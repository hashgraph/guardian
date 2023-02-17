import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Options } from '../../structures/storage/config-options';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { TokenService } from 'src/app/services/token.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { GenerateUUIDv4, Schema, SchemaHelper, Token } from '@guardian/interfaces';
import { RegisteredBlocks } from '../../registered-blocks';
import { PolicyModel, PolicyBlockModel, PolicyModuleModel, PolicyStorage } from '../../structures';
import { CdkDropList } from '@angular/cdk/drag-drop';
import * as yaml from 'js-yaml';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PolicyAction, SavePolicyDialog } from '../../helpers/save-policy-dialog/save-policy-dialog.component';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import { SaveBeforeDialogComponent } from '../../helpers/save-before-dialog/save-before-dialog.component';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';

enum OperationMode {
    none,
    create,
    publish,
}

/**
 * The page for editing the policy and blocks.
 */
@Component({
    selector: 'app-policy-configuration',
    templateUrl: './policy-configuration.component.html',
    styleUrls: ['./policy-configuration.component.scss']
})
export class PolicyConfigurationComponent implements OnInit {
    public loading: boolean = true;
    public options: Options;
    public readonly!: boolean;

    public policyId!: string;
    public policyModel: PolicyModel;
    public schemas!: Schema[];
    public tokens!: Token[];

    public errors: any[] = [];
    public errorsCount: number = -1;
    public errorsMap: any;
    public currentView: string = 'blocks';
    public search: string = '';
    public searchModule: string = '';
    public policyStorage: PolicyStorage;
    public copyBlocksMode: boolean = false;
    public eventVisible: string = 'All';
    public currentBlock!: PolicyBlockModel | undefined;
    public openModule: PolicyModel | PolicyModuleModel;
    public templateModules: any[] = [];
    public code!: string;

    public openModeType: 'Policy' | 'Module' = 'Policy';
    public selectModeType: 'Block' | 'Module' = 'Block';

    readonly codeMirrorOptions = {
        theme: 'default',
        mode: 'application/ld+json',
        styleActiveLine: true,
        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: [
            'CodeMirror-linenumbers',
            'CodeMirror-foldgutter',
            'CodeMirror-lint-markers'
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readOnly: false,
        viewportMargin: Infinity
    };
    readonly componentsList: any = {
        favorites: [],
        uiComponents: [],
        serverBlocks: [],
        addons: [],
        unGrouped: [],
    };
    readonly modulesList: any = {
        favorites: [],
        defaultModules: [],
        customModules: [],
    };
    private _searchTimeout!: any;

    public dropListConnector: any = {
        menu: null,
        body: null
    }

    @ViewChild('menuList')
    public set menuList(value: CdkDropList<any>) {
        this.dropListConnector.menu = value;
    }
    public get menuList(): CdkDropList<any> {
        return this.dropListConnector.menu;
    }

    private get hasChanges() {
        return this.policyStorage.isUndo;
    }

    private operationMode: OperationMode = OperationMode.none;
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;

    constructor(
        private registeredBlocks: RegisteredBlocks,
        private route: ActivatedRoute,
        private router: Router,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private changeDetector: ChangeDetectorRef,
        private dialog: MatDialog,
        private informService: InformService,
        private taskService: TasksService,
    ) {
        this.options = new Options();
        this.policyModel = new PolicyModel();
        this.policyStorage = new PolicyStorage(localStorage);
        this.openModule = this.policyModel;
    }

    public ngOnInit() {
        this.loading = true;
        this.options.load();
        this.route.queryParams.subscribe(queryParams => {
            this.loadPolicy();
        });
    }

    public select(name: string) {
        this.options.select(name);
        this.options.save();
    }

    public collapse(name: string) {
        this.options.collapse(name);
        this.options.save();
    }

    private loadPolicy(): void {
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.currentView = 'blocks';
        this.policyId = this.route.snapshot.queryParams['policyId'];

        if (!this.policyId) {
            this.policyModel = new PolicyModel();
            this.onOpenPolicy();
            this.loading = false;
            return;
        }

        this.policyEngineService.policy(this.policyId).subscribe((policy: any) => {
            if (!policy) {
                this.policyModel = new PolicyModel();
                this.onOpenPolicy();
                this.loading = false;
                return;
            }

            this.policyModel = new PolicyModel(policy);
            this.onOpenPolicy();

            if (!this.policyModel.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.tokenService.getTokens(),
                this.policyEngineService.blockAbout(),
                this.schemaService.getSchemas(this.policyModel.topicId)
            ]).subscribe((data: any) => {
                const tokens = data[0] || [];
                const blockAbout = data[1] || {};
                const schemas = data[2] || [];

                this.registeredBlocks.registerConfig(blockAbout);
                this.tokens = tokens.map((e: any) => new Token(e));
                this.schemas = SchemaHelper.map(schemas) || [];
                this.schemas.unshift({ type: "" } as any);

                const t = localStorage.getItem('template-modules');
                if (t) {
                    this.templateModules = JSON.parse(t);
                } else {
                    this.templateModules = [];
                }

                this.finishedLoad();
            }, (error) => {
                this.loading = false;
                console.error(error);
            });
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    private finishedLoad() {
        this.readonly = this.policyModel.readonly;
        this.codeMirrorOptions.readOnly = this.readonly;

        this.policyStorage.load(this.policyModel.id);
        this.checkState();

        this.policyModel.subscribe(() => {
            this.saveState();
        });

        this.onSelect(this.openModule.root);
        this.updateComponents();
        this.updateModules();

        setTimeout(() => { this.loading = false; }, 500);
    }

    private updatePolicyModel(policy: any) {
        if (!policy) {
            this.policyModel = new PolicyModel();
            return;
        }

        this.policyModel = new PolicyModel(policy);

        this.currentView = 'blocks';
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};

        this.clearState();
        this.onOpenPolicy();
        this.finishedLoad();
    }

    private updateComponents() {
        const all = this.registeredBlocks.getAll();
        this.componentsList.favorites = [];
        this.componentsList.uiComponents = [];
        this.componentsList.serverBlocks = [];
        this.componentsList.addons = [];
        this.componentsList.unGrouped = [];
        const search = this.search ? this.search.toLowerCase() : null;
        for (const block of all) {
            if (this.search && block.search.indexOf(search) === -1) {
                continue;
            }
            if (block.header === 'UI Components') {
                this.componentsList.uiComponents.push(block);
            } else if (block.header === 'Server Blocks') {
                this.componentsList.serverBlocks.push(block);
            } else if (block.header === 'Addons') {
                this.componentsList.addons.push(block);
            } else {
                this.componentsList.unGrouped.push(block);
            }
            block.favorite = this.options.getFavorite(block.type);
            if (block.favorite) {
                this.componentsList.favorites.push(block);
            }
        }
    }

    private updateModules() {
        this.modulesList.favorites = [];
        this.modulesList.defaultModules = [];
        this.modulesList.customModules = [];

        const search = this.searchModule ? this.searchModule.toLowerCase() : null;
        for (const module of this.templateModules) {
            module.isDefault = module.type === 'DEFAULT';
            module.data = `module:${module.uuid}`;

            if (this.search && module.name.indexOf(search) === -1) {
                continue;
            }
            if (module.isDefault) {
                this.modulesList.defaultModules.push(module);
            } else {
                this.modulesList.customModules.push(module);
            }
            module.favorite = this.options.getModuleFavorite(module.uuid);
            if (module.favorite) {
                this.modulesList.favorites.push(module);
            }
        }
    }

    public setFavorite(item: any) {
        this.options.setFavorite(item.type, !item.favorite);
        this.options.save();
        this.updateComponents();
    }

    public onSearch(event: any) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this.updateComponents();
        }, 200);
    }

    public setModuleFavorite(item: any) {
        this.options.setModuleFavorite(item.uuid, !item.favorite);
        this.options.save();
        this.updateModules();
    }

    public onModuleSearch(event: any) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this.updateModules();
        }, 200);
    }

    public onView(type: string) {
        this.loading = true;
        setTimeout(() => {
            this.chanceView(type);
            this.loading = false;
        }, 0);
    }

    public onShowEvent(type: string) {
        this.eventVisible = type;
    }

    public onSelect(block: any) {
        this.currentBlock = this.openModule.getBlock(block);
        this.selectModeType = this.currentBlock?.isModule ? 'Module' : 'Block';
        this.openModule.checkChange();
        this.changeDetector.detectChanges();
        return false;
    }

    public onAdd(btn: any) {
        this.currentBlock = this.openModule.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const newBlock = this.registeredBlocks.newBlock(btn.type);
            newBlock.tag = this.openModule.getNewTag('Block');
            this.currentBlock.createChild(newBlock);
        }
    }

    public onDelete(block: any) {
        this.openModule.removeBlock(block);
        this.onSelect(this.openModule.root);
        return false;
    }

    public onReorder(event: any) {
        if (event.type === 'reorder') {
            this.changeDetector.detectChanges();
        } else if (event.type === 'add' && event.data) {
            if (event.data.operation === 'new') {
                const config = this.registeredBlocks.newBlock(event.data.name);
                config.tag = this.openModule.getNewTag('Block');
                event.data.parent?.createChild(config, event.data.index);
            }
            if (event.data.operation === 'module') {
                const config = this.templateModules.find(e => e.uuid === event.data.name);
                const module = this.policyModel.newModule(config);
                event.data.parent?.addChild(module, event.data.index);
            }
        } else {
            this.changeDetector.detectChanges();
        }
    }

    public onCreateModule() {
        this.currentBlock = this.policyModel.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const module = this.policyModel.newModule();
            this.currentBlock.addChild(module);
        }
    }

    public onConvertToModule() {
        this.currentBlock = this.policyModel.getBlock(this.currentBlock);
        if (this.currentBlock) {
            this.policyModel.convertModule(this.currentBlock);
        }
    }

    public onOpenModule(module: any) {
        const item = this.policyModel.getModule(module);
        if (item) {
            this.openModeType = 'Module';
            this.openModule = item;
            this.changeDetector.detectChanges();
        }
    }

    public onSaveModule() {
        const item = this.policyModel.getModule(this.currentBlock);
        if (item) {
            const json = item.getJSON();
            const id = GenerateUUIDv4();
            this.templateModules.push({
                data: `module:${id}`,
                uuid: id,
                name: item.tag,
                description: item.tag,
                tag: item.tag,
                type: 'CUSTOM',
                config: json
            })
            localStorage.setItem('template-modules', JSON.stringify(this.templateModules));
            this.updateModules();
            this.changeDetector.detectChanges();
        }
    }

    public onDeleteModule(item: any) {
        this.templateModules =  this.templateModules.filter(e => e.uuid !== item.uuid);
        localStorage.setItem('template-modules', JSON.stringify(this.templateModules));
        this.updateModules();
        this.changeDetector.detectChanges();
    }

    public onAddModule(item: any) {
        this.currentBlock = this.openModule.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const module = this.policyModel.newModule(item);
            this.currentBlock.addChild(module);
        }
    }

    public onOpenPolicy() {
        this.openModule = this.policyModel;
        this.openModeType = 'Policy';
        this.changeDetector.detectChanges();
    }

    public get leftMenu(): boolean {
        return (this.openModeType === 'Policy' && this.selectModeType === 'Module');
    }

    public noReturnPredicate() {
        return false;
    }

    public drop(event: any) {
        this.changeDetector.detectChanges();
    }


    private chanceView(type: string) {
        if (type == this.currentView) {
            return;
        }
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        try {
            if (type == 'blocks') {
                let root = null;
                if (this.currentView == 'json') {
                    root = this.jsonToObject(this.code);
                } else if (this.currentView == 'yaml') {
                    root = this.yamlToObject(this.code);
                }
                this.policyModel.rebuild(root);
            } else if (type == 'json') {
                let code = "";
                if (this.currentView == 'blocks') {
                    code = this.objectToJson(this.policyModel.getJSON());
                } else if (this.currentView == 'yaml') {
                    code = this.yamlToJson(this.code);
                }
                this.code = code;
                this.codeMirrorOptions.mode = 'application/ld+json';
            } else if (type == 'yaml') {
                let code = "";
                if (this.currentView == 'blocks') {
                    code = this.objectToYaml(this.policyModel.getJSON());
                }
                if (this.currentView == 'json') {
                    code = this.jsonToYaml(this.code);
                }
                this.code = code;
                this.codeMirrorOptions.mode = 'text/x-yaml';
            }
            this.currentView = type;
        } catch (error: any) {
            this.errors = [error.message];
        }
    }

    private jsonToObject(json: string): any {
        return JSON.parse(json);
    }

    private yamlToObject(yamlString: string): any {
        return yaml.load(yamlString);
    }

    private objectToJson(root: any): string {
        return JSON.stringify(root, null, 2);
    }

    private yamlToJson(yaml: string): string {
        const root = this.yamlToObject(yaml);
        return this.objectToJson(root);
    }

    private objectToYaml(root: any): string {
        return yaml.dump(root, {
            indent: 4,
            lineWidth: -1,
            noRefs: false,
            noCompatMode: true
        });
    }

    private jsonToYaml(json: string): string {
        const root = this.jsonToObject(json);
        return this.objectToYaml(root);
    }

    private checkState() {
        if (
            !this.readonly &&
            !this.compareState(this.policyModel.getJSON(), this.policyStorage.current)
        ) {
            const applyChangesDialog = this.dialog.open(ConfirmationDialogComponent, {
                data: {
                    dialogTitle: "Apply latest changes",
                    dialogText: "Do you want to apply latest changes?"
                },
                disableClose: true
            })
            applyChangesDialog.afterClosed().subscribe((result) => {
                if (result) {
                    this.loadState(this.policyStorage.current);
                } else {
                    this.rewriteState();
                }
            })
        } else {
            this.rewriteState();
        }
    }

    private compareState(policy: any, storageItem: any): boolean {
        const JSONconfig = this.objectToJson(policy);
        if (!storageItem) {
            return true;
        }
        if (storageItem.view === 'json' || storageItem.view === 'blocks') {
            return storageItem.value === JSONconfig;
        }
        if (storageItem.view === 'yaml') {
            return this.yamlToJson(storageItem.value) === JSONconfig;
        }
        return true;
    }

    private clearState() {
        const json = this.policyModel.getJSON();
        const value = this.objectToJson(json);
        this.policyStorage.set('blocks', null);
    }

    private rewriteState() {
        const json = this.policyModel.getJSON();
        const value = this.objectToJson(json);
        this.policyStorage.set('blocks', value);
    }

    private loadState(root: any) {
        if (!root) {
            return;
        }
        if (this.currentView !== root.view) {
            this.currentView = root.view;
            this.chanceView(root.view);
        }
        if (root.view === 'yaml' || root.view === 'json') {
            this.code = root.value;
        }
        if (root.view === 'blocks') {
            const policy = this.jsonToObject(root.value);
            this.policyModel.rebuild(policy);
            this.errors = [];
            this.errorsCount = -1;
            this.errorsMap = {};
            this.currentBlock = this.policyModel.getBlock(this.currentBlock);
        }
        return true;
    }

    public saveState() {
        if (this.readonly) {
            return;
        }
        if (this.currentView == 'blocks') {
            const json = this.objectToJson(this.policyModel.getJSON());
            this.policyStorage.push(this.currentView, json);
        } else if (this.currentView == 'yaml') {
            this.policyStorage.push(this.currentView, this.code);
        } else if (this.currentView == 'json') {
            this.policyStorage.push(this.currentView, this.code);
        }
    }

    public undoPolicy() {
        const item = this.policyStorage.undo();
        this.loadState(item);
    }

    public redoPolicy() {
        const item = this.policyStorage.redo();
        this.loadState(item);
    }

    private onCopyBlock(block?: any) {
        if (this.currentBlock && block) {
            this.currentBlock.copyChild(block);
        }
    }

    @HostListener('document:copy', ['$event'])
    public copy(event: ClipboardEvent) {
        if (this.currentBlock
            && this.copyBlocksMode
            && this.currentView === 'blocks'
            && !this.readonly) {
            event.preventDefault();
            const blockData = this.currentBlock?.getJSON() || null;
            navigator.clipboard.writeText(JSON.stringify(blockData));
        }
    }

    @HostListener('document:paste', ['$event'])
    public paste(evt: ClipboardEvent) {
        if (this.currentBlock
            && this.copyBlocksMode
            && this.currentView === 'blocks'
            && !this.readonly) {
            evt.preventDefault();
            try {
                const parsedBlockData = JSON.parse(evt.clipboardData?.getData('text') || "null");
                this.onCopyBlock(parsedBlockData);
            }
            catch {
                console.warn("Block data is incorrect");
                return;
            }
        }
    }

    public savePolicy() {
        this.asyncUpdatePolicy().subscribe();
    }

    public saveAsPolicy() {
        const dialogRef = this.dialog.open(SavePolicyDialog, {
            width: '500px',
            data: {
                policy: this.policyModel,
                action: this.policyModel.status === 'DRAFT'
                    ? PolicyAction.CREATE_NEW_POLICY
                    : null
            },
            autoFocus: false,
            disableClose: true
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && this.policyModel) {
                this.loading = true;
                const json = this.policyModel.getJSON();

                const policy = Object.assign({}, json, result.policy);

                if (result.action === PolicyAction.CREATE_NEW_POLICY) {
                    this.policyEngineService.pushClone(policy.id, {
                        policyTag: policy.policyTag,
                        name: policy.name,
                        topicDescription: policy.topicDescription,
                        description: policy.description
                    }).subscribe((result) => {
                        const { taskId, expectation } = result;
                        this.taskId = taskId;
                        this.expectedTaskMessages = expectation;
                        this.operationMode = OperationMode.create;
                    }, (e) => {
                        this.loading = false;
                        this.taskId = undefined;
                    });
                } else if (result.action === PolicyAction.CREATE_NEW_VERSION) {
                    delete policy._id;
                    delete policy.id;
                    delete policy.status;
                    delete policy.owner;
                    delete policy.version;
                    policy.previousVersion = json.version;
                    this.policyEngineService.pushCreate(policy).subscribe((result) => {
                        const { taskId, expectation } = result;
                        this.taskId = taskId;
                        this.expectedTaskMessages = expectation;
                        this.operationMode = OperationMode.create;
                    }, (e) => {
                        this.loading = false;
                        this.taskId = undefined;
                    });
                }
            }
        });
    }

    private asyncUpdatePolicy(): Observable<void> {
        return new Observable<void>(subscriber => {
            this.chanceView('blocks');
            const root = this.policyModel.getJSON();
            if (root) {
                this.loading = true;
                this.policyEngineService.update(this.policyId, root).subscribe((policy: any) => {
                    this.updatePolicyModel(policy);
                    setTimeout(() => { this.loading = false; }, 500);
                    subscriber.next();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    public validationPolicy() {
        this.loading = true;
        const json = this.policyModel.getJSON();
        const object = {
            topicId: this.policyModel.topicId,
            policyRoles: json?.policyRoles,
            policyGroups: json?.policyGroups,
            policyTopics: json?.policyTopics,
            policyTokens: json?.policyTokens,
            config: json?.config
        }
        this.policyEngineService.validate(object).subscribe((data: any) => {
            const { policy, results } = data;

            const config = policy.config;
            this.policyModel.rebuild(config);

            const errors = results.blocks.filter((block: any) => !block.isValid);
            this.errors = errors;
            this.errorsCount = errors.length;
            this.errorsMap = {};
            for (let i = 0; i < errors.length; i++) {
                const element = errors[i];
                this.errorsMap[element.id] = element.errors;
            }
            this.errorMessage(results.errors);
            this.onSelect(this.policyModel.root);
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    public setVersion() {
        const dialogRef = this.dialog.open(SetVersionDialog, {
            width: '350px',
            disableClose: true,
            data: {}
        });
        dialogRef.afterClosed().subscribe((version) => {
            if (version) {
                this.publishPolicy(version);
            }
        });
    }

    private publishPolicy(version: string) {
        this.loading = true;
        this.policyEngineService.pushPublish(this.policyId, version).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.publish;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    private dryRunPolicy() {
        this.loading = true;
        this.policyEngineService.dryRun(this.policyId).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (isValid) {
                this.clearState();
                this.loadPolicy();
            } else {
                const blocks = errors.blocks;
                const invalidBlocks = blocks.filter((block: any) => !block.isValid);
                this.errors = invalidBlocks;
                this.errorsCount = invalidBlocks.length;
                this.errorsMap = {};
                for (let i = 0; i < invalidBlocks.length; i++) {
                    const element = invalidBlocks[i];
                    this.errorsMap[element.id] = element.errors;
                }
                this.errorMessage(errors.errors);
                this.loading = false;
            }
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public draftPolicy() {
        this.loading = true;
        this.policyEngineService.draft(this.policyId).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            this.clearState();
            this.loadPolicy();
        }, (e) => {
            this.loading = false;
        });
    }

    public tryPublishPolicy() {
        if (this.hasChanges) {
            const dialogRef = this.dialog.open(SaveBeforeDialogComponent, {
                width: '500px',
                autoFocus: false,
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    this.asyncUpdatePolicy().subscribe(() => {
                        this.setVersion();
                    });
                }
            });
        } else {
            this.setVersion();
        }
    }

    public tryRunPolicy() {
        if (this.hasChanges) {
            const dialogRef = this.dialog.open(SaveBeforeDialogComponent, {
                width: '500px',
                autoFocus: false,
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    this.asyncUpdatePolicy().subscribe(() => {
                        this.dryRunPolicy();
                    });
                }
            });
        } else {
            this.dryRunPolicy();
        }
    }

    private errorMessage(errors: string[]) {
        if (errors && errors.length) {
            const text = errors.map((text) => `<div>${text}</div>`).join('');
            this.informService.errorShortMessage(text, 'The policy is invalid');
        }
    }

    public onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        console.error(error.error);
        this.loading = false;
        this.taskId = undefined;
    }

    public onAsyncCompleted() {
        if (this.taskId) {
            const taskId: string = this.taskId;
            const operationMode = this.operationMode;
            this.taskId = undefined;
            this.operationMode = OperationMode.none;
            this.taskService.get(taskId).subscribe((task: any) => {
                switch (operationMode) {
                    case OperationMode.create:
                        this.router.navigate(['/policy-configuration'], { queryParams: { policyId: task.result } });
                        break;
                    case OperationMode.publish:
                        const { result } = task;
                        const { isValid, errors } = result;
                        if (isValid) {
                            this.loadPolicy();
                        } else {
                            const blocks = errors.blocks;
                            const invalidBlocks = blocks.filter((block: any) => !block.isValid);
                            this.errors = invalidBlocks;
                            this.errorsCount = invalidBlocks.length;
                            this.errorsMap = {};
                            for (let i = 0; i < invalidBlocks.length; i++) {
                                const element = invalidBlocks[i];
                                this.errorsMap[element.id] = element.errors;
                            }
                            this.errorMessage(errors.errors);
                            this.loading = false;
                        }
                        break;
                    default:
                        console.log('Unknown operation mode');
                        break;
                }
            });
        }
    }
}
