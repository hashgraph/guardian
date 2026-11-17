import type { MockedObject } from "vitest";
import { HttpRequest } from '@angular/common/http';
import { Injector } from '@angular/core';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { HandleErrorsService } from './handle-errors.service';
import { ToastService } from './toast.service';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

describe('HandleErrorsService', () => {
    let toast: MockedObject<ToastService>;
    let service: HandleErrorsService;

    beforeEach(() => {
        toast = {
            error: vi.fn().mockName("ToastService.error"),
            warn: vi.fn().mockName("ToastService.warn")
        } as unknown as MockedObject<ToastService>;
        const translator = {
            translateMessage: vi.fn().mockName("MessageTranslationService.translateMessage")
        } as unknown as MockedObject<MessageTranslationService>;
        translator.translateMessage.mockImplementation((text: string) => ({ wasTranslated: false, text, message: text }));
        service = new HandleErrorsService({
            navigate: vi.fn().mockName("Router.navigate")
        } as any, toast, translator, {
            get: vi.fn().mockName("Injector.get")
        } as any);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    function failWith(data: unknown): void {
        const error = { status: 422, error: { message: 'Missing calculation inputs', statusCode: 422, data } };
        service.intercept(new HttpRequest('POST', '/api/v1/test', null), { handle: () => throwError(() => error) })
            .subscribe({ error: () => undefined });
        flushMicrotasks();
    }

    it('shows a server error as a sticky toast when the server does not say otherwise', fakeAsync(() => {
        failWith({ code: 'SOME_ERROR' });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(vi.mocked(toast.error).mock.lastCall![2]).toEqual(expect.objectContaining({ sticky: true }));
    }));

    it('shows a server error as a temporary toast when the server sends sticky false', fakeAsync(() => {
        failWith({ preview: true, notLogged: true, sticky: false, fields: ['field0'], missingFields: ['field0'] });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(vi.mocked(toast.error).mock.lastCall![2]).toEqual(expect.objectContaining({ sticky: false, logMessage: undefined }));
    }));
});
