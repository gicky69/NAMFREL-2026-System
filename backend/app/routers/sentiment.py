from fastapi import APIRouter

from app.config import settings
from app.schemas import SentimentAnalyzeRequest, SentimentPreview
from app.services.sentiment import analyze_sentiment, is_model_loaded, get_device

router = APIRouter(prefix="/api/sentiment", tags=["sentiment"])


@router.post("/analyze", response_model=SentimentPreview)
def analyze_text_sentiment(payload: SentimentAnalyzeRequest):
    """
    Analyze sentiment of the given text using the TagaSenti model.
    """
    score, label = analyze_sentiment(payload.text)
    return SentimentPreview(score=score, label=label)


@router.get("/status")
def sentiment_status():
    """
    Check the status of the TagaSenti sentiment model.
    """
    return {
        "model_name": settings.sentiment_model_name,
        "is_model_loaded": is_model_loaded(),
        "device": get_device(),
    }
