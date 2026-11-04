import { HttpRequest } from '@angular/common/http';
import { Injector } from '@angular/core';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { HandleErrorsService } from './handle-errors.service';
import { ToastService } from './toast.service';
import { MessageTranslationService } from './message-translation-service/message-translation-service';

describe('HandleErrorsService', () => {
    let toast: jasmine.SpyObj<ToastService>;
    let service: HandleErrorsService;

    beforeEach(() => {
        toast = jasmine.createSpyObj<ToastService>('ToastService', ['error', 'warn']);
        const translator = jasmine.createSpyObj<MessageTranslationService>('MessageTranslationService', ['translateMessage']);
        translator.translateMessage.and.callFake((text: string) => ({ wasTranslated: false, text, message: text }));
        service = new HandleErrorsService(
            jasmine.createSpyObj<Router>('Router', ['navigate']),
            toast,
            translator,
            jasmine.createSpyObj<Injector>('Injector', ['get'])
        );
        spyOn(console, 'error');
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
        expect(toast.error.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ sticky: true }));
    }));

    it('shows a server error as a temporary toast when the server sends sticky false', fakeAsync(() => {
        failWith({ preview: true, notLogged: true, sticky: false, fields: ['field0'], missingFields: ['field0'] });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error.calls.mostRecent().args[2]).toEqual(jasmine.objectContaining({ sticky: false, logMessage: undefined }));
    }));
});
