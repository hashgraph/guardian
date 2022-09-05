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
            text = `
                <div>${translatedMessage.text}</div>
            `;
        } else {
            text = `Unknown error`;
        }

        this.toastr.error(text, header, {
            timeOut: 30000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            enableHtml: true,
        });
    }

}
