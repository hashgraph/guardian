"""Root conftest.py - Shared fixtures for all integration tests.

This module provides session-scoped testcontainers fixtures for Qdrant,
ensuring the container is started once per test session and shared across
all integration tests.

Note: testcontainers is only imported when integration tests are run.
Unit tests don't require the qdrant_container/qdrant_url fixtures.
"""

import os

import pytest

# Set threading environment variables BEFORE importing any ML libraries.
# This prevents native library crashes (ACCESS_VIOLATION) on Windows
# when ONNX/PyTorch are used in parallel or across multiple tests.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")


@pytest.fixture(scope="session")
def qdrant_container():
    """Session-scoped Qdrant container - starts once per test session.

    The container is automatically started when first requested and stopped
    after all tests complete. Using session scope minimizes container startup
    overhead across multiple test modules.

    Yields:
        QdrantContainer: The running Qdrant container instance.
    """
    # Lazy import to avoid requiring testcontainers for unit tests
    from testcontainers.qdrant import QdrantContainer

    container = QdrantContainer(image="qdrant/qdrant:v1.16")
    container.start()
    yield container
    container.stop()


@pytest.fixture(scope="session")
def qdrant_url(qdrant_container) -> str:
    """Get the dynamic Qdrant HTTP URL from the testcontainer.

    The port is dynamically assigned by Docker, so this fixture provides
    the actual URL that tests should use to connect to Qdrant.

    Args:
        qdrant_container: The running Qdrant container fixture.

    Returns:
        str: The Qdrant HTTP URL (e.g., "http://localhost:49153").
    """
    host = qdrant_container.get_container_host_ip()
    port = qdrant_container.get_exposed_port(6333)
    return f"http://{host}:{port}"
