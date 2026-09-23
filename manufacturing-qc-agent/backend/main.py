"""
main.py — FastAPI application entry point.

All API routes for the Manufacturing QC Agent are defined here.
Run with: uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import io
import json
import traceback
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from agents import (
    defect_prediction_agent,
    optimization_agent,
    process_monitoring_agent,
    quality_analysis_agent,
)
from data.data_processor import (
    compute_process_stats,
    df_to_records,
    get_dataset_info,
    parse_csv,
)
from data.sample_data import generate_sample_dataset
from models.schemas import (
    AnalysisSummary,
    ChatRequest,
    ChatResponse,
    DatasetInfo,
)
from rag import knowledge_base
from watsonx import watsonx_client

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title=config.APP_TITLE,
    version=config.APP_VERSION,
    description="AI-powered manufacturing process quality control system.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory session state
# A proper backend would use Redis / a database.  For a prototype, one global
# DataFrame is sufficient.
# ---------------------------------------------------------------------------
_session: Dict[str, Any] = {
    "df": None,           # Active manufacturing DataFrame
    "source": "sample",   # "sample" | "uploaded"
    "filename": "",
    "monitoring": [],
    "quality": [],
    "defects": [],
    "optimizations": [],
    "model_accuracy": 0.0,
}


def _get_df() -> pd.DataFrame:
    """Return the active DataFrame, loading sample data if needed."""
    if _session["df"] is None:
        _session["df"] = generate_sample_dataset(200)
        _session["source"] = "sample"
    return _session["df"]


def _run_all_agents(df: pd.DataFrame) -> None:
    """Execute all four agents on the given DataFrame and cache results."""
    monitoring = process_monitoring_agent.analyse_batch(df)
    _session["monitoring"] = [r.dict() for r in monitoring]

    quality = quality_analysis_agent.analyse_batch(df)
    _session["quality"] = [r.dict() for r in quality]

    defects, acc = defect_prediction_agent.predict_batch(df)
    _session["defects"] = [r.dict() for r in defects]
    _session["model_accuracy"] = acc

    df_lookup = {int(row["record_id"]): row for row in df.to_dict(orient="records")}
    opts = optimization_agent.generate_batch_recommendations(monitoring, df_lookup)
    _session["optimizations"] = [r.dict() for r in opts]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _compute_summary() -> AnalysisSummary:
    df = _get_df()
    total = len(df)

    monitoring = _session.get("monitoring", [])
    quality = _session.get("quality", [])
    defects = _session.get("defects", [])

    abnormal = sum(1 for r in quality if r["status"] != "normal")
    normal = total - abnormal
    defect_count = sum(1 for r in defects if r["defect_predicted"])

    all_alerts = [a for r in monitoring for a in r["alerts"]]
    critical = sum(1 for a in all_alerts if a["severity"] == "critical")
    warning = sum(1 for a in all_alerts if a["severity"] == "warning")

    # Top issues: most frequently alerted parameters
    from collections import Counter
    param_counts = Counter(a["parameter"] for a in all_alerts)
    top_issues = [f"{p} ({c} alerts)" for p, c in param_counts.most_common(5)]

    stats = compute_process_stats(df)

    return AnalysisSummary(
        total_records=total,
        normal_count=normal,
        abnormal_count=abnormal,
        defect_count=defect_count,
        critical_alerts=critical,
        warning_alerts=warning,
        top_issues=top_issues,
        process_stats=stats,
    )


# ---------------------------------------------------------------------------
# Routes — Dataset
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": config.APP_VERSION,
        "watsonx_configured": config.watsonx_configured(),
    }


@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Parse and validate an uploaded CSV manufacturing dataset."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50 MB limit
        raise HTTPException(status_code=413, detail="File too large (max 50 MB).")

    try:
        df, warnings = parse_csv(content, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    df = df.head(config.MAX_DATASET_ROWS)
    _session["df"] = df
    _session["source"] = "uploaded"
    _session["filename"] = file.filename
    # Reset cached results
    _session["monitoring"] = []
    _session["quality"] = []
    _session["defects"] = []
    _session["optimizations"] = []

    # Run all agents immediately after upload
    _run_all_agents(df)

    info = get_dataset_info(df)
    return {
        "message": f"Uploaded {len(df)} records from '{file.filename}'.",
        "warnings": warnings,
        "info": info.dict(),
    }


@app.get("/api/dataset")
def get_dataset(page: int = 1, page_size: int = 50):
    """Return paginated dataset records."""
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)

    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    records = df_to_records(df.iloc[start:end])
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "source": _session["source"],
        "filename": _session["filename"],
        "records": records,
    }


@app.get("/api/dataset/info")
def dataset_info():
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)
    info = get_dataset_info(df, sample_n=5)
    return info.dict()


# ---------------------------------------------------------------------------
# Routes — Analysis summary / dashboard
# ---------------------------------------------------------------------------

@app.get("/api/summary")
def summary():
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)
    s = _compute_summary()
    return s.dict()


@app.get("/api/charts/process-parameters")
def chart_process_parameters():
    """Return time-series data for all numeric features (for chart rendering)."""
    df = _get_df()
    features = ["temperature", "pressure", "speed", "torque", "vibration", "tool_wear"]
    present = [f for f in features if f in df.columns]
    result = {"record_ids": df["record_id"].tolist()}
    for feat in present:
        result[feat] = df[feat].round(3).tolist()
    return result


# ---------------------------------------------------------------------------
# Routes — Agents
# ---------------------------------------------------------------------------

@app.get("/api/monitoring")
def get_monitoring(page: int = 1, page_size: int = 50):
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)
    data = _session["monitoring"]
    total = len(data)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "data": data[start: start + page_size]}


@app.get("/api/monitoring/alerts")
def get_alerts(severity: Optional[str] = None):
    """Return all alerts, optionally filtered by severity."""
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)
    alerts = [
        a
        for r in _session["monitoring"]
        for a in r["alerts"]
        if severity is None or a["severity"] == severity
    ]
    return {"total": len(alerts), "alerts": alerts}


@app.get("/api/quality")
def get_quality(page: int = 1, page_size: int = 50):
    df = _get_df()
    if not _session["quality"]:
        _run_all_agents(df)
    data = _session["quality"]
    total = len(data)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "data": data[start: start + page_size]}


@app.get("/api/defects")
def get_defects(page: int = 1, page_size: int = 50):
    df = _get_df()
    if not _session["defects"]:
        _run_all_agents(df)
    data = _session["defects"]
    total = len(data)
    start = (page - 1) * page_size
    return {
        "total": total,
        "page": page,
        "model_accuracy": _session["model_accuracy"],
        "data": data[start: start + page_size],
    }


@app.get("/api/optimizations")
def get_optimizations(page: int = 1, page_size: int = 50):
    df = _get_df()
    if not _session["optimizations"]:
        _run_all_agents(df)
    data = _session["optimizations"]
    total = len(data)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "data": data[start: start + page_size]}


# ---------------------------------------------------------------------------
# Routes — AI Assistant (chat)
# ---------------------------------------------------------------------------

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """AI Quality Assistant endpoint — uses RAG + IBM Granite."""
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)

    # 1. Retrieve relevant knowledge-base chunks
    retrieved = knowledge_base.retrieve(req.message, top_k=3)
    context = knowledge_base.format_context(retrieved)
    sources = [title for title, _ in retrieved]

    # 2. Build data summary for grounding
    try:
        s = _compute_summary()
        data_summary = (
            f"Total records: {s.total_records}, "
            f"Normal: {s.normal_count}, "
            f"Abnormal: {s.abnormal_count}, "
            f"Predicted defects: {s.defect_count}, "
            f"Critical alerts: {s.critical_alerts}, "
            f"Warning alerts: {s.warning_alerts}. "
            f"Top issues: {', '.join(s.top_issues) or 'none'}."
        )
    except Exception:
        data_summary = "Dataset loaded. Run analysis for detailed summary."

    # 3. Build prompt and call Granite (or fallback)
    history = [m.dict() for m in req.history]
    prompt = watsonx_client.build_qa_prompt(
        question=req.message,
        context=context,
        data_summary=data_summary,
        history=history,
    )
    answer = watsonx_client.generate(prompt)

    return ChatResponse(answer=answer, sources=sources)


# ---------------------------------------------------------------------------
# Routes — Report
# ---------------------------------------------------------------------------

@app.get("/api/report")
def get_report():
    """Generate and return a full quality report for the current dataset."""
    df = _get_df()
    if not _session["monitoring"]:
        _run_all_agents(df)

    s = _compute_summary()
    stats = s.process_stats

    # Collect all recommendations
    all_recs = [
        rec
        for opt in _session["optimizations"]
        for rec in opt["recommendations"]
    ]

    return {
        "title": "Manufacturing Quality Control Report",
        "source": _session["source"],
        "filename": _session["filename"],
        "summary": s.dict(),
        "process_stats": stats,
        "recommendations": all_recs[:20],  # top-20 for the report
        "model_accuracy": _session["model_accuracy"],
        "watsonx_configured": config.watsonx_configured(),
    }


# ---------------------------------------------------------------------------
# Entry point (development)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
