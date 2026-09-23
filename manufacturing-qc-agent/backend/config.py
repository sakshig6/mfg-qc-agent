"""
config.py — Application configuration.

IBM watsonx.ai credentials and model settings are centralised here.
Set these via environment variables (or a .env file) before running.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# IBM watsonx.ai settings
# ---------------------------------------------------------------------------
WATSONX_API_KEY: str = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID: str = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL: str = os.getenv(
    "WATSONX_URL", "https://us-south.ml.cloud.ibm.com"
)

# IBM Granite model to use for inference
# Swap to any Granite variant available in your watsonx.ai project.
GRANITE_MODEL_ID: str = os.getenv(
    "GRANITE_MODEL_ID", "ibm/granite-13b-instruct-v2"
)

# ---------------------------------------------------------------------------
# LLM generation parameters
# ---------------------------------------------------------------------------
LLM_MAX_NEW_TOKENS: int = int(os.getenv("LLM_MAX_NEW_TOKENS", "512"))
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))
LLM_TOP_P: float = float(os.getenv("LLM_TOP_P", "0.9"))

# ---------------------------------------------------------------------------
# App settings
# ---------------------------------------------------------------------------
APP_TITLE: str = "Manufacturing Process Quality Control Agent"
APP_VERSION: str = "1.0.0"
DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

# Maximum rows to keep in memory per session
MAX_DATASET_ROWS: int = int(os.getenv("MAX_DATASET_ROWS", "10000"))

# Thresholds used by the rule-based fallback when watsonx.ai is not configured
TEMPERATURE_WARN: float = float(os.getenv("TEMPERATURE_WARN", "85.0"))
TEMPERATURE_CRIT: float = float(os.getenv("TEMPERATURE_CRIT", "95.0"))
PRESSURE_WARN: float = float(os.getenv("PRESSURE_WARN", "7.5"))
PRESSURE_CRIT: float = float(os.getenv("PRESSURE_CRIT", "9.0"))
SPEED_WARN: float = float(os.getenv("SPEED_WARN", "1800.0"))
SPEED_CRIT: float = float(os.getenv("SPEED_CRIT", "2100.0"))
VIBRATION_WARN: float = float(os.getenv("VIBRATION_WARN", "0.6"))
VIBRATION_CRIT: float = float(os.getenv("VIBRATION_CRIT", "0.8"))

def watsonx_configured() -> bool:
    """Return True when the minimum IBM watsonx.ai credentials are present."""
    return bool(WATSONX_API_KEY and WATSONX_PROJECT_ID)
