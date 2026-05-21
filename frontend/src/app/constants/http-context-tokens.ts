import { HttpContextToken } from '@angular/common/http';

export const SILENT_HTTP_ERRORS = new HttpContextToken<boolean>(() => false);
