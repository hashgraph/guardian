import { HttpContextToken } from '@angular/common/http';

export const SILENT_HTTP_ERRORS = new HttpContextToken<boolean>(() => false);

// Marks a request that must not trigger the auth interceptor's refresh-on-401
// retry — set on the token-refresh call itself so a failed refresh doesn't loop.
export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);
