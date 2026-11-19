import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';
import { ChangeBlockSettingsDialog } from 'src/app/modules/policy-engine/dialogs/change-block-settings-dialog/change-block-settings-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { PresetPath } from '@guardian/interfaces';

/**
 * Settings for block of 'requestVcDocument' type.
 */
@Component({
    selector: 'request-config',
    templateUrl: './request-config.component.html',
    styleUrls: ['./request-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
})
export class RequestConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        privateFieldsGroup: false,
        preset: false,
        presetFields: {}
    };

    properties!: any;
    schemas!: SchemaVariables[];

    /** One row per root field of the block schema, then nested and stale mappings. */
    public rows: IPresetRow[] = [];
    private rootRows: IPresetRow[] = [];
    private sourceNodes = new Map<string, any>();
    public mappedCount = 0;
    /** Nested fields of the block schema that can still be added as preset targets, grouped by sub-schema. */
    public nestedTargetGroups: IPresetGroup[] = [];
    public newNestedTarget: string | null = null;
    public hasBlockSchema = false;

    private sources: IPresetSource[] = [];
    private targetNodes = new Map<string, any>();
    private extraNested = new Set<string>();
    private presetKey = '';
    private optionsCache = new Map<string, IPresetGroup[]>();

    public idTypeOptions = [
        { label: 'None', value: '' },
        { label: 'DID (New DID)', value: 'DID' },
        { label: 'UUID (New UUID)', value: 'UUID' },
        { label: 'Owner (Owner DID)', value: 'OWNER' }
    ];

    public uiMetaDataTypeOptions = [
        { label: 'PAGE', value: 'page' },
        { label: 'DIALOG', value: 'dialog' }
    ];

    public editType = [
        { label: 'New', value: 'new' },
        { label: 'Edit', value: 'edit' }
    ];

    public accountTypes = [
        { label: '', value: '' },
        { label: 'Pre-set user account', value: 'preset' },
        { label: 'Current user account', value: 'current' },
    ];

    constructor(private dialogService: DialogService) {
    }

    ngOnInit(): void {
        this.schemas = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        const key = `${block.properties?.schema}|${block.properties?.presetSchema}`;
        if (this.item !== block || this.presetKey !== key) {
            this.extraNested.clear();
        }
        this.presetKey = key;
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.editType = this.properties.editType || 'new';
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.type = this.properties.uiMetaData.type || 'page';
        this.properties.presetFields = this.properties.presetFields || [];
        if (this.properties.enableAdditionalData === undefined) {
            this.properties.enableAdditionalData = false;
        }

        this.schemas = this.moduleVariables?.schemas || [];

        const schema = this.schemas.find(e => e.value == this.properties.schema);
        const presetSchema = this.schemas.find(e => e.value == this.properties.presetSchema);
        if (!schema || !presetSchema) {
            this.properties.presetFields = [];
        }
        this.buildModel();
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSave() {
        this.item.changed = true;
    }

    // ---------------------------------------------------------------- preset

    private get blockSchema(): any {
        return this.schemas?.find(e => e.value == this.properties?.schema)?.data;
    }

    private get presetSchemaData(): any {
        return this.schemas?.find(e => e.value == this.properties?.presetSchema)?.data;
    }

    /**
     * Rebuilds the rows and the source lists from the schemas and the stored mappings.
     */
    private buildModel() {
        const target = this.blockSchema;
        const preset = this.presetSchemaData;
        this.hasBlockSchema = !!target;
        this.optionsCache.clear();

        this.sources = [];
        this.sourceNodes = new Map<string, any>();
        if (preset?.getDeepFields) {
            const walk = (nodes: any[]) => {
                for (const node of nodes) {
                    this.sourceNodes.set(node.path, node);
                    this.sources.push({
                        name: node.path,
                        title: node.field?.description || node.path,
                        type: node.type,
                        level: node.arrayLvl,
                        nested: node.path.includes('.')
                    });
                    walk(node.fields || []);
                }
            };
            walk(preset.getDeepFields());
        }

        this.targetNodes = new Map<string, any>();
        const rootRows: IPresetRow[] = [];
        if (target?.getDeepFields) {
            const walk = (nodes: any[]) => {
                for (const node of nodes) {
                    this.targetNodes.set(node.path, node);
                    if (!node.path.includes('.')) {
                        rootRows.push(this.createRow(node.path));
                    }
                    walk(node.fields || []);
                }
            };
            walk(target.getDeepFields());
        }

        this.rootRows = rootRows;
        this.refreshLevels();
        const mappedNames = new Set<string>(
            this.properties.presetFields.filter((e: any) => e.value).map((e: any) => e.name)
        );
        const rootNames = new Set<string>(rootRows.map((row) => row.name));
        const ordered = new Set<string>();
        for (const entry of this.properties.presetFields) {
            const name = entry.name;
            if (typeof name !== 'string') {
                continue;
            }
            if (rootNames.has(name) && !entry.value && !this.extraNested.has(name)) {
                continue;
            }
            ordered.add(name);
        }
        for (const name of this.extraNested) {
            ordered.add(name);
        }

        this.rows = Array.from(ordered).map((name) => this.createRow(name));
        this.mappedCount = mappedNames.size;

        const used = new Set(this.rows.map((e) => e.name));
        this.nestedTargetGroups = target?.getDeepFields
            ? this.buildGroups(target, (node) => !used.has(node.path))
            : [];
    }

    private createRow(name: string): IPresetRow {
        const node = this.targetNodes.get(name);
        return {
            name,
            title: node?.field?.description || this.properties.presetFields.find((e: any) => e.name === name)?.title || name,
            type: node?.type || '',
            level: node?.arrayLvl ?? 0,
            nested: name.includes('.'),
            pathParts: this.shortPath(name),
            stale: !node,
            sourceMissing: this.isSourceMissing(name)
        };
    }

    /**
     * True if the row is mapped to a preset field that is not in the preset schema any more
     * (renamed or removed). The special values of the user are not preset fields.
     */
    private isSourceMissing(name: string): boolean {
        const value = this.properties.presetFields.find((e: any) => e.name === name)?.value;
        if (!value || value === 'username' || value === 'hederaAccountId') {
            return false;
        }
        return !!this.presetSchemaData?.getDeepFields && !this.sourceNodes.has(value);
    }

    /**
     * Array levels are stored with the mapping, so they go stale when a schema gains or loses
     * an array. Recomputes them for the nested mappings whose two fields still exist.
     */
    private refreshLevels() {
        for (const entry of this.properties.presetFields) {
            if (!entry?.value || !PresetPath.isNested(entry)) {
                continue;
            }
            if (!this.targetNodes.has(entry.name) || !this.sources.some((e) => e.name === entry.value)) {
                continue;
            }
            this.syncLevels(entry);
        }
    }

    /**
     * Path segments for display. A long path keeps its first segment and the last two,
     * the full path is in the tooltip.
     */
    private shortPath(path: string): string[] {
        const parts = path.split('.');
        return parts.length > 4 ? [parts[0], '\u2026', ...parts.slice(-2)] : parts;
    }

    public entryOf(row: IPresetRow): any {
        return this.properties.presetFields.find((e: any) => e.name === row.name) || null;
    }

    public valueOf(row: IPresetRow): string | null {
        return this.entryOf(row)?.value ?? null;
    }

    public isMapped(row: IPresetRow): boolean {
        return !!this.entryOf(row)?.value;
    }

    public isReadonlyField(row: IPresetRow): boolean {
        return !!this.entryOf(row)?.readonly;
    }

    /**
     * Options of a row's source dropdown, grouped by schema like the schema editor's field
     * pickers. A plain root row gets every root field, exactly as before. A nested row, and any nested
     * path, only gets sources with at least as many arrays as the target.
     */
    public getSourceOptions(row: IPresetRow): IPresetGroup[] {
        const target = this.targetNodes.get(row.name)?.field;
        const cacheKey = `${row.level}|${row.nested}|${PresetPath.fieldKind(target)}`;
        let groups = this.optionsCache.get(cacheKey);
        if (!groups) {
            const preset = this.presetSchemaData;
            groups = preset?.getDeepFields
                ? this.buildGroups(
                    preset,
                    (node) => (!row.nested && !node.path.includes('.')) || (row.level === 0 ? node.arrayLvl === 0 : node.arrayLvl >= row.level),
                    (node) => !!target && !PresetPath.isTypeCompatible(target, node.field)
                )
                : [];
            this.optionsCache.set(cacheKey, groups);
        }
        return groups;
    }

    /**
     * Is the selected source not fit the field, or null. It is only a hint: the source
     * can still be selected.
     */
    public typeIssue(row: IPresetRow): string | null {
        const value = this.valueOf(row);
        const target = this.targetNodes.get(row.name);
        const source = value ? this.sourceNodes.get(value) : null;
        if (!target || !source || PresetPath.isTypeCompatible(target.field, source.field)) {
            return null;
        }
        return `Type mismatch: the source is "${source.type}", this field is "${target.type}". The value may not fit.`;
    }

    /**
     * Groups the fields of a schema the way the schema editor's reference picker does:
     * one group per (sub-)schema, with the field label, its full path and its type.
     */
    private buildGroups(schema: any, accept: (node: any) => boolean, mismatch?: (node: any) => boolean): IPresetGroup[] {
        const groups: IPresetGroup[] = [];
        const add = (nodes: any[], trail: string[]) => {
            const items: IPresetOption[] = [];
            for (const node of nodes) {
                if (!accept(node)) {
                    continue;
                }
                const label = node.field?.description || node.field?.name || node.path;
                items.push({
                    value: node.path,
                    label,
                    fullLabel: trail.length ? `${trail.join(' › ')} › ${label}` : label,
                    type: node.type,
                    mismatch: mismatch ? mismatch(node) : false
                });
            }
            if (items.length) {
                const parents = trail.slice(0, -1);
                groups.push({
                    label: trail.length ? trail.join(' › ') : (schema.name || 'This schema'),
                    name: trail.length ? trail[trail.length - 1] : (schema.name || 'This schema'),
                    parents: parents.length > 2
                        ? `${parents[0]} › … › ${parents[parents.length - 1]}`
                        : parents.join(' › '),
                    items
                });
            }
            for (const node of nodes) {
                if (node.fields?.length) {
                    add(node.fields, [...trail, this.subSchemaName(node.field)]);
                }
            }
        };
        add(schema.getDeepFields(), []);
        return groups;
    }

    private subSchemaName(field: any): string {
        const found = this.schemas?.find((e) => e.value === field?.type)?.data;
        return found?.name || field?.description || field?.name || '';
    }

    public setSource(row: IPresetRow, value: string | null | undefined) {
        if (!value) {
            this.clearSource(row);
            return;
        }
        let entry = this.entryOf(row);
        if (!entry) {
            entry = { name: row.name, title: row.title, value, readonly: false };
            this.properties.presetFields.push(entry);
        }
        entry.value = value;
        this.syncLevels(entry);
        this.changed();
    }

    public clearSource(row: IPresetRow) {
        const index = this.properties.presetFields.findIndex((e: any) => e.name === row.name);
        if (index >= 0) {
            this.properties.presetFields.splice(index, 1);
        }
        this.extraNested.delete(row.name);
        this.changed();
    }

    public setReadonly(row: IPresetRow, value: boolean) {
        const entry = this.entryOf(row);
        if (entry) {
            entry.readonly = !!value;
            this.onSave();
        }
    }

    /**
     * Drops the preset schema and every mapping, so nothing of the preset stays in the block JSON.
     */
    public clearPreset() {
        delete this.properties.presetSchema;
        this.properties.presetFields = [];
        this.extraNested.clear();
        this.changed();
    }

    /**
     * Preset schema changed: map the root fields that have the same title, the way it always did.
     * Unmatched fields get no entry, so nothing empty is stored.
     */
    public onSelectInput() {
        this.properties.presetFields = [];
        this.extraNested.clear();
        this.buildModel();
        const byTitle = new Map<string, string>();
        for (const source of this.sources) {
            if (!source.nested) {
                byTitle.set(source.title, source.name);
            }
        }
        for (const row of this.rootRows) {
            const value = row.nested ? undefined : byTitle.get(row.title);
            if (value) {
                this.setSourceQuiet(row, value);
            }
        }
        this.changed();
    }

    private setSourceQuiet(row: IPresetRow, value: string) {
        const entry = { name: row.name, title: row.title, value, readonly: false };
        this.properties.presetFields.push(entry);
    }

    public addNestedTarget(path: string | null) {
        if (path) {
            this.extraNested.add(path);
        }
        this.newNestedTarget = null;
        this.buildModel();
    }

    /**
     * Keeps the array levels of nested mappings (they decide how a deeper source is
     * flattened). Plain mappings are stored exactly as before.
     */
    private syncLevels(entry: any) {
        if (PresetPath.isNested(entry)) {
            const source = this.sources.find((e) => e.name === entry.value);
            entry.nameLevel = this.targetNodes.get(entry.name)?.arrayLvl;
            entry.valueLevel = source?.level;
        } else {
            delete entry.nameLevel;
            delete entry.valueLevel;
        }
    }

    /**
     * Removes entries without a source (old policies stored one for every field) and saves.
     */
    private changed() {
        this.properties.presetFields = this.properties.presetFields.filter((e: any) => !!e.value);
        this.buildModel();
        this.onSave();
    }
}

interface IPresetOption {
    value: string;
    label: string;
    fullLabel: string;
    type: string;
    mismatch: boolean;
}

interface IPresetGroup {
    label: string;
    name: string;
    parents: string;
    items: IPresetOption[];
}

interface IPresetSource {
    name: string;
    title: string;
    type: string;
    level: number;
    nested: boolean;
}

interface IPresetRow {
    name: string;
    title: string;
    type: string;
    level: number;
    nested: boolean;
    /** Segments of the path to show, shortened when long. */
    pathParts: string[];
    /** The block schema has no such field any more. */
    stale: boolean;
    sourceMissing: boolean;
}
