import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, HostBinding, Output, ViewChild, inject } from '@angular/core';
import { SchemaFormPreferencesService } from 'src/app/services/schema-form-preferences.service';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RequestDocumentBlockComponent } from '../request-document-block.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { RequestDocumentBlockAddonComponent } from '../../request-document-block-addon/request-document-block-addon.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { audit, takeUntil } from 'rxjs/operators';
import { interval, Subject, Subscription } from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { BlockErrorType, DocumentValidators, IDocumentValidatorBlockError } from '@guardian/interfaces';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { DocumentAutosaveStorage } from 'src/app/modules/policy-engine/structures';
import { TablePersistenceService } from 'src/app/services/table-persistence.service';
import { GeoFilePersistenceService } from 'src/app/services/geo-file-persistence.service';
import { autosaveValueChanged, getMinutesAgoStream } from 'src/app/utils/autosave-utils';
import { RelayerAccountsService } from 'src/app/services/relayer-accounts.service';
import { AttachedFile } from 'src/app/modules/common/policy-comments/attached-file';
import { IPFSService } from 'src/app/services/ipfs.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { FormulasTree } from 'src/app/modules/formulas/models/formula-tree';
import { IFormIssue, SchemaFormRootComponent } from 'src/app/modules/schema-engine/schema-form-root/schema-form-root.component';
import { PolicyTestAutomationService } from '../../../policy-test-automation/policy-test-automation.service';
import { CalculationPreviewService, ICalculationPreviewProblem, ICalculationPreviewResult, ICalculationPreviewTimelineItem } from 'src/app/services/calculation-preview.service';
import { IFormTarget, isIndexSegment, walkFields } from 'src/app/modules/schema-engine/schema-form/schema-form-walk';
import { IFormCompletion } from 'src/app/modules/schema-engine/schema-form/schema-form-completion';
import { ToastService } from 'src/app/services/toast.service';
import { FormTakeoverService } from '../../../form-takeover/form-takeover.service';
import { PolicyProgressService } from '../../../../services/policy-progress.service';

export interface IPreviewItemView extends ICalculationPreviewTimelineItem {
    title: string;
    sub: string;
}

export type FormStep = 'fill' | 'evidence' | 'relayer';
export type FormScreen = 'form' | 'results' | 'presults' | 'submitted';

/**
 * Everything the Submitted screen shows. The block underneath can change or disappear
 * (step change, ws refresh), so the screen reads only this copy.
 */
export interface ISubmittedSnapshot {
    document: any | null;
    vcId: string | null;
    issuedAt: string | null;
    role: string | null;
    title: string;
    schemaName: string;
    stepLabel: string | null;
    policyId: string;
    dryRun: boolean;
    edit: boolean;
    payload: any;
}

@Component({
    selector: 'request-document-form',
    templateUrl: './request-document-form.component.html',
    styleUrls: ['./request-document-form.component.scss'],
    standalone: false
})
export class RequestDocumentFormComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    @Input() parent: RequestDocumentBlockComponent | RequestDocumentBlockAddonComponent;
    @Input() allowDraft: boolean;
    @Input() duplicatedFrom: string | null = null;
    @Output() closed = new EventEmitter<void>();

    public menuOpen: boolean = false;

    public closeMenu(): void {
        this.menuOpen = false;
    }

    @HostBinding('attr.modal')
    public get isModal(): boolean | null {
        return this.dialogRef ? true : null;
    }

    // The form is opened either as a content-area takeover or, outside the viewer, as a modal
    public dialogRef = inject(DynamicDialogRef, { optional: true });
    public config = inject(DynamicDialogConfig, { optional: true });
    private policyProgressService = inject(PolicyProgressService, { optional: true });
    private formTakeover = inject(FormTakeoverService, { optional: true });
    private toastService = inject(ToastService);
    private activeStepLabel: string | null = null;

    public get id() { return this.parent?.id; }
    public get dryRun() { return this.parent?.dryRun; }
    public get restoreData() { return this.parent?.restoreData; }
    public get dialogTitle() { return this.parent?.dialogTitle; }
    public get schema() { return this.parent?.schema; }
    public get hideFields() { return this.parent?.hideFields; }
    public get presetDocument() { return this.parent?.presetDocument; }
    public get presetReadonlyFields() { return this.parent?.presetReadonlyFields; }
    public get policyId() { return this.parent?.policyId; }
    public get disabled() { return this.parent?.disabled; }
    public get docRef() { return this.parent?.getRef(); }
    public get autosaveId() { return this.parent?.getAutosaveId(); }
    public get edit() { return this.parent?.edit; }
    public get draft() { return this.parent?.draft; }
    public get relayerAccount() { return this.parent?.relayerAccount; }
    public get user() { return this.parent?.user; }
    public get isLocalUser() { return this.parent?.isLocalUser; }

    public buttons: any = [];
    public rules: DocumentValidators;
    public dataForm: UntypedFormGroup;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public formulas: FormulasTree | null = null;
    public rulesResults: any;
    public lastSavedAt?: Date;
    private storage: DocumentAutosaveStorage;
    private sub?: Subscription;
    private readonly AUTOSAVE_INTERVAL = 120000;
    public dataSaved: boolean = false;
    public step: FormStep = 'fill';
    public screen: FormScreen = 'form';
    public issues: IFormIssue[] = [];
    public completion: IFormCompletion | null = null;
    public ruleIssues: IFormIssue[] = [];
    public submitted: ISubmittedSnapshot | null = null;
    public docTab: 'doc' | 'json' = 'doc';
    public submittedJson = '';
    public relayerAccountType: string = 'account';
    public currentRelayerAccount: string;
    public relayerAccounts: any[] = [];
    public remoteWarning: boolean = false;
    public previewMode: boolean = false;
    public previewRendering: boolean = false;
    private previewBusyHold: boolean = false;
    private previewBusyTimer: ReturnType<typeof setTimeout> | null = null;
    private submitTimer: ReturnType<typeof setTimeout> | null = null;
    private previewSubmitLabel: boolean = false;
    public previewItems: IPreviewItemView[] = [];
    /** Cards whose document viewer was opened. Their viewers stay alive while hidden. */
    public previewVisited = new Set<number>();
    public previewIndex: number = 0;
    public previewProblems: ICalculationPreviewProblem[] = [];
    public previewShowErrors: boolean = false;
    public previewExpanded: boolean = false;
    public previewDiscoveryWarning: boolean = false;
    public previewTab: 'doc' | 'json' = 'doc';
    public previewJson = '';
    public previewViewLoading: number = 0;
    /** Loading viewers per card: a viewer that stays mounted while hidden still reports. */
    private previewLoadingByCard = new Map<number, number>();

    public get isPreviewBusy(): boolean {
        return this.previewMode && (this.loading || this.previewRendering || this.previewBusyHold);
    }

    ngDoCheck(): void {
        if (!this.loading) {
            this.previewSubmitLabel = this.previewMode;
        }
        if (!this.previewMode || this.loading || this.previewRendering) {
            if (this.previewBusyTimer !== null) {
                clearTimeout(this.previewBusyTimer);
                this.previewBusyTimer = null;
            }
            this.previewBusyHold = this.previewMode;
            return;
        }
        if (this.previewBusyHold && this.previewBusyTimer === null) {
            this.previewBusyTimer = setTimeout(() => {
                this.previewBusyTimer = null;
                this.previewBusyHold = false;
                this.changeDetectorRef.markForCheck();
            }, 300);
        }
    }

    public onPreviewRenderingChange(rendering: boolean): void {
        const wasRendering = this.previewRendering;
        this.previewRendering = this.previewMode && rendering;
        if (wasRendering && !this.previewRendering && this.screen === 'results') {
            // The form finished rebuilding with the new requirements
            this.refreshIssues();
        }
        this.changeDetectorRef.markForCheck();
    }
    public previewRequiredFields: string[] | null = null;
    public previewRequiredText = 'Only the fields the calculations read are required.';
    private previewRequest: number = 0;
    public previewMissingFields: string[] = [];
    private previewPreferenceLoaded: boolean = false;

    public get previewAvailable(): boolean {
        return this.parent instanceof RequestDocumentBlockComponent;
    }

    public enableAdditionalData: boolean = false;
    public evidenceText: string = '';
    public evidenceFiles: AttachedFile[] = [];
    private _evidenceFileMap = new WeakMap<AttachedFile, File>();

    public get isEvidenceUploading(): boolean {
        return this.evidenceFiles.some(f => !f.loaded && !f.error);
    }

    public get headerStepLabel(): string | null {
        return this.submitted ? this.submitted.stepLabel : this.activeStepLabel;
    }

    public get headerTitle(): string {
        return this.submitted ? this.submitted.title : (this.dialogTitle || this.parent?.title);
    }

    public get resultsEyebrow(): string {
        return this.previewMode ? 'Calculation preview' : this.buttonNames['submit'];
    }

    public get resultsHeading(): string {
        const count = this.issues.length;
        if (this.previewMode) {
            return `The calculations need ${count} more ${count === 1 ? 'value' : 'values'}`;
        }
        if (!count) {
            return 'Fix the highlighted fields before creating the document';
        }
        return `Fix ${count} ${count === 1 ? 'problem' : 'problems'} before creating the document`;
    }

    public get resultsLead(): string {
        return this.previewMode
            ? "These fields are read by the policy's calculations. Fill them in and run Preview again. Nothing was created."
            : "Nothing was submitted. Errors block creation. Rule checks come from the policy's schema rules and don't block it.";
    }

    public get issuePill(): string {
        return this.previewMode ? 'Missing' : 'Error';
    }

    /** Sets the fields the calculations read and the form notice that counts them. */
    private setPreviewRequiredFields(value: string[] | null): void {
        this.previewRequiredFields = value;
        this.updatePreviewRequiredText();
    }

    /** The notice shows the same required count as the form's progress. */
    private updatePreviewRequiredText(): void {
        if (!this.previewRequiredFields || !this.completion) {
            this.previewRequiredText = 'Only the fields the calculations read are required.';
            return;
        }
        const count = this.completion.total;
        this.previewRequiredText = count === 1
            ? 'Only the 1 field the calculation reads is required.'
            : `Only the ${count} fields the calculations read are required.`;
    }

    public get previewHeading(): string {
        return this.previewShowErrors ? 'The preview is incomplete' : 'Preview results';
    }

    public get previewLead(): string {
        return this.previewShowErrors
            ? 'A block in the calculation chain stopped. Fix the cause and run Preview again.'
            : 'Temporary documents produced by the policy\'s calculation chain from your current values, in chain order. Nothing was created, sent to Hedera or minted.';
    }

    public isPreviewItemVisible(index: number): boolean {
        const item = this.previewItems[index];
        return this.previewExpanded || item.role === 'input' || item.final === true
            || (!this.previewItems.some((entry) => entry.final === true) && index === this.previewItems.length - 1);
    }

    public showPreviewErrors(): void {
        if (this.previewProblems.length) {
            this.previewShowErrors = true;
        }
    }

    public showPreviewResults(): void {
        this.previewShowErrors = false;
    }

    public get previewSelected(): IPreviewItemView | null {
        return this.previewItems[this.previewIndex] ?? null;
    }

    public validatorError(problem: ICalculationPreviewProblem): IDocumentValidatorBlockError | null {
        return problem.errorData?.type === BlockErrorType.DOCUMENT_VALIDATOR_BLOCK_ERROR
            ? problem.errorData as IDocumentValidatorBlockError
            : null;
    }

    private toPreviewItemView(item: ICalculationPreviewTimelineItem): IPreviewItemView {
        return {
            ...item,
            title: item.role === 'input' ? (this.schema?.name || item.label) : item.label,
            sub: item.role === 'input'
                ? item.label
                : [item.blockType, item.target || item.source].filter(Boolean).join(' · ')
        };
    }

    public setDocView(kind: 'preview' | 'submitted', tab: 'doc' | 'json'): void {
        if (kind === 'preview') {
            this.previewTab = tab;
        } else {
            this.docTab = tab;
        }
    }

    public selectPreviewItem(index: number): void {
        if (index === this.previewIndex) {
            return;
        }
        this.previewIndex = index;
        this.previewVisited.add(index);
        this.previewJson = this.stringifyPreviewItem();
        this.previewViewLoading = this.previewLoadingByCard.get(index) ?? 0;
    }

    private stringifyPreviewItem(): string {
        const item = this.previewSelected;
        return item ? JSON.stringify(item.document ?? null, null, 2) : '';
    }

    public onPreviewViewLoadingChange(index: number, loading: boolean): void {
        const count = Math.max(0, (this.previewLoadingByCard.get(index) ?? 0) + (loading ? 1 : -1));
        this.previewLoadingByCard.set(index, count);
        // Only the open card can hold the overlay
        this.previewViewLoading = this.previewLoadingByCard.get(this.previewIndex) ?? 0;
        this.changeDetectorRef.markForCheck();
    }

    public get isSubmitted(): boolean {
        return this.screen === 'submitted';
    }

    // The 'Validation results' step is red while errors remain after going back to the form
    public get hasOpenIssues(): boolean {
        return this.issues.length > 0;
    }

    public get stepperSteps(): { id: string; label: string }[] {
        if (this.previewMode) {
            return [{ id: 'fill', label: 'Fill form' }, { id: 'results', label: 'Calculation preview' }];
        }
        const steps = [{ id: 'fill', label: 'Fill form' }, { id: 'results', label: 'Validation results' }];
        if (this.enableAdditionalData) {
            steps.push({ id: 'evidence', label: 'Evidence attachments' });
        }
        if (this.relayerAccount) {
            steps.push({ id: 'relayer', label: 'Relayer account' });
        }
        steps.push({ id: 'submitted', label: 'Submitted' });
        return steps;
    }

    public get currentStepId(): string {
        if (this.screen === 'submitted') return 'submitted';
        if (this.screen === 'results' || this.screen === 'presults') return 'results';
        return this.step;
    }

    public stepState(id: string): { current: boolean; done: boolean; bad: boolean; clickable: boolean } {
        const steps = this.stepperSteps.map((item) => item.id);
        const index = steps.indexOf(id);
        const currentIndex = steps.indexOf(this.currentStepId);
        const current = index === currentIndex;
        const bad = id === 'results' && this.hasOpenIssues && index >= currentIndex;
        const done = index < currentIndex && !bad;
        const clickable = !this.isSubmitted && !current && !this.loading
            && (id === 'fill' || (id === 'evidence' && this.step === 'relayer' && this.screen === 'form')
                || (id === 'results' && bad));
        return { current, done, bad, clickable };
    }

    public onStepperClick(id: string): void {
        if (id === 'fill') {
            this.showForm();
        } else if (id === 'evidence') {
            this.step = 'evidence';
        } else if (id === 'results') {
            this.revalidate();
        }
    }

    public get backLabel(): string {
        const label = this.submitted?.stepLabel;
        return label ? `Back to ${label}` : 'Back';
    }

    public get canDuplicate(): boolean {
        return !!this.submitted && !this.submitted.edit && !this.parent?.isDestroyed;
    }

    public minutesAgo$ = getMinutesAgoStream(() => this.lastSavedAt);
    private buttonNames: { [id: string]: string } = {
        save: 'Save Draft',
        cancel: 'Cancel',
        prev: 'Previous',
        next: 'Next',
        relayerAccount: 'Select Relayer Account',
        submit: 'Validate & Create'
    }

    public relayerAccountForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        account: new FormControl<string>('', Validators.required),
        key: new FormControl<string>('', Validators.required),
    });

    public get needRemoteWarning() {
        return !this.isLocalUser && this.relayerAccountType !== 'account';
    }

    public get isRemoteWarning() {
        return this.needRemoteWarning && !this.remoteWarning;
    }

    @ViewChild('formRoot') formRoot?: SchemaFormRootComponent;

    constructor(
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
        private schemaRulesService: SchemaRulesService,
        private relayerAccountsService: RelayerAccountsService,
        private fb: UntypedFormBuilder,
        private changeDetectorRef: ChangeDetectorRef,
        private indexedDb: IndexedDbRegistryService,
        private tablePersist: TablePersistenceService,
        private geoFilePersist: GeoFilePersistenceService,
        private ipfsService: IPFSService,
        private policyTest: PolicyTestAutomationService,
        private formulasService: FormulasService,
        private calculationPreview: CalculationPreviewService,
        public formPreferences: SchemaFormPreferencesService,
    ) {
        this.dataForm = this.fb.group({});
        this.storage = new DocumentAutosaveStorage(indexedDb);
    }

    ngOnInit() {
        this.parent ??= this.config?.data;
        this.allowDraft ??= (this.parent as any)?.allowDraft;
        if (this.parent) {
            this.parent.form = this;
            this.enableAdditionalData = !!(this.parent as any).enableAdditionalData;
        }
        this.loading = true;
        this.loadRules();
        this.loadFormulas();
        this.policyProgressService?.activeStep$?.pipe(takeUntil(this.destroy$)).subscribe((step) => {
            this.activeStepLabel = step?.label ?? null;
        });
        this.initForm(this.dataForm, false);
        this.sub = interval(this.AUTOSAVE_INTERVAL).subscribe(async () => {
            const data = this.dataForm.getRawValue();
            const savedData = await this.storage.load(this.autosaveId);
            const saveNeeded = await autosaveValueChanged(data, savedData);

            if (saveNeeded) {
                this.storage.save(this.autosaveId, data);
                this.lastSavedAt = new Date();
            }
        });
        this.buttonNames['submit'] = (this.edit && !this.draft) ? 'Validate & Update' : 'Validate & Create';
    }

    ngOnDestroy(): void {
        if (this.submitTimer !== null) clearTimeout(this.submitTimer);
        if (this.previewBusyTimer !== null) clearTimeout(this.previewBusyTimer);
        if (this.previewMode) this.previewRequest++;
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
        this.sub?.unsubscribe();
        if (this.parent?.form === this) {
            this.parent.form = null;
        }
    }

    public close(): void {
        this.closed?.emit();
        this.dialogRef?.close(null);
    }

    public initForm($event: any, restorePreview: boolean = true) {
        this.dataForm = $event;
        this.dataForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .pipe(audit(ev => interval(1000)))
            .subscribe(val => {
                this.validate();
                this.dataSaved = false;
                if (this.issues.length) {
                    this.refreshIssues();
                }
            });
        if (restorePreview) {
            this.restorePreviewMode();
        }
    }

    public onPresetApplied(): void {
        if (this.previewMode) {
            void this.runPreview(true);
        }
    }

    private loadRules() {
        this.schemaRulesService
            .getSchemaRuleData({
                policyId: this.policyId,
                schemaId: this.schema?.iri,
                parentId: this.docRef?.id
            })
            .pipe(takeUntil(this.destroy$))
            .subscribe((rules: any[]) => {
                this.rules = new DocumentValidators(rules);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    private loadFormulas() {
        const schemaIri = this.schema?.iri;
        if (!this.policyId || !schemaIri) {
            return;
        }
        this.formulasService
            .getFormTree(this.policyId, schemaIri)
            .pipe(takeUntil(this.destroy$))
            .subscribe((formulas) => {
                this.formulas = formulas;
                this.changeDetectorRef.markForCheck();
            }, () => {
                this.formulas = null;
            });
    }

    private loadRelayerAccounts() {
        this.loading = true;
        this.relayerAccountsService
            .getRelayerAccountsAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe((relayerAccounts: any[]) => {
                this.relayerAccounts = relayerAccounts;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    private validate() {
        if (!this.rules) {
            return;
        }
        const data = this.dataForm.getRawValue();
        this.rulesResults = this.rules.validateForm(this.schema?.iri, data);
    }

    public onClose(): void {
        if (this.submitted) {
            this.close();
        } else if ((this.dataForm.dirty && !this.dataSaved) || this.isPreviewBusy) {
            this.showUnsavedChangesDialog();
        } else {
            this.close();
        }
    }

    private getRelayerAccount() {
        if (this.relayerAccount) {
            if (this.relayerAccountType === 'account') {
                return null;
            } else if (this.relayerAccountType === 'relayerAccount') {
                return this.currentRelayerAccount;
            } else if (this.relayerAccountType === 'new') {
                return this.relayerAccountForm.value;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    public onEvidenceDrop($event: DragEvent) {
        $event.preventDefault();
        const files = $event.dataTransfer?.files;
        if (files?.length) {
            this.addEvidenceFiles(Array.from(files));
        }
    }

    public onEvidenceAttach($event: any) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e: any) => {
            const files: File[] = Array.from(e.target.files || []);
            if (files.length) {
                this.addEvidenceFiles(files);
            }
        };
        input.click();
    }

    public onDeleteEvidenceFile(file: AttachedFile) {
        const index = this.evidenceFiles.indexOf(file);
        if (index !== -1) {
            this.evidenceFiles.splice(index, 1);
            this._evidenceFileMap.delete(file);
        }
    }

    private addEvidenceFiles(files: File[]) {
        for (const rawFile of files) {
            if (this.evidenceFiles.some(f => this._evidenceFileMap.get(f)?.name === rawFile.name)) {
                continue;
            }
            const af = AttachedFile.fromFile('', '', '', rawFile);
            this._evidenceFileMap.set(af, rawFile);
            this.evidenceFiles.push(af);
            this.ipfsService.addFile(rawFile).subscribe((cid: string) => {
                af.cid = cid;
                af.link = 'ipfs://' + cid;
                af.loaded = true;
            }, () => {
                af.error = true;
            });
        }
    }

    private buildEvidence(): Array<{ dataType: 'message' | 'file'; data: string }> {
        const entries: Array<{ dataType: 'message' | 'file'; data: string }> = [];
        if (this.evidenceText?.trim()) {
            entries.push({ dataType: 'message', data: this.evidenceText.trim() });
        }
        for (const file of this.evidenceFiles.filter(f => f.loaded && !f.error)) {
            entries.push({ dataType: 'file', data: file.link });
        }
        return entries;
    }

    private async onSubmit(draft?: boolean) {
        const data = this.dataForm.getRawValue();
        this.loading = true;

        let geoPersistStarted = false;
        try {
            await this.tablePersist.persistTablesInDocument(data, !!this.dryRun, this.policyId, this.id, draft);
            geoPersistStarted = true;
            await this.geoFilePersist.persistGeoFilesInDocument(data, !!this.dryRun, !!draft);
        } catch (error) {
            await this.tablePersist.rollbackIpfsUploads();
            if (geoPersistStarted) await this.geoFilePersist.rollbackGridFsUploads();
            console.error(error);
            this.loading = false;
            return;
        }

        prepareVcData(data);
        const draftId = this.parent instanceof RequestDocumentBlockComponent ? this.parent.draftId : null;
        this.storage.delete(this.autosaveId);

        const evidence = this.enableAdditionalData ? this.buildEvidence() : undefined;

        const payload = {
            document: data,
            ref: this.docRef,
            draft,
            draftId,
            relayerAccount: this.getRelayerAccount(),
            ...(evidence?.length ? { evidence } : {})
        };

        const captureOutput = this.dryRun && !draft && this.policyTest.state.captureNextFormSubmit;

        this.policyEngineService
            .setBlockDataWithResult(this.id, this.policyId, payload)
            .subscribe((result) => {
                if (captureOutput) {
                    this.policyTest.captureTestCase({
                        policyId: this.policyId,
                        blockId: this.id,
                        blockType: 'requestDocumentBlock',
                        ...payload,
                        result: result?.result || result?.response
                    });
                }
                if (!draft) {
                    this.formTakeover?.keep(this);
                }
                if (this.submitTimer !== null) clearTimeout(this.submitTimer);
                this.submitTimer = setTimeout(() => {
                    this.submitTimer = null;
                    this.loading = false;
                    if (!draft) {
                        this.showSubmitted(result, data);
                    } else {
                        this.dataSaved = true;
                    }
                }, 1000);
            }, async (e) => {
                await this.tablePersist.rollbackIpfsUploads();
                await this.geoFilePersist.rollbackGridFsUploads();
                console.error(e.error);
                this.loading = false;
            });
    }

    private showSubmitted(result: any, payload: any): void {
        const document = result?.response?.document ?? null;
        this.submitted = {
            document,
            vcId: document?.id ?? null,
            issuedAt: document?.issuanceDate ?? null,
            role: this.policyProgressService?.getCurrentRole() ?? null,
            title: this.dialogTitle || this.parent?.title,
            schemaName: this.schema?.name || '',
            stepLabel: this.policyProgressService?.getHasNavigation() === false ? null : this.activeStepLabel,
            policyId: this.policyId,
            dryRun: !!this.dryRun,
            edit: !!this.edit && !this.draft,
            payload
        };
        this.docTab = 'doc';
        this.submittedJson = JSON.stringify(document ?? null, null, 2);
        this.clearIssues();
        this.screen = 'submitted';
        this.dataSaved = true;
        this.sub?.unsubscribe();
        this.changeDetectorRef.markForCheck();
    }


    public onDuplicate(): void {
        const submitted = this.submitted;
        if (!submitted || !this.canDuplicate) {
            return;
        }
        const parent = this.parent;
        this.dialogRef?.close(null);
        void parent.duplicateSubmitted(submitted.payload, submitted.vcId);
    }

    public onCreateAnother(): void {
        if (!this.canDuplicate) {
            return;
        }
        const parent = this.parent;
        this.dialogRef?.close(null);
        if (parent instanceof RequestDocumentBlockComponent) {
            void parent.onDialogOpen();
        } else {
            parent.onDialog();
        }
    }

    /** Row title: the field name only (the last part of the label path). */
    public issueName(issue: IFormIssue): string {
        return issue.label.split(' / ').pop() || issue.label;
    }

    /** Row subtitle: where the field lives, then the message. */
    public issueDetail(issue: IFormIssue): string {
        const trail = issue.label.split(' / ').slice(0, -1).join(' / ');
        return [issue.section, trail, issue.message].filter(Boolean).join(' · ');
    }

    public get requiredValid(): number {
        return this.completion?.answered ?? 0;
    }

    public onCompletionChange(completion: IFormCompletion): void {
        this.completion = completion;
        this.updatePreviewRequiredText();
        this.changeDetectorRef.markForCheck();
    }

    /** Footer link: goes to the first required answer that is still missing. */
    public jumpToNextMissing(): void {
        if (!this.formRoot?.focusNextMissing()) {
            this.toastService.success('All required answers are filled in');
        }
    }

    private computeRuleIssues(targets: IFormTarget[]): IFormIssue[] {
        const iri = this.schema?.iri;
        if (!this.rules || !iri) {
            return [];
        }
        const results = this.rules.validateForm(iri, this.dataForm.getRawValue());
        if (!results) {
            return [];
        }
        const labels = new Map<string, string>();
        for (const target of targets) {
            labels.set(target.path, target.labels.join(' / '));
        }
        const prefix = `${iri}/`;
        const issues: IFormIssue[] = [];
        for (const [key, value] of Object.entries<any>(results)) {
            if (value?.status !== 'Failure' && value?.status !== 'Error') {
                continue;
            }
            const path = key.startsWith(prefix) ? key.slice(prefix.length) : key;
            const names = (value.rules || [])
                .filter((rule: any) => rule.status === 'Failure' || rule.status === 'Error')
                .map((rule: any) => rule.name)
                .join(', ');
            const section = this.formRoot?.sectionTitleOf(path);
            issues.push({ path, label: labels.get(path) || path, message: names ? `Rule failed: ${names}` : 'Rule failed', ...(section ? { section } : {}) });
        }
        return issues;
    }

    private clearIssues(): void {
        this.issues = [];
        this.ruleIssues = [];
    }

    private refreshIssues(): void {
        const targets = walkFields(this.formRoot?.model?.controls);
        this.issues = this.formRoot?.getIssues(targets) ?? [];
        if (this.previewMode) {
            this.issues = [...this.issues, ...this.unlistedMissingFields(targets, this.issues)];
        }
        this.ruleIssues = this.computeRuleIssues(targets);
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Fields the calculations read that the form has no control for yet, for example inside an
     * optional sub-schema that was not added. The form can't flag them, so the results list them.
     */
    private unlistedMissingFields(targets: IFormTarget[], listed: IFormIssue[]): IFormIssue[] {
        const byPath = new Map(targets.map((target) => [target.path, target]));
        const listedPaths = new Set(listed.map((issue) => issue.path));
        const isEmptyTable = (target: IFormTarget) => !target.row && !!target.field.isArray && !target.field.list?.length;
        const result: IFormIssue[] = [];
        const add = (path: string, message: string) => {
            if (!listedPaths.has(path) && !result.some((issue) => issue.path === path)) {
                result.push({ path, label: this.missingFieldLabel(path), message });
            }
        };
        for (const path of this.previewMissingFields) {
            const own = byPath.get(path);
            if (own) {
                if (!own.hidden && isEmptyTable(own)) {
                    add(path, 'Add an entry');
                } else if (!own.hidden && !own.control) {
                    add(path, 'Enter a value');
                }
                continue;
            }
            const parts = path.split('.');
            let length = parts.length - 1;
            let parent = byPath.get(parts.slice(0, length).join('.'));
            while (!parent && length > 1) {
                length--;
                parent = byPath.get(parts.slice(0, length).join('.'));
            }
            if (!parent) {
                if (!parts.some(isIndexSegment)) {
                    add(path, 'Enter a value');
                }
            } else if (!parent.hidden) {
                if (!parts.slice(length).some(isIndexSegment)) {
                    add(path, 'Enter a value');
                } else if (isIndexSegment(parts[length]) && isEmptyTable(parent)) {
                    add(parent.path, 'Add an entry');
                }
            }
        }
        return result;
    }

    /** A row index reads as `#n`; the schema path up to each other segment gives that field's name. */
    private missingFieldLabel(path: string): string {
        const schemaPath: string[] = [];
        return path.split('.').map((part) => {
            if (isIndexSegment(part)) {
                return `#${Number(part) + 1}`;
            }
            schemaPath.push(part);
            const field = this.schema?.getField(schemaPath.join('.'));
            return field?.description || field?.title || field?.name || part;
        }).join(' / ');
    }

    /** Reveals every error and opens the results screen. Does not touch the API. */
    private showResults(): void {
        this.formRoot?.revealErrors(false);
        this.refreshIssues();
        this.screen = 'results';
    }

    /** Stepper click on 'Validation results': checks again and never submits. */
    public revalidate(): void {
        if (this.dataForm.valid) {
            this.issues = [];
            this.ruleIssues = [];
            this.screen = 'form';
            this.step = 'fill';
            return;
        }
        this.showResults();
    }

    /** 'Preview again' on the preview results screen. */
    public async previewAgain(): Promise<void> {
        if (this.loading || this.isPreviewBusy) {
            return;
        }
        if (!(await this.isValidForPreview())) {
            this.showResults();
            return;
        }
        await this.runPreview(false);
    }

    /** In Preview an invalid form first asks again which fields its current values need. */
    private async isValidForPreview(): Promise<boolean> {
        if (this.dataForm.valid) {
            return true;
        }
        if (!this.previewMode) {
            return false;
        }
        await this.runPreview(true, true);
        if (!this.previewMode) {
            return false;
        }
        this.changeDetectorRef.detectChanges();
        return this.dataForm.valid;
    }

    public showForm(): void {
        this.screen = 'form';
        this.step = 'fill';
        this.changeDetectorRef.detectChanges();
    }

    public goToField(path: string): void {
        this.showForm();
        this.formRoot?.focusField(path);
    }

    public fixFirstError(): void {
        const first = this.issues[0] ?? this.ruleIssues[0];
        if (first) {
            this.goToField(first.path);
        } else {
            this.showForm();
        }
    }

    public async onStep(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }
        if (draft) {
            await this.onSubmit(true);
            return;
        }
        if (!(await this.isValidForPreview())) {
            this.showResults();
            return;
        }
        this.clearIssues();
        if (this.previewMode) {
            await this.runPreview(false);
            return;
        }
        this.screen = 'form';
        if (this.enableAdditionalData && this.step === 'fill') {
            this.step = 'evidence';
        } else if (this.enableAdditionalData && this.step === 'evidence' && this.relayerAccount) {
            this.step = 'relayer';
            this.loadRelayerAccounts();
        } else if (!this.enableAdditionalData && this.relayerAccount && this.step === 'fill') {
            this.step = 'relayer';
            this.loadRelayerAccounts();
        } else {
            await this.onSubmit(false);
        }
    }

    private restorePreviewMode(): void {
        if (this.previewPreferenceLoaded || this.disabled || !this.previewAvailable || !this.schema || !this.parent?.user?.id || !this.policyId || !this.id) {
            return;
        }
        this.previewPreferenceLoaded = true;
        if (this.calculationPreview.loadMode(this.parent?.user?.id, this.policyId, this.id)) {
            void this.onPreviewModeChange(true);
        }
    }

    public togglePreviewMode(): void {
        if (this.loading || this.isPreviewBusy) {
            return;
        }
        void this.onPreviewModeChange(!this.previewMode);
    }

    public async onPreviewModeChange(enabled: boolean): Promise<void> {
        this.previewPreferenceLoaded = true;
        this.calculationPreview.saveMode(this.parent?.user?.id, this.policyId, this.id, enabled);
        this.previewMode = enabled;
        if (!enabled) this.previewRendering = false;
        if (!enabled) {
            this.previewRequest++;
            this.loading = false;
            this.setPreviewRequiredFields(null);
            this.previewMissingFields = [];
            this.resetPreviewResult();
            if (this.screen === 'presults' || this.screen === 'results') {
                this.clearIssues();
                this.screen = 'form';
            }
            return;
        }
        this.clearIssues();
        this.screen = 'form';
        this.step = 'fill';
        await this.runPreview(true);
    }

    private async runPreview(previewFields: boolean, listMissing: boolean = false): Promise<void> {
        const request = ++this.previewRequest;
        const preset = this.presetDocument;
        const current = () => request === this.previewRequest && preset === this.presetDocument;
        this.loading = true;
        try {
            const result = await this.calculationPreview.run(
                this.policyId,
                this.id,
                this.dataForm.getRawValue(),
                this.docRef,
                previewFields,
                {
                    relayerAccount: this.relayerAccountType === 'new' ? null : this.getRelayerAccount(),
                    evidence: this.enableAdditionalData ? this.buildEvidence() : undefined
                }
            );
            if (!this.previewMode || !current()) {
                return;
            }
            this.setPreviewRequiredFields(this.calculationPreview.updateRequiredFields(this.previewRequiredFields, result));
            this.previewMissingFields = listMissing ? [...result.missingFields] : [];
            if (previewFields) {
                this.previewDiscoveryWarning = this.calculationPreview.needsDiscoveryWarning(result);
            } else {
                this.showPreviewResult(result);
            }
        } catch (error) {
            const validation = this.calculationPreview.getInputValidation(error);
            if (this.previewMode && validation && current()) {
                const before = this.previewRequiredFields;
                const required = this.calculationPreview.updateRequiredFields(before, validation);
                this.setPreviewRequiredFields(required);
                this.previewMissingFields = [...validation.missingFields];
                if (!previewFields) {
                    await this.runPreview(true, true);
                    if (!this.previewMode || this.previewRequest !== request + 1) {
                        return;
                    }
                    this.setPreviewRequiredFields([...new Set([...(this.previewRequiredFields ?? []), ...required])].sort());
                    this.previewMissingFields = [...new Set([...validation.missingFields, ...this.previewMissingFields])];
                    const after = this.previewRequiredFields ?? [];
                    // New requirements first reach the form, so the results list what is missing.
                    // The same requirements need no pass: the form already has them.
                    const unchanged = !!before && before.length === after.length && before.every((path, i) => path === after[i]);
                    if (!unchanged) {
                        this.changeDetectorRef.detectChanges();
                    }
                    this.showResults();
                }
            } else if (this.previewMode && !validation && !previewFields && current()) {
                // The run failed for another reason: the old results no longer match the form.
                this.resetPreviewResult();
                this.clearIssues();
                this.screen = 'form';
            }
            console.error(error);
        } finally {
            if (current()) {
                this.loading = false;
            }
        }
    }

    private resetPreviewResult(): void {
        this.previewItems = [];
        this.previewVisited.clear();
        this.previewIndex = 0;
        this.previewProblems = [];
        this.previewShowErrors = false;
        this.previewExpanded = false;
        this.previewDiscoveryWarning = false;
        this.previewTab = 'doc';
        this.previewJson = '';
        this.previewLoadingByCard.clear();
        this.previewViewLoading = 0;
    }

    private showPreviewResult(result: ICalculationPreviewResult): void {
        this.clearIssues();
        this.resetPreviewResult();
        this.previewProblems = this.calculationPreview.getProblems(result);
        this.previewItems = this.calculationPreview.getTimeline(result).map((item) => this.toPreviewItemView(item));
        const finalIndex = this.previewItems.findIndex((item) => item.final === true);
        this.previewIndex = finalIndex < 0 ? Math.max(0, this.previewItems.length - 1) : finalIndex;
        this.previewVisited.add(this.previewIndex);
        this.previewJson = this.stringifyPreviewItem();
        this.screen = 'presults';
    }

    public showUnsavedChangesDialog() {
        if (!this.loading || this.previewMode) {
            const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog without-saving-dialog',
                data: {
                    header: 'Leave without saving?',
                    text: 'You’re trying to leave the page without saving your changes. \n\nAre you sure you want to discard them and exit the creation process?',
                    buttons: [{
                        name: 'Close',
                        class: 'secondary'
                    }, {
                        name: 'Confirm',
                        class: 'primary'
                    }]
                },
            })!;

            dialogOptionRef.onClose.subscribe((result: string) => {
                if (result == 'Confirm') {
                    this.close();
                }
            });
        }
    }

    public onDryRun() {
        this.parent.onDryRun();
    }

    public onRestoreClick() {
        this.parent.onRestoreClick();
    }

    public handleCancelBtnEvent($event: any, data: RequestDocumentFormComponent) {
        data.onClose();
    }

    public handleSubmitBtnEvent($event: any, data: RequestDocumentFormComponent) {
        data.onStep();
    }

    public handleSaveBtnEvent($event: any, data: RequestDocumentFormComponent) {
        if (!this.loading) {
            data.onStep(true);
        }
    }

    public onDraftImported(doc: any): void {
        this.parent.preset(doc);
        this.dataSaved = false;
    }

    public getButtonName(item: any) {
        if (item.id === 'submit') {
            if (this.previewSubmitLabel) {
                return 'Preview';
            }
            if (this.enableAdditionalData && this.step === 'fill') {
                return 'Add Evidence Attachments';
            } else if (this.relayerAccount && this.step === (this.enableAdditionalData ? 'evidence' : 'fill')) {
                return this.buttonNames['relayerAccount'];
            }
        }
        return this.buttonNames[item.id] || item.text;
    }

    /** The label of the primary action: the footer and the overview show the same one. */
    public get submitLabel(): string {
        return this.getButtonName({ id: 'submit', text: 'Validate & Create' });
    }

    public onChangeButtons($event: any) {
        setTimeout(() => {
            this.buttons = Array.isArray($event) ? $event.map((item) => ({ ...item })) : [];
        }, 0);
    }

    public ifRelayerAccountDisabled() {
        if (this.relayerAccount) {
            if (this.step === 'relayer') {
                if (this.relayerAccountType === 'account') {
                    return false;
                } else if (this.relayerAccountType === 'relayerAccount') {
                    return !this.currentRelayerAccount;
                } else if (this.relayerAccountType === 'new') {
                    return this.relayerAccountForm.invalid;
                } else {
                    return null;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public ifDisabledBtn(config: any) {
        if (this.isPreviewBusy && config.id !== 'cancel') return true;
        if (config.id === 'submit') {
            return this.loading || this.ifRelayerAccountDisabled() || this.isRemoteWarning;
        } else {
            return false;
        }
    }

    public detectChanges() {
        this.changeDetectorRef.detectChanges();
    }

    public onGenerateRelayerAccount() {
        this.loading = true;
        this.relayerAccountsService
            .generateRelayerAccount()
            .subscribe((account) => {
                const data = this.relayerAccountForm.value;
                this.relayerAccountForm.setValue({
                    name: data.name || '',
                    account: account.id || '',
                    key: account.key || ''
                })
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }
}
