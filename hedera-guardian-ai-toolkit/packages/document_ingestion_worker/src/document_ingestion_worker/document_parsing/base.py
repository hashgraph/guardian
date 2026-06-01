"""Base classes for document ingestion components.

This module provides shared base classes and mixins used across
the document_ingestion_worker.document_parsing package.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Self

logger = logging.getLogger(__name__)


class CleanupMixin:
    """Mixin providing idempotent cleanup and context manager support.

    Provides a standardized cleanup pattern for classes that hold resources
    (ML models, tokenizers, converters) that need explicit release.

    Usage:
        class MyParser(CleanupMixin):
            def __init__(self):
                self._is_cleaned = False  # Required
                self.model = load_model()

            def _do_cleanup(self) -> None:
                if self.model is not None:
                    del self.model
                    self.model = None

            def process(self, data):
                self._check_not_cleaned("process")
                return self.model.process(data)

    Note:
        Subclasses MUST initialize `_is_cleaned = False` in their __init__.
        The base class cannot do this because Python's MRO and __init__
        handling with mixins requires explicit initialization.
    """

    _is_cleaned: bool

    def cleanup(self) -> None:
        """Release resources. Idempotent - safe to call multiple times.

        After cleanup, the instance cannot be reused. Subsequent operations
        will raise RuntimeError if they call _check_not_cleaned().

        Subclasses should override _do_cleanup() to implement actual cleanup logic.
        Do NOT override this method unless you need custom cleanup orchestration.
        """
        if self._is_cleaned:
            return
        self._do_cleanup()
        self._is_cleaned = True

    def _do_cleanup(self) -> None:
        """Override to implement actual cleanup logic.

        This method is called once by cleanup() when resources need to be released.
        gc.collect() should NOT be called here - it's handled at the orchestrator
        level to avoid redundant collection calls.
        """
        pass

    def _check_not_cleaned(self, operation: str) -> None:
        """Raise RuntimeError if already cleaned.

        Args:
            operation: Name of the operation being attempted (for error message)

        Raises:
            RuntimeError: If the instance has been cleaned up
        """
        if self._is_cleaned:
            raise RuntimeError(
                f"{self.__class__.__name__} has been cleaned up and cannot {operation}"
            )

    def __enter__(self) -> Self:
        """Enter context manager."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        """Exit context manager, ensuring cleanup."""
        self.cleanup()
        return False  # Don't suppress exceptions
