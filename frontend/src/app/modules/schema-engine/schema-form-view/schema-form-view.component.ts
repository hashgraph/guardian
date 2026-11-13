import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, LOCALE_ID, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { formatDate } from '@angular/common';
import { API_IPFS_GATEWAY_URL, IPFS_SCHEMA } from 'src/app/services/api';
import { Subscription } from 'rxjs';
import {
    getAllContinents,
    getAllCountries,
    getCountriesOfState,
    getStatesOfCountry,
    isGeoCustomType,
    Schema,
    SchemaField,
    SchemaRuleValidateResult,
    UnitSystem
} from '@guardian/interfaces';
import { IPFSService } from 'src/app/services/ipfs.service';
import { isSafeHref, withNewTabLinks } from '../rich-text-editor/rich-text-sanitizer';
import { collectImageReferences, markdownToHtml, markdownToPlainText } from '../rich-text-editor/markdown';
import { SchemaFormPreferencesService } from 'src/app/services/schema-form-preferences.service';
import { baseMetaTags, IMetaTag, metaType } from '../schema-form/schema-form-metadata';
import { recordSummary } from '../schema-form/schema-form-records';
import { geoRecordSummary } from '../geo-file/geo-value-summary';
import { applyNestedConditions, applyViewConditions } from './schema-form-view-conditions';

const PREVIEW_RENDER_CHUNK = 10;

interface IFieldControl extends SchemaField {
    fullPath: string;
    hide: boolean;
    isInvalidType: boolean;
    value: any;
    loading: boolean;
    imgSrc: string;
    list: IFieldIndexControl[];
    count: number;
    pageIndex: number;
    pageSize: number;
    notCorrespondCondition?: boolean;
    link?: string | undefined;
    accordionLink?: string | undefined;
    open: boolean;
    previewReady?: boolean;
    /** Indexes of the opened record cards of an array of sub-schemas. */
    openRows?: Set<number>;
}

interface IRichTextEntry {
    description?: string;
    value: any;
}

interface IFieldIndexControl {
    value: any;
    loading: boolean;
    imgSrc: string;
}

/**
 * Form view by schema
 */
@Component({
    selector: 'app-schema-form-view',
    templateUrl: './schema-form-view.component.html',
    styleUrls: ['./schema-form-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SchemaFormViewComponent implements OnInit, OnChanges, OnDestroy {
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('schema') schema: Schema | null | undefined;
    @Input('fields') schemaFields!: SchemaField[] | undefined;
    @Input('values') values: any;
    @Input() dryRun?: boolean = false;
    @Input() rules?: SchemaRuleValidateResult;
    @Input() formulas?: any;
    @Input('discussion') discussionData?: any;
    @Input('discussion-action') discussionAction: boolean = false;
    @Input('discussion-view') discussionView: boolean = false;
    @Input() link?: string | undefined;
    /** Conditions of the array this view renders one row of; judged by this row's values. */
    @Input() conditions?: any[];
    @Input() accordionLink?: string | undefined;
    @Input() preview: boolean = false;
    /** Path of this view's values, so the metadata strip shows the same path as the edit form. */
    @Input() pathPrefix: string = '';
    /** Set on the view of a record card: rich text there keeps the popover and the dialog. */
    @Input() inRecord: boolean = false;
    @Input() hideNotProvided: boolean = false;

    @Output('discussion-action') discussionActionEvent = new EventEmitter<any>();
    @Output('onAccordionSelect') onAccordionSelect = new EventEmitter<{path: string, isOpen: boolean}>();
    @Output() previewLoadingChange = new EventEmitter<boolean>();

    public fields: IFieldControl[] | undefined = [];
    private pageSize: number = 25;
    // Resolved images by link; null marks a link that failed to resolve.
    private imgCache = new Map<string, string | null>();
    /** Rendered rich text per markdown value; dropped whenever an image resolves, since that changes the HTML. */
    private richHtmlCache = new Map<string, string>();
    private rowSummaryCache = new WeakMap<object, { title: string; sub: string }>();
    private imgRequests = new Map<string, Promise<string | null>>();
    private previewFrames = new Map<IFieldControl, number>();
    public previewRenderLimit: number = Infinity;
    private previewRenderFrame: number | null = null;
    private linkedField: string | undefined;

    constructor(
        private ipfs: IPFSService,
        private changeDetector: ChangeDetectorRef,
        private preferences: SchemaFormPreferencesService,
        @Inject(LOCALE_ID) private locale: string = 'en-US'
    ) { }

    public showMetadata: boolean = false;
    private metadataSub?: Subscription;
    /** Rule results by field path, with the text of the rule line and the tooltip. */
    public ruleView = new Map<string, { failed: boolean; text: string }>();
    private expandedText = new Set<string>();

    ngOnInit(): void {
        applyViewConditions(this.fields, this.conditions, this.values);
        applyNestedConditions(this.fields, this.values);
        this.metadataSub = this.preferences.showFieldMetadata$.subscribe((value) => {
            this.showMetadata = value;
            this.changeDetector.markForCheck();
        });
    }

    private stopPreviewRendering(): void {
        if (this.previewRenderFrame !== null) {
            cancelAnimationFrame(this.previewRenderFrame);
            this.previewRenderFrame = null;
            this.previewLoadingChange.emit(false);
        }
        this.previewRenderLimit = Infinity;
    }

    private startPreviewRendering(): void {
        this.stopPreviewRendering();
        if (!this.preview || (this.fields?.length || 0) <= PREVIEW_RENDER_CHUNK) return;
        this.previewRenderLimit = PREVIEW_RENDER_CHUNK;
        this.previewLoadingChange.emit(true);
        const next = () => {
            this.previewRenderLimit += PREVIEW_RENDER_CHUNK;
            this.preparePreviewRange();
            if (this.previewRenderLimit < (this.fields?.length || 0)) {
                this.changeDetector.detectChanges();
                this.previewRenderFrame = requestAnimationFrame(next);
                return;
            }
            this.previewRenderFrame = null;
            this.previewRenderLimit = Infinity;
            this.preparePreviewRange();
            this.changeDetector.detectChanges();
            this.previewLoadingChange.emit(false);
        };
        this.previewRenderFrame = requestAnimationFrame(next);
    }

    /** Sub-schemas are always open, so each one is prepared when its sub-heading enters the render chunk. */
    private preparePreviewRange(): void {
        if (!this.preview || !this.fields) {
            return;
        }
        const limit = Math.min(this.fields.length, this.previewRenderLimit);
        for (let i = 0; i < limit; i++) {
            const field = this.fields[i];
            if (field.isRef && !field.isArray && field.open && !field.previewReady) {
                this.preparePreviewSection(field);
            }
        }
    }

    private cancelPreviewSections(): void {
        for (const [item, frame] of this.previewFrames) {
            cancelAnimationFrame(frame);
            item.previewReady = false;
            this.previewLoadingChange.emit(false);
        }
        this.previewFrames.clear();
    }

    public preparePreviewSection(item: IFieldControl): void {
        if (!this.preview || !item.isRef) return;
        const pending = this.previewFrames.get(item);
        if (pending !== undefined) {
            if (item.open) return;
            cancelAnimationFrame(pending);
            this.previewFrames.delete(item);
            this.previewLoadingChange.emit(false);
        }
        if (!item.open) {
            item.previewReady = false;
            return;
        }
        if (item.previewReady) return;
        this.previewLoadingChange.emit(true);
        this.previewFrames.set(item, requestAnimationFrame(() => {
            this.previewFrames.set(item, requestAnimationFrame(() => {
                item.previewReady = true;
                this.changeDetector.detectChanges();
                this.previewFrames.set(item, requestAnimationFrame(() => {
                    this.previewFrames.delete(item);
                    this.previewLoadingChange.emit(false);
                }));
            }));
        }));
    }

    public isBooleanView(value: boolean | any): string {
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return this.isEmptyValue(value) ? 'Not provided' : String(value);
    }

    /** An empty value is shown as "Not provided". `false` and `0` are values. */
    public isEmptyValue(value: unknown): boolean {
        return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.rules) {
            this.buildRuleView();
        }
        if (
            changes.schema ||
            changes.schemaFields ||
            changes.hide
        ) {
            this.rowSummaryCache = new WeakMap();
            if (this.preview) this.cancelPreviewSections();
            this.hide = this.hide || {};
            if (this.schemaFields) {
                this.update(this.schemaFields);
            } else if (this.schema) {
                this.update(this.schema.fields);
            } else {
                this.update();
            }
            if (this.preview) {
                this.startPreviewRendering();
                this.preparePreviewRange();
            }
        }
        if (changes.link) {
            this.openField(this.link);
        }

        if(changes.accordionLink) {
            this.openAccordion(this.accordionLink);
        }
    }

    private buildRuleView(): void {
        this.ruleView = new Map();
        for (const [path, value] of Object.entries(this.rules || {})) {
            const failed = value.status === 'Failure' || value.status === 'Error';
            const names = (value.rules || [])
                .filter((rule) => failed
                    ? (rule.status === 'Failure' || rule.status === 'Error')
                    : rule.status === 'Success')
                .map((rule) => rule.name)
                .join(', ');
            this.ruleView.set(path, { failed, text: names });
        }
    }

    private update(schemaFields?: SchemaField[]) {
        if (!schemaFields) {
            return;
        }

        const fields: any[] = [];
        for (let i = 0; i < schemaFields.length; i++) {
            const field = schemaFields[i];
            if (this.hide[field.name] || this.isHelpText(field)) {
                continue
            }
            if (field.hidden && this.isEmptyValue(this.values?.[field.name])) {
                continue
            }
            const item: IFieldControl = {
                ...field,
                fullPath: field.fullPath || '',
                hide: false,
                isInvalidType: false,
                value: undefined,
                loading: false,
                list: [],
                pageIndex: 0,
                pageSize: 0,
                count: 0,
                imgSrc: '',
                open: false
            }
            if (!field.isArray && !field.isRef) {
                item.value = !this.values
                    || this.values[item.name] === null
                    || this.values[item.name] === undefined
                    ? ""
                    : this.values[item.name];
                if (this.isIPFS(field) && field.customType !== 'file') {
                    this.loadImg(item)
                }
                if (this.isRichText(item)) {
                    this.loadRichTextImages(item.value);
                }
            }
            if (!field.isArray && field.isRef) {
                // Conditions mark these fields, so each view needs its own copies: rows must not share the flags.
                item.fields = field.conditions?.length ? field.fields?.map((f) => ({ ...f })) : field.fields;
                // A sub-schema is always open.
                item.open = true;
            }

            if (field.isArray && !field.isRef) {
                let value: IFieldIndexControl[] = [];
                if (this.values
                    && this.values[item.name] !== null
                    && this.values[item.name] !== undefined
                ) {
                    const fieldValue = this.values[item.name];
                    if (Array.isArray(fieldValue)) {
                        value = fieldValue.map((fieldItem) => {
                            return {
                                value: fieldItem,
                                imgSrc: '',
                                loading: false
                            };
                        });
                    }
                    else {
                        value = [{
                            value: fieldValue,
                            imgSrc: '',
                            loading: false
                        }]
                        item.isInvalidType = true;
                    }
                    if (this.isIPFS(field) && field.customType !== 'file') {
                        this.loadImgs(value);
                    }
                    if (this.isRichText(item)) {
                        for (const listItem of value) {
                            this.loadRichTextImages(listItem.value);
                        }
                    }
                }

                item.list = value;
                item.count = item.list?.length;
                item.pageIndex = 0;
                item.pageSize = this.pageSize;
            }

            if (field.isArray && field.isRef) {
                item.fields = field.fields;
                let value: IFieldIndexControl[];
                if (this.values && this.values[item.name]) {
                    value = this.values[item.name];
                } else {
                    value = [];
                }

                item.list = value;
                item.count = item.list?.length;
                item.pageIndex = 0;
                item.pageSize = this.pageSize;
                item.openRows = new Set<number>();
            }
            fields.push(item);
        }
        this.fields = fields;
    }

    private imgKey(reference: string): string {
        return `${this.dryRun ? 'dry-run' : 'ipfs'}:${reference}`;
    }

    private async loadImg(item: IFieldControl | IFieldIndexControl) {
        const key = this.imgKey(item.value);

        if (this.imgCache.has(key)) {
            item.imgSrc = this.imgCache.get(key) || '';
            item.loading = false;
            return;
        }

        item.loading = true;
        const imgSrc = await this.loadImgReference(item.value, false);
        item.imgSrc = imgSrc || '';
        item.loading = false;
        this.changeDetector.detectChanges();
    }

    private async loadImgReference(reference: string, dryRunFallback: boolean): Promise<string | null> {
        const key = this.imgKey(reference);

        // update() rebuilds every field on each input change; without this cache a
        // failing link is re-requested on every re-render.
        if (this.imgCache.has(key)) {
            return this.imgCache.get(key) || null;
        }

        let request = this.imgRequests.get(key);
        if (!request) {
            request = this.readImage(reference, dryRunFallback)
                .catch(() => null)
                .finally(() => this.imgRequests.delete(key));
            this.imgRequests.set(key, request);
        }

        const imgSrc = await request;
        this.imgCache.set(key, imgSrc);
        this.richHtmlCache.clear();
        return imgSrc;
    }

    private readImage(reference: string, dryRunFallback: boolean): Promise<string> {
        if (this.dryRun && !dryRunFallback) {
            return this.ipfs.getImageFromDryRunStorage(reference);
        }
        return this.ipfs.getImageWithDryRunFallback(reference, !!this.dryRun);
    }

    private loadRichTextImages(value: unknown): void {
        const references = collectImageReferences(typeof value === 'string' ? value : '');
        if (!references.length) {
            return;
        }
        Promise.all(references.map((reference) => this.loadImgReference(reference, true)))
            .finally(() => this.changeDetector.detectChanges());
    }

    public richTextPopoverValue = '';

    public richTextDialogField: IRichTextEntry | null = null;

    private richTextHideTimer: any = null;

    public onRichTextCellEnter(event: Event, field: { value: any }, popover: any): void {
        this.clearRichTextHideTimer();
        this.richTextPopoverValue = this.getRichTextValue(field.value);
        if (this.richTextPopoverValue) {
            const visible = !!popover.overlayVisible;
            popover.show(event);
            if (visible) {
                this.changeDetector.detectChanges();
                popover.align();
            }
        } else {
            popover.hide();
        }
    }

    public onRichTextCellLeave(popover: any): void {
        this.clearRichTextHideTimer();
        this.richTextHideTimer = setTimeout(() => {
            this.richTextHideTimer = null;
            popover.hide();
        }, 250);
    }

    public onRichTextPopoverEnter(): void {
        this.clearRichTextHideTimer();
    }

    public openRichTextDialog(field: IRichTextEntry, popover: any): void {
        this.clearRichTextHideTimer();
        popover.hide();
        this.richTextDialogField = field;
        this.changeDetector.detectChanges();
    }

    public closeRichTextDialog(): void {
        this.richTextDialogField = null;
        this.changeDetector.detectChanges();
    }

    private clearRichTextHideTimer(): void {
        if (this.richTextHideTimer) {
            clearTimeout(this.richTextHideTimer);
            this.richTextHideTimer = null;
        }
    }

    ngOnDestroy(): void {
        this.metadataSub?.unsubscribe();
        this.clearRichTextHideTimer();
        this.cancelPreviewSections();
        this.stopPreviewRendering();
    }

    private loadImgs(items: IFieldIndexControl[]) {
        Promise.all(
            items.map(async (fieldItem: IFieldIndexControl) => {
                return this.loadImg(fieldItem);
            })
        ).finally(() => this.changeDetector.detectChanges());
    }

    public getCID(link: string): string {
        let matches = link?.match(
            /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/
        );
        return matches ? matches[0] : '';
    }

    public getItemsPage(item: IFieldControl) {
        const pageIndex = item.pageIndex || 0;
        const pageSize = item.pageSize || this.pageSize;
        const result = [];
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;
        for (let i = startIndex; i < endIndex && i < item.list.length; i++) {
            result.push(item.list[i]);
        }
        return result;
    }

    public isDate(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'date';
    }

    public isDateTime(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'date-time';
    }

    public isBoolean(item: IFieldControl): boolean {
        return item.type === 'boolean';
    }

    public isIPFS(item: SchemaField): boolean {
        if (item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || item.pattern === '^ipfs:\/\/.+') {
        }
        return item.pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+'
            || item.pattern === '^ipfs:\/\/.+';
    }

    public displayValue(item: IFieldControl, value: any = item.value): any {
        if (!isGeoCustomType(item.customType || '') || !value) {
            return value;
        }
        if (item.customType === 'continent') {
            return getAllContinents()
                .find((entry) => entry.value === value)?.name || value;
        }
        if (item.customType === 'country') {
            return getAllCountries()
                .find((entry) => entry.value === value)?.name || value;
        }
        for (const country of getCountriesOfState(value)) {
            const state = getStatesOfCountry(country)
                .find((entry) => entry.value === value);
            if (state) {
                return state.name;
            }
        }
        return value;
    }

    public isInput(item: IFieldControl): boolean {
        return (
            (
                item.type === 'string' ||
                item.type === 'number' ||
                item.type === 'integer'
            ) && (
                item.format !== 'date' &&
                item.format !== 'time' &&
                item.format !== 'date-time' &&
                item.customType !== 'table' &&
                item.customType !== 'richText'
            )
        );
    }

    public isRichText(item: IFieldControl): boolean {
        return item.customType === 'richText';
    }

    public getRichTextValue(value: unknown): string {
        const markdown = typeof value === 'string' ? value : '';
        const cached = this.richHtmlCache.get(markdown);
        if (cached !== undefined) {
            return cached;
        }
        const resolved = new Map<string, string>();
        for (const reference of collectImageReferences(markdown)) {
            const source = this.imgCache.get(this.imgKey(reference));
            if (source) {
                resolved.set(reference, source);
            }
        }
        const html = withNewTabLinks(markdownToHtml(markdown, resolved));
        this.richHtmlCache.set(markdown, html);
        return html;
    }

    public onRichTextLinkClick(event: MouseEvent): void {
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

    public isPrefix(item: IFieldControl): boolean {
        return item.unitSystem === UnitSystem.Prefix;
    }

    public isPostfix(item: IFieldControl): boolean {
        return item.unitSystem === UnitSystem.Postfix;
    }

    public isHelpText(item: SchemaField): boolean {
        return item.type === 'null';
    }

    public isUrl(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'url';
    }

    public isEmail(item: IFieldControl): boolean {
        return item.type === 'string' && item.format === 'email';
    }

    public isGeoLocation(item: IFieldControl): boolean {
        return isGeoCustomType(item.customType || '');
    }

    /** Same rule as the edit form's `isFullRow`, minus the enum modes: a value is short. */
    public isFullRow(item: IFieldControl): boolean {
        if (item.isArray || item.isRef || this.isRichText(item)) {
            return true;
        }
        const customType = item.customType || '';
        if (customType === 'table' || customType === 'geo' || customType === 'sentinel' || this.isIPFS(item)) {
            return true;
        }
        if (item.enum || item.remoteLink || this.isGeoLocation(item) || this.isBoolean(item)) {
            return false;
        }
        return item.type === 'string' && !item.format;
    }

    /**
     * A cell with no neighbour in its grid row (full rows before and after it): it takes the whole
     * row, so a long value is not squeezed into one column.
     */
    public isLoneField(index: number): boolean {
        const fields = this.fields || [];
        const limit = Math.min(fields.length, this.previewRenderLimit);
        if (index >= limit || this.isFullRow(fields[index])) {
            return false;
        }
        for (let i = index - 1; i >= 0; i--) {
            if (this.ifFieldVisible(fields[i])) {
                if (!this.isFullRow(fields[i])) {
                    return false;
                }
                break;
            }
        }
        for (let i = index + 1; i < limit; i++) {
            if (this.ifFieldVisible(fields[i])) {
                if (!this.isFullRow(fields[i])) {
                    return false;
                }
                break;
            }
        }
        return true;
    }

    public isGeoSub(item: IFieldControl): boolean {
        return item.customType === 'geo' || item.customType === 'sentinel';
    }

    public dateView(value: unknown, format: 'mediumDate' | 'medium'): string {
        try {
            return formatDate(value as any, format, this.locale);
        } catch {
            return String(value);
        }
    }

    /** The raw value of a field whose stored value does not match its type. */
    public rawValue(item: IFieldControl): string {
        const values = item.list?.map((entry) => entry.value) ?? [];
        const value = values.length === 1 ? values[0] : values;
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    public ipfsLink(link: string): string {
        return typeof link === 'string' && link.startsWith(IPFS_SCHEMA)
            ? `${API_IPFS_GATEWAY_URL}${link.substring(IPFS_SCHEMA.length)}`
            : link;
    }

    /** Short scalars of a simple array are shown as chips, anything longer as a list. */
    public isChipList(item: IFieldControl): boolean {
        if (this.isIPFS(item) || this.isRichText(item) || item.customType === 'table') {
            return false;
        }
        return this.getItemsPage(item).every((entry) => String(entry.value ?? '').length <= 40);
    }

    public isEmptyField(item: IFieldControl): boolean {
        if (item.isInvalidType) {
            return false;
        }
        if (item.isArray) {
            return !item.list?.length;
        }
        if (item.isRef) {
            return this.isEmptyValue(this.values?.[item.name]);
        }
        return this.isEmptyValue(item.value);
    }

    public ruleOf(item: IFieldControl): { failed: boolean; text: string } | undefined {
        return this.ruleView.get(item.fullPath);
    }

    public formulaCount(item: IFieldControl): number {
        const formulas = this.isFormulas(item);
        return formulas ? this.formulaItems(formulas).length : 0;
    }

    public metaTypeOf(item: IFieldControl): string {
        return metaType(item);
    }

    public metaPath(item: IFieldControl): string {
        return this.pathPrefix + item.name;
    }

    public metaTags(item: IFieldControl): IMetaTag[] {
        const tags = baseMetaTags(item);
        const formulas = this.formulaCount(item);
        if (formulas) {
            tags.push({ text: `${formulas} formula${formulas === 1 ? '' : 's'}` });
        }
        if (this.rules?.[item.fullPath]) {
            tags.push({ text: 'schema rule' });
        }
        return tags;
    }

    public isTextExpanded(key: string): boolean {
        return this.expandedText.has(key);
    }

    public toggleText(key: string): void {
        if (!this.expandedText.delete(key)) {
            this.expandedText.add(key);
        }
    }

    /** Index of a row of an array across its pages. */
    public rowIndex(item: IFieldControl, indexOnPage: number): number {
        return (item.pageIndex || 0) * (item.pageSize || this.pageSize) + indexOnPage;
    }

    public rowPath(item: IFieldControl, index: number): string {
        return `${this.pathPrefix}${item.name}.${index}.`;
    }

    public rowSummary(item: IFieldControl, row: any, index: number): { title: string; sub: string } {
        const cached = row && typeof row === 'object' ? this.rowSummaryCache.get(row) : undefined;
        if (cached) {
            return cached;
        }
        if (item.customType === 'geo') {
            const geoSummary = geoRecordSummary(item.description, row);
            if (row && typeof row === 'object') {
                this.rowSummaryCache.set(row, geoSummary);
            }
            return geoSummary;
        }
        const values = (item.fields || [])
            .filter((field) => !field.isArray && !field.isRef && !field.hidden && !this.hide?.[field.name])
            .map((field) => this.isRichText(field as IFieldControl) ? markdownToPlainText(row?.[field.name]) : row?.[field.name]);
        const summary = recordSummary(values, `${item.description} #${index + 1}`);
        if (row && typeof row === 'object') {
            this.rowSummaryCache.set(row, summary);
        }
        return summary;
    }

    public isRowOpen(item: IFieldControl, index: number): boolean {
        return !!item.openRows?.has(index);
    }

    public toggleRow(item: IFieldControl, index: number): void {
        item.openRows = item.openRows || new Set<number>();
        if (!item.openRows.delete(index)) {
            item.openRows.add(index);
        }
    }

    /** Opens every record card of the current page. */
    public expandAll(item: IFieldControl): void {
        item.openRows = item.openRows || new Set<number>();
        const start = (item.pageIndex || 0) * (item.pageSize || this.pageSize);
        const end = Math.min(item.list.length, start + (item.pageSize || this.pageSize));
        for (let i = start; i < end; i++) {
            item.openRows.add(i);
        }
    }

    public collapseAll(item: IFieldControl): void {
        item.openRows?.clear();
    }

    public hasOpenRows(item: IFieldControl): boolean {
        return !!item.openRows?.size;
    }

    public onPage(item: IFieldControl, event: any): void {
        item.pageIndex = event.pageIndex;
        item.pageSize = event.pageSize;
    }

    public ifFieldVisible(item: IFieldControl): boolean {
        return !item.hide && !item.notCorrespondCondition && !this.isHiddenAsEmpty(item);
    }

    private isHiddenAsEmpty(item: IFieldControl): boolean {
        return this.hideNotProvided && !this.isLinkedField(item) && this.isEmptyField(item);
    }

    private isLinkedField(item: IFieldControl): boolean {
        return !!this.linkedField && (item.fullPath === this.linkedField || item.name === this.linkedField);
    }

    public ifSimpleField(item: IFieldControl): boolean {
        return !item.isArray && !item.isRef;
    }

    public ifSubSchema(item: IFieldControl): boolean {
        return !item.isArray && item.isRef;
    }

    public ifSimpleArray(item: IFieldControl): boolean {
        return item.isArray && !item.isRef;
    }

    public ifSubSchemaArray(item: IFieldControl): boolean {
        return item.isArray && item.isRef;
    }

    public isRulesStatus(item: IFieldControl) {
        return this.rules?.[item.fullPath]?.status;
    }

    public isFormulas(item: IFieldControl) {
        return this.formulas ? this.formulas[item.fullPath] : undefined;
    }

    private formulaItemsCache = new WeakMap<object, any[]>();

    /** Formula items of a field for the inline card; one array per link so OnPush bindings stay stable. */
    public formulaItems(formulas: any): any[] {
        let items = this.formulaItemsCache.get(formulas);
        if (!items) {
            try {
                items = formulas.tree?.get(formulas.schema, formulas.path, formulas.context) ?? [];
            } catch {
                items = [];
            }
            this.formulaItemsCache.set(formulas, items!);
        }
        return items!;
    }

    public isDiscussion(item: IFieldControl) {
        // Comments exist only for published policies.
        return (this.discussionView && !this.dryRun && (
            this.isInput(item) ||
            this.isDateTime(item) ||
            this.isDate(item) ||
            this.isBoolean(item)
        ));
    }

    public isDiscussionCount(item: IFieldControl) {
        // return 10;
        return this.discussionData ? this.discussionData[item.fullPath] : 0;
    }

    public openDiscussion(item: IFieldControl) {
        this.discussionActionEvent.emit({
            type: 'open',
            field: item.fullPath,
            fieldName: item.title
        });
    }

    public linkMessage(item: IFieldControl) {
        this.discussionActionEvent.emit({
            type: 'link',
            field: item.fullPath,
            fieldName: item.title
        });
    }

    public onDiscussionAction($event: any) {
        this.discussionActionEvent.emit($event);
    }

    private markOpened(field: IFieldControl): void {
        field.open = true;
        if (field.isArray) {
            this.expandAll(field);
        } else if (this.preview) {
            this.preparePreviewSection(field);
        }
    }

    public openField(link?: string): void {
        let _rootLink: string | undefined = undefined;
        let _subLink: string | undefined = undefined;
        if (link) {
            const index = link.indexOf('.');
            if (index > -1) {
                _rootLink = link.substring(0, index);
                _subLink = link.substring(index + 1) || undefined;
            } else {
                _rootLink = link;
                _subLink = undefined;
            }
        } else {
            _rootLink = undefined;
            _subLink = undefined;
        }
        this.linkedField = _rootLink;

        if (_rootLink && this.fields) {
            for (const field of this.fields) {
                if (field.fullPath === _rootLink) {
                    this.markOpened(field);
                    field.link = _subLink;
                } else if (field.name === _rootLink) {
                    this.markOpened(field);
                    field.link = _subLink;
                } else {
                    field.link = undefined;
                }
            }
        }
    }

    public openAccordion(link?: string): void {
        let _rootLink: string | undefined = undefined;
        let _subLink: string | undefined = undefined;
        if (link) {
            const index = link.indexOf(';');
            if (index > -1) {
                _rootLink = link.substring(0, index);
                _subLink = link.substring(index + 1) || undefined;
            } else {
                _rootLink = link;
                _subLink = undefined;
            }
        } else {
            _rootLink = undefined;
            _subLink = undefined;
        }

        if (_rootLink && this.fields) {
            for (const field of this.fields) {
                if (field.fullPath === _rootLink) {
                    this.markOpened(field);
                    field.accordionLink = _subLink;
                } else {
                    field.accordionLink = undefined;
                }
            }
        }
    }

     public onAccordionSelectEvent(isOpen: any, item: any, childrenAccordionId?: string) {
        let accordionId = item.fullPath;

        if (childrenAccordionId) {
            accordionId = `${accordionId};${childrenAccordionId}`;
        }
        this.onAccordionSelect.emit({
            path: accordionId,
            isOpen: isOpen
        });
    }
}
