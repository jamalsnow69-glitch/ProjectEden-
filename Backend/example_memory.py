import json
from pathlib import Path
from typing import List, Dict


BASE_DIR = Path(__file__).resolve().parent.parent
TRAINING_PATH = BASE_DIR / "data" / "approved_training.jsonl"


def load_training_examples(limit: int = 5000) -> List[Dict]:
    examples = []

    if not TRAINING_PATH.exists():
        return examples

    with TRAINING_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if not line:
                continue

            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue

            if item.get("approved") is not True:
                continue

            user_input = item.get("input", "")
            output = item.get("output", "")

            if not user_input or not output:
                continue

            examples.append(item)

            if len(examples) >= limit:
                break

    return examples


def score_example(query: str, example: Dict) -> int:
    query_words = set(query.lower().split())

    input_text = example.get("input", "").lower()
    output_text = example.get("output", "").lower()

    score = 0

    for word in query_words:
        if word in input_text:
            score += 3
        if word in output_text:
            score += 1

    return score


def find_relevant_examples(query: str, limit: int = 6) -> List[Dict]:
    examples = load_training_examples()

    scored = []

    for example in examples:
        score = score_example(query, example)

        if score > 0:
            scored.append((score, example))

    scored.sort(key=lambda item: item[0], reverse=True)

    return [example for _, example in scored[:limit]]


def format_examples_for_prompt(examples: List[Dict]) -> str:
    if not examples:
        return ""

    text = "Relevant Eden behavior examples:\n"

    for example in examples:
        text += f"User: {example.get('input', '')}\n"
        text += f"Eden: {example.get('output', '')}\n\n"

    return text.strip()