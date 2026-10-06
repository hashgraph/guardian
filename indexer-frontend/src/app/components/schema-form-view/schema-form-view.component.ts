import {
    DatePipe,
    JsonPipe,
    NgFor,
    NgIf,
    NgSwitch,
    NgSwitchCase,
} from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
} from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { SchemaField, Schema } from '@indexer/interfaces';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DialogService } from 'primeng/dynamicdialog';
import { FormulasViewDialog } from '../../dialogs/formulas-view-dialog/formulas-view-dialog.component';
import {TableViewerComponent} from '../table-viewer/table-viewer.component';
import { isSafeHref, withNewTabLinks } from './rich-text-view';
import { collectImageReferences, markdownToHtml } from './markdown-view';
import { EntitiesService } from '@services/entities.service';

/**
 * Form view by schema
 */
@Component({
    selector: 'app-schema-form-view',
    templateUrl: './schema-form-view.component.html',
    styleUrls: ['./schema-form-view.component.scss'],
    standalone: true,
    imports: [
        InputTextModule,
        NgIf,
        NgFor,
        NgSwitch,
        NgSwitchCase,
        DatePipe,
        JsonPipe,
        CheckboxModule,
        FormsModule,
        InputTextareaModule,
        FormulasViewDialog,
        TableViewerComponent,
    ],
    providers: [DialogService],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemaFormViewComponent {
    @Input('private-fields') hide: { [x: string]: boolean } = {};
    @Input('schema') schema?: Schema;
    @Input('fields') schemaFields!: SchemaField[];
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('values') values: any;
    @Input() formulas?: any;
    @Input('analytics') analytics?: any;

    fields: any[] | undefined = [];
    pageSize: number = 20;

    private resolvedImages = new Map<string, string | null>();
    private pendingImages = new Map<string, Promise<string | null>>();

    constructor(
        private dialogService: DialogService,
        private entitiesService: EntitiesService,
        private changeDetector: ChangeDetectorRef
    ) { }

    isBooleanView(item: boolean | any): string {
        return typeof item === 'boolean' ? String(item) : 'Unset';
    }

    ngOnChanges() {
        this.hide = this.hide || {};
        if (this.schemaFields) {
            this.update(this.schemaFields);
            return;
        } else if (this.schema) {
            this.update(this.schema.fields);
            return;
        }
        this.update();
    }

    update(schemaFields?: SchemaField[]) {
        if (!schemaFields) {
            return;
        }

        const fields: any[] = [];
        for (const field of schemaFields) {
            if (this.hide[field.name]) {
                continue;
            }
            const item: any = {
                ...field,
                fullPath: field.fullPath || '',
                hide: false,
                isInvalidType: false,
            };
            if (!field.isArray && !field.isRef) {
                item.value =
                    !this.values ||
                        this.values[item.name] === null ||
                        this.values[item.name] === undefined
                        ? ''
                        : this.values[item.name];
                if (this.isRichText(item)) {
                    this.loadRichTextImages(item.value);
                }
            }
            if (!field.isArray && field.isRef) {
                item.fields = field.fields;
            }

            if (field.isArray && !field.isRef) {
                let value: any = [];
                if (
                    this.values &&
                    this.values[item.name] !== null &&
                    this.values[item.name] !== undefined
                ) {
                    const fieldValue = this.values[item.name];
                    if (Array.isArray(fieldValue)) {
                        value = fieldValue.map((fieldItem) => {
                            return {
                                value: fieldItem,
                            };
                        });
                    } else {
                        value = [
                            {
                                value: fieldValue,
                            },
                        ];
                        item.isInvalidType = true;
                    }
                }

                if (this.isRichText(item)) {
                    for (const listItem of value) {
                        this.loadRichTextImages(listItem.value);
                    }
                }

                item.list = value;
            }

            if (field.isArray && field.isRef) {
                item.fields = field.fields;
                let value = [];
                if (this.values && this.values[item.name]) {
                    value = this.values[item.name];
                }

                item.list = value;
            }
            fields.push(item);
        }
        this.fields = fields;
    }

    isTime(item: SchemaField): boolean {
        return item.type === 'string' && item.format === 'time';
    }

    isDate(item: SchemaField): boolean {
        return item.type === 'string' && item.format === 'date';
    }

    isDateTime(item: SchemaField): boolean {
        return item.type === 'string' && item.format === 'date-time';
    }

    isBoolean(item: SchemaField): boolean {
        return item.type === 'boolean';
    }

    isIPFS(item: SchemaField): boolean {
        return (
            item.pattern === '^((https)://)?ipfs.io/ipfs/.+' ||
            item.pattern === '^ipfs://.+'
        );
    }

    isInput(item: SchemaField): boolean {
        return (
            (item.type === 'string' ||
                item.type === 'number' ||
                item.type === 'integer') &&
            item.format !== 'date' &&
            item.format !== 'time' &&
            item.format !== 'date-time' &&
            item.customType !== 'table' &&
            item.customType !== 'richText'
        );
    }

    isRichText(item: SchemaField): boolean {
        return item.customType === 'richText';
    }

    getRichTextValue(value: unknown): string {
        const markdown = typeof value === 'string' ? value : '';
        const resolved = new Map<string, string>();
        for (const reference of collectImageReferences(markdown)) {
            const source = this.resolvedImages.get(reference);
            if (source) {
                resolved.set(reference, source);
            }
        }
        return withNewTabLinks(markdownToHtml(markdown, resolved));
    }

    private loadRichTextImages(value: unknown): void {
        const references = collectImageReferences(typeof value === 'string' ? value : '');
        if (!references.length) {
            return;
        }
        Promise.all(references.map((reference) => this.loadImage(reference)))
            .finally(() => this.changeDetector.markForCheck());
    }

    private async loadImage(reference: string): Promise<string | null> {
        if (this.resolvedImages.has(reference)) {
            return this.resolvedImages.get(reference) || null;
        }

        let request = this.pendingImages.get(reference);
        if (!request) {
            request = this.entitiesService.getImageByLink(reference)
                .catch(() => null)
                .finally(() => this.pendingImages.delete(reference));
            this.pendingImages.set(reference, request);
        }

        const source = await request;
        this.resolvedImages.set(reference, source);
        return source;
    }

    onRichTextLinkClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const link = target.closest('a');
        const href = link?.getAttribute('href') || '';
        if (!href || !isSafeHref(href)) {
            return;
        }
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
    }

    isPrefix(item: SchemaField): boolean {
        return item.unitSystem === 'prefix';
    }

    isPostfix(item: SchemaField): boolean {
        return item.unitSystem === 'postfix';
    }

    public isFormulas(item: any) {
        return this.formulas ? this.formulas[item.fullPath] : undefined;
    }

    public showFormulas(formulas: any) {
        const dialogRef = this.dialogService.open(FormulasViewDialog, {
            showHeader: false,
            width: '950px',
            styleClass: 'guardian-dialog',
            data: formulas,
        });
        dialogRef.onClose.subscribe((result: any) => { });
    }
}
