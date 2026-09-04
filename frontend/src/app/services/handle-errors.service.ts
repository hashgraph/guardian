import { Injectable, Injector } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { MessageTranslationService } from './message-translation-service/message-translation-service';
import { SILENT_HTTP_ERRORS } from '../constants';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

/**
 * Error interceptor.
 */
@Injectable()
export class HandleErrorsService implements HttpInterceptor {
    constructor(
        public router: Router,
        private toastService: ToastService,
        private messageTranslator: MessageTranslationService,
        // AuthService/AuthStateService depend on HttpClient, so injecting them
        // directly would create a cyclic dependency with this interceptor.
        // They are resolved lazily through the injector inside intercept().
        private injector: Injector,
    ) {
    }

    excludeErrorCodes: string[] = ['401'];
    excludeErrorTexts: string[] = ['Block Unavailable'];

    private titleFromCode(message: any): string | null {
        const match = /^([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\s*:/.exec(String(message ?? '').trim());
        if (!match) {
            return null;
        }
        return match[1]
            .toLowerCase()
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private messageToText(message: any) {
        if (typeof message === 'object') {
            return JSON.stringify(message, null, 2);
        }
        return message;
    }

    private async getMessage(error: any) {
        let header = 'Other Error';
        let text = 'Unknown error';
        let warning = false;

        const errorObject = error.error;
        if (!errorObject) {
            return { warning, text, header };
        }

        if (typeof errorObject === 'string') {
            const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.message));
            header = `${error.status} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : error.statusText}`;
            if (error.message) {
                text = `${translatedMessage.text}\n${this.messageToText(errorObject)}`;
            } else {
                text = `${errorObject}`;
            }
            return { warning, text, header };
        }

        warning = errorObject.statusCode === 0;

        if (typeof errorObject === 'object') {
            if (typeof errorObject.text == 'function') {
                try {
                    const e = await errorObject.text();
                    const _error = JSON.parse(e);
                    const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(_error.message));
                    const header = `${_error.statusCode} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
                    let text;
                    if (_error.message) {
                        text = `${translatedMessage.text}\n${this.messageToText(_error.error)}`;
                    } else {
                        text = `${_error.error}`;
                    }
                    return { warning, text, header };
                } catch (a) {
                    return { warning, text, header };
                }
            } else if (typeof errorObject.message === 'string') {
                const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(errorObject.message));
                if (errorObject.uuid) {
                    text = `${this.messageToText(translatedMessage.text)}\n${errorObject.uuid}`;
                } else {
                    text = `${this.messageToText(translatedMessage.text)}`;
                }
                const codeTitle = this.titleFromCode(errorObject.message);
                if (errorObject.type) {
                    header = `${errorObject.statusCode} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : errorObject.type}`;
                } else if (!translatedMessage.wasTranslated && codeTitle) {
                    header = codeTitle;
                } else {
                    header = `${errorObject.statusCode} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
                }
                return { warning, text, header, blockErrorData: errorObject.data };
            }
        }

        const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.message));
        header = `${error.statusCode || 500} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
        text = `${translatedMessage.text}`;

        return { warning, text, header };
    }

    private createMessage(result: { warning: any, text: any, header: any, blockErrorData?: any }, error: any) {
        if (result.warning) {
            this.toastService.warn(result.text, 'Waiting for initialization');
        } else {
            if (
                !this.excludeErrorCodes.includes(String(error.status)) &&
                !this.excludeErrorTexts.includes(String(result.text))
            ) {
                this.toastService.error(result.text, result.header, { sticky: true, logMessage: result.text, blockErrorData: result.blockErrorData });
            }
        }
    }

    /**
     * A 401 returned while an access token is attached means that token is no
     * longer accepted (the session has expired). Clear the stale credentials
     * and send the user to the login page. Requests made without a token (the
     * user is already logged out) are left untouched, so this never loops on
     * the login page. The first handled error clears the token, so concurrent
     * 401s from the bootstrap requests skip straight past this.
     */
    private handleExpiredSession(error: any): boolean {
        if (error?.status !== 401) {
            return false;
        }
        const auth = this.injector.get(AuthService);
        if (!auth.getAccessToken()) {
            return false;
        }
        const authState = this.injector.get(AuthStateService);
        authState.clearSession();
        this.router.navigate(['/login']);
        return true;
    }

    public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error: any) => {
                console.error(error);
                if (this.handleExpiredSession(error)) {
                    return throwError(error);
                }
                if (req.context.get(SILENT_HTTP_ERRORS)) {
                    return throwError(error);
                }
                this.getMessage(error).then((result) => {
                    this.createMessage(result, error);
                })
                return throwError(error);
            })
        );
    }
}
