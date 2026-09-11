import re

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

def load_model():
    # Placeholder — swap this out for a real classifier later
    # (e.g. a HuggingFace sentiment pipeline or a small fine-tuned model)
    return None
    
def analyze_sentiment(text: str) -> tuple[float, str]:
    lower = text.lower()
    words = re.split(r"[\s,.;:!?'\"\-—–()]+", lower)
    words = [w for w in words if w]

    positive = 0
    negative = 0

    for word in words:
        if any(p in word or word in p for p in POSITIVE_WORDS):
            positive += 1
        if any(n in word or word in n for n in NEGATIVE_WORDS):
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