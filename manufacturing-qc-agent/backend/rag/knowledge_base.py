"""
knowledge_base.py — Static RAG knowledge base for manufacturing quality control.

Contains curated documentation about manufacturing process parameters,
defect types, quality standards, and corrective actions.
This content is retrieved using keyword/semantic search to ground the
AI assistant's responses in factual information.
"""
from __future__ import annotations

from typing import List, Tuple

# ---------------------------------------------------------------------------
# Manufacturing quality control documentation chunks.
# In production this would be replaced by a vector store (e.g. Chroma, FAISS,
# or IBM watsonx Discovery). For the prototype we use TF-IDF similarity.
# ---------------------------------------------------------------------------
KB_DOCUMENTS = [
    {
        "id": "temp_control",
        "title": "Temperature Control in Manufacturing",
        "content": (
            "Temperature is a critical process parameter in manufacturing. "
            "Optimal temperature ranges vary by material: for steel machining, "
            "typical cutting zone temperatures should stay below 800°C. "
            "For injection moulding, melt temperatures range from 200–300°C depending "
            "on the polymer. Process temperatures above the recommended range cause "
            "thermal expansion, dimensional inaccuracies, surface oxidation, "
            "and potential material phase changes. Warning threshold: 85°C (process ambient). "
            "Critical threshold: 95°C. Corrective actions include reducing cutting speed, "
            "improving coolant flow, and checking heat exchanger function."
        ),
    },
    {
        "id": "pressure_control",
        "title": "Pressure Control and Its Effect on Quality",
        "content": (
            "Hydraulic and pneumatic pressure directly affects clamping force, "
            "injection pressure in moulding, and die force in forging. "
            "Excess pressure leads to flash defects (material squeezed out of mould), "
            "dimensional overshoot, and surface stress. "
            "Insufficient pressure causes incomplete fill, porosity, and weak parts. "
            "Recommended operating range: 5.0–7.5 bar for most processes. "
            "Warning threshold: 7.5 bar. Critical: 9.0 bar. "
            "Check pressure regulators, relief valves, and seals regularly."
        ),
    },
    {
        "id": "machine_speed",
        "title": "Machine Speed and Rotational Speed Management",
        "content": (
            "Machine speed (RPM) affects material removal rate, surface finish, "
            "and tool life. Optimal RPM is determined by the material and tool diameter "
            "using the formula: RPM = (cutting speed × 1000) / (π × diameter). "
            "Excessive RPM causes increased vibration, heat generation, rapid tool wear, "
            "and poor surface finish. Warning threshold: 1800 RPM. Critical: 2100 RPM. "
            "Corrective actions: reduce spindle speed, check balance, inspect bearings."
        ),
    },
    {
        "id": "vibration_analysis",
        "title": "Vibration Analysis and Machine Condition Monitoring",
        "content": (
            "Vibration monitoring (ISO 10816) classifies machine condition based on "
            "RMS velocity (mm/s): Class A (<0.28 mm/s normal), Class B (0.28–0.71 mm/s acceptable), "
            "Class C (0.71–1.8 mm/s unsatisfactory), Class D (>1.8 mm/s unacceptable). "
            "Elevated vibration causes: poor surface finish, dimensional variation, "
            "bearing damage, and tool breakage. "
            "Warning threshold: 0.6 mm/s. Critical: 0.8 mm/s. "
            "Root causes: unbalanced tooling, loose fixtures, worn bearings, resonance. "
            "Corrective actions: rebalance tooling, tighten fixtures, replace bearings."
        ),
    },
    {
        "id": "tool_wear",
        "title": "Tool Wear Management",
        "content": (
            "Tool wear is measured in minutes of operation. ISO 3685 defines tool life "
            "criteria based on flank wear width (VB). Worn tools produce: "
            "increased surface roughness, dimensional drift, burrs, and built-up edge. "
            "Tool wear index >200 min indicates approaching end-of-life. "
            "Critical at >230 min. Monitoring methods: acoustic emission, power consumption, "
            "direct measurement. Corrective actions: replace tool, adjust feed rate, "
            "increase coolant concentration."
        ),
    },
    {
        "id": "defect_types",
        "title": "Common Manufacturing Defect Types",
        "content": (
            "Dimensional inaccuracies: part dimensions outside tolerance; caused by "
            "thermal expansion, tool wear, machine misalignment. "
            "Surface imperfections: scratches, porosity, burrs, oxidation; caused by "
            "incorrect speed/feed, worn tools, inadequate coolant. "
            "Structural defects: cracks, inclusions, voids; caused by material issues, "
            "excess pressure, improper heat treatment. "
            "Visual defects: discolouration, flash, sink marks; caused by temperature "
            "extremes and pressure problems. "
            "Prevention: SPC (Statistical Process Control), regular calibration, "
            "scheduled maintenance, operator training."
        ),
    },
    {
        "id": "spc_control_charts",
        "title": "Statistical Process Control (SPC)",
        "content": (
            "SPC uses control charts to monitor process stability over time. "
            "X-bar and R charts track sample mean and range. "
            "Control limits are set at ±3σ from the process mean (99.73% of normal variation). "
            "Points outside control limits indicate special-cause variation requiring investigation. "
            "Key SPC indices: Cp (process capability) and Cpk (centred capability). "
            "A Cp of 1.33 is typically required for production approval. "
            "Warning triggers: 8 consecutive points on one side of centreline, "
            "2 of 3 points beyond 2σ, 4 of 5 points beyond 1σ."
        ),
    },
    {
        "id": "iso_9001",
        "title": "ISO 9001 Quality Management Requirements",
        "content": (
            "ISO 9001:2015 requires documented quality management systems covering: "
            "risk-based thinking, process approach, continual improvement. "
            "Key clauses for manufacturing: Clause 8.5 Production and service provision — "
            "requires controlled conditions including documented information, monitoring, "
            "and calibrated equipment. Clause 8.7 Non-conforming outputs — "
            "requires identification, containment, and corrective action for defects. "
            "Root cause analysis methods: 5-Why, Fishbone (Ishikawa) diagram, FMEA. "
            "Corrective actions must be documented and verified for effectiveness."
        ),
    },
    {
        "id": "predictive_maintenance",
        "title": "Predictive Maintenance in Manufacturing",
        "content": (
            "Predictive maintenance uses sensor data to forecast equipment failures "
            "before they cause production defects. Key indicators: vibration signature "
            "changes, temperature drift, current draw anomalies, oil analysis. "
            "ML techniques used: Random Forest, LSTM, Isolation Forest for anomaly detection. "
            "Benefits: 30–50% reduction in unplanned downtime, 10–25% reduction in maintenance costs. "
            "Implementation steps: sensor installation, data collection, baseline model training, "
            "threshold calibration, alert system configuration."
        ),
    },
    {
        "id": "corrective_actions",
        "title": "Corrective Action Framework",
        "content": (
            "When a quality issue is detected: "
            "1. Contain: isolate affected parts, halt or quarantine production if critical. "
            "2. Identify root cause: use process data, inspection reports, operator logs. "
            "3. Correct: adjust process parameters, replace worn components, recalibrate equipment. "
            "4. Verify: confirm that the adjustment resolved the issue using SPC charts. "
            "5. Prevent recurrence: update maintenance schedules, control plans, and operator training. "
            "Parameter-specific actions: temperature → adjust coolant/heating; "
            "pressure → check regulators/valves; speed → adjust RPM via CNC program; "
            "vibration → rebalance/retighten; tool wear → replace tooling per schedule."
        ),
    },
]


# ---------------------------------------------------------------------------
# Simple TF-IDF retrieval (replaced by a proper vector store when scaling up)
# ---------------------------------------------------------------------------
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    _corpus = [f"{d['title']}. {d['content']}" for d in KB_DOCUMENTS]
    _vectorizer = TfidfVectorizer(stop_words="english")
    _tfidf_matrix = _vectorizer.fit_transform(_corpus)
    _RAG_AVAILABLE = True
except ImportError:
    _RAG_AVAILABLE = False


def retrieve(query: str, top_k: int = 3) -> List[Tuple[str, str]]:
    """
    Retrieve the top-k most relevant knowledge-base chunks for a query.

    Returns
    -------
    List of (title, content) tuples, ordered by relevance.
    """
    if not _RAG_AVAILABLE or not query.strip():
        return []

    q_vec = _vectorizer.transform([query])
    sims = cosine_similarity(q_vec, _tfidf_matrix).flatten()
    top_idx = sims.argsort()[::-1][:top_k]
    return [
        (KB_DOCUMENTS[i]["title"], KB_DOCUMENTS[i]["content"])
        for i in top_idx
        if sims[i] > 0.05  # minimum relevance threshold
    ]


def format_context(retrieved: List[Tuple[str, str]]) -> str:
    """Format retrieved chunks into a prompt-ready context string."""
    if not retrieved:
        return ""
    sections = "\n\n".join(
        f"[{title}]\n{content}" for title, content in retrieved
    )
    return f"Relevant manufacturing knowledge:\n\n{sections}\n\n"
