"""Unit tests for document_ingestion_worker.subprocess_runner."""

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from document_ingestion_worker.config import DocumentIngestionSettings
from document_ingestion_worker.subprocess_runner import (
    LINUX_OOM_CODES,
    WINDOWS_CRASH_CODES,
    WINDOWS_OOM_CODES,
    _create_crash_response,
    _force_kill_process,
    _handle_timeout,
    run_document_subprocess,
)


class TestCreateCrashResponse:
    """Test suite for _create_crash_response function."""

    @pytest.mark.parametrize(
        "exit_code",
        list(LINUX_OOM_CODES),
        ids=[f"linux_oom_{code}" for code in LINUX_OOM_CODES],
    )
    def test_linux_oom_detection(self, exit_code):
        """Test OOM detection for Linux exit codes (137, -9)."""
        document_id = "test_doc"
        stderr = b""

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["status"] == "failed"
        assert response["document_id"] == document_id
        assert response["error_type"] == "OOM"
        assert f"exit code {exit_code}" in response["error_message"]
        assert "OOM killer" in response["error_message"]

    @pytest.mark.parametrize(
        "exit_code",
        list(WINDOWS_OOM_CODES),
        ids=[f"windows_oom_{hex(code) if code > 0 else code}" for code in WINDOWS_OOM_CODES],
    )
    def test_windows_oom_detection(self, exit_code):
        """Test OOM detection for Windows memory-specific exit codes."""
        document_id = "test_doc"
        stderr = b""

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["status"] == "failed"
        assert response["document_id"] == document_id
        assert response["error_type"] == "OOM"
        assert response["chunks_generated"] == 0
        assert response["vectors_upserted"] == 0
        assert f"exit code {exit_code}" in response["error_message"]
        assert "OOM killer" in response["error_message"]

    @pytest.mark.parametrize(
        "exit_code",
        list(WINDOWS_CRASH_CODES),
        ids=[f"windows_crash_{code}" for code in WINDOWS_CRASH_CODES],
    )
    def test_windows_crash_codes_detection(self, exit_code):
        """Test that Windows access violation / stack overflow are classified as Crash."""
        document_id = "test_doc"
        stderr = b""

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["status"] == "failed"
        assert response["document_id"] == document_id
        assert response["error_type"] == "Crash"
        assert response["chunks_generated"] == 0
        assert response["vectors_upserted"] == 0
        assert "possible OOM or memory corruption" in response["error_message"]

    @pytest.mark.parametrize(
        "exit_code,expected_message",
        [
            (-11, "segmentation fault"),
            (139, "segmentation fault"),
        ],
        ids=["sigsegv_negative", "sigsegv_128_plus_11"],
    )
    def test_sigsegv_detection(self, exit_code, expected_message):
        """Test SIGSEGV (segmentation fault) detection (-11, 139)."""
        document_id = "test_doc"
        stderr = b""

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["status"] == "failed"
        assert response["document_id"] == document_id
        assert response["error_type"] == "Crash"
        assert expected_message in response["error_message"]

    @pytest.mark.parametrize(
        "exit_code",
        [1, 2, 42, 255, -1, -5],
        ids=["exit_1", "exit_2", "exit_42", "exit_255", "exit_neg1", "exit_neg5"],
    )
    def test_generic_crash_detection(self, exit_code):
        """Test generic crash detection for other non-zero exit codes."""
        document_id = "test_doc"
        stderr = b""

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["status"] == "failed"
        assert response["document_id"] == document_id
        assert response["error_type"] == "Crash"
        assert f"exited with code {exit_code}" in response["error_message"]
        assert "no response file" in response["error_message"]

    def test_none_return_code_handling(self):
        """Test handling of None return code (process was killed)."""
        document_id = "test_doc"
        stderr = b""

        response = _create_crash_response(document_id, None, stderr)

        assert response["status"] == "failed"
        assert response["document_id"] == document_id
        assert response["error_type"] == "Crash"
        assert response["chunks_generated"] == 0
        assert response["vectors_upserted"] == 0
        assert "killed" in response["error_message"]
        assert "no exit code" in response["error_message"]

    def test_stderr_inclusion_single_line(self):
        """Test that stderr is included in error message (single line)."""
        document_id = "test_doc"
        exit_code = 1
        stderr = b"Error: Failed to load model"

        response = _create_crash_response(document_id, exit_code, stderr)

        assert "Last stderr:" in response["error_message"]
        assert "Failed to load model" in response["error_message"]

    def test_stderr_inclusion_multiple_lines(self):
        """Test that last stderr lines are included (multiple lines)."""
        document_id = "test_doc"
        exit_code = 1
        stderr_lines = [f"Line {i}" for i in range(1, 16)]
        stderr = "\n".join(stderr_lines).encode()

        response = _create_crash_response(document_id, exit_code, stderr)

        # Should include last 10 lines
        assert "Last stderr:" in response["error_message"]
        assert "Line 15" in response["error_message"]
        assert "Line 6" in response["error_message"]
        assert "Line 5" not in response["error_message"]  # Should not include earlier lines

    def test_stderr_inclusion_exactly_10_lines(self):
        """Test stderr inclusion when exactly 10 lines exist."""
        document_id = "test_doc"
        exit_code = 1
        stderr_lines = [f"Line {i}" for i in range(1, 11)]
        stderr = "\n".join(stderr_lines).encode()

        response = _create_crash_response(document_id, exit_code, stderr)

        assert "Last stderr:" in response["error_message"]
        assert "Line 1" in response["error_message"]
        assert "Line 10" in response["error_message"]

    def test_stderr_with_unicode_errors(self):
        """Test stderr handling with invalid UTF-8 sequences."""
        document_id = "test_doc"
        exit_code = 1
        # Invalid UTF-8 sequence
        stderr = b"Valid text \xff\xfe Invalid bytes"

        response = _create_crash_response(document_id, exit_code, stderr)

        # Should not crash, errors='replace' should handle it
        assert response["error_message"] is not None
        assert "Last stderr:" in response["error_message"]

    def test_empty_stderr(self):
        """Test crash response with empty stderr."""
        document_id = "test_doc"
        exit_code = 1
        stderr = b""

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["status"] == "failed"
        assert response["error_message"] is not None
        # Should not include "Last stderr:" when stderr is empty
        assert "Last stderr:" not in response["error_message"]

    def test_oom_crash_with_stderr(self):
        """Test OOM crash response includes stderr."""
        document_id = "test_doc"
        exit_code = 137  # Linux OOM
        stderr = b"MemoryError: Unable to allocate array\nKilled"

        response = _create_crash_response(document_id, exit_code, stderr)

        assert response["error_type"] == "OOM"
        assert "Last stderr:" in response["error_message"]
        assert "MemoryError" in response["error_message"]


class TestHandleTimeout:
    """Test suite for _handle_timeout function."""

    @pytest.mark.asyncio
    async def test_graceful_termination_success(self):
        """Test successful graceful termination with SIGTERM."""
        # Mock process that responds to terminate()
        mock_proc = AsyncMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345
        mock_proc.terminate = Mock()
        mock_proc.wait = AsyncMock(return_value=0)

        document_id = "test_doc"
        timeout = 300

        response = await _handle_timeout(mock_proc, document_id, timeout)

        # Verify terminate was called
        mock_proc.terminate.assert_called_once()
        # Verify wait was called (with timeout)
        mock_proc.wait.assert_called_once()

        # Verify response
        assert response["status"] == "timeout"
        assert response["document_id"] == document_id
        assert response["error_type"] == "Timeout"
        assert str(timeout) in response["error_message"]

    @pytest.mark.asyncio
    async def test_force_kill_on_terminate_timeout(self):
        """Test force kill when graceful termination times out."""
        # Mock process that doesn't respond to terminate()
        mock_proc = AsyncMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345
        mock_proc.terminate = Mock()
        # First wait times out, second wait succeeds
        mock_proc.wait = AsyncMock(side_effect=[TimeoutError(), 0])

        document_id = "test_doc"
        timeout = 300

        with patch(
            "document_ingestion_worker.subprocess_runner._force_kill_process"
        ) as mock_force_kill:
            response = await _handle_timeout(mock_proc, document_id, timeout)

            # Verify terminate was called
            mock_proc.terminate.assert_called_once()
            # Verify force kill was called when terminate timeout
            mock_force_kill.assert_called_once_with(mock_proc)
            # Verify wait was called twice (graceful timeout + after force kill)
            assert mock_proc.wait.call_count == 2

        assert response["status"] == "timeout"
        assert response["error_type"] == "Timeout"

    @pytest.mark.asyncio
    async def test_timeout_response_structure(self):
        """Test timeout response has correct structure."""
        mock_proc = AsyncMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345
        mock_proc.terminate = Mock()
        mock_proc.wait = AsyncMock(return_value=0)

        document_id = "test_doc"
        timeout = 120

        response = await _handle_timeout(mock_proc, document_id, timeout)

        # Verify all required fields are present
        assert "status" in response
        assert "document_id" in response
        assert "error_type" in response
        assert "error_message" in response

        # Verify values
        assert response["status"] == "timeout"
        assert response["document_id"] == document_id
        assert response["error_type"] == "Timeout"
        assert "120" in response["error_message"]
        assert "timeout" in response["error_message"]


class TestForceKillProcess:
    """Test suite for _force_kill_process function."""

    @patch("document_ingestion_worker.subprocess_runner.sys.platform", "win32")
    @patch("document_ingestion_worker.subprocess_runner.subprocess.run")
    def test_windows_tree_kill(self, mock_subprocess_run):
        """Test Windows process tree kill using taskkill."""
        mock_proc = MagicMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345

        _force_kill_process(mock_proc)

        # Verify taskkill was called with correct arguments
        mock_subprocess_run.assert_called_once_with(
            ["taskkill", "/F", "/T", "/PID", "12345"],
            capture_output=True,
            timeout=10,
            check=False,
        )
        # Verify proc.kill() was NOT called
        mock_proc.kill.assert_not_called()

    @patch("document_ingestion_worker.subprocess_runner.sys.platform", "win32")
    @patch("document_ingestion_worker.subprocess_runner.subprocess.run")
    def test_windows_tree_kill_fallback_on_exception(self, mock_subprocess_run):
        """Test fallback to proc.kill() if taskkill fails on Windows."""
        mock_subprocess_run.side_effect = Exception("taskkill failed")

        mock_proc = MagicMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345

        _force_kill_process(mock_proc)

        # Verify taskkill was attempted
        mock_subprocess_run.assert_called_once()
        # Verify fallback to proc.kill()
        mock_proc.kill.assert_called_once()

    @patch("document_ingestion_worker.subprocess_runner.sys.platform", "linux")
    def test_linux_simple_kill(self):
        """Test Linux uses simple kill (SIGKILL)."""
        mock_proc = MagicMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345

        _force_kill_process(mock_proc)

        # Verify proc.kill() was called
        mock_proc.kill.assert_called_once()

    @patch("document_ingestion_worker.subprocess_runner.sys.platform", "darwin")
    def test_macos_simple_kill(self):
        """Test macOS uses simple kill (SIGKILL)."""
        mock_proc = MagicMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 12345

        _force_kill_process(mock_proc)

        # Verify proc.kill() was called
        mock_proc.kill.assert_called_once()

    @patch("document_ingestion_worker.subprocess_runner.sys.platform", "win32")
    @patch("document_ingestion_worker.subprocess_runner.subprocess.run")
    def test_windows_taskkill_timeout_parameter(self, mock_subprocess_run):
        """Test that taskkill is called with 10 second timeout."""
        mock_proc = MagicMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 99999

        _force_kill_process(mock_proc)

        call_kwargs = mock_subprocess_run.call_args[1]
        assert call_kwargs["timeout"] == 10

    @patch("document_ingestion_worker.subprocess_runner.sys.platform", "win32")
    @patch("document_ingestion_worker.subprocess_runner.subprocess.run")
    def test_windows_taskkill_check_false(self, mock_subprocess_run):
        """Test that taskkill is called with check=False to not raise on non-zero exit."""
        mock_proc = MagicMock(spec=asyncio.subprocess.Process)
        mock_proc.pid = 99999

        _force_kill_process(mock_proc)

        call_kwargs = mock_subprocess_run.call_args[1]
        assert call_kwargs["check"] is False


class TestExitCodeConstants:
    """Test suite to verify exit code constant definitions."""

    def test_linux_oom_codes_defined(self):
        """Test that Linux OOM codes are correctly defined."""
        assert 137 in LINUX_OOM_CODES
        assert -9 in LINUX_OOM_CODES
        assert len(LINUX_OOM_CODES) == 2

    def test_windows_oom_codes_defined(self):
        """Test that Windows OOM codes contain only memory-specific codes."""
        assert -1073741571 in WINDOWS_OOM_CODES  # STATUS_COMMITMENT_LIMIT (0xC000012D)
        assert -1073741801 in WINDOWS_OOM_CODES  # STATUS_NO_MEMORY (0xC0000017)
        assert len(WINDOWS_OOM_CODES) == 2

    def test_windows_crash_codes_defined(self):
        """Test that Windows crash codes contain ambiguous access violation codes."""
        assert -1073741819 in WINDOWS_CRASH_CODES  # STATUS_ACCESS_VIOLATION (0xC0000005)
        assert -1073740791 in WINDOWS_CRASH_CODES  # STATUS_STACK_BUFFER_OVERRUN (0xC0000409)
        assert len(WINDOWS_CRASH_CODES) == 2

    def test_oom_codes_no_overlap(self):
        """Test that code sets don't overlap."""
        assert not (LINUX_OOM_CODES & WINDOWS_OOM_CODES)
        assert not (WINDOWS_OOM_CODES & WINDOWS_CRASH_CODES)


# =============================================================================
# run_document_subprocess() IPC tests
# =============================================================================


def _make_mock_process(returncode: int, stderr_lines: list[str] | None = None):
    """Create an AsyncMock process with async-iterable stderr.

    Args:
        returncode: Process exit code
        stderr_lines: Lines to yield from stderr (encoded to bytes internally)
    """
    proc = AsyncMock()
    proc.returncode = returncode
    proc.pid = 12345

    async def _wait():
        return returncode

    proc.wait = _wait

    if stderr_lines is None:
        stderr_lines = []

    class _AsyncStderr:
        """Async iterable that yields encoded stderr lines."""

        def __aiter__(self):
            return self

        def __init__(self):
            self._lines = iter(stderr_lines)

        async def __anext__(self):
            try:
                line = next(self._lines)
                return line.encode() + b"\n"
            except StopIteration:
                raise StopAsyncIteration from None

    proc.stderr = _AsyncStderr()

    return proc


@pytest.fixture
def subprocess_config(tmp_path):
    """Create a mock config with required fields for subprocess runner."""
    staged_dir = tmp_path / "staged" / "documents"
    staged_dir.mkdir(parents=True)

    config = Mock(spec=DocumentIngestionSettings)
    config.staged_documents_dir = staged_dir
    config.subprocess_timeout_seconds = 300
    config.subprocess_memory_limit_gb = None
    config.start_from = "beginning"
    config.model_dump_json.return_value = '{"mock": true}'
    return config


class TestRunDocumentSubprocess:
    """Tests for run_document_subprocess() IPC function."""

    @pytest.mark.asyncio
    async def test_path_traversal_rejection(self, subprocess_config, tmp_path):
        """Staged path outside allowed directory returns Security error."""
        evil_path = tmp_path / "evil" / "escape"
        evil_path.mkdir(parents=True)

        result = await run_document_subprocess(
            config=subprocess_config,
            document_path=Path("test_doc.pdf"),
            staged_path=evil_path,
            source_format="pdf",
        )

        assert result["status"] == "failed"
        assert result["error_type"] == "Security"
        assert "outside allowed directory" in result["error_message"]

    @pytest.mark.asyncio
    async def test_successful_subprocess_roundtrip(self, subprocess_config):
        """Mock subprocess writes valid response -> success result.

        Also verifies:
        - Request file contains valid JSON with expected fields
        - IPC files are cleaned up after success
        """
        staged_path = subprocess_config.staged_documents_dir / "test_doc"
        staged_path.mkdir(parents=True)

        captured_request = {}

        async def _fake_exec(*cmd, **kwargs):
            # Find the request file from command args
            request_path = Path(cmd[-1])
            request_data = json.loads(request_path.read_text())
            captured_request.update(request_data)

            # Write a success response
            response_path = request_path.with_suffix(".response.json")
            response_path.write_text(
                json.dumps(
                    {
                        "status": "success",
                        "document_id": "test_doc",
                        "chunks_generated": 5,
                        "vectors_upserted": 5,
                        "processing_time_seconds": 1.2,
                    }
                )
            )

            return _make_mock_process(returncode=0)

        with patch(
            "document_ingestion_worker.subprocess_runner.asyncio.create_subprocess_exec",
            side_effect=_fake_exec,
        ):
            result = await run_document_subprocess(
                config=subprocess_config,
                document_path=Path("test_doc.pdf"),
                staged_path=staged_path,
                source_format="pdf",
            )

        assert result["status"] == "success"
        assert result["chunks_generated"] == 5
        assert result["vectors_upserted"] == 5

        # Verify request file contained expected fields
        assert captured_request["document_id"] == "test_doc"
        assert captured_request["source_format"] == "pdf"
        assert captured_request["start_from"] == "beginning"
        assert "config_json" in captured_request

        # Verify IPC files are cleaned up
        ipc_dir = staged_path / "_ipc"
        if ipc_dir.exists():
            remaining = list(ipc_dir.iterdir())
            assert len(remaining) == 0, f"IPC files not cleaned up: {remaining}"

    @pytest.mark.asyncio
    async def test_subprocess_crash_no_response_file(self, subprocess_config):
        """Subprocess exits non-zero with no response file -> crash response.

        Also verifies request file is cleaned up even on crash.
        """
        staged_path = subprocess_config.staged_documents_dir / "crash_doc"
        staged_path.mkdir(parents=True)

        async def _fake_exec(*cmd, **kwargs):
            # Don't write any response file — simulate a crash
            return _make_mock_process(
                returncode=1,
                stderr_lines=["ERROR: Something went wrong"],
            )

        with patch(
            "document_ingestion_worker.subprocess_runner.asyncio.create_subprocess_exec",
            side_effect=_fake_exec,
        ):
            result = await run_document_subprocess(
                config=subprocess_config,
                document_path=Path("crash_doc.pdf"),
                staged_path=staged_path,
                source_format="pdf",
            )

        assert result["status"] == "failed"
        assert result["error_type"] == "Crash"

        # Verify IPC files are cleaned up even on crash
        ipc_dir = staged_path / "_ipc"
        if ipc_dir.exists():
            remaining = list(ipc_dir.iterdir())
            assert len(remaining) == 0, f"IPC files not cleaned up after crash: {remaining}"

    @pytest.mark.asyncio
    async def test_subprocess_timeout(self, subprocess_config):
        """Process exceeds timeout -> timeout response."""
        subprocess_config.subprocess_timeout_seconds = 1
        staged_path = subprocess_config.staged_documents_dir / "slow_doc"
        staged_path.mkdir(parents=True)

        async def _fake_exec(*cmd, **kwargs):
            proc = AsyncMock()
            proc.returncode = None
            proc.pid = 99999

            async def _hang():
                await asyncio.sleep(3600)

            proc.wait = _hang

            # Empty stderr
            async def _aiter():
                return
                yield  # noqa: RET504 - unreachable yield makes this an async generator

            proc.stderr = AsyncMock()
            proc.stderr.__aiter__ = _aiter

            proc.terminate = Mock()
            proc.kill = Mock()

            return proc

        with (
            patch(
                "document_ingestion_worker.subprocess_runner.asyncio.create_subprocess_exec",
                side_effect=_fake_exec,
            ),
            patch("document_ingestion_worker.subprocess_runner._handle_timeout") as mock_timeout,
        ):
            mock_timeout.return_value = {
                "status": "timeout",
                "document_id": "slow_doc",
                "chunks_generated": 0,
                "vectors_upserted": 0,
                "error_type": "Timeout",
                "error_message": "Process exceeded 1s timeout",
            }

            result = await run_document_subprocess(
                config=subprocess_config,
                document_path=Path("slow_doc.pdf"),
                staged_path=staged_path,
                source_format="pdf",
            )

        assert result["status"] == "timeout"
        assert result["error_type"] == "Timeout"

    @pytest.mark.asyncio
    async def test_corrupt_response_file(self, subprocess_config):
        """Invalid JSON in response file -> IPC error."""
        staged_path = subprocess_config.staged_documents_dir / "corrupt_doc"
        staged_path.mkdir(parents=True)

        async def _fake_exec(*cmd, **kwargs):
            # Write corrupt response
            request_path = Path(cmd[-1])
            response_path = request_path.with_suffix(".response.json")
            response_path.write_text("NOT VALID JSON {{{")

            return _make_mock_process(returncode=0)

        with patch(
            "document_ingestion_worker.subprocess_runner.asyncio.create_subprocess_exec",
            side_effect=_fake_exec,
        ):
            result = await run_document_subprocess(
                config=subprocess_config,
                document_path=Path("corrupt_doc.pdf"),
                staged_path=staged_path,
                source_format="pdf",
            )

        assert result["status"] == "failed"
        assert result["error_type"] == "IPC"
        assert "invalid response file" in result["error_message"].lower()

    @pytest.mark.asyncio
    async def test_ipc_directory_created(self, subprocess_config):
        """Verify _ipc/ directory is created under staged_path."""
        staged_path = subprocess_config.staged_documents_dir / "ipc_test_doc"
        staged_path.mkdir(parents=True)

        ipc_dir_created = False

        async def _fake_exec(*cmd, **kwargs):
            nonlocal ipc_dir_created
            # Check that _ipc dir exists by the time subprocess is spawned
            ipc_dir = staged_path / "_ipc"
            ipc_dir_created = ipc_dir.exists()

            # Write a success response
            request_path = Path(cmd[-1])
            response_path = request_path.with_suffix(".response.json")
            response_path.write_text(
                json.dumps(
                    {
                        "status": "success",
                        "document_id": "ipc_test_doc",
                        "chunks_generated": 1,
                        "vectors_upserted": 1,
                    }
                )
            )

            return _make_mock_process(returncode=0)

        with patch(
            "document_ingestion_worker.subprocess_runner.asyncio.create_subprocess_exec",
            side_effect=_fake_exec,
        ):
            await run_document_subprocess(
                config=subprocess_config,
                document_path=Path("ipc_test_doc.pdf"),
                staged_path=staged_path,
                source_format="pdf",
            )

        assert ipc_dir_created, "_ipc/ directory should be created before subprocess spawn"
