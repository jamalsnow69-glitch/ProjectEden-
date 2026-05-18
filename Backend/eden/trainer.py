import json
import time
from pathlib import Path

import torch
import torch.nn as nn


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CHECKPOINT_DIR = BASE_DIR / "checkpoints"

DATA_PATH = DATA_DIR / "approved_training.jsonl"
REJECTED_PATH = DATA_DIR / "rejected_training.jsonl"
AUTO_TRAIN_STATE_PATH = DATA_DIR / "auto_train_state.json"
CHECKPOINT_PATH = CHECKPOINT_DIR / "eden_char_v0.pt"

BLOCK_SIZE = 64
BATCH_SIZE = 32
EMBED_SIZE = 64
HIDDEN_SIZE = 128
EPOCHS = 300
LEARNING_RATE = 0.003

AUTO_TRAIN_EVERY_NEW_EXAMPLES = 10
AUTO_TRAIN_COOLDOWN_SECONDS = 300


class EdenCharModel(nn.Module):
    def __init__(self, vocab_size: int):
        super().__init__()

        self.embedding = nn.Embedding(vocab_size, EMBED_SIZE)

        self.rnn = nn.GRU(
            input_size=EMBED_SIZE,
            hidden_size=HIDDEN_SIZE,
            batch_first=True,
        )

        self.output = nn.Linear(HIDDEN_SIZE, vocab_size)

    def forward(self, x):
        x = self.embedding(x)
        out, _ = self.rnn(x)
        logits = self.output(out)
        return logits


def load_approved_training_data() -> str:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training file not found: {DATA_PATH}")

    training_pairs = []

    with DATA_PATH.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()

            if not line:
                continue

            try:
                item = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSON on line {line_number}") from error

            if item.get("approved") is not True:
                continue

            user_input = item.get("input", "").strip()
            eden_output = item.get("output", "").strip()

            if not user_input or not eden_output:
                continue

            training_pairs.append(
                f"User: {user_input}\nEden: {eden_output}\n\n"
            )

    text = "".join(training_pairs)

    if len(text) < 200:
        raise ValueError(
            "Not enough approved training data. Add more examples to approved_training.jsonl."
        )

    return text


def build_vocab(text: str):
    chars = sorted(set(text))
    stoi = {char: index for index, char in enumerate(chars)}
    itos = {index: char for char, index in stoi.items()}
    return chars, stoi, itos


def encode(text: str, stoi: dict):
    return torch.tensor([stoi[char] for char in text], dtype=torch.long)


def get_batch(data: torch.Tensor):
    max_start = len(data) - BLOCK_SIZE - 1

    if max_start <= 0:
        raise ValueError("Training data is too small for the configured block size.")

    starts = torch.randint(0, max_start, (BATCH_SIZE,))

    x = torch.stack([
        data[start:start + BLOCK_SIZE]
        for start in starts
    ])

    y = torch.stack([
        data[start + 1:start + BLOCK_SIZE + 1]
        for start in starts
    ])

    return x, y


def train_model():
    text = load_approved_training_data()
    chars, stoi, itos = build_vocab(text)
    data = encode(text, stoi)

    model = EdenCharModel(vocab_size=len(chars))
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    loss_fn = nn.CrossEntropyLoss()

    model.train()

    for epoch in range(1, EPOCHS + 1):
        x, y = get_batch(data)

        logits = model(x)

        loss = loss_fn(
            logits.reshape(-1, len(chars)),
            y.reshape(-1),
        )

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        if epoch % 25 == 0:
            print(f"Epoch {epoch}/{EPOCHS} | Loss: {loss.item():.4f}")

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    torch.save(
        {
            "model_state": model.state_dict(),
            "chars": chars,
            "stoi": stoi,
            "itos": itos,
            "vocab_size": len(chars),
            "block_size": BLOCK_SIZE,
            "embed_size": EMBED_SIZE,
            "hidden_size": HIDDEN_SIZE,
            "epochs": EPOCHS,
        },
        CHECKPOINT_PATH,
    )

    return f"Training complete. Saved checkpoint to {CHECKPOINT_PATH}"


def approve_training_example(example: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    example["approved"] = True

    with DATA_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(example, ensure_ascii=False) + "\n")

    return "Training example approved."


def reject_training_example(example: dict, reason: str = "unspecified"):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    example["approved"] = False
    example["reason"] = reason

    with REJECTED_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(example, ensure_ascii=False) + "\n")

    return "Training example rejected."


def count_approved_examples() -> int:
    if not DATA_PATH.exists():
        return 0

    count = 0

    with DATA_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if not line:
                continue

            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue

            if item.get("approved") is True:
                count += 1

    return count


def load_auto_train_state() -> dict:
    if not AUTO_TRAIN_STATE_PATH.exists():
        return {
            "last_trained_count": 0,
            "last_trained_at": 0,
        }

    try:
        return json.loads(AUTO_TRAIN_STATE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {
            "last_trained_count": 0,
            "last_trained_at": 0,
        }


def save_auto_train_state(state: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    AUTO_TRAIN_STATE_PATH.write_text(
        json.dumps(state, indent=2),
        encoding="utf-8",
    )


def should_auto_train() -> bool:
    state = load_auto_train_state()
    approved_count = count_approved_examples()

    last_trained_count = state.get("last_trained_count", 0)
    last_trained_at = state.get("last_trained_at", 0)

    new_examples = approved_count - last_trained_count
    seconds_since_train = time.time() - last_trained_at

    if approved_count < AUTO_TRAIN_EVERY_NEW_EXAMPLES:
        return False

    if new_examples < AUTO_TRAIN_EVERY_NEW_EXAMPLES:
        return False

    if seconds_since_train < AUTO_TRAIN_COOLDOWN_SECONDS:
        return False

    return True


def auto_train_if_ready() -> str:
    if not should_auto_train():
        return "Auto-train skipped. Not enough new approved examples yet."

    result = train_model()

    state = {
        "last_trained_count": count_approved_examples(),
        "last_trained_at": time.time(),
    }

    save_auto_train_state(state)

    try:
        from eden.model import reload_model
        reload_model()
    except Exception as error:
        return f"Auto-training complete, but model reload failed: {error}"

    return f"Auto-training complete. {result}"


if __name__ == "__main__":
    print(train_model())
