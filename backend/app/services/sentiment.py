import logging
import re
from typing import Optional, Tuple
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

POSITIVE_WORDS = [
    "peaceful", "peace", "success", "successful", "progress",
    "support", "hope", "unity", "agreement", "agreed", "cooperation",
    "transparent", "fair", "orderly", "celebrated", "landslide", "victory",
    "win", "triumph", "confidence", "optimism", "endorsed", "respected",
    "reform", "improved", "benefit", "democratic", "legitimate", "turnout",
]

NEGATIVE_WORDS = [
    "violence", "kill", "killed", "attack", "attacked", "bomb", "bombing",
    "fraud", "cheating", "intimidation", "threat", "threatened", "gunman",
    "shooting", "shot", "explosion", "explosive", "grenade", "ambush",
    "clash", "clashes", "evacuate", "evacuated", "displace", "displaced",
    "corrupt", "corruption", "vote buying", "vote-buying", "rigging",
    "protest", "rally", "unrest", "tension", "tensions", "conflict",
    "fear", "fearful", "dangerous", "boycott", "dispute",
    "massacre", "behead", "hostage", "kidnap", "abduction", "terror",
    "fire", "burned", "arson", "looted", "looting",
]

MULTI_WORD_NEGATIVE = ["vote buying", "vote-buying"]


def get_device() -> str:
    if settings.sentiment_api_url:
        return "external_api"
    return "lexicon_fallback"


def load_model():
    """
    Log and verify sentiment analysis configuration on startup.
    The heavy LLM runs as a separate API service.
    """
    if settings.sentiment_api_url:
        logger.info(
            "Sentiment analysis configured using external API endpoint: %s",
            settings.sentiment_api_url,
        )
    else:
        logger.info(
            "No external SENTIMENT_API_URL configured. Using fast rule-based lexicon fallback."
        )


def is_model_loaded() -> bool:
    return bool(settings.sentiment_api_url)


def _analyze_sentiment_fallback(text: str) -> Tuple[float, str]:
    """
    Rule-based lexicon fallback scorer for sentiment analysis.
    """
    lower = text.lower()
    words = re.split(r"[\s,.;:!?'\"\-—–()]+", lower)
    words = [w for w in words if w]

    positive = 0
    negative = 0

    for word in words:
        if any(word == p or (len(p) >= 4 and p in word) for p in POSITIVE_WORDS):
            positive += 1
        if any(word == n or (len(n) >= 4 and n in word) for n in NEGATIVE_WORDS):
            negative += 1

    for phrase in MULTI_WORD_NEGATIVE:
        if phrase in lower:
            negative += 1

    total = positive + negative
    if total == 0:
        return 0.0, "neutral"

    score = round((positive - negative) / total, 2)

    if score > 0.15:
        label = "positive"
    elif score < -0.15:
        label = "negative"
    else:
        label = "neutral"

    return score, label


def _call_external_sentiment_api(text: str) -> Tuple[float, str]:
    """
    Call the external sentiment API endpoint.
    Supports standard response schemas:
      - {"score": 0.8, "label": "positive"}
      - {"sentiment": "positive", "score": 0.8}
      - [[{"label": "...", "score": ...}]]
    """
    headers = {"Content-Type": "application/json"}
    if settings.sentiment_api_key:
        headers["Authorization"] = f"Bearer {settings.sentiment_api_key}"

    with httpx.Client(timeout=settings.sentiment_timeout) as client:
        resp = client.post(
            settings.sentiment_api_url,
            json={"text": text},
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    # Case 1: {"score": 0.8, "label": "positive"}
    if isinstance(data, dict):
        label = data.get("label") or data.get("sentiment", "neutral")
        score = data.get("score")
        if score is None:
            score = 1.0 if str(label).lower() == "positive" else (-1.0 if str(label).lower() == "negative" else 0.0)
        return round(float(score), 2), str(label).lower()

    # Case 2: Hugging Face inference format [[{"label": "...", "score": ...}, ...]]
    if isinstance(data, list) and data:
        items = data[0] if isinstance(data[0], list) else data
        if items and isinstance(items[0], dict) and "label" in items[0]:
            top_item = max(items, key=lambda x: x.get("score", 0.0))
            label = str(top_item.get("label", "neutral")).lower()
            score = float(top_item.get("score", 0.0))
            if label == "negative":
                score = -abs(score)
            return round(score, 2), label

    raise ValueError(f"Unexpected response format from external sentiment API: {data}")


def analyze_sentiment(text: str) -> Tuple[float, str]:
    """
    Analyze sentiment of the given text.
    If external API endpoint is configured, delegates to it.
    Otherwise (or on failure), falls back to lexicon-based scorer.
    """
    if not text or not text.strip():
        return 0.0, "neutral"

    if settings.sentiment_api_url:
        try:
            return _call_external_sentiment_api(text)
        except Exception as exc:
            if settings.sentiment_fallback_enabled:
                logger.warning(
                    "External sentiment API at '%s' failed (%s). Falling back to lexicon.",
                    settings.sentiment_api_url,
                    exc,
                )
                return _analyze_sentiment_fallback(text)
            raise exc

    return _analyze_sentiment_fallback(text)