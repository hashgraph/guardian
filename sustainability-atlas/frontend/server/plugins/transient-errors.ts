/**
 * Keeps the Nitro (SSR) server alive on transient network errors.
 *
 * The dev proxy (routeRules /api/v1 -> :3030) and HMR websockets occasionally
 * surface reset sockets as process-level unhandledRejection / uncaughtException
 * (e.g. ECONNRESET, EPIPE, "socket hang up") when a client cancels a request or
 * a keep-alive connection is dropped. Node terminates the process on an
 * unhandled rejection, which would otherwise crash the whole dev server (and an
 * SSR client-disconnect shouldn't take down production either).
 *
 * We swallow ONLY these transient network errors and log everything else so real
 * bugs stay visible.
 */
export default defineNitroPlugin(() => {
    const transientCodes = new Set(['ECONNRESET', 'EPIPE', 'ECONNABORTED', 'ERR_STREAM_PREMATURE_CLOSE']);

    const isTransient = (e: unknown): boolean => {
        const err = e as { code?: string; cause?: { code?: string }; message?: string } | undefined;
        const code = err?.code ?? err?.cause?.code;
        if (code && transientCodes.has(code)) return true;
        return /socket hang up|ECONNRESET|EPIPE/i.test(err?.message ?? '');
    };

    process.on('unhandledRejection', (reason: unknown) => {
        if (isTransient(reason)) {
            const r = reason as { code?: string; message?: string };
            console.warn(`[nitro] ignored transient network error: ${r?.code ?? r?.message}`);
            return;
        }
        console.error('[nitro] unhandledRejection:', reason);
    });

    process.on('uncaughtException', (err: unknown) => {
        if (isTransient(err)) {
            const e = err as { code?: string; message?: string };
            console.warn(`[nitro] ignored transient network error: ${e?.code ?? e?.message}`);
            return;
        }
        // Log non-transient errors but keep the SSR server up rather than hard-crashing.
        console.error('[nitro] uncaughtException:', err);
    });
});
