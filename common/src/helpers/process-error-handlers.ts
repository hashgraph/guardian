import process from 'process';
import { PinoLogger } from './pino-logger.js';

/**
 * Logger used by the global handlers once the service has initialized one.
 * Until {@link setGlobalErrorLogger} is called (early boot) the handlers fall
 * back to console output only.
 * @private
 */
let activeLogger: PinoLogger | null = null;

/**
 * Whether the owning service has finished bootstrapping. A stray rejection
 * *before* boot completes leaves the service half-initialized, so we exit and
 * let the orchestrator restart a clean instance. After boot we keep running so
 * that a single failed operation (e.g. one policy failing to initialize) cannot
 * take down the whole process.
 * @private
 */
let booted = false;

/**
 * Attributes attached to every logged global error.
 * @private
 */
let logAttributes: string[] = ['GLOBAL'];

/**
 * Route the global error handlers to a PinoLogger once one is available.
 * @param logger initialized logger
 */
export function setGlobalErrorLogger(logger: PinoLogger): void {
    activeLogger = logger;
}

/**
 * Mark bootstrap as complete. After this, unhandled rejections are logged and
 * swallowed instead of terminating the process.
 */
export function markServiceBooted(): void {
    booted = true;
}

/**
 * Log a global error through both the console (always) and the PinoLogger (if set).
 * @private
 */
function logGlobalError(kind: string, error: Error): void {
    // Console first: guaranteed to reach stdout even if the logger is down.
    console.error(`[${kind}]`, error.stack || error.message);
    // PinoLogger is async and must never itself throw from inside a handler.
    activeLogger?.error(error, [...logAttributes, kind], null).catch(() => { /* noop */ });
}

/**
 * Register process-level safety nets so a single stray promise rejection or
 * uncaught exception cannot silently crash the service.
 *
 * - `unhandledRejection`: logged. Terminates only if it happens before boot
 *   completes; after boot it is swallowed to keep the service available.
 * - `uncaughtException`: process state is undefined afterwards, so we log
 *   synchronously and exit(1) for a clean restart.
 *
 * Must be called as early as possible during startup (before the bootstrap that
 * can produce rejections).
 *
 * @param attributes log attributes identifying the service (e.g. ['GUARDIAN_SERVICE'])
 */
export function registerGlobalErrorHandlers(attributes: string[]): void {
    logAttributes = attributes;

    process.on('unhandledRejection', (reason: unknown) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        logGlobalError('unhandledRejection', error);
        if (!booted) {
            console.error('[unhandledRejection] occurred during startup - exiting for a clean restart');
            process.exit(1);
        }
    });

    process.on('uncaughtException', (error: Error) => {
        logGlobalError('uncaughtException', error);
        process.exit(1);
    });
}
