"""
data_processor.py — CSV ingestion, validation, cleaning, and feature engineering.

All manufacturing datasets are normalised to a common internal schema so that
the AI agents always receive data in a predictable format.
"""
from __future__ import annotations

import io
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from models.schemas import DatasetInfo

# ---------------------------------------------------------------------------
# Expected column name aliases → internal canonical name
# Flexible mapping so datasets with slightly different headers still work.
# ---------------------------------------------------------------------------
COLUMN_ALIASES: Dict[str, str] = {
    # temperature variants
    "temperature": "temperature",
    "temp": "temperature",
    "process_temp": "temperature",
    "air_temperature": "temperature",
    "machine_temperature": "temperature",
    # pressure variants
    "pressure": "pressure",
    "process_pressure": "pressure",
    "hydraulic_pressure": "pressure",
    # speed variants
    "speed": "speed",
    "rotational_speed": "speed",
    "machine_speed": "speed",
    "rpm": "speed",
    # torque variants
    "torque": "torque",
    "process_torque": "torque",
    # vibration
    "vibration": "vibration",
    "tool_wear": "tool_wear",
    # material
    "material_strength": "material_strength",
    "hardness": "material_strength",
    # quality / defect label
    "quality": "quality_label",
    "quality_label": "quality_label",
    "defect": "quality_label",
    "failure": "quality_label",
    "machine_failure": "quality_label",
    "label": "quality_label",
    # identifiers
    "id": "record_id",
    "record_id": "record_id",
    "product_id": "record_id",
    "uid": "record_id",
}

# Numeric columns the agents operate on
NUMERIC_FEATURES = [
    "temperature",
    "pressure",
    "speed",
    "torque",
    "vibration",
    "tool_wear",
    "material_strength",
]


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case and strip column names, then map to canonical names."""
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    rename_map = {
        col: COLUMN_ALIASES[col]
        for col in df.columns
        if col in COLUMN_ALIASES
    }
    return df.rename(columns=rename_map)


def _impute_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Fill missing numeric values with column medians; fill strings with 'unknown'."""
    for col in df.select_dtypes(include=[np.number]).columns:
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna("unknown")
    return df


def _add_record_id(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure a numeric record_id column exists."""
    if "record_id" not in df.columns:
        df.insert(0, "record_id", range(1, len(df) + 1))
    else:
        df["record_id"] = pd.to_numeric(df["record_id"], errors="coerce").fillna(
            pd.Series(range(1, len(df) + 1))
        )
    return df


def _ensure_quality_label(df: pd.DataFrame) -> pd.DataFrame:
    """
    If a quality_label column is present, standardise to 0 (normal) / 1 (defective).
    If absent, initialise to 0 (will be inferred by agents).
    """
    if "quality_label" in df.columns:
        # Accept various representations: 1/0, True/False, 'defect'/'normal', etc.
        col = df["quality_label"].astype(str).str.lower()
        df["quality_label"] = col.apply(
            lambda v: 1 if v in {"1", "true", "defect", "defective", "failure", "fail", "yes"} else 0
        )
    else:
        df["quality_label"] = 0
    return df


def parse_csv(content: bytes, filename: str = "") -> Tuple[pd.DataFrame, List[str]]:
    """
    Parse CSV bytes into a cleaned DataFrame.

    Returns
    -------
    df : pd.DataFrame
        Cleaned, canonical-column DataFrame.
    warnings : list[str]
        Non-fatal data quality messages.
    """
    warnings: List[str] = []

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise ValueError(f"Cannot parse CSV file '{filename}': {exc}") from exc

    if df.empty:
        raise ValueError("The uploaded CSV file contains no data rows.")

    original_cols = list(df.columns)
    df = _normalise_columns(df)

    # Report any columns that were not recognised
    recognised = set(COLUMN_ALIASES.values())
    unrecognised = [c for c in df.columns if c not in recognised]
    if unrecognised:
        warnings.append(
            f"Columns not mapped to known features (kept as-is): {unrecognised}"
        )

    # At least one numeric feature must be present
    present_features = [f for f in NUMERIC_FEATURES if f in df.columns]
    if not present_features:
        raise ValueError(
            "No recognised numeric process-parameter columns found. "
            f"Recognised columns: {list(COLUMN_ALIASES.keys())}. "
            f"CSV columns: {original_cols}"
        )

    # Report and impute missing values
    missing = df.isnull().sum()
    missing_cols = missing[missing > 0].to_dict()
    if missing_cols:
        warnings.append(
            f"Missing values found (imputed with median/unknown): {missing_cols}"
        )

    df = _impute_missing(df)
    df = _add_record_id(df)
    df = _ensure_quality_label(df)

    # Coerce numeric feature columns to float
    for feat in present_features:
        df[feat] = pd.to_numeric(df[feat], errors="coerce").fillna(df[feat].median())

    return df, warnings


def get_dataset_info(df: pd.DataFrame, sample_n: int = 10) -> DatasetInfo:
    """Return metadata about the processed dataset."""
    missing = df.isnull().sum().to_dict()
    sample = df.head(sample_n).replace({float("nan"): None}).to_dict(orient="records")
    return DatasetInfo(
        total_records=len(df),
        columns=list(df.columns),
        sample_rows=sample,
        missing_values={k: int(v) for k, v in missing.items() if v > 0},
    )


def compute_process_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute descriptive statistics for all present numeric features."""
    stats: Dict[str, Any] = {}
    for feat in NUMERIC_FEATURES:
        if feat in df.columns:
            col = df[feat].dropna()
            stats[feat] = {
                "mean": round(float(col.mean()), 3),
                "std": round(float(col.std()), 3),
                "min": round(float(col.min()), 3),
                "max": round(float(col.max()), 3),
                "p25": round(float(col.quantile(0.25)), 3),
                "p75": round(float(col.quantile(0.75)), 3),
            }
    return stats


def df_to_records(df: pd.DataFrame, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Convert DataFrame to JSON-serialisable list of records."""
    out = df if limit is None else df.head(limit)
    return out.replace({float("nan"): None, math.nan: None}).to_dict(orient="records")
