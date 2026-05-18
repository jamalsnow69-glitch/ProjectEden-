from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn


BASE_DIR = Path(__file__).resolve().parent.parent
CHECKPOINT_PATH = BASE_DIR / "checkpoints" / "eden_char_v0.pt"

_model: Optional[nn.Module] = None
_chars = None
_stoi = None
_itos = None
_device = torch.device("cpu")


class EdenCharModel(nn.Module):
    def __init__(self, vocab_size: int, embed_size: int = 64, hidden_size: int = 128):
        super().__init__()

        self.embedding = nn.Embedding(vocab_size, embed_size)
        self.rnn = nn.GRU(
            input_size=embed_size,
            hidden_size=hidden_size,
            batch_first=True,
        )
        self.output = nn.Linear(hidden_size, vocab_size)

    def forward(self, x):
        x = self.embedding(x)
        out, _ = self.rnn(x)
        logits = self.output(out)
        return logits


def load_model(path: str | Path = CHECKPOINT_PATH) -> bool:
    global _model, _chars, _stoi, _itos

    path = Path(path)

    if not path.exists():
        print(f"[Eden Model] Checkpoint not found: {path}")
        return False

    try:
        checkpoint = torch.load(
            path,
            map_location=_device,
            weights_only=False,
        )
    except TypeError:
        checkpoint = torch.load(
            path,
            map_location=_device,
        )

    vocab_size = checkpoint["vocab_size"]
    embed_size = checkpoint.get("embed_size", 64)
    hidden_size = checkpoint.get("hidden_size", 128)

    eden_model = EdenCharModel(
        vocab_size=vocab_size,
        embed_size=embed_size,
        hidden_size=hidden_size,
    )

    eden_model.load_state_dict(checkpoint["model_state"])
    eden_model.to(_device)
    eden_model.eval()

    _model = eden_model
    _chars = checkpoint["chars"]
    _stoi = checkpoint["stoi"]
    _itos = checkpoint["itos"]

    print(f"[Eden Model] Loaded checkpoint: {path}")
    return True


def model_loaded() -> bool:
    return _model is not None


def generate_text(
    prompt: str,
    max_tokens: int = 200,
    temperature: float = 0.8,
) -> str:
    global _model, _stoi, _itos

    if _model is None:
        loaded = load_model()

        if not loaded:
            return "Model checkpoint not found. Train Eden first."

    if not prompt:
        prompt = "User:"

    temperature = max(temperature, 0.1)

    safe_prompt = "".join(char for char in prompt if char in _stoi)

    if not safe_prompt:
        fallback_chars = list(_stoi.keys())
        safe_prompt = fallback_chars[0] if fallback_chars else " "

    x = torch.tensor(
        [[_stoi[char] for char in safe_prompt]],
        dtype=torch.long,
        device=_device,
    )

    generated_chars = []

    with torch.no_grad():
        for _ in range(max_tokens):
            logits = _model(x)

            next_logits = logits[:, -1, :] / temperature
            probs = torch.softmax(next_logits, dim=-1)

            next_id = torch.multinomial(probs, num_samples=1)
            next_char = _itos[int(next_id.item())]

            generated_chars.append(next_char)

            x = torch.cat([x, next_id], dim=1)

            if x.shape[1] > 128:
                x = x[:, -128:]

            current_text = "".join(generated_chars)

            if "\nUser:" in current_text or "\nuser:" in current_text:
                break

    return "".join(generated_chars).strip()
