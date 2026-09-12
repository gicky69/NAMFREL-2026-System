import logging
import re
from typing import Optional, Tuple

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

# Global cache for model and tokenizer
_tokenizer = None
_model = None
_device = "cpu"
_model_loaded = False


def get_device() -> str:
    config_device = getattr(settings, "sentiment_device", "auto")
    if config_device == "auto":
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            return "cpu"
    return config_device


def load_model():
    """
    Load the TagaSenti sentiment model and tokenizer.
    Cached in memory so it is only initialized once.
    """
    global _tokenizer, _model, _device, _model_loaded
    if _model_loaded and _model is not None:
        return _model

    model_name = getattr(settings, "sentiment_model_name", "jjjardev/tagasenti_model")
    _device = get_device()
    cache_dir = getattr(settings, "sentiment_cache_dir", None)

    if not cache_dir:
        import os
        import shutil
        try:
            if os.path.exists("D:\\"):
                c_free = shutil.disk_usage("C:\\").free if os.path.exists("C:\\") else 0
                if c_free < 2 * 1024 * 1024 * 1024:  # less than 2GB on C:
                    cache_dir = "D:\\huggingface_cache"
                    os.makedirs(cache_dir, exist_ok=True)
        except Exception:
            pass

    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        import torch

        logger.info("Loading TagaSenti model '%s' on device '%s' (cache_dir=%s)...", model_name, _device, cache_dir)
        tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
        model = AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir=cache_dir)
        model.to(_device)
        model.eval()

        _tokenizer = tokenizer
        _model = model
        _model_loaded = True
        logger.info("TagaSenti model '%s' loaded successfully.", model_name)
        return _model
    except Exception as exc:
        logger.warning(
            "Could not load TagaSenti model '%s': %s. Using rule-based fallback.",
            model_name,
            exc,
        )
        _model = None
        _model_loaded = False
        return None


def is_model_loaded() -> bool:
    return _model_loaded and _model is not None


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


def analyze_sentiment(text: str) -> Tuple[float, str]:
    """
    Analyze sentiment of the given text using the TagaSenti model (or fallback).
    Returns (score, label):
      score: float between -1.0 and 1.0
      label: 'positive' | 'negative' | 'neutral'
    """
    if not text or not text.strip():
        return 0.0, "neutral"

    # Attempt to load model if not yet attempted
    if not _model_loaded and _model is None:
        load_model()

    if _model is not None and _tokenizer is not None:
        try:
            import torch

            inputs = _tokenizer(
                text,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt",
            ).to(_device)

            with torch.no_grad():
                logits = _model(**inputs).logits
                probs = torch.softmax(logits, dim=-1)[0]

            # Model id2label: {0: 'Negative', 1: 'Neutral', 2: 'Positive'}
            neg_prob = float(probs[0].item())
            neu_prob = float(probs[1].item())
            pos_prob = float(probs[2].item())

            pred_idx = int(torch.argmax(probs).item())
            label_map = {0: "negative", 1: "neutral", 2: "positive"}
            label = label_map.get(pred_idx, "neutral")

            # Score in [-1.0, 1.0] representing directional polarity
            score = round(pos_prob - neg_prob, 2)

            return score, label
        except Exception as exc:
            logger.warning("Inference with TagaSenti failed: %s. Using fallback.", exc)

    return _analyze_sentiment_fallback(text)