import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Schema } from 'interfaces';

/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form',
    templateUrl: './schema-form.component.html',
    styleUrls: ['./schema-form.component.css']
})
export class SchemaFormComponent implements OnInit {
    @Input('formGroup') group!: FormGroup;
    @Input('readonly') readonly!: any;
    @Input('hide') hide!: any;

    @Input('contextDocument') contextDocument!: any;
    @Input('schemes') schemes!: Schema[];
    @Input('type') type!: string;

    fields: any[] | undefined = []
    options: FormGroup | undefined;

    constructor(private fb: FormBuilder) {
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.contextDocument) {
            this.update(this.contextDocument);
            return;
        } else if (this.schemes && this.type) {
            const item = this.schemes.find(e => e.type == this.type);
            if (item) {
                this.update(item.fullDocument);
                return;
            }
        }
        this.update(null);
    }

    update(contextDocument: any) {
        this.group.removeControl("_type");
        this.group.removeControl("_context");
        this.group.removeControl("_options");

        this.fields = undefined;
        this.options = undefined;
        if (!contextDocument) {
            return;
        }

        const _id = contextDocument['@id'] || "";
        const _context = contextDocument['@context'] || "";

        const fields: any[] = [];
        const group: any = {};
        const keys = Object.keys(_context);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (_context[key]['@context']) {
                group[key] = new FormGroup({});
                fields.push({
                    group: group[key],
                    control: null,
                    title: key,
                    name: key,
                    readonly: false,
                    hide: false,
                    contextDocument: _context[key],
                    type: null
                })
            } else {
                const readonly = this.readonly ? this.readonly[key] : "";
                const hide = this.hide ? this.hide[key] : "";
                if (!hide) {
                    group[key] = new FormControl(readonly, Validators.required);
                    fields.push({
                        group: null,
                        control: group[key],
                        title: key,
                        name: key,
                        readonly: !!readonly,
                        hide: !!hide,
                        contextDocument: null,
                        type: null
                    })
                }
            }
        }
        this.options = this.fb.group(group);
        this.fields = fields;
        this.group.addControl("_options", this.options);

        //!
        const param = _id.split("#");
        if (param[1]) {
            const t = new FormControl(param[1], Validators.required);
            this.group.addControl("_type", t);
        }
        if (param[0]) {
            const c = new FormControl([param[0]], Validators.required);
            this.group.addControl("_context", c);
        }
    }

    public static getOptions(value: any): any {
        const data = this._getOptionsValue(value._options);
        data["type"] = value._type;
        data["@context"] = value._context;
        return data;
    }

    public static _getOptionsValue(value: any): any {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value == "object") {
            const res: any = {};
            const keys = Object.keys(value);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key == "_options") {
                    const options = this._getOptionsValue(value[key]);
                    Object.assign(res, options);
                } else if (key == "_type") {
                    res["type"] = value[key];
                } else if (key == "_context") {
                    res["@context"] = value[key];
                } else {
                    res[key] = this._getOptionsValue(value[key]);
                }
            }
            return res;
        }
        return value;
    }
}
