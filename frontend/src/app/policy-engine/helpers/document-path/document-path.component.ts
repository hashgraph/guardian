import { Component, EventEmitter, Inject, Input, Output, SimpleChanges } from '@angular/core';

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'document-path',
    templateUrl: './document-path.component.html',
    styleUrls: ['./document-path.component.css']
})
export class DocumentPath {
    @Input('value') value!: string;
    @Input('displayTooltip') displayTooltip!: boolean;
    @Input('readonly') readonly!: boolean;

    @Output('valueChange') valueChange = new EventEmitter<string>();
    @Output('change') change = new EventEmitter<string>();

    startPath: string = '';
    endPath: string = '';

    map = [
        { value: "", name: "Root" },
        { value: "document.", name: "Document" },
        { value: "document.credentialSubject.", name: "Credential Subjects" },
        { value: "document.credentialSubject.0.", name: "First Credential Subjects" },
        { value: "document.credentialSubject.L.", name: "Last Credential Subjects" },
        { value: "document.verifiableCredential.", name: "Verifiable Credentials" },
        { value: "document.verifiableCredential.0.", name: "First Verifiable Credential" },
        { value: "document.verifiableCredential.L.", name: "Last Verifiable Credential" },
        { value: "option.", name: "Attributes" },
    ]

    constructor() {
    }

    onChange() {
        this.value = this.startPath + this.endPath;
        this.valueChange.emit(this.value);
        this.change.emit(this.value);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.value) {
            for (const item of this.map) {
                if (this.value.startsWith(item.value)) {
                    this.startPath = item.value;
                    this.endPath = this.value.substring(item.value.length);
                }
            }
        } else {
            this.startPath = '';
            this.endPath = '';
        }
    }

    onInput() {
        setTimeout(() => {
            this.onChange();
        });
    }
}