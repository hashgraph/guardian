import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { ToastService } from './toast.service';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

describe('ToastService', () => {
    let service: ToastService;
    let messageService: MockedObject<MessageService>;
    let translator: MockedObject<MessageTranslationService>;

    beforeEach(() => {
        messageService = {
            add: vi.fn().mockName("MessageService.add"),
            clear: vi.fn().mockName("MessageService.clear")
        } as unknown as MockedObject<MessageService>;
        translator = {
            translateMessage: vi.fn().mockName("MessageTranslationService.translateMessage")
        } as unknown as MockedObject<MessageTranslationService>;
        translator.translateMessage.mockReturnValue({ wasTranslated: false, text: 'raw', message: 'raw' });

        TestBed.configureTestingModule({
            providers: [
                ToastService,
                { provide: MessageService, useValue: messageService },
                { provide: MessageTranslationService, useValue: translator },
            ],
        });

        service = TestBed.inject(ToastService);
    });

    describe('success / info', () => {
        it('adds a transient success message', () => {
            service.success('Done', 'OK');
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
                severity: 'success',
                detail: 'Done',
                summary: 'OK',
                life: 3000,
            }));
        });

        it('uses empty string as default summary', () => {
            service.info('Hello');
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ summary: '' }));
        });
    });

    describe('warn / error — timing', () => {
        it('is transient by default', () => {
            service.warn('Watch out');
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ life: 3000 }));
        });

        it('is sticky when option is set', () => {
            service.warn('Watch out', '', { sticky: true });
            const call = vi.mocked(messageService.add).mock.lastCall![0] as any;
            expect(call.sticky).toBe(true);
            expect(call.life).toBeUndefined();
        });
    });

    describe('logUrl derivation', () => {
        it('derives logUrl from logMessage via btoa', () => {
            service.error('boom', '', { logMessage: 'boom' });
            const call = vi.mocked(messageService.add).mock.lastCall![0] as any;
            expect(call.data.logUrl).toBe(`/admin/logs?message=${btoa('boom')}`);
        });

        it('uses logUrl directly when provided', () => {
            service.error('boom', '', { logUrl: '/admin/logs?message=foo' });
            const call = vi.mocked(messageService.add).mock.lastCall![0] as any;
            expect(call.data.logUrl).toBe('/admin/logs?message=foo');
        });

        it('has no logUrl when neither option is set', () => {
            service.error('boom');
            const call = vi.mocked(messageService.add).mock.lastCall![0] as any;
            expect(call.data.logUrl).toBeUndefined();
        });
    });

    describe('processAsyncError', () => {
        it('uses message from Error object', () => {
            translator.translateMessage.mockReturnValue({ wasTranslated: false, text: 'network failure', message: 'network failure' });
            service.processAsyncError(new Error('network failure'));
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
                severity: 'error',
                detail: 'network failure',
            }));
        });

        it('uses plain string directly', () => {
            translator.translateMessage.mockReturnValue({ wasTranslated: false, text: 'plain', message: 'plain' });
            service.processAsyncError('plain');
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ detail: 'plain' }));
        });

        it('sets summary to "Hedera transaction failed" when message is recognised', () => {
            translator.translateMessage.mockReturnValue({ wasTranslated: true, text: 'Friendly text', message: 'raw' });
            service.processAsyncError({ message: 'raw' });
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
                summary: 'Hedera transaction failed',
            }));
        });

        it('uses "Other Error" summary for unrecognised messages', () => {
            translator.translateMessage.mockReturnValue({ wasTranslated: false, text: 'raw', message: 'raw' });
            service.processAsyncError({ message: 'raw' });
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
                summary: 'Other Error',
            }));
        });

        it('prefixes error code in summary when present', () => {
            translator.translateMessage.mockReturnValue({ wasTranslated: false, text: 'raw', message: 'raw' });
            service.processAsyncError({ message: 'raw', code: 'TIMEOUT' });
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
                summary: 'TIMEOUT Other Error',
            }));
        });

        it('is always sticky', () => {
            service.processAsyncError('oops');
            const call = vi.mocked(messageService.add).mock.lastCall![0] as any;
            expect(call.sticky).toBe(true);
        });

        it('derives logUrl from the error detail', () => {
            translator.translateMessage.mockReturnValue({ wasTranslated: false, text: 'oops', message: 'oops' });
            service.processAsyncError('oops');
            const call = vi.mocked(messageService.add).mock.lastCall![0] as any;
            expect(call.data.logUrl).toBe(`/admin/logs?message=${btoa('oops')}`);
        });
    });

    describe('sticky', () => {
        it('adds a non-closable sticky message with the given key', () => {
            service.sticky('info', 'Reconnecting…', 'WS', 'ws-reconnect-sticky');
            expect(messageService.add).toHaveBeenCalledTimes(1);
            expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({
                severity: 'info',
                detail: 'Reconnecting…',
                summary: 'WS',
                key: 'ws-reconnect-sticky',
                sticky: true,
                closable: false,
            }));
        });
    });

    describe('clearKey', () => {
        it('delegates to MessageService.clear', () => {
            service.clearKey('ws-reconnect-sticky');
            expect(messageService.clear).toHaveBeenCalledTimes(1);
            expect(messageService.clear).toHaveBeenCalledWith('ws-reconnect-sticky');
        });
    });
});
