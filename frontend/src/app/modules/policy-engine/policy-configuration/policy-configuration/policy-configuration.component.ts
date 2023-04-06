import { CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { GenerateUUIDv4, Schema, SchemaHelper, Token } from '@guardian/interfaces';
import * as yaml from 'js-yaml';
import { forkJoin, Observable } from 'rxjs';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { SetVersionDialog } from 'src/app/modules/schema-engine/set-version-dialog/set-version-dialog.component';
import { InformService } from 'src/app/services/inform.service';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaService } from 'src/app/services/schema.service';
import { TasksService } from 'src/app/services/tasks.service';
import { TokenService } from 'src/app/services/token.service';
import { NewModuleDialog } from '../../helpers/new-module-dialog/new-module-dialog.component';
import { SaveBeforeDialogComponent } from '../../helpers/save-before-dialog/save-before-dialog.component';
import { PolicyAction, SavePolicyDialog } from '../../helpers/save-policy-dialog/save-policy-dialog.component';
import { RegisteredService } from '../../registered-service/registered.service';
import { PolicyBlockModel, PolicyModel, PolicyModuleModel, PolicyStorage, TemplateModel } from '../../structures';
import { Options } from '../../structures/storage/config-options';
import { PolicyTreeComponent } from '../policy-tree/policy-tree.component';

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
    public moduleId!: string;

    public policyModel!: PolicyModel;
    public templateModel!: TemplateModel;
    public openModule!: PolicyModel | PolicyModuleModel;
    public rootModule!: PolicyModel | TemplateModel;
    public currentBlock!: PolicyBlockModel | undefined;

    public schemas!: Schema[];
    public tokens!: Token[];
    public errors: any[] = [];
    public errorsCount: number = -1;
    public errorsMap: any;
    public currentView: string = 'blocks';
    public search: string = '';
    public searchModule: string = '';
    public storage: PolicyStorage;
    public copyBlocksMode: boolean = false;
    public eventVisible: string = 'All';
    public templateModules: any[] = [];
    public code!: string;

    public openType: 'Root' | 'Sub' = 'Root';
    public rootType: 'Policy' | 'Module' = 'Policy';
    public selectType: 'Block' | 'Module' = 'Block';

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
        return this.storage.isUndo;
    }

    public get isRootModule() {
        return this.currentBlock && (this.currentBlock === this.openModule);
    }

    public get isTree(): boolean {
        return this.currentView === 'blocks';
    }

    public get disableComponentMenu(): boolean {
        return (
            !this.isTree ||
            (
                this.selectType === 'Module' &&
                this.openType === 'Root' &&
                this.rootType === 'Policy'
            )
        );
    }

    public get disableModuleMenu(): boolean {
        return (
            !this.isTree ||
            this.rootType === 'Module' ||
            this.openType === 'Sub' ||
            this.selectType === 'Module'
        );
    }

    private operationMode: OperationMode = OperationMode.none;
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;

    private treeOverview!: PolicyTreeComponent;

    public get isModuleValid(): boolean {
        return this.rootModule?.valid;
    }

    public get allSubModule(): PolicyModuleModel[] {
        return this.policyModel.allModule;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private changeDetector: ChangeDetectorRef,
        private dialog: MatDialog,
        private informService: InformService,
        private taskService: TasksService,
        private matIconRegistry: MatIconRegistry,
        private domSanitizer: DomSanitizer,
        private registeredService: RegisteredService,
        private modulesService: ModulesService
    ) {
        this.options = new Options();
        this.policyModel = new PolicyModel();
        this.storage = new PolicyStorage(localStorage);
        this.openModule = this.policyModel;
        this.matIconRegistry.addSvgIconLiteral('policy-module', this.domSanitizer.bypassSecurityTrustHtml(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path style="fill:#e1933c" d="M 12,0.83007812 3.0507812,6 12,11.160156 20.949219,6 Z" />
                <path style="fill:#24bfe1" d="m 21.673828,7.25 -8.96289,5.169922 V 22.75 l 8.96289,-5.199219 z" />
                <path style="fill:#9e57f5" d="M 2.3261719,7.25 V 17.550781 L 11.279297,22.75 V 12.419922 Z" />
            </svg>
        `));
    }

    public ngOnInit() {
        this.loading = true;
        this.options.load();
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
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

    private loadData(): void {
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.currentView = 'blocks';
        this.policyId = this.route.snapshot.queryParams['policyId'];
        this.moduleId = this.route.snapshot.queryParams['moduleId'];

        if (this.policyId) {
            this.loadPolicy();
        } else if (this.moduleId) {
            this.loadModule();
        } else {
            this.loading = false;
            return;
        }
    }

    private loadModule(): void {
        this.rootType = 'Module';
        this.modulesService.getById(this.moduleId).subscribe((module: any) => {
            if (!module) {
                this.policyModel = new PolicyModel();
                this.onOpenRoot(this.policyModel);
                this.loading = false;
                return;
            }

            this.templateModel = new TemplateModel(module);
            this.onOpenRoot(this.templateModel);

            if (!this.templateModel.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.policyEngineService.getBlockInformation(),
                this.modulesService.menuList()
            ]).subscribe((data: any) => {
                const blockInformation = data[0] || {};
                const modules = data[1] || [];
                this.registeredService.registerConfig(blockInformation);
                this.templateModules = modules;
                this.finishedLoad(this.templateModel);
            }, (error) => {
                this.loading = false;
                console.error(error);
            });
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    private loadPolicy(): void {
        this.rootType = 'Policy';
        this.policyEngineService.policy(this.policyId).subscribe((policy: any) => {
            if (!policy) {
                this.policyModel = new PolicyModel();
                this.onOpenRoot(this.policyModel);
                this.loading = false;
                return;
            }

            this.policyModel = new PolicyModel(policy);
            this.onOpenRoot(this.policyModel);

            if (!this.policyModel.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.tokenService.getTokens(),
                this.policyEngineService.getBlockInformation(),
                this.schemaService.getSchemas(this.policyModel.topicId),
                this.modulesService.menuList()
            ]).subscribe((data: any) => {
                const tokens = data[0] || [];
                const blockInformation = data[1] || {};
                const schemas = data[2] || [];
                const modules = data[3] || [];

                this.registeredService.registerConfig(blockInformation);
                this.tokens = tokens.map((e: any) => new Token(e));
                this.schemas = SchemaHelper.map(schemas) || [];
                this.templateModules = modules;
                this.policyModel.setTokens(this.tokens);
                this.policyModel.setSchemas(this.schemas);

                this.finishedLoad(this.policyModel);
            }, (error) => {
                this.loading = false;
                console.error(error);
            });
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    private finishedLoad(module: PolicyModel | TemplateModel) {
        this.readonly = module.readonly;
        this.codeMirrorOptions.readOnly = this.readonly;

        this.storage.load(module.id);
        this.checkState();

        module.subscribe(() => {
            this.changeDetector.detectChanges();
            this.saveState();
            setTimeout(() => {
                if (this.treeOverview) {
                    this.treeOverview.render();
                }
            }, 10);
        });

        this.onSelect(this.openModule.root);
        this.updateComponents();
        this.updateModules();

        setTimeout(() => { this.loading = false; }, 500);
    }

    private checkState() {
        if (!this.rootModule || this.readonly) {
            return;
        }
        if (this.compareState(this.rootModule.getJSON(), this.storage.current)) {
            this.rewriteState();
        } else {
            const applyChangesDialog = this.dialog.open(ConfirmationDialogComponent, {
                data: {
                    dialogTitle: "Apply latest changes",
                    dialogText: "Do you want to apply latest changes?"
                },
                disableClose: true
            })
            applyChangesDialog.afterClosed().subscribe((result) => {
                if (result) {
                    this.loadState(this.storage.current);
                } else {
                    this.rewriteState();
                }
            })
        }
    }

    private rewriteState() {
        if (!this.rootModule) {
            return;
        }
        const json = this.rootModule.getJSON();
        const value = this.objectToJson(json);
        this.storage.set('blocks', value);
    }


    private clearState() {
        if (!this.rootModule) {
            return;
        }
        const json = this.rootModule.getJSON();
        const value = this.objectToJson(json);
        this.storage.set('blocks', null);
    }

    private compareState(policy: any, storageItem: any): boolean {
        const JSONconfig = this.objectToJson(policy);
        if (!storageItem) {
            return true;
        }
        if (storageItem.view === 'json' || storageItem.view === 'blocks') {
            const json = storageItem.value;
            return json === JSONconfig;
        }
        if (storageItem.view === 'yaml') {
            const json = this.yamlToJson(storageItem.value);
            return json === JSONconfig;
        }
        return true;
    }

    private loadState(root: any) {
        if (!this.rootModule || !root) {
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
            this.rootModule.rebuild(policy);
            this.errors = [];
            this.errorsCount = -1;
            this.errorsMap = {};
            this.openModule =
                this.rootModule.getModule(this.openModule) ||
                this.rootModule.getRootModule();
            this.currentBlock = this.openModule.root;
        }
        return true;
    }

    public saveState() {
        if (!this.rootModule || this.readonly) {
            return;
        }
        if (this.currentView == 'blocks') {
            const json = this.objectToJson(this.rootModule.getJSON());
            this.storage.push(this.currentView, json);
        } else if (this.currentView == 'yaml') {
            this.storage.push(this.currentView, this.code);
        } else if (this.currentView == 'json') {
            this.storage.push(this.currentView, this.code);
        }
    }

    public onInitViewer(event: PolicyTreeComponent) {
        this.treeOverview = event;
    }

    private updatePolicyModel(policy: any) {
        this.policyModel = new PolicyModel(policy);
        this.policyModel.setTokens(this.tokens);
        this.policyModel.setSchemas(this.schemas);

        this.currentView = 'blocks';
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};

        this.clearState();
        this.onOpenRoot(this.policyModel);
        this.finishedLoad(this.policyModel);
    }

    private updateComponents() {
        const all = this.registeredService.getAll();
        this.componentsList.favorites = [];
        this.componentsList.uiComponents = [];
        this.componentsList.serverBlocks = [];
        this.componentsList.addons = [];
        this.componentsList.unGrouped = [];
        const search = this.search ? this.search.toLowerCase() : null;
        for (const block of all) {
            if (search && block.search.indexOf(search) === -1) {
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
            module.search = (module.name || '').toLowerCase();

            if (search && module.search.indexOf(search) === -1) {
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

    public setFavorite(event: any, item: any) {
        event.preventDefault();
        event.stopPropagation();
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

    public setModuleFavorite(event: any, item: any) {
        event.preventDefault();
        event.stopPropagation();
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
        this.selectType = this.currentBlock?.isModule ? 'Module' : 'Block';
        this.openModule.checkChange();
        this.changeDetector.detectChanges();
        return false;
    }

    public onAdd(btn: any) {
        this.currentBlock = this.openModule.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const newBlock = this.registeredService.getBlockConfig(btn.type);
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
                const config = this.registeredService.getBlockConfig(event.data.name);
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
            if(this.currentBlock.search('module')) {
                this.informService.errorShortMessage(
                    `Block cannot be converted to module as we have a module in it.`,
                    'Invalid operation.'
                );
            } else {
                this.policyModel.convertModule(this.currentBlock);
            }
        }
    }

    public onOpenModule(module: any) {
        const item = this.policyModel.getModule(module);
        if (item) {
            this.openType = 'Sub';
            this.openModule = item;
            this.changeDetector.detectChanges();
        }
    }

    public onSaveModule() {
        const item = this.policyModel.getModule(this.currentBlock);
        if (item) {
            const json = item.getJSON();
            json.tag = 'Module';
            const module = {
                name: item.localTag,
                description: item.localTag,
                config: json
            }
            const dialogRef = this.dialog.open(NewModuleDialog, {
                width: '650px',
                panelClass: 'g-dialog',
                disableClose: true,
                autoFocus: false,
                data: module
            });
            dialogRef.afterClosed().subscribe(async (result) => {
                if (!result) {
                    return;
                }
                module.name = result.name;
                module.description = result.description;
                this.loading = true;
                this.modulesService.create(module).subscribe((result) => {
                    this.templateModules.push(result);
                    this.updateModules();
                    this.changeDetector.detectChanges()
                    setTimeout(() => { this.loading = false; }, 500);
                }, (e) => {
                    this.loading = false;
                });
            });
        }
    }

    // public onDeleteModule(item: any) {
    //     this.templateModules = this.templateModules.filter(e => e.uuid !== item.uuid);
    //     localStorage.setItem('template-modules', JSON.stringify(this.templateModules));
    //     this.updateModules();
    //     this.changeDetector.detectChanges();
    // }

    public onAddModule(item: any) {
        this.currentBlock = this.openModule.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const module = this.policyModel.newModule(item);
            this.currentBlock.addChild(module);
        }
    }

    public onOpenRoot(root: PolicyModel | TemplateModel) {
        this.rootModule = root;
        this.openModule = root?.getRootModule();
        this.openType = 'Root';
        this.changeDetector.detectChanges();
    }

    public noReturnPredicate() {
        return false;
    }

    public drop(event: any) {
        this.changeDetector.detectChanges();
    }

    private setErrors(results: any) {
        const blocks = results.blocks || [];
        const modules = results.modules || [];
        const commonErrors = results.errors || [];
        this.errors = [];
        for (const block of blocks) {
            if (!block.isValid) {
                this.errors.push(block);
            }
        }
        for (const module of modules) {
            if (!module.isValid) {
                this.errors.push(module);
            }
            for (const block of module.blocks) {
                if (!block.isValid) {
                    this.errors.push(block);
                }
            }
        }
        this.errorsCount = this.errors.length;
        this.errorsMap = {};
        for (const element of this.errors) {
            this.errorsMap[element.id] = element.errors;
        }
        this.errorMessage(commonErrors);
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

    public undoPolicy() {
        const item = this.storage.undo();
        this.loadState(item);
    }

    public redoPolicy() {
        const item = this.storage.redo();
        this.loadState(item);
    }

    private onPasteBlock(block?: any) {
        if (this.currentBlock && block) {
            this.currentBlock.pasteChild(block);
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
                this.onPasteBlock(parsedBlockData);
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
                    if (policy) {
                        this.updatePolicyModel(policy);
                    } else {
                        this.policyModel = new PolicyModel();
                    }
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
            this.setErrors(results);
            this.onSelect(this.openModule.root);
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
                this.loadData();
            } else {
                this.setErrors(errors);
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
            this.loadData();
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
                            this.loadData();
                        } else {
                            this.setErrors(errors);
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

    public tryPublishModule() {
        this.loading = true;
        this.modulesService.publish(this.moduleId).subscribe((result) => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public updateModule() {
        const module = this.templateModel.getJSON();
        this.loading = true;
        this.modulesService.update(this.moduleId, module).subscribe((result) => {
            this.clearState();
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public saveAsModule() {
        const module = this.templateModel.getJSON();
        delete module.id;
        delete module.uuid;
        const dialogRef = this.dialog.open(NewModuleDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: module
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (!result) {
                return;
            }
            module.name = result.name;
            module.description = result.description;
            this.loading = true;
            this.modulesService.create(module).subscribe((result) => {
                this.router.navigate(['/policy-configuration'], { queryParams: { moduleId: result.uuid } });
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public validationModule() {
        this.loading = true;
        const module = this.templateModel.getJSON();
        this.modulesService.validate(module).subscribe((data: any) => {
            const { module, results } = data;
            this.templateModel.rebuild(module);
            this.setErrors(results);
            this.onOpenRoot(this.templateModel);
            this.onSelect(this.openModule.root);
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }
}
