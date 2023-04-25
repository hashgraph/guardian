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
    }

    private generateRegExpMap(): void {
        for (let key of this.messagesMap.keys()) {
            this.regExpMap.set(
                new RegExp(`^.+${key}.*$`),
                key
            )
        }
    }

    private getOperatorIdFromMessage(message: string): string {
        const operatorId = /^.+(\d+\.\d+\.\d+)@\d+\.\d+.+/.exec(message);
        if (!operatorId) {
            return '';
        }
        return operatorId[1];

    }

    public translateMessage(message: string): {
        wasTranslated: boolean,
        text: string,
        message: string
    } {
        for (const [re, key] of this.regExpMap.entries()) {
            if (re.test(message)) {
                let text = this.messagesMap.get(key);
                const operatorId = this.getOperatorIdFromMessage(message)
                if (operatorId) {
                    text += ` (OPERATOR_ID: ${operatorId})`;
                }

                return {
                    wasTranslated: true,
                    text,
                    message
                };
            }
        }
        return {
            wasTranslated: false,
            text: message,
            message
        };
    }
}
