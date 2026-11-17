import { EventEmitter, ViewContainerRef } from '@angular/core';
import { FormTakeoverService } from '../../form-takeover/form-takeover.service';
import { RequestDocumentBlockAddonComponent } from './request-document-block-addon.component';

describe('RequestDocumentBlockAddonComponent reloaded under its open form', () => {
    // The block has a dozen dependencies opening the form does not touch: build it without them.
    const createBlock = () => {
        const form = {
            instance: { closed: new EventEmitter<void>() },
            setInput: vi.fn(),
            changeDetectorRef: { detectChanges: vi.fn() },
            destroy: vi.fn(),
        };
        const formTakeover = new FormTakeoverService();
        formTakeover.setHost({ createComponent: () => form } as unknown as ViewContainerRef);
        const block: any = Object.create(RequestDocumentBlockAddonComponent.prototype);
        block.formTakeover = formTakeover;
        block.dataForm = { reset: vi.fn() };
        return { block, form, formTakeover };
    };

    it('keeps the form open when a pushed update destroys the block that opened it', () => {
        const { block, form, formTakeover } = createBlock();
        block.onDialog();
        expect(formTakeover.active$.value).toBe(true);

        block.ngOnDestroy();

        expect(form.destroy).not.toHaveBeenCalled();
        expect(formTakeover.active$.value).toBe(true);
    });
});
