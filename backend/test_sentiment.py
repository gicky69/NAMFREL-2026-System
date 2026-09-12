import logging
import sys

sys.stdout.reconfigure(line_buffering=True)
logging.basicConfig(level=logging.INFO)

import pytest
from app.services.sentiment import analyze_sentiment, _analyze_sentiment_fallback, load_model, is_model_loaded
from app.schemas import SentimentAnalyzeRequest
from app.routers.sentiment import analyze_text_sentiment, sentiment_status


def test_empty_and_whitespace():
    score, label = analyze_sentiment("")
    assert score == 0.0
    assert label == "neutral"

    score, label = analyze_sentiment("   \n\t  ")
    assert score == 0.0
    assert label == "neutral"


def test_fallback_sentiment_scoring():
    # Positive sample
    pos_score, pos_label = _analyze_sentiment_fallback("Peaceful and successful election turnout with great progress and unity.")
    assert pos_label == "positive"
    assert pos_score > 0

    # Negative sample
    neg_score, neg_label = _analyze_sentiment_fallback("Gunman attack and violence with bombing and terror threats reported.")
    assert neg_label == "negative"
    assert neg_score < 0

    # Neutral sample
    neu_score, neu_label = _analyze_sentiment_fallback("The committee conducted the regular session at 10 AM.")
    assert neu_label == "neutral"
    assert neu_score == 0.0


def test_analyze_sentiment_general():
    # Tagalog/Taglish samples
    samples = [
        ("Naging mapayapa at matagumpay ang halalan sa aming presinto!", "positive"),
        ("May kaguluhan at pamamaril sa labas ng presinto, maraming natakot.", "negative"),
        ("Nagsimula ang bilangan ng mga balota kaninang alas-siyete ng gabi.", "neutral"),
    ]

    for text, expected_directional_sentiment in samples:
        score, label = analyze_sentiment(text)
        assert label in ["positive", "negative", "neutral"], f"Invalid label: {label}"
        assert -1.0 <= score <= 1.0, f"Score out of range: {score}"
        print(f"Sample: '{text}' -> Label: {label}, Score: {score}")


def test_sentiment_router_endpoint():
    request = SentimentAnalyzeRequest(text="Sobrang ganda at payapa ng eleksyon.")
    preview = analyze_text_sentiment(request)
    assert preview.label in ["positive", "negative", "neutral"]
    assert -1.0 <= preview.score <= 1.0

    status = sentiment_status()
    assert "model_name" in status
    assert "is_model_loaded" in status
    assert "device" in status


if __name__ == "__main__":
    print("Running TagaSenti test cases...")
    test_empty_and_whitespace()
    print("  [PASSED] Empty & whitespace tests")
    test_fallback_sentiment_scoring()
    print("  [PASSED] Fallback sentiment scoring tests")
    test_analyze_sentiment_general()
    print("  [PASSED] Sentiment analysis general tests")
    test_sentiment_router_endpoint()
    print("  [PASSED] Sentiment router endpoint tests")
    print("\nAll tests completed successfully!")
