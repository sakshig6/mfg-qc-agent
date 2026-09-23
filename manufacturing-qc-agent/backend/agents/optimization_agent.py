"""
optimization_agent.py — Process Optimization Agent.

Given the monitoring and prediction results for a record, generates
concrete corrective-action recommendations with reasons.
"""
from __future__ import annotations

from typing import Any, Dict, List

import config
from models.schemas import (
    Alert,
    AlertSeverity,
    OptimizationRecommendation,
    OptimizationResult,
)

# ---------------------------------------------------------------------------
# Corrective-action rules — maps parameter → action based on severity
# ---------------------------------------------------------------------------
_ACTIONS: Dict[str, Dict[str, Any]] = {
    "temperature": {
        AlertSeverity.WARNING: {
            "action": "Reduce process temperature by 5–8 °C",
            "recommended_value_offset": -6.0,
            "reason": (
                "Elevated temperature accelerates thermal expansion and "
                "dimensional drift. Reducing temperature restores part geometry "
                "and prevents material phase changes."
            ),
        },
        AlertSeverity.CRITICAL: {
            "action": "Immediately halt process and reduce temperature by 10–15 °C. "
                      "Inspect cooling system.",
            "recommended_value_offset": -12.0,
            "reason": (
                "Critical overtemperature risks permanent material degradation, "
                "tool damage, and scrap production. Process must be stopped until "
                "temperature returns to the safe operating range."
            ),
        },
    },
    "pressure": {
        AlertSeverity.WARNING: {
            "action": "Reduce hydraulic/process pressure by 0.5–1.0 bar",
            "recommended_value_offset": -0.75,
            "reason": (
                "Excess pressure increases surface stress and can produce micro-cracks "
                "or dimensional inaccuracies. Reducing pressure reduces reject rate."
            ),
        },
        AlertSeverity.CRITICAL: {
            "action": "Stop process. Reduce pressure by 1.5–2.5 bar. "
                      "Check pressure regulators and relief valves.",
            "recommended_value_offset": -2.0,
            "reason": (
                "Critical overpressure is a safety hazard and will certainly "
                "produce defective parts. Equipment inspection is mandatory."
            ),
        },
    },
    "speed": {
        AlertSeverity.WARNING: {
            "action": "Reduce machine speed by 100–150 RPM",
            "recommended_value_offset": -125.0,
            "reason": (
                "High rotational speed increases centrifugal force and vibration, "
                "leading to surface finish degradation and dimensional variation."
            ),
        },
        AlertSeverity.CRITICAL: {
            "action": "Reduce machine speed by 250–400 RPM immediately. "
                      "Check spindle bearings.",
            "recommended_value_offset": -325.0,
            "reason": (
                "Critical over-speed causes severe vibration, bearing wear, and "
                "part rejection. Spindle bearings must be inspected for damage."
            ),
        },
    },
    "vibration": {
        AlertSeverity.WARNING: {
            "action": "Check tool mounting and workpiece fixturing. "
                      "Inspect spindle balance.",
            "recommended_value_offset": -0.1,
            "reason": (
                "Excess vibration degrades surface finish and dimensional accuracy. "
                "Common causes: loose fixtures, unbalanced tooling, or worn bearings."
            ),
        },
        AlertSeverity.CRITICAL: {
            "action": "Stop machine immediately. Inspect all mechanical connections, "
                      "tooling, spindle, and drive train.",
            "recommended_value_offset": -0.2,
            "reason": (
                "Critical vibration levels indicate structural looseness or bearing "
                "failure. Continued operation risks machine damage and unsafe conditions."
            ),
        },
    },
    "tool_wear": {
        AlertSeverity.WARNING: {
            "action": "Schedule tool replacement within next 10–20 production cycles",
            "recommended_value_offset": 0.0,  # replacement, not offset
            "reason": (
                "Tool wear above 200 min degrades surface finish and dimensional "
                "accuracy. Planned replacement avoids unexpected failures."
            ),
        },
        AlertSeverity.CRITICAL: {
            "action": "Replace cutting tool immediately before next production cycle",
            "recommended_value_offset": 0.0,
            "reason": (
                "Critical tool wear causes burring, inaccurate cuts, and "
                "surface defects. Continued use guarantees scrap production."
            ),
        },
    },
}


def generate_recommendations(
    record_id: int,
    alerts: List[Alert],
    row: Dict[str, Any],
) -> OptimizationResult:
    """
    Generate optimisation recommendations for a single manufacturing record.

    Parameters
    ----------
    record_id : int
    alerts    : list of Alert objects from the Process Monitoring Agent
    row       : original data row dict (for current values)
    """
    recommendations: List[OptimizationRecommendation] = []

    for alert in alerts:
        param = alert.parameter
        if param not in _ACTIONS:
            continue
        action_map = _ACTIONS[param]
        sev = alert.severity
        if sev not in action_map:
            sev = AlertSeverity.WARNING  # fallback

        spec = action_map[sev]
        current = float(row.get(param, alert.value))
        offset = spec["recommended_value_offset"]
        rec_val = (current + offset) if offset != 0.0 else None

        recommendations.append(
            OptimizationRecommendation(
                parameter=param,
                current_value=round(current, 3),
                recommended_action=spec["action"],
                recommended_value=round(rec_val, 3) if rec_val is not None else None,
                reason=spec["reason"],
                priority=alert.severity,
            )
        )

    # Sort: critical first
    recommendations.sort(
        key=lambda r: 0 if r.priority == AlertSeverity.CRITICAL else 1
    )

    if recommendations:
        summary = (
            f"Record {record_id}: {len(recommendations)} corrective action(s) recommended. "
            + "Critical items require immediate attention."
            if any(r.priority == AlertSeverity.CRITICAL for r in recommendations)
            else f"Record {record_id}: {len(recommendations)} corrective action(s) recommended."
        )
    else:
        summary = f"Record {record_id}: Operating within normal range. No corrective actions needed."

    return OptimizationResult(
        record_id=record_id,
        recommendations=recommendations,
        overall_summary=summary,
    )


def generate_batch_recommendations(
    monitoring_results,
    df_lookup: Dict[int, Dict[str, Any]],
) -> List[OptimizationResult]:
    """Generate optimisation recommendations for all records with alerts."""
    results = []
    for mon_result in monitoring_results:
        if mon_result.alerts:
            row = df_lookup.get(mon_result.record_id, {})
            results.append(
                generate_recommendations(mon_result.record_id, mon_result.alerts, row)
            )
    return results
