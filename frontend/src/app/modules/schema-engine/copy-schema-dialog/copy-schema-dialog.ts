import {ChangeDetectorRef, Component, Inject, ViewChild} from '@angular/core';
import {SchemaConfigurationComponent} from '../schema-configuration/schema-configuration.component';
import {Schema} from '@guardian/interfaces';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import { SchemaType } from '../../policy-engine/structures/types/schema-type.type';

/**
 * Dialog for creating and editing schemas.
 */
@Component({
    selector: 'copy-schema-dialog',
    templateUrl: './copy-schema-dialog.html',
    styleUrls: ['./copy-schema-dialog.scss']
})
export class CopySchemaDialog {
    @ViewChild('document') schemaControl!: SchemaConfigurationComponent;

    public scheme: Schema;
    public started: boolean = false;
    public type: 'new' | 'edit' | 'version' = 'new';
    public topicId: any;
    public schemaType: any;
    public valid: boolean = true;
    public extended: boolean = false;
    public fields: any[] = [];
    public restoreData: any = null;

    public policies: any[];
    public modules: any[];
    public tools: any[];

    public dataForm!: UntypedFormGroup;

    public defaultPolicyOption = {topicId: 'draft', name: 'No binding'};
    public defaultToolOption = {topicId: 'draft', name: 'No binding'};
    public defaultEntityOption = {value: '', label: 'No binding'};
    public entities = [
        {value: 'STANDARD_REGISTRY', label: 'STANDARD REGISTRY'},
        {value: 'USER', label: 'USER'}
    ];

    constructor(
        private cdr: ChangeDetectorRef,
        private fb: UntypedFormBuilder,
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const data = this.config.data

        this.scheme = data.scheme || null;
        this.type = data.type || null;
        this.topicId = data.topicId || null;
        this.schemaType = data.schemaType || 'policy';
        this.policies = data.policies || [];
        this.modules = data.modules || [];
        this.tools = data.tools || [];
    }

    public get isSystem(): boolean {
        return this.dataForm?.get('schemaType')?.value === SchemaType.System;
    }

    public get isTag(): boolean {
        return this.dataForm?.get('schemaType')?.value === SchemaType.Tag;
    }

    public get isModule(): boolean {
        return this.dataForm?.get('schemaType')?.value === SchemaType.Module;
    }

    public get isTool(): boolean {
        return this.dataForm?.get('schemaType')?.value === SchemaType.Tool;
    }

    public get isPolicy(): boolean {
        return (
            this.dataForm?.get('schemaType')?.value !== SchemaType.System &&
            this.dataForm?.get('schemaType')?.value !== SchemaType.Tag &&
            this.dataForm?.get('schemaType')?.value !== SchemaType.Module &&
            this.dataForm?.get('schemaType')?.value !== SchemaType.Tool
        );
    }

    ngOnInit(): void {
        this.dataForm = this.fb.group({
            name: this.scheme.name,
            schemaType: this.fb.control(this.schemaType),
            topicId: this.fb.control(this.scheme.topicId),
            copyNested: true,
        });
    }

    public onFilter(event: any) {
        const topicId = event.value;
        console.log(topicId);
    }

    public onChangeType(event: any) {
        console.log(event);
        // this.schemaType = event.value;
    }

    getDocument(schema: Schema | null) {
        this.dialogRef.close(schema);
    }

    onClose() {
        this.dialogRef.close(null);
    }

    onCreate() {
        const topicId = this.dataForm.get('topicId')?.value;
        const name = this.dataForm.get('name')?.value;
        const iri = this.scheme.iri;
        const copyNested = this.dataForm.get('copyNested')?.value;
        this.dialogRef.close({
            topicId, name, iri, copyNested
        });
    }

    onChangeForm(schemaControl: SchemaConfigurationComponent) {
        this.valid = schemaControl.isValid();
    }

    onChangeFields(fields: any[]) {
        this.fields = fields;
        this.cdr.detectChanges();
    }

    drop(event: CdkDragDrop<any[]>) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }

    onRestoreClick() {
        this.scheme = this.restoreData;
        this.restoreData = null;
    }

    getPoliciesWithDefault(): Record<string, any>[] {
        return [...this.policies];
    }

    getToolsWithDefault(): Record<string, any>[] {
        return [this.defaultToolOption, ...this.tools];
    }

    getEntitiesWithDefault(): Record<string, any>[] {
        return [this.defaultEntityOption, ...this.entities];
    }
}
