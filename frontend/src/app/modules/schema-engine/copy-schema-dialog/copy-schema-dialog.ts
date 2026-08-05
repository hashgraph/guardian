import {Component} from '@angular/core';
import {Schema} from '@guardian/interfaces';
import {UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import { SchemaType } from '../../policy-engine/structures/types/schema-type.type';

@Component({
    selector: 'copy-schema-dialog',
    templateUrl: './copy-schema-dialog.html',
    styleUrls: ['./copy-schema-dialog.scss'],
    standalone: false
})
export class CopySchemaDialog {
    public scheme: Schema;
    public type: 'new' | 'edit' | 'version' = 'new';
    public topicId: any;
    public schemaType: any;

    public policies: any[];
    public tools: any[];

    public dataForm!: UntypedFormGroup;

    public defaultToolOption = {topicId: 'draft', name: 'No binding'};
    public defaultEntityOption = {value: '', label: 'No binding'};
    public entities = [
        {value: 'STANDARD_REGISTRY', label: 'STANDARD REGISTRY'},
        {value: 'USER', label: 'USER'}
    ];

    constructor(
        private fb: UntypedFormBuilder,
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const data = this.config.data;
        this.scheme = data.scheme || null;
        this.type = data.type || null;
        this.topicId = data.topicId || null;
        this.schemaType = data.schemaType || 'policy';
        this.policies = data.policies || [];
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

    onClose() {
        this.dialogRef.close(null);
    }

    onCreate() {
        const topicId = this.dataForm.get('topicId')?.value;
        const name = this.dataForm.get('name')?.value;
        const iri = this.scheme.iri;
        const copyNested = this.dataForm.get('copyNested')?.value;
        this.dialogRef.close({ topicId, name, iri, copyNested });
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
