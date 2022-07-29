import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

@Injectable({
  providedIn: 'root'
})
export class InformService {

  constructor(private toastr: ToastrService, private messageTranslator: MessageTranslationService) { }

  public processAsyncError(error: any) {
    const translatedMessage = this.messageTranslator.translateMessage(
        this.messageToText(error.message)
    );
    const header = `${error.code} ${
        translatedMessage.wasTranslated
            ? 'Hedera transaction failed'
            : 'Other Error'
    }`;
    let text;
    if (error.message) {
        text = `<div>${
            translatedMessage.text
        }</div><div>${this.messageToText(error.error)}</div>`;
    } else {
        text = `${error.error}`;
    }
    this.toastr.error(text, header, {
        timeOut: 30000,
        closeButton: true,
        positionClass: 'toast-bottom-right',
        enableHtml: true,
    });
  }

  private messageToText(message: any) {
      if (typeof message === 'object') {
          return JSON.stringify(message, null, 2);
      }
      return message;
  }
}
