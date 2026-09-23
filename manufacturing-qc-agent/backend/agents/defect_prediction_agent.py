"""
defect_prediction_agent.py — Defect Prediction Agent.

Trains a Random Forest classifier on the uploaded dataset (or sample data)
and predicts the defect probability for each record.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from data.data_processor import NUMERIC_FEATURES
from models.schemas import DefectPredictionResult


def _available_features(df: pd.DataFrame) -> List[str]:
    return [f for f in NUMERIC_FEATURES if f in df.columns]


def _train_model(
    df: pd.DataFrame, features: List[str]
) -> Tuple[RandomForestClassifier, StandardScaler, float]:
    """
    Train a Random Forest on the dataset.

    Returns the fitted model, scaler, and OOB/validation accuracy.
    The model is re-trained every time the dataset changes — no persistence
    needed for a prototype; swap to a persisted model for production.
    """
    X = df[features].values.astype(float)
    y = df["quality_label"].values.astype(int)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # If only one class exists in the dataset, skip training — return a trivial model
    if len(np.unique(y)) == 1:
        clf = RandomForestClassifier(
            n_estimators=100, random_state=42, oob_score=False
        )
        clf.fit(X_scaled, y)
        return clf, scaler, 1.0

    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        oob_score=True,
        class_weight="balanced",
    )
    clf.fit(X_scaled, y)
    accuracy = round(float(clf.oob_score_), 3)
    return clf, scaler, accuracy


def predict_batch(df: pd.DataFrame) -> Tuple[List[DefectPredictionResult], float]:
    """
    Run the Defect Prediction Agent on the full dataset.

    Returns
    -------
    results : list[DefectPredictionResult]
    model_accuracy : float — OOB accuracy of the trained classifier
    """
    features = _available_features(df)
    if not features:
        return [], 0.0

    clf, scaler, accuracy = _train_model(df, features)

    X = df[features].values.astype(float)
    X_scaled = scaler.transform(X)

    probabilities = clf.predict_proba(X_scaled)
    # Index of the "defective" class (class 1)
    defect_class_idx = list(clf.classes_).index(1) if 1 in clf.classes_ else 0
    defect_probs = probabilities[:, defect_class_idx]

    importances = clf.feature_importances_
    sorted_feature_idx = np.argsort(importances)[::-1]

    results: List[DefectPredictionResult] = []

    for i, row in df.iterrows():
        record_id = int(row.get("record_id", i))
        prob = float(defect_probs[i])
        predicted = prob >= 0.5

        # Top-3 contributing parameters for this prediction
        contributing: List[Dict[str, Any]] = []
        for fi in sorted_feature_idx[:3]:
            feat = features[fi]
            contributing.append(
                {
                    "parameter": feat,
                    "importance": round(float(importances[fi]), 4),
                    "value": round(float(row[feat]), 3),
                }
            )

        if predicted:
            explanation = (
                f"Record {record_id}: DEFECT PREDICTED (probability={prob:.1%}). "
                f"Top contributing factor: {contributing[0]['parameter']} = "
                f"{contributing[0]['value']}."
            )
        else:
            explanation = (
                f"Record {record_id}: No defect predicted (defect probability={prob:.1%})."
            )

        results.append(
            DefectPredictionResult(
                record_id=record_id,
                defect_predicted=predicted,
                probability=round(prob, 4),
                contributing_parameters=contributing,
                explanation=explanation,
            )
        )

    return results, accuracy
