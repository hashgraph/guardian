import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { ToastService } from './toast.service';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

describe('ToastService', () => {
    let service: ToastService;
    let messageService: jasmine.SpyObj<MessageService>;
    let translator: jasmine.SpyObj<MessageTranslationService>;

    beforeEach(() => {
        messageService = jasmine.createSpyObj('MessageService', ['add', 'clear']);
        translator = jasmine.createSpyObj('MessageTranslationService', ['translateMessage']);
        translator.translateMessage.and.returnValue({ wasTranslated: false, text: 'raw', message: 'raw' });

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
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({
                severity: 'success',
                detail: 'Done',
                summary: 'OK',
                life: 3000,
            }));
        });

        it('uses empty string as default summary', () => {
            service.info('Hello');
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ summary: '' }));
        });
    });

    describe('warn / error — timing', () => {
        it('is transient by default', () => {
            service.warn('Watch out');
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ life: 3000 }));
        });

        it('is sticky when option is set', () => {
            service.warn('Watch out', '', { sticky: true });
            const call = messageService.add.calls.mostRecent().args[0] as any;
            expect(call.sticky).toBeTrue();
            expect(call.life).toBeUndefined();
        });
    });

    describe('logUrl derivation', () => {
        it('derives logUrl from logMessage via btoa', () => {
            service.error('boom', '', { logMessage: 'boom' });
            const call = messageService.add.calls.mostRecent().args[0] as any;
            expect(call.data.logUrl).toBe(`/admin/logs?message=${btoa('boom')}`);
        });

        it('uses logUrl directly when provided', () => {
            service.error('boom', '', { logUrl: '/admin/logs?message=foo' });
            const call = messageService.add.calls.mostRecent().args[0] as any;
            expect(call.data.logUrl).toBe('/admin/logs?message=foo');
        });

        it('has no logUrl when neither option is set', () => {
            service.error('boom');
            const call = messageService.add.calls.mostRecent().args[0] as any;
            expect(call.data.logUrl).toBeUndefined();
        });
    });

    describe('processAsyncError', () => {
        it('uses message from Error object', () => {
            translator.translateMessage.and.returnValue({ wasTranslated: false, text: 'network failure', message: 'network failure' });
            service.processAsyncError(new Error('network failure'));
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({
                severity: 'error',
                detail: 'network failure',
            }));
        });

        it('uses plain string directly', () => {
            translator.translateMessage.and.returnValue({ wasTranslated: false, text: 'plain', message: 'plain' });
            service.processAsyncError('plain');
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ detail: 'plain' }));
        });

        it('sets summary to "Hedera transaction failed" when message is recognised', () => {
            translator.translateMessage.and.returnValue({ wasTranslated: true, text: 'Friendly text', message: 'raw' });
            service.processAsyncError({ message: 'raw' });
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({
                summary: 'Hedera transaction failed',
            }));
        });

        it('uses "Other Error" summary for unrecognised messages', () => {
            translator.translateMessage.and.returnValue({ wasTranslated: false, text: 'raw', message: 'raw' });
            service.processAsyncError({ message: 'raw' });
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({
                summary: 'Other Error',
            }));
        });

        it('prefixes error code in summary when present', () => {
            translator.translateMessage.and.returnValue({ wasTranslated: false, text: 'raw', message: 'raw' });
            service.processAsyncError({ message: 'raw', code: 'TIMEOUT' });
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({
                summary: 'TIMEOUT Other Error',
            }));
        });

        it('is always sticky', () => {
            service.processAsyncError('oops');
            const call = messageService.add.calls.mostRecent().args[0] as any;
            expect(call.sticky).toBeTrue();
        });

        it('derives logUrl from the error detail', () => {
            translator.translateMessage.and.returnValue({ wasTranslated: false, text: 'oops', message: 'oops' });
            service.processAsyncError('oops');
            const call = messageService.add.calls.mostRecent().args[0] as any;
            expect(call.data.logUrl).toBe(`/admin/logs?message=${btoa('oops')}`);
        });
    });

    describe('sticky', () => {
        it('adds a non-closable sticky message with the given key', () => {
            service.sticky('info', 'Reconnecting…', 'WS', 'ws-reconnect-sticky');
            expect(messageService.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({
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
            expect(messageService.clear).toHaveBeenCalledOnceWith('ws-reconnect-sticky');
        });
    });
});
