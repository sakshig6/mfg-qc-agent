"""
schemas.py — Pydantic data models shared across the backend.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class AlertSeverity(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


class QualityStatus(str, Enum):
    NORMAL = "normal"
    ABNORMAL = "abnormal"
    DEFECTIVE = "defective"


# ---------------------------------------------------------------------------
# Alert
# ---------------------------------------------------------------------------

class Alert(BaseModel):
    record_id: Optional[int] = None
    severity: AlertSeverity
    parameter: str
    value: float
    threshold: float
    message: str
    timestamp: Optional[str] = None


# ---------------------------------------------------------------------------
# Agent results
# ---------------------------------------------------------------------------

class ProcessMonitoringResult(BaseModel):
    record_id: int
    status: QualityStatus
    alerts: List[Alert] = []
    anomaly_score: float = Field(ge=0.0, le=1.0)
    summary: str = ""


class QualityAnalysisResult(BaseModel):
    record_id: int
    status: QualityStatus
    confidence: float = Field(ge=0.0, le=1.0)
    contributing_factors: List[str] = []
    explanation: str = ""


class DefectPredictionResult(BaseModel):
    record_id: int
    defect_predicted: bool
    probability: float = Field(ge=0.0, le=1.0)
    contributing_parameters: List[Dict[str, Any]] = []
    explanation: str = ""


class OptimizationRecommendation(BaseModel):
    parameter: str
    current_value: float
    recommended_action: str
    recommended_value: Optional[float] = None
    reason: str
    priority: AlertSeverity = AlertSeverity.NORMAL


class OptimizationResult(BaseModel):
    record_id: int
    recommendations: List[OptimizationRecommendation] = []
    overall_summary: str = ""


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []


# ---------------------------------------------------------------------------
# Dataset / upload
# ---------------------------------------------------------------------------

class DatasetInfo(BaseModel):
    total_records: int
    columns: List[str]
    sample_rows: List[Dict[str, Any]] = []
    missing_values: Dict[str, int] = {}


class AnalysisSummary(BaseModel):
    total_records: int
    normal_count: int
    abnormal_count: int
    defect_count: int
    critical_alerts: int
    warning_alerts: int
    top_issues: List[str] = []
    process_stats: Dict[str, Any] = {}
