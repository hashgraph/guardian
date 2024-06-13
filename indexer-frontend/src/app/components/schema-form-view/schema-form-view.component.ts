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
    Component,
    Input,
} from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { SchemaField, Schema } from '@indexer/interfaces';
import { InputTextareaModule } from 'primeng/inputtextarea';

/**
 * Form view by schema
 */
@Component({
    selector: 'app-schema-form-view',
    templateUrl: './schema-form-view.component.html',
    styleUrls: ['./schema-form-view.component.css'],
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
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemaFormViewComponent {
    @Input('private-fields') hide: { [x: string]: boolean } = {};
    @Input('schema') schema?: Schema;
    @Input('fields') schemaFields!: SchemaField[];
    @Input('delimiter-hide') delimiterHide: boolean = false;
    @Input('values') values: any;

    fields: any[] | undefined = [];
    pageSize: number = 20;

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
            item.format !== 'date-time'
        );
    }

    isPrefix(item: SchemaField): boolean {
        return item.unitSystem === 'prefix';
    }

    isPostfix(item: SchemaField): boolean {
        return item.unitSystem === 'postfix';
    }
}
