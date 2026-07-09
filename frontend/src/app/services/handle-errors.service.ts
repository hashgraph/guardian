import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { MessageTranslationService } from './message-translation-service/message-translation-service';
import { SILENT_HTTP_ERRORS } from '../constants';
// import { AuthService } from './auth.service';
// import { AuthStateService } from './auth-state.service';

/**
 * Error interceptor.
 */
@Injectable()
export class HandleErrorsService implements HttpInterceptor {
    constructor(
        public router: Router,
        private toastService: ToastService,
        private messageTranslator: MessageTranslationService,
        // private auth: AuthService,
        // private authState: AuthStateService,
    ) {
    }

    excludeErrorCodes: string[] = ['401'];
    excludeErrorTexts: string[] = ['Block Unavailable'];

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
                if (errorObject.type) {
                    header = `${errorObject.statusCode} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : errorObject.type}`;
                } else if (!translatedMessage.wasTranslated && translatedMessage.text.startsWith('Validation failed')) {
                    header = 'Validation failed';
                    text = this.messageToText(translatedMessage.text.replace(/^Validation failed\n+/, ''));
                } else {
                    header = `${errorObject.statusCode} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
                }
                return { warning, text, header };
            }
        }

        const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.message));
        header = `${error.statusCode || 500} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
        text = `${translatedMessage.text}`;

        return { warning, text, header };
    }

    private createMessage(result: { warning: any, text: any, header: any }, error: any) {
        if (result.warning) {
            this.toastService.warn(result.text, 'Waiting for initialization');
        } else {
            if (
                !this.excludeErrorCodes.includes(String(error.status)) &&
                !this.excludeErrorTexts.includes(String(result.text))
            ) {
                this.toastService.error(result.text, result.header, { sticky: true, logMessage: result.text });
            }
        }
    }

    private ifTokenExpired(error:any){
        if( error?.status === 401 && error?.error?.message === 'Token expired') {
            return true;
        }
        return false;
    }

    public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error: any) => {
                console.error(error);
                // if(this.ifTokenExpired(error)) {
                //     this.auth.removeAccessToken();
                //     this.auth.removeUsername();
                //     this.authState.updateState(false);
                //     this.router.navigate(['/login']);
                //     return throwError(error);
                // }
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
