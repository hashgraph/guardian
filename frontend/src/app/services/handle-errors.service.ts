import { Injectable } from "@angular/core";
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";
import { MessageTranslationService } from './message-translation-service/message-translation-service';

/**
 * Error interceptor.
 */
@Injectable()
export class HandleErrorsService implements HttpInterceptor {
    constructor(
        public router: Router,
        private toastr: ToastrService,
        private messageTranslator: MessageTranslationService
    ) {
    }

    messageToText(message: any) {
        if (typeof message === 'object') {
            return JSON.stringify(message, null, 2);
        }
        return message;
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error) => {
                console.error(error);
                let header = "";
                let text = "";
                if (typeof error.error === 'string') {
                    const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.message));
                    header = `${error.status} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : error.statusText}`;
                    if (error.message) {
                        text = `<div>${translatedMessage.text}</div><div>${this.messageToText(error.error)}</div>`;
                    } else {
                        text = `${error.error}`;
                    }
                } else if (typeof error.error === 'object') {
                    if (typeof error.error.text == 'function') {
                        error.error.text().then((e: string) => {
                            const error = JSON.parse(e);
                            const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.message));
                            const header = `${error.code} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
                            let text;
                            if (error.message) {
                                text = `<div>${translatedMessage.text}</div><div>${this.messageToText(error.error)}</div>`;
                            } else {
                                text = `${error.error}`;
                            }
                            this.toastr.error(text, header, {
                                timeOut: 30000,
                                closeButton: true,
                                positionClass: 'toast-bottom-right',
                                enableHtml: true
                            });
                        });
                        return throwError(error.message);
                    }
                    const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.error.message));

                    if (error.error.uuid) {
                        text = `<div>${this.messageToText(translatedMessage.text)}</div><div>${error.error.uuid}</div>`;
                    } else {
                        text = `${this.messageToText(translatedMessage.text)}`;
                    }
                    if (error.error.type) {
                        header = `${error.error.code} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : error.error.type}`;
                    } else {
                        header = `${error.error.code} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
                    }
                } else {
                    const translatedMessage = this.messageTranslator.translateMessage(this.messageToText(error.message));
                    header = `${error.code} ${(translatedMessage.wasTranslated) ? 'Hedera transaction failed' : 'Other Error'}`;
                    text = `${translatedMessage.text}`;
                }
                if (error.error.code === 0) {
                    this.toastr.warning(text, 'Waiting for initialization', {
                        timeOut: 30000,
                        closeButton: true,
                        positionClass: 'toast-bottom-right',
                        enableHtml: true
                    });
                    return throwError(error.message);
                }
                this.toastr.error(text, header, {
                    timeOut: 30000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true
                });
                return throwError(error.message);
            })
        );
    }
}
