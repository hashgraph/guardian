import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

@Injectable({
    providedIn: 'root'
})
export class InformService {

    constructor(private toastr: ToastrService, private messageTranslator: MessageTranslationService) { }

    public processAsyncError(error: any) {
        const translatedMessage = this.messageTranslator.translateMessage(error.message);

        let header = '';
        if (error.code) {
            header += `${error.code} `;
        }
        if (translatedMessage.wasTranslated) {
            header += 'Hedera transaction failed';
        } else {
            header += 'Other Error';
        }
        let text;
        if (error.message) {
            text = `${translatedMessage.text}`;
        } else {
            text = `Unknown error`;
        }

        const body = `
            <div>${text}</div>
            <div>See <a style="color: #0B73F8" href="/admin/logs?message=${btoa(text)}">logs</a> for details.</div>
        `;

        this.toastr.error(body, header, {
            timeOut: 100000,
            extendedTimeOut: 30000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            toastClass: 'ngx-toastr error-message-toastr',
            enableHtml: true,
        });
    }

    public errorMessage(text: string, header: string) {
        const body = `
            <div>${text}</div>
            <div>See <a style="color: #0B73F8" href="/admin/logs?message=${btoa(text)}">logs</a> for details.</div>
        `;
        this.toastr.error(body, header, {
            timeOut: 100000,
            extendedTimeOut: 30000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            toastClass: 'ngx-toastr error-message-toastr',
            enableHtml: true,
        });
    }

    public errorShortMessage(text: string, header: string) {
        const body = `
            <div>${text}</div>
        `;
        this.toastr.error(body, header, {
            timeOut: 100000,
            extendedTimeOut: 30000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            toastClass: 'ngx-toastr error-message-toastr',
            enableHtml: true,
        });
    }
}
