import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

interface WorkerData {
    execFunc: string;
    user: any;
    documents: any[];
    artifacts: any[];
    sources: any[];
    tablesPack: Record<string, { rows: any[]; columnKeys: string[] }>;
}

interface DockerCallbacks {
    onDone: (result: any, final: boolean) => Promise<void> | void;
    onDebug: (result: any) => void;
}

/**
 * Run Python code in an isolated Docker container.
 *
 * Communicates via newline-delimited JSON over stdin/stdout.
 * Resolves when the container exits cleanly.
 * Rejects on timeout, container error, error JSON from container, or spawn failure.
 */
export function runPythonInDocker(
    workerData: WorkerData,
    callbacks: DockerCallbacks
): Promise<void> {
    return new Promise((resolve, reject) => {
        let payload: string;
        try {
            payload = JSON.stringify(workerData);
        } catch (err) {
            reject(new Error('Failed to serialize Python sandbox payload: ' + (err as Error).message));
            return;
        }

        const image = process.env.PYTHON_SANDBOX_IMAGE || 'guardian/python-sandbox:latest';
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._\-/]*:[a-zA-Z0-9._\-]+$/.test(image)) {
            reject(new Error(`Invalid sandbox image name: ${image}`));
            return;
        }
        const timeoutMs = parseInt(process.env.PYTHON_SANDBOX_TIMEOUT_MS, 10);
        const containerName = `python-sandbox-${crypto.randomUUID()}`;

        const args = [
            'run', '--rm', '-i',
            `--name=${containerName}`,
            '--network=none',
            '--cap-drop=ALL',
            '--security-opt=no-new-privileges',
            '--read-only',
            '--user=1001:1001',
            '--log-driver=none',
            '--pull=never',
            '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
            image
        ];

        const container = spawn('docker', args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let settled = false;
        let stdoutBuffer = '';
        let timer: ReturnType<typeof setTimeout> | null = null;

        const forceRemoveContainer = () => {
            // Fire-and-forget: use spawn instead of execFileSync to avoid blocking the event loop
            try {
                const rm = spawn('docker', ['rm', '-f', containerName], {
                    stdio: 'ignore'
                });
                rm.on('error', () => { /* ignore */ });
            } catch {
                // container may already be removed by --rm
            }
        };

        const settle = (err?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        };

        timer = setTimeout(() => {
            forceRemoveContainer();
            settle(new Error('Python sandbox execution timed out'));
        }, timeoutMs);

        // --- Write input data to container stdin ---
        container.stdin.on('error', (err) => {
            console.error('[python-sandbox] stdin pipe error:', err.message);
            // Don't settle here — the close event will handle the exit.
            // The container may already be dead, which is the most common cause.
        });

        container.stdin.write(payload, (writeErr) => {
            if (writeErr) {
                console.error('[python-sandbox] stdin write error:', writeErr.message);
                return;
            }
            container.stdin.end();
        });

        /**
         * Process a single newline-delimited JSON line.
         * Returns true if the caller should stop processing further lines (i.e. settled).
         */
        const processLine = (line: string): boolean => {
            if (!line.trim() || settled) {
                return settled;
            }
            try {
                const msg = JSON.parse(line);
                switch (msg.type) {
                    case 'done':
                        if (!settled) {
                            callbacks.onDone(msg.result, msg.final);
                        }
                        break;
                    case 'debug':
                        if (!settled) {
                            callbacks.onDebug(msg.result);
                        }
                        break;
                    case 'error':
                        settle(new Error(msg.error || 'Unknown error from Python sandbox'));
                        return true;
                    case 'stdout':
                        console.log('[python-sandbox stdout]', msg.message);
                        break;
                    case 'stderr':
                        console.error('[python-sandbox]', msg.message);
                        break;
                    default:
                        console.warn('[python-sandbox] Unknown message type:', msg.type);
                        break;
                }
            } catch {
                console.error('[python-sandbox] Malformed output:', line.slice(0, 200));
            }
            return false;
        };

        // --- Parse stdout line by line (newline-delimited JSON) ---
        container.stdout.on('data', (chunk: Buffer) => {
            if (settled) {
                return;
            }
            stdoutBuffer += chunk.toString();
            const lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop() || '';

            for (const line of lines) {
                if (settled) {
                    break;
                }
                processLine(line);
            }
        });

        container.stderr.on('data', (chunk: Buffer) => {
            console.error('[python-sandbox stderr]', chunk.toString());
        });

        container.on('error', (err) => {
            forceRemoveContainer();
            settle(new Error('Failed to start Docker sandbox: ' + err.message));
        });

        container.on('close', (code) => {
            // Process any remaining data in the buffer (including debug messages).
            if (stdoutBuffer.trim()) {
                const remainingLines = stdoutBuffer.split('\n');
                for (const line of remainingLines) {
                    if (settled) {
                        break;
                    }
                    processLine(line);
                }
                stdoutBuffer = '';
            }

            if (settled) {
                return;
            }

            if (code !== 0 && code !== null) {
                settle(new Error(`Python sandbox exited with code ${code}`));
            } else {
                // Container exited cleanly. Resolve even if no explicit 'done' message was sent.
                settle();
            }
        });
    });
}
