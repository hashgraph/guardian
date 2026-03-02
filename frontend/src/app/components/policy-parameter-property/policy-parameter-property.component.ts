import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation, } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';
import { PolicyEditableFieldDTO } from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { CodeEditorDialogComponent } from 'src/app/modules/policy-engine/dialogs/code-editor-dialog/code-editor-dialog.component';
import { PolicyBlock } from 'src/app/modules/policy-engine/structures';

/**
 * policy parameter property
 */

@Component({
    selector: '[policy-parameter-property]',
    templateUrl: './policy-parameter-property.component.html',
    styleUrls: ['./policy-parameter-property.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class PolicyParameterPropertyComponent implements OnInit {
    @Input() control!: AbstractControl;
    @Input('block') currentBlock?: PolicyBlock;
    @Input('property') property!: any;
    @Input('collapse') collapse!: any;
    @Input('readonly') readonly!: boolean;
    @Input('config') config: PolicyEditableFieldDTO;
    @Input('offset') offset!: number;
    @Output('update') update = new EventEmitter();
    @Input('isArrayElement') isArrayElement?: boolean;

    rootPath: string;
    pathValue: string;

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

    needUpdate: boolean = true;

    allBlocks: any[] = [];
    childrenBlocks: any[] = [];
    loaded: boolean = false;
    
    constructor(
        private dialog: DialogService,
    ) {
    }

    get isArray(): boolean { return this.control instanceof FormArray; }
    get fc(): FormControl { return this.control as FormControl; }


    get rows(): AbstractControl[] {
        return (this.control as FormArray).controls;
    }

    get group(): FormGroup {
        return this.control as FormGroup;
    }
    
    get pathCtrl(): FormControl {
        return this.group.controls['path'] as FormControl;
    }

    get valueCtrl(): FormControl {
        return this.group.controls['value'] as FormControl;
    }

    addItems() {
        this.needUpdate = true;
        const rows = this.control as FormArray;
        const group: Record<string, FormControl> = {};
        for (const p of this.property?.items?.properties ?? []) {
            group[p.name] = new FormControl('', []);
        }

        rows.push(new FormGroup(group));
        this.update.emit();
    }

    rowGroup(row: AbstractControl): FormGroup {
        return row as FormGroup;
    }

    removeItems(index: number) {
        const rows = this.control as FormArray;

        if (!rows || index < 0 || index >= rows.length) return;

        rows.removeAt(index);
        this.needUpdate = true;
        this.update.emit();
    }

    ngOnInit(): void {
        this.needUpdate = true;

        if (this.property?.type === 'Array') {
            if (!Array.isArray(this.config.value)) {
                this.config.value = [];
            }
        }
    }
    
    onPathPropertyChanged() {
        this.onSave();
    }

    onSave() {
        this.needUpdate = true;
        this.update.emit();
    }

    editCode($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                test: false,
                expression: this.fc.value,
                readonly: this.readonly
            }
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.fc.setValue(result.expression);
                if (result.type === 'save') {
                    this.needUpdate = true;
                    this.update.emit();
                }
            }
        })
    }
}
