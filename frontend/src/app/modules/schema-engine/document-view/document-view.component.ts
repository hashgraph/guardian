import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { DocumentValidators, Schema, SchemaRuleValidateResult } from '@guardian/interfaces';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormulasService } from 'src/app/services/formulas.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';
import { equalsLoosely } from '../schema-form-model/field-form';
import { FormulasTree } from '../../formulas/models/formula-tree';
import { IRailBadge, IRailCard, IRailSection } from '../schema-form-rail/schema-form-rail.component';
import { IOverviewCard, IOverviewTile } from '../schema-form-nav/schema-form-overview.component';
import { IViewSection } from '../schema-form-root/schema-form-sections';
import { ISubjectView, IViewLocation, IViewStats, IPageBlock, buildSubjectView, collectLocations, fieldStats, isEmptyValue, sectionBlocks, sectionCards, sumStats } from './document-view-pages';

/** The pages of a document, for a host that draws the navigation itself (a presentation). */
export const OVERVIEW_PAGE = 'overview';
export const DETAILS_PAGE = 'details';

/**
 * View document
 */
@Component({
    selector: 'app-document-view',
    templateUrl: './document-view.component.html',
    styleUrls: ['./document-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class DocumentViewComponent implements OnInit {
    @Input() dialogContext?: 'fullscreen' | 'viewer';
    @Input('getByUser') getByUser: boolean = false;
    @Input('document') document: any;
    @Input('formulas') formulas: FormulasTree | null;
    @Input('hide-fields') hideFields!: { [x: string]: boolean };
    @Input('type') type!: 'VC' | 'VP';
    @Input('schema') schema!: any;
    @Input('discussion') discussionData!: any;
    @Input('discussion-action') discussionAction: boolean = false;
    @Input('discussion-view') discussionView: boolean = false;

    @Input() dryRun?: boolean = false;
    @Input() policyId?: string;
    @Input() documentId?: string;
    @Input() schemaId?: string;
    @Input('relayer-account') relayerAccount?: string;

    @Input('disconnected') disconnected: boolean = false;
    @Input() preview: boolean = false;
    /** The host draws the navigation (a presentation); this view shows one page. */
    @Input() navHidden: boolean = false;
    /** The page to show: `overview`, `details` or a section id. */

    @Output() pagesChange = new EventEmitter<IRailCard[]>();
    @Output('discussion-action') discussionActionEvent = new EventEmitter<any>();
    @Output() previewLoadingChange = new EventEmitter<boolean>();

    public loading: boolean = false;
    public previewRendering: boolean = false;
    public previewReady: boolean = false;
    private previewFrame: number | null = null;
    private previewRenderTimer: ReturnType<typeof setTimeout> | null = null;
    private linkTimer: ReturnType<typeof setTimeout> | undefined;
    public subjects: any[] = [];
    public proofJson!: string;
    public evidenceJson!: string;
    public evidenceEntries: { dataType: string; data: string }[] = [];
    public hasStructuredEvidence: boolean = false;
    public showProof: boolean = false;
    public proofType: string = '';
    public issuerId: string = '';
    public issuerLine: string = '';
    public pageIndex: number = 0;
    public pageSize: number = 5;
    public schemaMap: { [x: string]: Schema | null } = {};
    public rules: DocumentValidators;
    public rulesResults: SchemaRuleValidateResult;
    private formulasBySubject = new Map<any, any>();
    public link: string | undefined;

    /** Navigation of a credential: the page, and for a presentation the credential that is open. */
    public screen: 'overview' | 'section' = 'overview';
    /** Rail row of the open page: 0 is "Document details", the sections follow. */
    public activeIndex = 0;
    public subjectIndex = 0;
    /** Presentation: 0 is "Presentation details", the credentials follow. */
    public vpIndex = 0;
    public vpCards: IRailCard[] = [];
    /** The credential view of a presentation: it owns the pages, the rail only tells it which to show. */
    @ViewChild('nestedView') nestedView?: DocumentViewComponent;
    public pagesReady = false;
    private subjectViews = new Map<any, ISubjectView>();
    public railSections: IRailSection[] = [];
    public sectionStats: IViewStats[] = [];
    public overviewTiles: IOverviewTile[] = [];
    public overviewCards: IOverviewCard[] = [];
    public overviewTitle = '';
    public overviewEyebrow = '';
    public locations: IViewLocation[] = [];

    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private schemaService: SchemaService,
        private schemaRulesService: SchemaRulesService,
        private formulasService: FormulasService,
        private ref: ChangeDetectorRef,
        private host: ElementRef<HTMLElement>
    ) { }

    ngOnInit(): void {
        if (!this.document) {
            return;
        }
        if (this.preview) {
            this.previewRendering = true;
            this.previewLoadingChange.emit(true);
        }

        this.proofJson = this.document.proof ? JSON.stringify(this.document.proof, null, 4) : '';
        this.evidenceJson = this.document.evidence ? JSON.stringify(this.document.evidence, null, 4) : '';
        this.parseEvidenceEntries();
        const proof = Array.isArray(this.document.proof) ? this.document.proof[0] : this.document.proof;
        this.proofType = typeof proof?.type === 'string' ? proof.type : '';
        const issuer = this.document.issuer;
        const issuerIsObject = !!issuer && typeof issuer === 'object';
        const issuerOptions = issuerIsObject
            ? Object.keys(issuer).filter((key) => key !== 'id').map((key) => `${key}: ${issuer[key]}`)
            : [];
        this.issuerId = issuerIsObject ? (issuer.id || '') : (issuer || '');
        this.issuerLine = issuerOptions.join(' · ');
        if (this.type === 'VC') {
            if (Array.isArray(this.document.credentialSubject)) {
                for (const s of this.document.credentialSubject) {
                    this.subjects.push(s);
                }
            } else {
                this.subjects.push(this.document.credentialSubject);
            }
        } else if (this.type === 'VP') {
            if (Array.isArray(this.document.verifiableCredential)) {
                for (const s of this.document.verifiableCredential) {
                    this.subjects.push(s);
                }
            } else {
                this.subjects.push(this.document.verifiableCredential);
            }
        }
        this.updateFormulasResults();
        this.loadData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.updateFormulasResults();
        if (this.pagesReady && (changes.discussionData || changes.discussionView || changes.hideFields)) {
            this.refreshPages();
        }
    }

    /**
     * Formulas of fields whose display condition matches the credential subject values.
     * Cached per subject: the view is OnPush and the template needs stable references.
     */
    private updateFormulasResults(): void {
        this.formulasBySubject = new Map<any, any>();
        if (!this.formulas) {
            return;
        }
        for (const subject of this.subjects) {
            this.formulasBySubject.set(subject, this.formulas.getFields(this.schemaId, {
                data: subject,
                anyEntry: true,
                equalsFn: equalsLoosely
            }));
        }
    }

    public formulasFor(item: any): any {
        return this.formulasBySubject.get(item) ?? null;
    }

    ngOnDestroy() {
        clearTimeout(this.linkTimer);
        if (this.preview && this.previewRendering) this.previewLoadingChange.emit(false);
        if (this.previewRenderTimer !== null) {
            clearTimeout(this.previewRenderTimer);
            this.previewRenderTimer = null;
        }
        if (this.previewFrame !== null) {
            cancelAnimationFrame(this.previewFrame);
            this.previewFrame = null;
        }
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private parseEvidenceEntries(): void {
        const evidence = this.document?.evidence;
        if (!Array.isArray(evidence) || evidence.length === 0) {
            this.hasStructuredEvidence = false;
            return;
        }
        const isStructured = evidence.every(
            (e: any) => e && typeof e.dataType === 'string' && typeof e.data === 'string'
        );
        if (isStructured) {
            this.hasStructuredEvidence = true;
            this.evidenceEntries = evidence.map((e: any) => ({
                dataType: e.dataType,
                data: e.data,
            }));
        } else {
            this.hasStructuredEvidence = false;
        }
    }

    private loadData() {
        const requests: any = {};

        //Load Schemas
        if (this.type === 'VC') {
            const schemas: any[] = [];
            for (const credentialSubject of this.subjects) {
                const type: string = credentialSubject.type;
                if (!this.schemaMap[type]) {
                    this.schemaMap[type] = null;
                }
                if (!this.schemaId) {
                    this.schemaId = `#${type}`;
                }
            }
            for (const [type, schema] of Object.entries(this.schemaMap)) {
                if (!schema) {
                    if (this.getByUser) {
                        schemas.push(
                            this.schemaService
                                .getSchemasByTypeAndUser(type)
                                .pipe(takeUntil(this.destroy$))
                        )
                    } else {
                        schemas.push(
                            this.schemaService
                                .getSchemasByType(type)
                                .pipe(takeUntil(this.destroy$))
                        )
                    }
                }
            }
            for (let i = 0; i < schemas.length; i++) {
                requests[i] = schemas[i];
            }
        }

        //Load Rules
        if (this.type === 'VC') {
            requests.rules = this.schemaRulesService
                .getSchemaRuleData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId
                })
                .pipe(takeUntil(this.destroy$));
        }

        //Load Formulas
        if (this.documentId) {
            requests.formulas = this.formulasService
                .getFormulasData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId
                })
                .pipe(takeUntil(this.destroy$));
        }


        this.loading = true;
        if (this.preview && !Object.keys(requests).length) {
            this.loading = false;
            this.refreshPages();
            this.renderPreview();
            return;
        }
        forkJoin(requests).subscribe((results: any) => {
            //Load Rules
            if (results.rules) {
                const rules = results.rules;
                this.rules = new DocumentValidators(rules);
                this.rulesResults = this.rules.validateVC(this.schemaId, this.document);
                delete results.rules;
            }

            //Load Formulas
            if (results.formulas) {
                const formulas = results.formulas;
                this.formulas = FormulasTree.from(formulas);
                this.formulas?.setDocuments(this.document);
                this.updateFormulasResults();
                delete results.formulas;
            }

            //Load Schemas
            for (const schema of Object.values<any>(results)) {
                if (schema) {
                    try {
                        let type = (schema.iri || '');
                        if (type.startsWith('#')) {
                            type = type.substr(1);
                        }
                        this.schemaMap[type] = new Schema(schema);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            const timer = setTimeout(() => {
                this.loading = false;
                this.refreshPages();
                if (this.preview) {
                    this.previewRenderTimer = null;
                    this.renderPreview();
                }
                this.ref.detectChanges();
            }, 500);
            if (this.preview) {
                this.previewRenderTimer = timer;
            }
        }, (e) => {
            this.loading = false;
            this.refreshPages();
            if (this.preview) {
                this.renderPreview();
            }
            this.ref.detectChanges();
        });

    }

    private renderPreview(): void {
        this.previewFrame = requestAnimationFrame(() => {
            this.previewFrame = requestAnimationFrame(() => {
                this.previewReady = true;
                this.ref.detectChanges();
                this.previewFrame = requestAnimationFrame(() => {
                    this.previewFrame = null;
                    this.previewRendering = false;
                    this.previewLoadingChange.emit(false);
                    this.ref.markForCheck();
                });
            });
        });
    }

    getItemsPage(items: any[]) {
        const result = [];
        const startIndex = this.pageIndex * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        for (let i = startIndex; i < endIndex && i < items.length; i++) {
            result.push(items[i]);
        }
        return result;
    }

    public onPage(event: any): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
    }

    public onDiscussionAction($event: any) {
        this.discussionActionEvent.emit($event);
    }

    public get subject(): any {
        return this.subjects[this.subjectIndex];
    }

    public get view(): ISubjectView {
        return this.subjectViews.get(this.subject) ?? { sections: [], fields: [], values: this.subject, pathPrefix: '', rootName: null };
    }

    public get hasSections(): boolean {
        return this.view.sections.length > 0;
    }

    /** The section on the open page; null on Overview and on Document details. */
    public get section(): IViewSection | null {
        return this.screen === 'section' && this.activeIndex > 0 ? this.view.sections[this.activeIndex - 1] ?? null : null;
    }

    public get sectionStat(): IViewStats | null {
        return this.section ? this.sectionStats[this.activeIndex - 1] ?? null : null;
    }

    /** The details card is on its own page, or on top of a flat document. */
    public get showDetails(): boolean {
        return !this.hasSections || (this.screen === 'section' && this.activeIndex === 0);
    }

    /** The key of the open page; the field view is created again when it changes. */
    public get pageKey(): string {
        return `${this.subjectIndex}:${this.screen}:${this.activeIndex}`;
    }

    public get barLabel(): string {
        // Document details is the first rail row but not a section
        return this.screen === 'section' && this.activeIndex > 0 ? `Section ${this.activeIndex} of ${this.railSections.length - 1}` : '';
    }

    /** The link as the open page's field view reads it: without the promoted root's name. */
    public get pageLink(): string | undefined {
        const root = this.view.rootName;
        if (this.link && root && this.link.startsWith(`${root}.`)) {
            return this.link.substring(root.length + 1);
        }
        return this.link;
    }

    /** The pages of the open credential, for a host that draws the rail. */
    public get pages(): IRailCard[] {
        if (!this.hasSections) {
            return [];
        }
        return [
            { id: OVERVIEW_PAGE, title: 'Overview' },
            { id: DETAILS_PAGE, title: 'Document details' },
            ...this.view.sections.map(item => ({ id: item.id, title: item.title })),
        ];
    }

    /** The sub-schemas of the open section, listed under it in the rail. */
    public get railCards(): IRailCard[] {
        const key = `${this.pageKey}:${this.cardsVersion}`;
        if (key !== this.cardsKey) {
            this.cardsKey = key;
            const section = this.section;
            this.cardsList = section ? sectionCards(section, this.view.values, this.hideFields || {}) : [];
        }
        return this.cardsList;
    }

    /** The cards of the open page: one per first-level sub-schema of a section, one for a flat document. */
    public get blocks(): IPageBlock[] {
        const key = `${this.pageKey}:${this.cardsVersion}`;
        if (key !== this.blocksKey) {
            this.blocksKey = key;
            const view = this.view;
            const section = this.section;
            this.blocksList = section
                ? sectionBlocks(section, view.values, view.pathPrefix, this.hideFields || {})
                : !view.sections.length
                    ? [{ key: 'flat', title: null, fields: view.fields, values: view.values, prefix: '', linkPrefix: '', empty: false }]
                    : [];
        }
        return this.blocksList;
    }

    /** The part of the field link that points into a card, relative to the card's own fields. */
    public blockLink(block: IPageBlock): string | undefined {
        const link = this.pageLink;
        if (!link) {
            return undefined;
        }
        if (!block.linkPrefix) {
            return link;
        }
        return link.startsWith(block.linkPrefix) && link.length > block.linkPrefix.length ? link.substring(block.linkPrefix.length) : undefined;
    }

    private blocksKey = '';
    private blocksList: IPageBlock[] = [];
    private cardsKey = '';
    private cardsVersion = 0;
    private cardsList: IRailCard[] = [];

    /** Scrolls to the sub-heading of a card the rail reports. */
    public onNavCard(card: IRailCard): void {
        setTimeout(() => {
            this.host.nativeElement
                .querySelector<HTMLElement>(`[field-id="${CSS.escape(card.id)}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    public get subjectLabels(): { index: number; text: string }[] {
        return this.getItemsPage(this.subjects).map((item) => {
            const index = this.subjects.indexOf(item);
            return { index, text: `${index + 1} · ${item?.type ?? ''}` };
        });
    }

    public openPage(index: number): void {
        this.screen = 'section';
        this.activeIndex = index;
        this.ref.detectChanges();
    }

    /** Opens the page of a location's field, opens the row it is in, and scrolls to it. */
    public openLocation(location: IViewLocation): void {
        this.link = location.path;
        this.screen = 'section';
        this.activeIndex = location.sectionIndex + 1;
        this.ref.detectChanges();
        this.onNavCard({ id: location.id });
        // The link only has to open the field once; a later one for the same field must work again
        clearTimeout(this.linkTimer);
        this.linkTimer = setTimeout(() => {
            this.link = undefined;
            this.ref.detectChanges();
        }, 600);
    }

    public openOverview(): void {
        this.screen = 'overview';
        this.activeIndex = 0;
        this.ref.detectChanges();
    }

    public onNavSelect(target: number | 'overview'): void {
        if (target === 'overview') {
            this.openOverview();
        } else {
            this.openPage(target);
        }
    }

    public selectSubject(index: number): void {
        if (index === this.subjectIndex) {
            return;
        }
        this.subjectIndex = index;
        this.link = undefined;
        this.screen = 'overview';
        this.activeIndex = 0;
        this.refreshPages();
        this.ref.detectChanges();
    }

    /** Shows the page with this id (`overview`, `details` or a section id) of the open credential. */
    public showPage(id: string): void {
        if (!this.pagesReady) {
            return;
        }
        if (id === OVERVIEW_PAGE) {
            this.screen = 'overview';
            this.activeIndex = 0;
        } else if (id === DETAILS_PAGE) {
            this.screen = 'section';
            this.activeIndex = 0;
        } else {
            const index = this.view.sections.findIndex(item => item.id === id);
            if (index >= 0) {
                this.screen = 'section';
                this.activeIndex = index + 1;
            }
        }
        this.ref.markForCheck();
    }

    public openField(id?: string): void {
        const path = id?.split('/');
        this.link = path && path.length > 1 ? path[path.length - 1] : undefined;
        if (this.link) {
            this.showFieldPage(this.link);
        }
        this.ref.detectChanges();
    }

    private showFieldPage(link: string): void {
        const view = this.view;
        if (!view.sections.length) {
            return;
        }
        const parts = link.split('.');
        if (view.rootName && parts[0] === view.rootName) {
            parts.shift();
        }
        const index = view.sections.findIndex(item => item.fields.some(field => field.name === parts[0] || field.fullPath === parts[0]));
        if (index >= 0) {
            this.screen = 'section';
            this.activeIndex = index + 1;
        }
    }

    public get vpSections(): IRailSection[] {
        return [
            { id: 'presentation', title: 'Presentation details' },
            ...this.subjects.map((item, index) => ({ id: `vc-${index}`, title: this.credentialTitle(item, index) })),
        ];
    }

    public credentialTitle(item: any, index: number): string {
        const subject = Array.isArray(item?.credentialSubject) ? item.credentialSubject[0] : item?.credentialSubject;
        return subject?.type || `Verifiable Credential #${index + 1}`;
    }

    public onVpSelect(target: number | 'overview'): void {
        if (typeof target === 'number') {
            this.openCredential(target);
        }
    }

    public openCredential(index: number): void {
        this.vpIndex = index;
        this.vpCards = [];
        this.ref.detectChanges();
    }

    public onVpCard(card: IRailCard): void {
        this.nestedView?.showPage(card.id);
    }

    public onNestedPages(cards: IRailCard[]): void {
        this.vpCards = cards;
        this.ref.markForCheck();
    }

    private get statsContext() {
        return { hide: this.hideFields || {}, rules: this.rulesResults, discussion: this.discussionData };
    }

    private badges(stats: IViewStats): IRailBadge[] {
        const badges: IRailBadge[] = [];
        if (stats.warnings) {
            badges.push({ kind: 'warn', count: stats.warnings, tooltip: `${stats.warnings} rule ${stats.warnings === 1 ? 'warning' : 'warnings'}` });
        }
        if (this.discussionView && stats.comments) {
            badges.push({ kind: 'comment', count: stats.comments, tooltip: `${stats.comments} ${stats.comments === 1 ? 'comment' : 'comments'}` });
        }
        return badges;
    }

    /** Builds the sections of every credential subject and what the Overview shows. */
    private refreshPages(): void {
        if (this.type !== 'VC' || !this.subjects.length) {
            return;
        }
        this.cardsVersion++;
        this.subjectViews = new Map();
        for (const item of this.subjects) {
            this.subjectViews.set(item, buildSubjectView(this.schemaMap[item.type], item, this.hideFields || {}));
        }
        this.pagesReady = true;
        const view = this.view;
        const context = this.statsContext;
        this.sectionStats = view.sections.map(item => fieldStats(item.fields, view.values, context));
        const total = sumStats(this.sectionStats);
        this.railSections = view.sections.length
            ? [
                { id: DETAILS_PAGE, title: 'Document details' },
                ...view.sections.map((item, index) => ({ id: item.id, title: item.title, badges: this.badges(this.sectionStats[index]) })),
            ]
            : [];
        const results = Object.values(this.rulesResults || {});
        const failed = results.filter(item => item.status === 'Failure' || item.status === 'Error').length;
        const tiles: IOverviewTile[] = [
            { value: String(view.sections.length), label: 'Sections' },
            { value: `${total.total - total.missing} of ${total.total}`, label: 'Fields provided' },
        ];
        if (results.length) {
            tiles.push({ value: `${failed} of ${results.length}`, label: 'Rule checks failed', tone: failed ? 'warn' : 'ok' });
        }
        if (this.discussionView) {
            tiles.push({ value: String(total.comments), label: 'Comments' });
        }
        this.overviewTiles = tiles;
        this.overviewCards = [
            { id: DETAILS_PAGE, title: 'Document details', meta: 'ID, issuer, issued date, evidence and proof', action: 'Open' },
            ...view.sections.map((item, index): IOverviewCard => {
                const stats = this.sectionStats[index];
                const missing = stats.missing ? ` · ${stats.missing} not provided` : '';
                return {
                    id: item.id,
                    title: item.title,
                    meta: `${stats.total} ${stats.total === 1 ? 'field' : 'fields'}${missing}`,
                    fill: stats.total ? (stats.total - stats.missing) / stats.total * 100 : 0,
                    badges: this.badges(stats),
                    action: 'Open',
                };
            }),
        ];
        this.locations = collectLocations(view.sections, view.values, this.hideFields || {});
        const schema = this.schemaMap[this.subject?.type];
        const schemaName = schema?.name || schema?.description || '';
        this.overviewEyebrow = schemaName ? `Overview · ${schemaName}` : 'Overview';
        this.overviewTitle = this.titleOf(view) || schemaName;
        this.pagesChange.emit(this.pages);
    }

    /** D3: the value of the first top-level plain string field; empty when there is none or it has no value. */
    private titleOf(view: ISubjectView): string {
        for (const section of view.sections) {
            for (const field of section.fields) {
                if (field.type === 'string' && !field.format && !field.isRef && !field.isArray) {
                    const value = view.values?.[field.name];
                    return typeof value === 'string' && !isEmptyValue(value) ? value : '';
                }
            }
        }
        return '';
    }

    public getTagJson(tag: any): string {
        return tag ? JSON.stringify(tag, null, 4) : '';
    }
}
