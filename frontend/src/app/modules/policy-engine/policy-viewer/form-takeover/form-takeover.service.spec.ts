import { ViewContainerRef } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { FormTakeoverService } from './form-takeover.service';

describe('FormTakeoverService', () => {
    const makeRef = () => ({
        instance: { closed: new EventEmitter<void>() },
        setInput: vi.fn(),
        changeDetectorRef: { detectChanges: vi.fn() },
        destroy: vi.fn(),
    });

    const setup = () => {
        const refs = [makeRef(), makeRef()];
        let created = 0;
        const host = { createComponent: () => refs[created++] } as unknown as ViewContainerRef;
        const service = new FormTakeoverService();
        service.setHost(host);
        return { service, refs };
    };

    it('closes the open form', () => {
        const { service, refs } = setup();
        service.open(class {
        } as any, {});
        service.close();
        expect(refs[0].destroy).toHaveBeenCalled();
        expect(service.active$.value).toBe(false);
    });

    it('replaces the open form when another one opens', () => {
        const { service, refs } = setup();
        service.open(class {
        } as any, {});
        service.open(class {
        } as any, {});
        expect(refs[0].destroy).toHaveBeenCalled();
        expect(refs[1].destroy).not.toHaveBeenCalled();
        expect(service.active$.value).toBe(true);
    });

    it('closes the form when it emits closed', () => {
        const { service, refs } = setup();
        service.open(class {
        } as any, {});
        refs[0].instance.closed.emit();
        expect(refs[0].destroy).toHaveBeenCalled();
        expect(service.active$.value).toBe(false);
    });
});
