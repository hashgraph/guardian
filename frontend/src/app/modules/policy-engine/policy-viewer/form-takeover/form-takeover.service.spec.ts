import { ViewContainerRef } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { FormTakeoverService } from './form-takeover.service';

describe('FormTakeoverService', () => {
    const makeRef = () => ({
        instance: { closed: new EventEmitter<void>() },
        setInput: jasmine.createSpy('setInput'),
        changeDetectorRef: { detectChanges: jasmine.createSpy('detectChanges') },
        destroy: jasmine.createSpy('destroy'),
    });

    const setup = () => {
        const refs = [makeRef(), makeRef()];
        let created = 0;
        const host = { createComponent: () => refs[created++] } as unknown as ViewContainerRef;
        const service = new FormTakeoverService();
        service.setHost(host);
        return { service, refs };
    };

    it('closes an owned form when its owner passes the same ref', () => {
        const { service, refs } = setup();
        const ref = service.open(class {} as any, {});
        service.close(ref);
        expect(refs[0].destroy).toHaveBeenCalled();
        expect(service.active$.value).toBeFalse();
    });

    it('keeps a kept form open when the block closes it', () => {
        const { service, refs } = setup();
        const ref = service.open(class {} as any, {});
        service.keep(ref.instance);
        service.close(ref);
        expect(refs[0].destroy).not.toHaveBeenCalled();
        expect(service.active$.value).toBeTrue();
    });

    it('closes a kept form without an argument', () => {
        const { service, refs } = setup();
        const ref = service.open(class {} as any, {});
        service.keep(ref.instance);
        service.close();
        expect(refs[0].destroy).toHaveBeenCalled();
        expect(service.active$.value).toBeFalse();
    });

    it('replaces a kept form when another one opens', () => {
        const { service, refs } = setup();
        const first = service.open(class {} as any, {});
        service.keep(first.instance);
        service.open(class {} as any, {});
        expect(refs[0].destroy).toHaveBeenCalled();
        expect(service.active$.value).toBeTrue();
        // The new form is not kept
        service.close(refs[1] as any);
        expect(refs[1].destroy).toHaveBeenCalled();
    });

    it('closes a kept form when it emits closed', () => {
        const { service, refs } = setup();
        const ref = service.open(class {} as any, {});
        service.keep(ref.instance);
        refs[0].instance.closed.emit();
        expect(refs[0].destroy).toHaveBeenCalled();
    });

    it('ignores keep for a form that is not open', () => {
        const { service, refs } = setup();
        const ref = service.open(class {} as any, {});
        service.keep({});
        service.close(ref);
        expect(refs[0].destroy).toHaveBeenCalled();
    });
});
