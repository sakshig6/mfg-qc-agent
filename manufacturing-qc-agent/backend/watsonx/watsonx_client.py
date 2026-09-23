"""
watsonx_client.py — IBM watsonx.ai / Granite integration.

When IBM credentials are configured (WATSONX_API_KEY + WATSONX_PROJECT_ID),
all LLM calls are routed to IBM Granite via the ibm-watsonx-ai SDK.
When credentials are absent the module falls back to template-based responses
so the prototype can be demonstrated without IBM access.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import config

# ---------------------------------------------------------------------------
# Try to import the IBM watsonx.ai SDK
# Install: pip install ibm-watsonx-ai
# ---------------------------------------------------------------------------
try:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

    _SDK_AVAILABLE = True
except ImportError:
    _SDK_AVAILABLE = False

_client: Optional[Any] = None
_model: Optional[Any] = None


def _get_model():
    """Lazy-initialise the IBM Granite model client."""
    global _client, _model

    if _model is not None:
        return _model

    if not _SDK_AVAILABLE:
        return None

    if not config.watsonx_configured():
        return None

    try:
        credentials = Credentials(
            url=config.WATSONX_URL,
            api_key=config.WATSONX_API_KEY,
        )
        _client = APIClient(credentials)
        _model = ModelInference(
            model_id=config.GRANITE_MODEL_ID,
            api_client=_client,
            project_id=config.WATSONX_PROJECT_ID,
            params={
                GenParams.MAX_NEW_TOKENS: config.LLM_MAX_NEW_TOKENS,
                GenParams.TEMPERATURE: config.LLM_TEMPERATURE,
                GenParams.TOP_P: config.LLM_TOP_P,
            },
        )
        return _model
    except Exception as exc:
        print(f"[watsonx_client] WARNING: Failed to initialise model — {exc}")
        return None


def generate(prompt: str) -> str:
    """
    Call IBM Granite to generate a response for the given prompt.

    Falls back to a canned message when watsonx.ai is not configured or
    the SDK is not installed.
    """
    model = _get_model()

    if model is None:
        return _fallback_response(prompt)

    try:
        response = model.generate_text(prompt=prompt)
        return response.strip()
    except Exception as exc:
        print(f"[watsonx_client] Inference error: {exc}")
        return _fallback_response(prompt)


def _fallback_response(prompt: str) -> str:
    """
    Template-based fallback when IBM watsonx.ai is not available.

    Produces useful, structured responses using the rule-based agent outputs
    so the UI remains fully functional without credentials.
    """
    prompt_lower = prompt.lower()

    if "corrective" in prompt_lower or "recommendation" in prompt_lower:
        return (
            "[watsonx.ai not connected — rule-based response]\n\n"
            "Based on the detected parameter deviations, the following corrective "
            "actions are recommended:\n"
            "1. Adjust the affected process parameter toward the safe operating range.\n"
            "2. Inspect the relevant machine subsystem (cooling, hydraulics, spindle).\n"
            "3. Document the action in the maintenance log.\n"
            "4. Monitor the parameter for at least 10 production cycles after adjustment.\n\n"
            "Connect IBM watsonx.ai credentials for detailed Granite-powered recommendations."
        )

    if "defect" in prompt_lower or "predict" in prompt_lower:
        return (
            "[watsonx.ai not connected — rule-based response]\n\n"
            "The defect prediction is based on a Random Forest model trained on the "
            "uploaded manufacturing data. Key contributing parameters are shown in the "
            "Defect Prediction page. "
            "Connect IBM watsonx.ai for LLM-enhanced explanations."
        )

    if "summar" in prompt_lower or "report" in prompt_lower:
        return (
            "[watsonx.ai not connected — rule-based response]\n\n"
            "A quality summary has been generated based on the current dataset. "
            "Please navigate to the Reports page for a full summary including "
            "production statistics, detected anomalies, and recommendations. "
            "Connect IBM watsonx.ai credentials for an AI-narrated summary."
        )

    # Generic fallback
    return (
        "[watsonx.ai not connected — rule-based response]\n\n"
        "I can answer questions about manufacturing quality based on the uploaded data. "
        "Please ensure IBM watsonx.ai credentials are configured in the .env file "
        "(WATSONX_API_KEY and WATSONX_PROJECT_ID) to enable full IBM Granite responses.\n\n"
        "In the meantime, please use the dashboard and analysis pages to explore the "
        "quality data directly."
    )


def build_qa_prompt(
    question: str,
    context: str,
    data_summary: str,
    history: List[Dict[str, str]],
) -> str:
    """
    Build the prompt for the AI Quality Assistant.

    Injects RAG context and a summary of current manufacturing data.
    """
    history_text = ""
    for msg in history[-4:]:  # limit to last 4 exchanges
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    prompt = (
        "You are an expert AI Quality Control Assistant for a manufacturing plant. "
        "Answer questions about manufacturing quality based on the provided data and knowledge. "
        "Be concise, accurate, and actionable. Do not invent facts or standards.\n\n"
        f"{context}"
        f"Current manufacturing data summary:\n{data_summary}\n\n"
        f"Conversation history:\n{history_text}\n"
        f"User: {question}\n"
        "Assistant:"
    )
    return prompt
