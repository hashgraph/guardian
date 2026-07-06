import { registerGlobalErrorHandlers } from '@guardian/common';

// Registered as a side effect on import so the safety nets are active before the
// application bootstrap (imported afterwards in index.ts) can produce any
// unhandled rejection. See process-error-handlers.ts in @guardian/common.
registerGlobalErrorHandlers(['GUARDIAN_SERVICE']);
