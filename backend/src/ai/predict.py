import pickle
import sys
import re
import string
import json

# Load the saved components
try:
    with open('vectorizer.pkl', 'rb') as f:
        vectorizer = pickle.load(f)
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError:
    # Fallback: try src/ai/ for safety if called from project root
    try:
        with open('src/ai/vectorizer.pkl', 'rb') as f:
            vectorizer = pickle.load(f)
        with open('src/ai/model.pkl', 'rb') as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print(json.dumps({"error": ".pkl files not found. Run train_model.py first."}))
        sys.exit(1)


def clean_input(text: str) -> str:
    text = text.lower()
    text = re.sub(r'<.*?>', '', text)
    text = text.translate(str.maketrans('', '', string.punctuation))
    return text


def predict_to_json(text: str) -> str:
    cleaned = clean_input(text)
    vectorized = vectorizer.transform([cleaned])

    # Probability of being trustworthy (0.0–1.0)
    probability = model.predict_proba(vectorized)[0][1]

    is_trustworthy = probability >= 0.5

    result = {
        # Scale probability to 0–5.00 for decimal(4,2)
        "trust_score": round(probability * 5, 2),
        "is_suspicious": 0 if is_trustworthy else 1,
        "ai_quality_label": (
            "Verified" if probability > 0.75
            else "Suspicious" if probability < 0.3
            else "generic"
        ),
        # Stub sentiment fields to match reviews table columns
        "sentiment_food": round(probability, 2),
        "sentiment_service": 0.0,
        "sentiment_ambience": 0.0,
        "sentiment_hygiene": 0.0,
        "sentiment_value": 0.0,
    }

    return json.dumps(result)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_review = sys.argv[1]
        print(predict_to_json(user_review))
    else:
        print(json.dumps({"error": "No input text provided"}))
