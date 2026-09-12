from fastapi import APIRouter

from app.config import settings
from app.schemas import SentimentAnalyzeRequest, SentimentPreview
from app.services.sentiment import analyze_sentiment, is_model_loaded, get_device

router = APIRouter(prefix="/api/sentiment", tags=["sentiment"])


@router.post("/analyze", response_model=SentimentPreview)
def analyze_text_sentiment(payload: SentimentAnalyzeRequest):
    """
    Analyze sentiment of the given text via external API or lexicon fallback.
    """
    score, label = analyze_sentiment(payload.text)
    return SentimentPreview(score=score, label=label)


@router.get("/status")
def sentiment_status():
    """
    Check the status of the sentiment analysis service.
    """
    return {
        "external_api_url": settings.sentiment_api_url,
        "is_external_api_configured": is_model_loaded(),
        "mode": get_device(),
        "fallback_enabled": settings.sentiment_fallback_enabled,
    }
