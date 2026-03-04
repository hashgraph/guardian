# Contributing Guide

> **Audience:** Developers and contributors

This guide covers development practices, code style, testing, and workflows for contributing to the Hedera Guardian AI Toolkit.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Poetry 2.0+ (dependency management)
- Docker and Docker Compose (for running Qdrant)
- Git

**Windows Users:** Ensure you have Python 3.11+ installed and added to PATH. You can verify with `python --version`.

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd hedera-guardian-ai-toolkit

# Install dependencies
poetry install

# Install pre-commit hooks
poetry run pre-commit install

# Start Qdrant for local development
docker compose up -d qdrant

# Copy environment file
# Unix/Linux/macOS:
cp .env.example .env

# Windows (CMD):
copy .env.example .env

# Windows (PowerShell):
Copy-Item .env.example .env

# Edit .env with your settings
```

**Note for Windows Users:**
- The virtual environment will be created at `.venv\Scripts\` (not `.venv/bin/`)
- VSCode Python path should be `.venv\Scripts\python.exe`
- Some commands in this guide show Unix syntax; Windows alternatives are provided where needed

### IDE Setup

#### VS Code

Recommended extensions:
- Python (Microsoft)
- Ruff (Astral Software)
- Pylance
- Docker

Workspace settings (`.vscode/settings.json`):

```json
{
  // Windows: use ".venv\\Scripts\\python.exe"
  // Unix/macOS: use ".venv/bin/python"
  "python.defaultInterpreterPath": ".venv\\Scripts\\python.exe",
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests"],
  "ruff.enable": true,
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.codeActionsOnSave": {
      "source.fixAll": true,
      "source.organizeImports": true
    }
  }
}
```

#### PyCharm

1. Configure Python interpreter to use Poetry environment
2. Enable Ruff for linting and formatting
3. Configure pytest as test runner
4. Enable async/await inspection

### Virtual Environment

Poetry creates and manages virtual environments automatically:

```bash
# Activate virtual environment
poetry shell

# Or run commands without activating
poetry run python -m schema_ingestion_worker
```

---

## Project Architecture

### Package Structure

The project follows a flat monorepo structure with independent packages:

```text
packages/
├── vector_store/                     # Shared async Qdrant connector and embeddings
├── schema_ingestion_worker/          # Schema parsing and ingestion pipeline
│   └── schema_parsing/               # JSON schema parsing logic
├── document_ingestion_worker/        # PDF/document processing pipeline
│   └── document_parsing/             # Docling PDF/DOCX processing
├── hedera_guardian_mcp_server/       # MCP server for semantic search
└── policy_schema_builder/            # Excel-based Guardian policy schema builder
```

**Package Dependencies:**
```text
vector_store (base)
    ├── schema_ingestion_worker (+ schema_parsing/)
    ├── document_ingestion_worker (+ document_parsing/)
    ├── hedera_guardian_mcp_server (+ policy_schema_builder)
    └── policy_schema_builder (standalone)
```

### Key Design Principles

1. **Async-First**: All I/O operations are async
2. **Shared Infrastructure**: Common code in vector_store package
3. **Type Safety**: Use Pydantic models and type hints
4. **Testability**: Dependency injection and mocking support
5. **Configuration**: Environment-based with Pydantic Settings
6. **Interface Segregation**: Use ABC for all external dependencies
7. **Immutability**: Use frozen Pydantic models where possible
8. **Error Handling**: Custom exception hierarchy with context

### Configuration

Each package uses Pydantic Settings with environment variable prefixes. See `.env.example` for all variables, and each package's CONFIG.md for details:

- [schema_ingestion_worker/CONFIG.md](../packages/schema_ingestion_worker/CONFIG.md)
- [document_ingestion_worker/CONFIG.md](../packages/document_ingestion_worker/CONFIG.md)
- [hedera_guardian_mcp_server/CONFIG.md](../packages/hedera_guardian_mcp_server/CONFIG.md)

---

## Development Workflow

### Working with Packages

#### Adding Dependencies

To a specific package:

```bash
cd packages/vector_store
poetry add qdrant-client

cd ../schema_ingestion_worker
poetry add pydantic
```

To root (development tools):

```bash
poetry add --group dev pytest-cov
```

#### Making Changes to vector_store

Since vector_store is used by other packages, follow this workflow:

```bash
# 1. Make changes to vector_store
cd packages/vector_store
# Edit code...

# 2. Test changes
pytest ../../tests/vector_store/ -v

# 3. Other packages automatically use updated code (develop = true)
cd ../schema_ingestion_worker
poetry run python -m schema_ingestion_worker
```

#### Creating a New Package

```bash
# 1. Create package directory structure
mkdir -p packages/new_package/src/new_package

# 2. Create pyproject.toml
cd packages/new_package
poetry init

# 3. Add vector_store dependency if needed
poetry add --path ../vector_store

# 4. Create test directory
mkdir -p ../../tests/new_package
```

> **Windows:** Replace `mkdir -p` with `mkdir` (CMD) or `New-Item -ItemType Directory -Force` (PowerShell).

**Additional steps:**
- Add the package name to `known-first-party` in root `pyproject.toml` `[tool.ruff.lint.isort]`
- Add CONFIG.md if the package has Pydantic Settings
- Add `.env.example` entries for new environment variables
- Add `docker-compose.yml` service if the package runs as a standalone worker
- Add test directory under `tests/<package_name>/`

### Common Development Tasks

#### Adding a New Embedding Provider

```python
# 1. Create provider in packages/vector_store/src/vector_store/embeddings/

class MyEmbedProvider(AsyncEmbeddingProvider):
    async def embed_query(self, query: str) -> list[float]:
        # Implementation
        pass

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        # Implementation
        pass

    def get_vector_size(self) -> int:
        return 1024

# 2. Register in factory.py
def create_embedding_provider(
    provider_type: EmbeddingProviderType,
    **kwargs
) -> AsyncEmbeddingProvider:
    if provider_type == EmbeddingProviderType.MY_PROVIDER:
        return MyEmbedProvider(**kwargs)
    # ...

# 3. Add tests in tests/vector_store/test_embeddings.py
async def test_my_embed_provider():
    provider = MyEmbedProvider()
    result = await provider.embed_query("test")
    assert len(result) == 1024
```

#### Adding a New Pipeline Node (Schema Ingestion Worker)

```python
# In packages/schema_ingestion_worker/src/schema_ingestion_worker/pipeline.py

async def my_custom_node(state: PipelineState) -> dict:
    """
    Custom processing node.

    Args:
        state: Current pipeline state

    Returns:
        Dictionary with state updates
    """
    logger.info("Running custom node...")

    # Your processing logic
    result = await process_data(state.parsed_documents)

    # Return state updates
    return {"custom_field": result}

# Add to graph
def create_ingestion_graph():
    graph = StateGraph(PipelineState)
    # ... existing nodes ...
    graph.add_node("custom", my_custom_node)
    graph.add_edge("parse_schemas", "custom")
    graph.add_edge("custom", "embed_batch")
    return graph.compile()
```

#### Adding a New MCP Tool

The server uses FastMCP with `@self.tool` decorators inside the `setup_mcp()` method of `HederaGuardianMCPServer`. Each tool is a standalone async function with typed parameters:

```python
# In packages/hedera_guardian_mcp_server/src/mcp_server/server.py
# Inside HederaGuardianMCPServer.setup_mcp():

@self.tool
async def my_new_tool(
    query: Annotated[str, Field(description="Search query text")],
    limit: Annotated[int, Field(description="Max results")] = 5,
) -> list[SearchResult]:
    """Description of what the tool does."""
    results = await methodology_connector.hybrid_search(
        query=query,
        limit=limit,
    )
    return results
```

FastMCP automatically generates the tool schema from the function signature and type annotations. No separate `list_tools()` registration is needed.

#### Debugging Qdrant Issues

For Qdrant debugging commands (checking status, listing collections, deleting data, dashboard access), see [DOCKER.md](DOCKER.md#common-workflows).

#### Working with LangGraph

```python
# Debug graph execution
import logging
logging.basicConfig(level=logging.DEBUG)

# Visualize graph (requires graphviz)
from langgraph.graph import StateGraph
graph = create_ingestion_graph()

# Stream graph execution for debugging
async for event in graph.astream(initial_state):
    print(f"Node: {event}")
    print(f"State: {event['state']}")
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create pull request on GitHub
```

### Commit Messages

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Example:
```text
feat: add FastEmbed support to vector_store

- Implement AsyncEmbeddingProvider interface
- Add FastEmbedProvider with caching
- Update tests for new provider
```

### Pull Request Checklist

Before submitting a PR:

- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Code formatted with Ruff
- [ ] No linting errors
- [ ] Type hints added
- [ ] Docstrings updated
- [ ] README updated if needed

---

## Code Style

### Quick Reference

```bash
# Check for issues
poetry run ruff check .

# Auto-fix issues
poetry run ruff check . --fix

# Format code
poetry run ruff format .

# Check formatting without changes
poetry run ruff format . --check
```

### Ruff Configuration

Configured in root `pyproject.toml`, applies to entire monorepo.

**Key Settings:**
- Python version: 3.11
- Line length: 100 characters
- Quote style: Double quotes
- Indent: 4 spaces

### Enabled Rules

| Code | Rule Set | Purpose |
|------|----------|---------|
| E, W | pycodestyle | Style errors and warnings |
| F | pyflakes | Logical errors |
| I | isort | Import sorting |
| N | pep8-naming | Naming conventions |
| UP | pyupgrade | Modern Python syntax |
| B | flake8-bugbear | Common bugs |
| C4 | flake8-comprehensions | Comprehension style |
| SIM | flake8-simplify | Code simplification |
| RET | flake8-return | Return statement style |
| ARG | flake8-unused-arguments | Unused arguments |
| PTH | flake8-use-pathlib | Pathlib usage |
| PL | pylint | Pylint rules |

### Disabled Rules

| Code | Description |
|------|-------------|
| E501 | Line too long (handled by formatter) |
| PLR0913 | Too many arguments |
| PLR2004 | Magic value used in comparison |
| PLR0912 | Too many branches |
| PLR0915 | Too many statements |
| PTH110, PTH112, PTH118, PTH123, PTH208 | Specific pathlib rules (gradual migration) |

### Per-File Ignores

```python
# tests/**/*.py - Allow unused fixture arguments and lazy imports
"ARG001", "ARG002", "PLC0415"

# **/__main__.py - Allow lazy imports for CLI entry points
"PLC0415"

# factory.py - Allow lazy loading of heavy ML dependencies
"PLC0415"
```

> This is a subset — see `pyproject.toml` `[tool.ruff.lint.per-file-ignores]` for the complete list (24 entries including pipeline files, subprocess workers, and visualization scripts).

### Import Sorting

Imports are automatically sorted into groups:
1. Standard library
2. Third-party
3. First-party (local packages)

First-party packages recognized:
- document_ingestion_worker
- hedera_guardian_mcp_server
- mcp_server
- policy_schema_builder
- schema_ingestion_worker
- vector_store

### Pre-commit Hooks

```bash
# Install hooks (one-time)
poetry run pre-commit install

# Run manually on all files
poetry run pre-commit run --all-files

# Skip hooks (not recommended)
git commit --no-verify
```

Pre-commit runs Ruff check and format on staged files before each commit.

### Common Patterns

#### Async Functions
```python
async def fetch_data(client: AsyncClient) -> list[dict]:
    """Always use async for I/O operations."""
    return await client.get_data()
```

#### Type Hints
```python
from collections.abc import Sequence

def process(items: Sequence[str], limit: int | None = None) -> list[str]:
    ...
```

#### Pydantic Models
```python
from pydantic import BaseModel, Field

class Config(BaseModel):
    name: str = Field(..., description="Required field")
    count: int = Field(default=10, ge=1)
```

### Fixing Common Issues

**Unsorted imports**: `ruff check . --fix` (auto-fixes)

**Line too long**: Formatter handles automatically

**Unused import**: Remove or prefix with `_` if intentional

**Magic value**: Extract to constant or add `# noqa: PLR2004` if intentional

### Best Practices

#### Async Programming

- Always use `async`/`await` for I/O operations
- Use `asyncio.to_thread()` for CPU-bound sync operations
- Avoid blocking calls in async functions
- Use async context managers (`async with`)
- Handle exceptions in async code properly

#### Error Handling

```python
import logging

logger = logging.getLogger(__name__)

async def robust_function():
    try:
        result = await risky_operation()
        return result
    except SpecificError as e:
        logger.error(f"Operation failed: {e}")
        # Handle or re-raise
        raise
    finally:
        # Cleanup if needed
        await cleanup()
```

#### Configuration

- Use Pydantic Settings for configuration
- Support environment variables
- Provide sensible defaults
- Document all configuration options

```python
from pydantic_settings import BaseSettings

class MySettings(BaseSettings):
    api_url: str = "http://localhost:8000"
    timeout: int = 30

    class Config:
        env_prefix = "MY_APP_"
```

#### Logging

```python
import logging

logger = logging.getLogger(__name__)

# Use appropriate log levels
logger.debug("Detailed debugging info")
logger.info("Important state changes")
logger.warning("Something unexpected but handled")
logger.error("Error that needs attention")
logger.exception("Error with full traceback")
```

---

## Testing

### Test Directory Structure

```text
tests/
├── vector_store/                   # Vector store tests
│   ├── conftest.py                 # Fixtures: mock_embedding_provider, mock_qdrant_client
│   └── test_*.py
├── schema_ingestion_worker/        # Schema ingestion tests
│   ├── unit/                       # Fast tests with mocked dependencies
│   └── integration/                # Real Qdrant tests
├── document_ingestion_worker/      # Document ingestion tests
│   ├── unit/                       # Fast tests with mocked Docling
│   └── integration/                # Real model tests
├── hedera_guardian_mcp_server/     # MCP server tests
│   ├── unit/                       # Mocked Qdrant, inline snapshots
│   └── integration/                # Real in-memory Qdrant
└── policy_schema_builder/          # Schema builder tests
```

### Running Tests

Tests can be run from the monorepo root (with `poetry install` at root level) or from individual component directories.

**From monorepo root:**
```bash
# All unit tests (fast, uses mocks)
pytest tests/ -m "not integration"

# Single component
pytest tests/vector_store/ -v
pytest tests/schema_ingestion_worker/ -v
pytest tests/hedera_guardian_mcp_server/ -v

# Single test file or test
pytest tests/vector_store/test_qdrant_connector.py -v
pytest tests/vector_store/test_qdrant_connector.py::TestQdrantConnectorInit::test_init_with_required_params -v

# With coverage
pytest tests/ --cov=src --cov-report=html
```

**From component directory** (uses component's own virtual environment):
```bash
cd packages/schema_ingestion_worker
poetry run pytest ../../tests/schema_ingestion_worker/ -v -m "not integration"
poetry run pytest ../../tests/schema_ingestion_worker/ -v --cov=src --cov-report=html
```

### Test Markers

```python
@pytest.mark.unit          # Fast, mocked dependencies
@pytest.mark.integration   # Real external services (Qdrant, models)
@pytest.mark.slow          # Long-running tests
@pytest.mark.manual        # Manual-only, require real services, not run in CI
```

> `@pytest.mark.asyncio` is **not** needed — `asyncio_mode = "auto"` in `pyproject.toml` auto-detects async tests.

**Selection:**
```bash
pytest -m "not integration"      # Unit tests only (fast)
pytest -m integration            # Integration tests only
pytest -m "not slow"             # Skip slow tests
```

### Dependency Management

Each component's `pyproject.toml` has dependency groups:

1. **`[tool.poetry.dependencies]`** - Runtime dependencies
2. **`[tool.poetry.group.dev.dependencies]`** - Development tools (linters, formatters)
3. **`[tool.poetry.group.test.dependencies]`** - Test-specific dependencies
4. **`[tool.poetry.group.integration-test.dependencies]`** (optional) - Integration test dependencies

> Not all packages use separate groups. `vector_store` and `policy_schema_builder` combine test deps in their `dev` group. Check each package's `pyproject.toml`.

#### Example: schema_ingestion_worker/pyproject.toml

```toml
[tool.poetry.dependencies]
python = "^3.11"
pydantic = "^2.0.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-mock = "^3.12.0"

[tool.poetry.group.test.dependencies]
pytest-cov = "^4.1.0"  # Code coverage

[tool.poetry.group.integration-test]
optional = true

[tool.poetry.group.integration-test.dependencies]
testcontainers = "^3.7.0"
```

#### Install Dependencies

```bash
# Install unit test dependencies
cd packages/schema_ingestion_worker
poetry install --with test

# Install integration test dependencies
poetry install --with test --with integration-test
```

### Key Fixtures by Component

Each package defines reusable fixtures in its `conftest.py` files — import paths follow the test directory structure.

#### vector_store
- `mock_embedding_provider` - AsyncMock with embed_query/embed_batch
- `mock_qdrant_client` - Mocked AsyncQdrantClient
- `sample_documents`, `sample_metadata`, `sample_search_results`

#### schema_ingestion_worker
- `sample_data_dir` - Temporary data directory for testing
- `sample_document` - Sample test document file

#### document_ingestion_worker
- `sample_data_dir` - Data directory structure (input/staged/output)
- `sample_pdf_file` - Sample PDF file created via reportlab
- `sample_output_dir` - Temporary output directory
- `mock_config` - Mocked DocumentIngestionSettings

#### hedera_guardian_mcp_server
- `mock_qdrant_connector` - QdrantConnector with mocked internals
- `mock_mcp_client` - Async MCP client fixture
- Integration: `fastembed_provider`, `async_qdrant_client_with_data`

### Async Testing

All async code uses pytest-asyncio with `asyncio_mode = "auto"`:

```python
# No decorator needed - auto-detected
async def test_search_results(mock_qdrant_connector):
    results = await mock_qdrant_connector.search("query")
    assert len(results) > 0
```

For async fixtures:
```python
@pytest_asyncio.fixture
async def async_client():
    client = AsyncQdrantClient(":memory:")
    yield client
    await client.close()
```

### Snapshot Testing (MCP Server)

The MCP server uses `inline-snapshot` for response validation:

```python
from inline_snapshot import snapshot

def test_tool_response():
    result = call_tool()
    assert result == snapshot({"expected": "value"})
```

Update snapshots after intentional changes:
```bash
pytest tests/hedera_guardian_mcp_server/ --inline-snapshot=review
pytest tests/hedera_guardian_mcp_server/ --inline-snapshot=fix
```

### Integration Tests with Testcontainers

Integration tests use [testcontainers](https://testcontainers.com/) to automatically manage Docker containers for external services like Qdrant.

The root `tests/conftest.py` provides session-scoped fixtures that:

1. **Start a Qdrant container** once per test session
2. **Provide dynamic URLs** since ports are randomly assigned by Docker
3. **Automatically clean up** containers after tests complete

```python
# tests/conftest.py (simplified)
@pytest.fixture(scope="session")
def qdrant_container():
    """Session-scoped Qdrant container."""
    from testcontainers.qdrant import QdrantContainer
    container = QdrantContainer(image="qdrant/qdrant:v1.16")
    container.start()
    yield container
    container.stop()

@pytest.fixture(scope="session")
def qdrant_url(qdrant_container) -> str:
    """Get dynamic Qdrant URL from testcontainer."""
    host = qdrant_container.get_container_host_ip()
    port = qdrant_container.get_exposed_port(6333)
    return f"http://{host}:{port}"
```

#### Using Testcontainers Fixtures

```python
@pytest.fixture
def integration_config(tmp_path, qdrant_url, request):
    """Create test config with dynamic Qdrant URL."""
    # Generate unique collection name for test isolation
    test_id = request.node.name.replace("[", "_").replace("]", "")[:30]
    collection_name = f"test_docs_{test_id}_{id(request.node) % 10000}"

    return Settings(
        qdrant_url=qdrant_url,  # Dynamic URL from testcontainer
        qdrant_collection_name=collection_name,
        # ... other settings
    )

@pytest.mark.integration
async def test_pipeline_end_to_end(integration_config):
    pipeline = MyPipeline(integration_config)
    # Test uses real Qdrant in Docker container
```

#### Requirements

- **Docker** must be running on your system
- **testcontainers** package (in `integration-test` dependency group)
- Network access to pull Docker images (first run only)

### Coverage

```bash
# HTML report
pytest tests/vector_store/ --cov=src --cov-report=html

# Terminal report
pytest tests/ --cov=src --cov-report=term-missing

# Open report (Windows)
start htmlcov\index.html

# Open report (Unix/macOS)
open htmlcov/index.html
```

Coverage config is in root `pyproject.toml`.

### Adding New Test Dependencies

Add the dependency to the appropriate group in the component's `pyproject.toml` (`[tool.poetry.group.test.dependencies]` or `[tool.poetry.group.integration-test.dependencies]`), then:

```bash
poetry lock && poetry install --with test
# For integration test deps:
poetry lock && poetry install --with test --with integration-test
```

> Always commit both `pyproject.toml` and `poetry.lock` together.

### Best Practices

#### 1. Separate Unit and Integration Tests

- Place unit tests in `tests/component/unit/`
- Place integration tests in `tests/component/integration/`
- Mark integration tests with `@pytest.mark.integration`

```python
import pytest

@pytest.mark.integration
def test_real_database_connection():
    # This test will be skipped with -m "not integration"
    pass
```

#### 2. Use Coverage Reports

Always check code coverage when adding new features:

```bash
cd packages/schema_ingestion_worker
poetry run pytest ../../tests/schema_ingestion_worker/ --cov=src --cov-report=html
# Open htmlcov/index.html in browser
```

#### 3. Keep Test Dependencies Minimal

- Only add dependencies to `[tool.poetry.group.test.dependencies]` if they're used by tests
- Use optional groups for heavy dependencies (Docker, testcontainers)
- Avoid adding test utilities to main dependencies

#### 4. Update Lock Files

After modifying `pyproject.toml`:

```bash
# Update lock file
poetry lock

# Commit both files
git add pyproject.toml poetry.lock
git commit -m "test: add new test dependency"
```

---

## Troubleshooting

### Common Issues

#### Import Errors

```bash
# Issue: ModuleNotFoundError: No module named 'vector_store'
# Solution: Ensure vector_store is installed in develop mode
poetry install

# Or reinstall
cd packages/vector_store
poetry install
```

#### Async/Await Errors

```python
# Issue: RuntimeWarning: coroutine was never awaited
# Solution: Add await to async function calls

# Wrong
result = async_function()

# Correct
result = await async_function()
```

#### Qdrant Connection Errors

Ensure Qdrant is running: `docker compose up -d qdrant`. For Docker troubleshooting, see [DOCKER.md](DOCKER.md#troubleshooting).

#### Test Failures — Async Errors

If async tests fail, ensure `pytest-asyncio` is installed and `asyncio_mode="auto"` is set in root `pyproject.toml`. See [Async Testing](#async-testing) for details.

#### Windows-Specific Issues

| Issue | Solution |
|-------|----------|
| Python version too old | Download 3.11+ from python.org. Check "Add to PATH" during install |
| VSCode can't find interpreter | Set `"python.defaultInterpreterPath": ".venv\\Scripts\\python.exe"` in `.vscode/settings.json` |
| `poetry install` fails | Delete `.venv` folder (`rmdir /s .venv`), then `poetry install` again |
| `cp`, `mkdir -p` not found | Use Git Bash / WSL, or Windows equivalents (`copy`, `mkdir`) |

#### Test-Specific Troubleshooting

**Problem: "ImportError: No module named X"**

**Solution**: Install test dependencies

```bash
cd packages/component_name
poetry install --with test
```

**Problem: "pytest: command not found"**

**Solution**: Run pytest through Poetry

```bash
poetry run pytest
```

**Problem: "Lock file is out of date"**

**Solution**: Update lock file

```bash
poetry lock
poetry install --with test
```

**Problem: Integration tests failing locally**

**Solution**: Install integration test dependencies

```bash
poetry install --with test --with integration-test
```

### Getting Help

1. Check existing documentation in package README files
2. Review this CONTRIBUTING.md for development patterns
3. Look at existing tests for usage examples
4. Check git history for context on changes
5. Open an issue for bugs or questions

---

## Resources

- [Poetry Documentation](https://python-poetry.org/docs/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [FastEmbed Documentation](https://qdrant.github.io/fastembed/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [pytest Documentation](https://docs.pytest.org/)

---

## See Also

- [QUICKSTART.md](QUICKSTART.md) — Quick setup and first search
- [USER-GUIDE.md](USER-GUIDE.md) — End-user guide for Claude Desktop integration
- [DOCKER.md](DOCKER.md) — Docker services, volumes, GPU configuration
- [MODELS.md](MODELS.md) — ML/AI models inventory and configuration
- [Root README](../README.md) — Project overview and package index
- Package configuration — see CONFIG.md links in [Configuration](#configuration) above

---

## License

Part of the Hedera Guardian AI Toolkit.
