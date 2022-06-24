import { Injectable } from '@angular/core';
import { MessagesMap } from './message-store';

@Injectable({
    providedIn: 'root'
})
export class MessageTranslationService {
    private messagesMap = MessagesMap;
    private regExpMap = new Map();

    constructor() {
        this.generateRegExpMap();
        console.log(this);
    }

    private generateRegExpMap(): void {
        for (let key of this.messagesMap.keys()) {
            this.regExpMap.set(
                new RegExp(`^.+${key}.*$`),
                key
            )
        }
    }

    public translateMessage(message: string): { wasTranslated: boolean, text: string } {
        for (let [re, key] of this.regExpMap.entries()) {
            if (re.test(message)) {
                return {
                    wasTranslated: true,
                    text: this.messagesMap.get(key)
                };
            }
        }
        return {
            wasTranslated: false,
            text: message
        };
    }
}
