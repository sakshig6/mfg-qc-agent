"""
quality_analysis_agent.py — Quality Analysis Agent.

Uses Isolation Forest (unsupervised) + label-aware logic to classify each
production record and explain why it was flagged.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from data.data_processor import NUMERIC_FEATURES
from models.schemas import QualityAnalysisResult, QualityStatus

# Feature importances proxy: use the z-score distance of each feature
_FEATURE_LABELS = {
    "temperature": "Temperature (°C)",
    "pressure": "Pressure (bar)",
    "speed": "Machine Speed (RPM)",
    "torque": "Torque (Nm)",
    "vibration": "Vibration (mm/s)",
    "tool_wear": "Tool Wear (min)",
    "material_strength": "Material Strength (MPa)",
}


def _available_features(df: pd.DataFrame) -> List[str]:
    return [f for f in NUMERIC_FEATURES if f in df.columns]


def analyse_batch(df: pd.DataFrame) -> List[QualityAnalysisResult]:
    """
    Run the Quality Analysis Agent on the full dataset.

    Steps
    -----
    1. Fit Isolation Forest on numeric features to detect structural outliers.
    2. For each record, compute per-feature z-scores to identify contributing factors.
    3. Override label with the uploaded quality_label when present.
    """
    features = _available_features(df)
    if not features:
        return []

    X = df[features].values.astype(float)

    # Normalise for z-score calculation
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Isolation Forest — contamination mirrors expected ~15 % defect rate
    iso = IsolationForest(contamination=0.15, random_state=42, n_estimators=100)
    iso_labels = iso.fit_predict(X_scaled)          # -1 = anomaly, 1 = normal
    iso_scores = -iso.score_samples(X_scaled)       # higher = more anomalous

    results: List[QualityAnalysisResult] = []

    for i, row in df.iterrows():
        record_id = int(row.get("record_id", i))
        uploaded_label = int(row.get("quality_label", 0))

        is_anomaly = (iso_labels[i] == -1) or (uploaded_label == 1)
        status = QualityStatus.ABNORMAL if is_anomaly else QualityStatus.NORMAL

        # Confidence derived from the Isolation Forest score
        raw_score = float(iso_scores[i])
        confidence = float(np.clip(raw_score, 0.0, 1.0))

        # Contributing factors: top-2 features with highest absolute z-score
        z_scores = np.abs(X_scaled[i])
        top_idx = np.argsort(z_scores)[::-1][:3]
        contributing = [
            f"{_FEATURE_LABELS.get(features[j], features[j])} "
            f"(z={z_scores[j]:.2f})"
            for j in top_idx
            if z_scores[j] > 1.0  # only report meaningful deviations
        ]

        if status == QualityStatus.ABNORMAL:
            explanation = (
                f"Record {record_id} was flagged as ABNORMAL. "
                + (
                    f"Key deviating parameters: {', '.join(contributing)}. "
                    if contributing
                    else "Multiple parameters deviate from historical norms. "
                )
                + "Recommend immediate process review."
            )
        else:
            explanation = (
                f"Record {record_id} is within normal operating range. "
                "No significant parameter deviations detected."
            )

        results.append(
            QualityAnalysisResult(
                record_id=record_id,
                status=status,
                confidence=round(confidence, 3),
                contributing_factors=contributing,
                explanation=explanation,
            )
        )

    return results
