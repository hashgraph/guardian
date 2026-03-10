import {
    Component,
    EventEmitter,
    forwardRef,
    Input,
    Output,
    SimpleChanges
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR
} from '@angular/forms';

@Component({
    selector: 'app-paramter-document-path',
    templateUrl: './parameter-document-path.component.html',
    styleUrls: ['./parameter-document-path.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ParameterDocumentPath),
            multi: true
        }
    ]
})
export class ParameterDocumentPath implements ControlValueAccessor {
    @Input() displayTooltip!: boolean;
    @Input() readonly!: boolean;

    @Output() valueChange = new EventEmitter<string>();
    @Output() change = new EventEmitter<string>();

    value: string = '';
    startPath: string = '';
    endPath: string = '';
    disabled = false;
    pathOptions = [
        { label: 'Root', value: '', title: ' ' },
        { label: 'Document', value: 'document.', title: 'document.' },
        { label: 'Credential Subjects', value: 'document.credentialSubject.', title: 'document.credentialSubject.' },
        { label: 'First Credential Subjects', value: 'document.credentialSubject.0.', title: 'document.credentialSubject.0.' },
        { label: 'Last Credential Subjects', value: 'document.credentialSubject.L.', title: 'document.credentialSubject.L.' },
        { label: 'Verifiable Credentials', value: 'document.verifiableCredential.', title: 'document.verifiableCredential.' },
        { label: 'First Verifiable Credential', value: 'document.verifiableCredential.0.', title: 'document.verifiableCredential.0.' },
        { label: 'Last Verifiable Credential', value: 'document.verifiableCredential.L.', title: 'document.verifiableCredential.L.' },
        { label: 'Attributes', value: 'option.', title: 'option.' }
    ];
    map = [
        { value: '', name: 'Root' },
        { value: 'document.', name: 'Document' },
        { value: 'document.credentialSubject.', name: 'Credential Subjects' },
        { value: 'document.credentialSubject.0.', name: 'First Credential Subjects' },
        { value: 'document.credentialSubject.L.', name: 'Last Credential Subjects' },
        { value: 'document.verifiableCredential.', name: 'Verifiable Credentials' },
        { value: 'document.verifiableCredential.0.', name: 'First Verifiable Credential' },
        { value: 'document.verifiableCredential.L.', name: 'Last Verifiable Credential' },
        { value: 'option.', name: 'Attributes' }
    ];

    private onTouched: () => void = () => {};
    private onChangeFn: (value: string) => void = () => {};

    constructor() {}

    writeValue(value: string | null): void {
        this.value = value ?? '';
        this.applyValueToParts(this.value);
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChangeFn = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['readonly']) {
            return;
        }

        this.applyValueToParts(this.value);
    }

    onInternalChange(): void {
        const newValue = `${this.startPath ?? ''}${this.endPath ?? ''}`;
        this.value = newValue;

        this.onChangeFn(this.value);
        this.valueChange.emit(this.value);
        this.change.emit(this.value);
    }

    onInput(): void {
        this.onInternalChange();
    }

    onBlur(): void {
        this.onTouched();
    }

    private applyValueToParts(value: string): void {
        if (!value) {
            this.startPath = '';
            this.endPath = '';
            return;
        }

        let matched = '';

        for (const item of this.map) {
            if (value.startsWith(item.value) && item.value.length >= matched.length) {
                matched = item.value;
            }
        }

        this.startPath = matched;
        this.endPath = value.substring(matched.length);
    }
}