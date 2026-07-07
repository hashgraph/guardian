import { Injectable } from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({
    providedIn: 'root'
})
export class ToastService {

    private readonly TRANSIENT_LIFE = 3000;

    constructor(
        private messageService: MessageService,
        private messageTranslator: MessageTranslationService
    ) {}

    public success(detail: string, summary = ''): void {
        this.add('success', detail, summary, { life: this.TRANSIENT_LIFE });
    }

    public info(detail: string, summary = ''): void {
        this.add('info', detail, summary, { life: this.TRANSIENT_LIFE });
    }

    public warn(detail: string, summary = '', logMessage?: string): void {
        const logUrl = logMessage ? `/admin/logs?message=${btoa(logMessage)}` : undefined;
        this.add('warn', detail, summary, { sticky: true, data: { logUrl } });
    }

    public error(detail: string, summary = '', logMessage?: string): void {
        const logUrl = logMessage ? `/admin/logs?message=${btoa(logMessage)}` : undefined;
        this.add('error', detail, summary, { sticky: true, data: { logUrl } });
    }

    public processAsyncError(error: any): void {
        const msg = typeof error === 'string' ? error : (error?.message ?? String(error));
        const translated = this.messageTranslator.translateMessage(msg);
        const summary = (error?.code ? `${error.code} ` : '') +
            (translated.wasTranslated ? 'Hedera transaction failed' : 'Other Error');
        this.error(translated.text || 'Unknown error', summary);
    }

    public sticky(severity: 'info' | 'error', detail: string, summary: string, key: string): void {
        this.add(severity, detail, summary, { sticky: true, closable: false, key });
    }

    public clearKey(key: string): void {
        this.messageService.clear(key);
    }

    private add(severity: ToastSeverity, detail: string, summary: string, options: Partial<ToastMessageOptions> = {}): void {
        this.messageService.add({ severity, summary, detail, closable: true, ...options });
    }
}
