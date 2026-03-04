"""
Parent-side subprocess management with timeout handling.

This module provides utilities for running document processing in isolated
subprocesses with proper timeout handling, process termination, and crash
detection. It implements best practices for subprocess IPC including:

- Atomic file writes (temp + replace) for IPC
- Two-phase termination (SIGTERM then SIGKILL)
- Buffer limits on stdout/stderr to prevent memory issues
- Windows process tree kill for clean termination
- IPC file cleanup after reading
- Stale response file deletion before spawn

The subprocess architecture solves Python's memory fragmentation issue by
processing each document in a separate process that exits after completion,
forcing the OS to reclaim all memory.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .config import DocumentIngestionSettings
    from .models import SubprocessResponse

# ---------------------------------------------------------------------------
# Optional psutil import for memory monitoring
# ---------------------------------------------------------------------------

try:
    import psutil

    _HAS_PSUTIL = True
except ImportError:
    psutil = None  # type: ignore[assignment]
    _HAS_PSUTIL = False

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Exit Code Constants for Crash Detection
# ---------------------------------------------------------------------------

WINDOWS_OOM_CODES = {
    -1073741571,  # STATUS_COMMITMENT_LIMIT (0xC000012D) - out of virtual memory
    -1073741801,  # STATUS_NO_MEMORY (0xC0000017) - insufficient memory
}

# Windows crash codes that may indicate OOM (access violation after failed alloc)
# but can also be genuine bugs (use-after-free, null dereference). Reported as "Crash".
WINDOWS_CRASH_CODES = {
    -1073741819,  # STATUS_ACCESS_VIOLATION (0xC0000005)
    -1073740791,  # STATUS_STACK_BUFFER_OVERRUN (0xC0000409)
}

LINUX_OOM_CODES = {
    137,  # 128 + SIGKILL from OOM killer
    -9,  # Killed by SIGKILL
}


# ---------------------------------------------------------------------------
# Main Subprocess Runner
# ---------------------------------------------------------------------------


async def run_document_subprocess(
    config: "DocumentIngestionSettings",
    document_path: Path,
    staged_path: Path,
    source_format: str,
) -> "SubprocessResponse":
    """
    Process a document in an isolated subprocess with timeout handling.

    This function spawns a child process to run the document processing pipeline
    in isolation, ensuring that memory is returned to the OS after each document.
    Communication happens via JSON files in an IPC directory.

    Best practices applied:
    - Atomic file writes (temp + replace) for IPC reliability
    - Two-phase termination (SIGTERM then SIGKILL) for clean shutdown
    - Buffer limits on stdout/stderr to prevent memory exhaustion
    - Windows process tree kill for complete cleanup
    - IPC file cleanup after reading
    - Stale response file deletion before spawn to prevent false reads

    Args:
        config: Document ingestion settings containing timeout and other config
        document_path: Path to the original document file (PDF or DOCX)
        staged_path: Path to the document's staging directory for intermediate files
        source_format: Document format ("pdf" or "docx")

    Returns:
        SubprocessResponse with processing results, including status, metrics,
        and error information if the subprocess failed or timed out.

    Raises:
        No exceptions are raised - all errors are captured in the response.
    """
    from .models import SubprocessRequest, SubprocessResponse  # noqa: PLC0415

    document_id = document_path.stem
    timeout = config.subprocess_timeout_seconds

    # Path traversal protection
    staged_base = Path(config.staged_documents_dir).resolve()
    staged_path_resolved = staged_path.resolve()
    if not staged_path_resolved.is_relative_to(staged_base):
        logger.error(
            f"[{document_id}] Invalid staged_path outside allowed directory: {staged_path}"
        )
        return SubprocessResponse(
            status="failed",
            document_id=document_id,
            chunks_generated=0,
            vectors_upserted=0,
            error_type="Security",
            error_message=f"Staged path {staged_path} is outside allowed directory",
        )

    ipc_dir = staged_path / "_ipc"
    ipc_dir.mkdir(exist_ok=True, parents=True)

    ipc_id = uuid.uuid4().hex[:8]
    request_file = ipc_dir / f"request_{ipc_id}.json"
    response_file = ipc_dir / f"request_{ipc_id}.response.json"

    request = SubprocessRequest(
        document_id=document_id,
        document_path=str(document_path.absolute()),
        staged_path=str(staged_path.absolute()),
        source_format=source_format,
        start_from=config.start_from,
        config_json=config.model_dump_json(exclude={"qdrant_api_key"}),
    )

    # Atomic write: temp file + rename
    temp_file = request_file.with_suffix(".tmp")
    temp_file.write_text(json.dumps(request, indent=2))
    temp_file.replace(request_file)

    logger.info(f"[{document_id}] Spawning subprocess for document processing")

    cmd = [
        sys.executable,
        "-m",
        "document_ingestion_worker.subprocess_worker",
        str(request_file),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        limit=10 * 1024 * 1024,  # 10MB buffer limit
        env=os.environ.copy(),
    )

    # Stream stderr in real-time while waiting for process to complete
    stderr_lines: list[str] = []

    async def _stream_stderr() -> None:
        assert proc.stderr is not None
        async for raw_line in proc.stderr:
            line = raw_line.decode(errors="replace").rstrip()
            stderr_lines.append(line)
            logger.info(f"[{document_id}] {line}")

    stream_task = asyncio.create_task(_stream_stderr())

    # Monitor subprocess: timeout + optional memory limit
    memory_limit_gb = config.subprocess_memory_limit_gb
    peak_memory_mb = 0.0

    if memory_limit_gb and not _HAS_PSUTIL:
        logger.warning(
            f"[{document_id}] subprocess_memory_limit_gb={memory_limit_gb} is configured "
            "but psutil could not be imported — memory limit will NOT be enforced. "
            "psutil is a bundled dependency; this indicates a broken installation."
        )

    try:
        peak_memory_mb = await _monitor_subprocess(proc, document_id, timeout, memory_limit_gb)
    except _MemoryLimitExceededError as exc:
        stream_task.cancel()
        return _create_memory_limit_response(document_id, exc.peak_mb, memory_limit_gb or 0)
    except TimeoutError:
        stream_task.cancel()
        return await _handle_timeout(proc, document_id, timeout)

    await stream_task  # Drain remaining lines

    if peak_memory_mb > 0:
        logger.info(
            f"[{document_id}] Subprocess peak RSS: {peak_memory_mb:.0f} MB "
            f"({peak_memory_mb / 1024:.2f} GB)"
        )

    try:
        if response_file.exists():
            for attempt in range(2):
                try:
                    response_data = json.loads(response_file.read_text())
                    response_data["peak_memory_mb"] = peak_memory_mb
                    return SubprocessResponse(**response_data)
                except (json.JSONDecodeError, OSError) as e:
                    if attempt == 0:
                        await asyncio.sleep(0.5)  # Brief delay for filesystem sync
                        continue
                    logger.error(f"[{document_id}] Failed to read response file: {e}")
                    return SubprocessResponse(
                        status="failed",
                        document_id=document_id,
                        chunks_generated=0,
                        vectors_upserted=0,
                        peak_memory_mb=peak_memory_mb,
                        error_type="IPC",
                        error_message=f"Invalid response file: {e}",
                    )

        # No response file -- subprocess crashed before writing
        stderr = "\n".join(stderr_lines).encode()
        response = _create_crash_response(document_id, proc.returncode, stderr)
        response["peak_memory_mb"] = peak_memory_mb
        return response
    finally:
        for f in [request_file, response_file]:
            try:
                if f.exists():
                    f.unlink()
            except OSError:
                pass
        try:
            if ipc_dir.exists() and not any(ipc_dir.iterdir()):
                ipc_dir.rmdir()
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Memory Monitoring
# ---------------------------------------------------------------------------

# Polling interval for memory checks (seconds)
_MEMORY_POLL_INTERVAL = 2.0


class _MemoryLimitExceededError(Exception):
    """Raised when a subprocess exceeds the configured memory limit."""

    def __init__(self, peak_mb: float) -> None:
        self.peak_mb = peak_mb
        super().__init__(f"Subprocess exceeded memory limit (peak: {peak_mb:.0f} MB)")


async def _monitor_subprocess(
    proc: asyncio.subprocess.Process,
    document_id: str,
    timeout: int,
    memory_limit_gb: float | None,
) -> float:
    """
    Monitor a running subprocess for timeout and optional memory limit.

    Polls the subprocess at regular intervals, tracking peak RSS memory usage
    via psutil. If a memory limit is configured and the subprocess exceeds it,
    the process is killed and _MemoryLimitExceededError is raised.

    Args:
        proc: The running asyncio subprocess
        document_id: Document identifier for logging
        timeout: Maximum allowed wall-clock time in seconds
        memory_limit_gb: Maximum RSS in GB, or None to disable

    Returns:
        Peak RSS memory in MB observed during the subprocess lifetime

    Raises:
        _MemoryLimitExceededError: If RSS exceeds memory_limit_gb
        TimeoutError: If subprocess exceeds timeout
    """
    memory_limit_bytes = int(memory_limit_gb * 1024 * 1024 * 1024) if memory_limit_gb else None
    peak_rss_bytes: int = 0
    start_time = time.monotonic()

    # Get psutil Process handle for the child (if psutil is available)
    ps_proc = None
    if _HAS_PSUTIL and proc.pid is not None:
        try:
            ps_proc = psutil.Process(proc.pid)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            logger.debug(f"[{document_id}] Could not attach psutil to PID {proc.pid}")

    while True:
        # Check if process has exited
        try:
            await asyncio.wait_for(proc.wait(), timeout=_MEMORY_POLL_INTERVAL)
            # Process exited — do one final memory sample if possible
            break
        except TimeoutError:
            pass  # Process still running — check memory and timeout

        # Check timeout using wall-clock time (immune to timing drift)
        if time.monotonic() - start_time >= timeout:
            raise TimeoutError

        # Sample RSS memory
        if ps_proc is not None:
            try:
                rss = ps_proc.memory_info().rss
                peak_rss_bytes = max(peak_rss_bytes, rss)
                # Check memory limit
                if memory_limit_bytes and rss > memory_limit_bytes:
                    peak_mb = peak_rss_bytes / (1024 * 1024)
                    logger.error(
                        f"[{document_id}] Subprocess RSS {rss / 1e9:.2f} GB exceeds limit "
                        f"{memory_limit_gb:.1f} GB — killing subprocess"
                    )
                    _force_kill_process(proc)
                    await proc.wait()
                    raise _MemoryLimitExceededError(peak_mb)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                # Process exited between wait_for timeout and memory check
                ps_proc = None

    return peak_rss_bytes / (1024 * 1024) if peak_rss_bytes > 0 else 0.0


def _create_memory_limit_response(
    document_id: str,
    peak_mb: float,
    limit_gb: float,
) -> "SubprocessResponse":
    """Create a response for a subprocess killed due to memory limit."""
    from .models import SubprocessResponse  # noqa: PLC0415

    return SubprocessResponse(
        status="failed",
        document_id=document_id,
        chunks_generated=0,
        vectors_upserted=0,
        peak_memory_mb=peak_mb,
        error_type="OOM",
        error_message=(
            f"Subprocess killed: RSS exceeded {limit_gb:.1f} GB limit (peak: {peak_mb:.0f} MB)"
        ),
    )


# ---------------------------------------------------------------------------
# Timeout and Termination Handling
# ---------------------------------------------------------------------------


async def _handle_timeout(
    proc: asyncio.subprocess.Process,
    document_id: str,
    timeout: int,
) -> "SubprocessResponse":
    """
    Handle subprocess timeout with two-phase termination.

    Implements a graceful shutdown pattern:
    1. Send SIGTERM and wait up to 30 seconds for clean exit
    2. If still running, force kill the process (tree kill on Windows)

    Args:
        proc: The asyncio subprocess to terminate
        document_id: Document identifier for logging
        timeout: The original timeout value (for error message)

    Returns:
        SubprocessResponse with status="timeout" and error details
    """
    from .models import SubprocessResponse  # noqa: PLC0415

    logger.warning(f"[{document_id}] Subprocess timeout after {timeout}s, terminating...")

    proc.terminate()
    try:
        await asyncio.wait_for(proc.wait(), timeout=30)
        logger.info(f"[{document_id}] Subprocess terminated gracefully")
    except TimeoutError:
        logger.warning(f"[{document_id}] Subprocess didn't respond to SIGTERM, killing...")
        _force_kill_process(proc)
        await proc.wait()

    return SubprocessResponse(
        status="timeout",
        document_id=document_id,
        chunks_generated=0,
        vectors_upserted=0,
        error_type="Timeout",
        error_message=f"Process exceeded {timeout}s timeout",
    )


def _force_kill_process(proc: asyncio.subprocess.Process) -> None:
    """
    Force kill a process, using tree kill on Windows.

    On Windows, child processes spawned by the subprocess may not be killed
    by proc.kill() alone. We use taskkill with /T flag to kill the entire
    process tree.

    On Linux/macOS, proc.kill() sends SIGKILL which is sufficient.

    Args:
        proc: The asyncio subprocess to force kill
    """
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                capture_output=True,
                timeout=10,
                check=False,
            )
        except Exception:
            proc.kill()
    else:
        proc.kill()


# ---------------------------------------------------------------------------
# Crash Response Generation
# ---------------------------------------------------------------------------


def _create_crash_response(
    document_id: str,
    return_code: int | None,
    stderr: bytes,
) -> "SubprocessResponse":
    """
    Create a response for a subprocess crash (no response file written).

    Analyzes the exit code to determine the type of crash:
    - OOM: Exit codes 137, -9 (SIGKILL) on Linux; Windows memory-specific codes
    - Crash: Windows access violations (may or may not be OOM-related),
      SIGSEGV (-11, 139), and other non-zero exit codes
    - Generic crash: Any other non-zero exit code

    Args:
        document_id: Document identifier for the response
        return_code: Subprocess exit code (may be None if killed)
        stderr: Captured stderr output from subprocess

    Returns:
        SubprocessResponse with status="failed" and crash details
    """
    from .models import SubprocessResponse  # noqa: PLC0415

    if return_code is None:
        return SubprocessResponse(
            status="failed",
            document_id=document_id,
            chunks_generated=0,
            vectors_upserted=0,
            error_type="Crash",
            error_message="Process was killed (no exit code)",
        )

    if return_code in LINUX_OOM_CODES or return_code in WINDOWS_OOM_CODES:
        error_type = "OOM"
        error_msg = f"Process killed by OOM killer (exit code {return_code})"
    elif return_code in WINDOWS_CRASH_CODES:
        error_type = "Crash"
        error_msg = (
            f"Process crashed with Windows status code {return_code} "
            "(possible OOM or memory corruption)"
        )
    elif return_code in {-11, 139}:  # SIGSEGV
        error_type = "Crash"
        error_msg = "Process crashed with segmentation fault"
    else:
        error_type = "Crash"
        error_msg = f"Process exited with code {return_code}, no response file"

    if stderr:
        stderr_tail = stderr.decode(errors="replace").splitlines()[-10:]
        if stderr_tail:
            error_msg += f"\nLast stderr: {' | '.join(stderr_tail)}"

    return SubprocessResponse(
        status="failed",
        document_id=document_id,
        chunks_generated=0,
        vectors_upserted=0,
        error_type=error_type,
        error_message=error_msg,
    )
