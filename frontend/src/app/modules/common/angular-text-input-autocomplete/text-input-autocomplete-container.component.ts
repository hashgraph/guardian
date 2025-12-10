import { Component, ContentChild, TemplateRef } from '@angular/core';

@Component({
    selector: 'mwl-text-input-autocomplete-container',
    styles: [
        `
            :host {
                position: relative;
                display: block;
            }
        `
    ],
    template: '<ng-content></ng-content>'
})
export class TextInputAutocompleteContainerComponent {
    @ContentChild('itemTemplate') itemTemplate?: TemplateRef<any>;
}
