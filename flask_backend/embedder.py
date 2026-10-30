"""
Sentence embeddings for DSA problems and search queries.

Owner: Bhooshan Deshpande (Member B)

Model: all-MiniLM-L6-v2 (384 dimensions), unit-normalised, so pgvector's
cosine distance (<=>) ranks results. The model is loaded lazily, once per
process, the first time something needs it (or at startup when
EMBEDDING_PRELOAD=true).

The text to embed always comes from the database (fn_embedding_text or
v_embedding_status.text_to_embed), never from string joining in Python, so
the md5 stored in dsa_embeddings.source_hash always matches.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Sequence

from config import settings

log = logging.getLogger(__name__)

DIMENSIONS = 384
MODEL_LABEL = "all-MiniLM-L6-v2"  # stored in dsa_embeddings.model; same as generate_embeddings_sql.py

_model: Any = None
_load_error: str | None = None
_lock = threading.Lock()


class EmbeddingUnavailable(Exception):
    """The embedding model could not be loaded (not installed, no download, ...)."""


def get_model() -> Any:
    """Return the shared SentenceTransformer, loading it on first call."""
    global _model, _load_error
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        try:
            from sentence_transformers import SentenceTransformer  # heavy import

            log.info("Loading embedding model %s", settings.embedding_model)
            _model = SentenceTransformer(settings.embedding_model)
            _load_error = None
        except Exception as exc:  # ImportError, network/download, corrupt cache, ...
            _load_error = f"{type(exc).__name__}: {exc}"
            log.warning("Embedding model unavailable: %s", _load_error)
            raise EmbeddingUnavailable("The embedding model could not be loaded.") from exc
    return _model


def is_loaded() -> bool:
    return _model is not None


def last_error() -> str | None:
    return _load_error


def embed_many(texts: Sequence[str]) -> list[list[float]]:
    """Embed several texts in one batch. Raises EmbeddingUnavailable."""
    if not texts:
        return []
    vectors = get_model().encode(
        list(texts), normalize_embeddings=True, batch_size=32, show_progress_bar=False
    )
    result = [[float(x) for x in v] for v in vectors]
    for v in result:
        assert len(v) == DIMENSIONS, f"model returned {len(v)} dimensions, expected {DIMENSIONS}"
    return result


def embed(text: str) -> list[float]:
    """Embed one text into a unit-length 384-dim vector. Raises EmbeddingUnavailable."""
    return embed_many([text])[0]


def to_pgvector(vec: Sequence[float]) -> str:
    """Format as pgvector text input '[0.123456,...]'; pass to SQL as %s::vector."""
    return "[" + ",".join(f"{float(v):.6f}" for v in vec) + "]"
