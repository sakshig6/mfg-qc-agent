"""
sample_data.py — Generates a sample manufacturing dataset when no CSV is uploaded.

This allows the application to be fully demonstrated without any external data.
"""
from __future__ import annotations

import random
from typing import Any, Dict, List

import numpy as np
import pandas as pd

_RNG = np.random.default_rng(42)


def generate_sample_dataset(n_records: int = 200) -> pd.DataFrame:
    """
    Produce a synthetic manufacturing dataset that mimics real process data.

    Columns
    -------
    record_id, temperature (°C), pressure (bar), speed (RPM),
    torque (Nm), vibration (mm/s), tool_wear (min), material_strength (MPa),
    quality_label (0=normal, 1=defective)
    """
    temperature = _RNG.normal(75.0, 8.0, n_records)
    pressure = _RNG.normal(6.0, 0.8, n_records)
    speed = _RNG.normal(1500.0, 200.0, n_records)
    torque = _RNG.normal(40.0, 5.0, n_records)
    vibration = _RNG.normal(0.4, 0.1, n_records)
    tool_wear = _RNG.uniform(0, 250, n_records)
    material_strength = _RNG.normal(300.0, 20.0, n_records)

    # Inject anomalies into ~15 % of records
    n_anomalies = max(1, int(n_records * 0.15))
    anomaly_idx = _RNG.choice(n_records, n_anomalies, replace=False)

    for i in anomaly_idx:
        fault = _RNG.integers(0, 5)
        if fault == 0:
            temperature[i] = _RNG.uniform(90, 105)   # over-temperature
        elif fault == 1:
            pressure[i] = _RNG.uniform(8.5, 11.0)    # over-pressure
        elif fault == 2:
            speed[i] = _RNG.uniform(1900, 2400)       # over-speed
        elif fault == 3:
            vibration[i] = _RNG.uniform(0.75, 1.2)   # excess vibration
        else:
            tool_wear[i] = _RNG.uniform(230, 260)     # worn tool

    # Derive quality label: defective if any parameter is outside safe range
    quality_label = np.zeros(n_records, dtype=int)
    quality_label[temperature > 88.0] = 1
    quality_label[pressure > 8.0] = 1
    quality_label[speed > 1850.0] = 1
    quality_label[vibration > 0.65] = 1
    quality_label[tool_wear > 220.0] = 1

    df = pd.DataFrame(
        {
            "record_id": range(1, n_records + 1),
            "temperature": np.round(temperature, 2),
            "pressure": np.round(pressure, 3),
            "speed": np.round(speed, 1),
            "torque": np.round(torque, 2),
            "vibration": np.round(vibration, 4),
            "tool_wear": np.round(tool_wear, 1),
            "material_strength": np.round(material_strength, 2),
            "quality_label": quality_label,
        }
    )
    return df


def get_sample_records(n: int = 200) -> List[Dict[str, Any]]:
    """Return sample dataset as a list of dicts (JSON-serialisable)."""
    df = generate_sample_dataset(n)
    return df.to_dict(orient="records")
