/**
 * Whether Python custom logic is switched off (PYTHON_SANDBOX_MODE="disabled").
 */
export function isPythonSandboxDisabled(): boolean {
    return process.env.PYTHON_SANDBOX_MODE === 'disabled';
}

export const PYTHON_DISABLED_MESSAGE =
    'Python custom logic is disabled on this instance (PYTHON_SANDBOX_MODE=disabled)';
