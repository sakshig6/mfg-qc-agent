"""
process_monitoring_agent.py — Process Monitoring Agent.

Analyses individual manufacturing records against threshold rules and
(optionally) augments results with IBM Granite / watsonx.ai explanations.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import pandas as pd

import config
from models.schemas import (
    Alert,
    AlertSeverity,
    ProcessMonitoringResult,
    QualityStatus,
)

# ---------------------------------------------------------------------------
# Rule-based thresholds (fallback when watsonx.ai is not configured)
# The same thresholds are used to compute anomaly scores in all cases.
# ---------------------------------------------------------------------------
THRESHOLDS: Dict[str, Dict[str, float]] = {
    "temperature": {
        "warn": config.TEMPERATURE_WARN,
        "crit": config.TEMPERATURE_CRIT,
    },
    "pressure": {
        "warn": config.PRESSURE_WARN,
        "crit": config.PRESSURE_CRIT,
    },
    "speed": {
        "warn": config.SPEED_WARN,
        "crit": config.SPEED_CRIT,
    },
    "vibration": {
        "warn": config.VIBRATION_WARN,
        "crit": config.VIBRATION_CRIT,
    },
    "tool_wear": {
        "warn": 200.0,
        "crit": 230.0,
    },
}


def _check_parameter(
    record_id: int,
    param: str,
    value: float,
    warn_th: float,
    crit_th: float,
) -> Optional[Alert]:
    """Return an Alert if value exceeds a threshold, else None."""
    if value >= crit_th:
        return Alert(
            record_id=record_id,
            severity=AlertSeverity.CRITICAL,
            parameter=param,
            value=round(value, 3),
            threshold=crit_th,
            message=(
                f"CRITICAL: {param} = {value:.2f} exceeds critical threshold {crit_th}. "
                "Immediate corrective action required."
            ),
        )
    if value >= warn_th:
        return Alert(
            record_id=record_id,
            severity=AlertSeverity.WARNING,
            parameter=param,
            value=round(value, 3),
            threshold=warn_th,
            message=(
                f"WARNING: {param} = {value:.2f} exceeds warning threshold {warn_th}. "
                "Monitor closely and prepare corrective action."
            ),
        )
    return None


def analyse_record(row: Dict[str, Any]) -> ProcessMonitoringResult:
    """
    Run the Process Monitoring Agent on a single manufacturing record.

    Parameters
    ----------
    row : dict
        A single row from the processed DataFrame (all numeric, canonical columns).

    Returns
    -------
    ProcessMonitoringResult
    """
    record_id = int(row.get("record_id", 0))
    alerts: List[Alert] = []

    for param, th in THRESHOLDS.items():
        val = row.get(param)
        if val is None:
            continue
        alert = _check_parameter(record_id, param, float(val), th["warn"], th["crit"])
        if alert:
            alerts.append(alert)

    # Compute a simple anomaly score: fraction of parameters in violation
    n_params = sum(1 for p in THRESHOLDS if row.get(p) is not None)
    anomaly_score = min(1.0, len(alerts) / max(n_params, 1))

    # Determine overall status
    if any(a.severity == AlertSeverity.CRITICAL for a in alerts):
        status = QualityStatus.DEFECTIVE
    elif any(a.severity == AlertSeverity.WARNING for a in alerts):
        status = QualityStatus.ABNORMAL
    else:
        status = QualityStatus.NORMAL

    summary = (
        f"Record {record_id}: {len(alerts)} alert(s) — status={status.value}."
        if alerts
        else f"Record {record_id}: all parameters within normal range."
    )

    return ProcessMonitoringResult(
        record_id=record_id,
        status=status,
        alerts=alerts,
        anomaly_score=round(anomaly_score, 3),
        summary=summary,
    )


def analyse_batch(df: pd.DataFrame) -> List[ProcessMonitoringResult]:
    """Run the Process Monitoring Agent on an entire DataFrame."""
    records = df.to_dict(orient="records")
    return [analyse_record(row) for row in records]
