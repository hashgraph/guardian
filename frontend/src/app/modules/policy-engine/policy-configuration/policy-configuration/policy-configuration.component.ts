import { CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Schema, SchemaHelper, Token } from '@guardian/interfaces';
import * as yaml from 'js-yaml';
import { forkJoin, Observable } from 'rxjs';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { SetVersionDialog } from 'src/app/modules/schema-engine/set-version-dialog/set-version-dialog.component';
import { InformService } from 'src/app/services/inform.service';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { SchemaService } from 'src/app/services/schema.service';
import { TokenService } from 'src/app/services/token.service';
import { NewModuleDialog } from '../../helpers/new-module-dialog/new-module-dialog.component';
import { SaveBeforeDialogComponent } from '../../helpers/save-before-dialog/save-before-dialog.component';
import { PolicyAction, SavePolicyDialog } from '../../helpers/save-policy-dialog/save-policy-dialog.component';
import { RegisteredService } from '../../services/registered.service';
import {
    Options,
    PolicyBlock,
    PolicyTemplate,
    PolicyModule,
    PolicyStorage,
    ModuleTemplate,
    Theme,
    ThemeRule,
    ToolTemplate,
    ToolMenuItem,
    PolicyFolder,
    PolicyItem,
    PolicyRoot,
    ToolMenu
} from '../../structures';
import { PolicyTreeComponent } from '../policy-tree/policy-tree.component';
import { ThemeService } from '../../../../services/theme.service';
import { SuggestionsService } from '../../../../services/suggestions.service';
import { ToolsService } from '../../../../services/tools.service';
import { AnalyticsService } from '../../../../services/analytics.service';
import { WizardMode, WizardService } from 'src/app/modules/policy-engine/services/wizard.service';

/**
 * The page for editing the policy and blocks.
 */
@Component({
    selector: 'app-policy-configuration',
    templateUrl: './policy-configuration.component.html',
    styleUrls: ['./policy-configuration.component.scss'],
})
export class PolicyConfigurationComponent implements OnInit {
    public loading: boolean = true;
    public options: Options;
    public readonly!: boolean;

    public rootType: 'Policy' | 'Module' | 'Tool' = 'Policy';
    public policyId!: string;
    public moduleId!: string;
    public toolId!: string;
    public rootId!: string;

    public policyTemplate!: PolicyTemplate;
    public moduleTemplate!: ModuleTemplate;
    public toolTemplate!: ToolTemplate;

    public openFolder!: PolicyFolder;
    public rootTemplate!: PolicyRoot;
    public currentBlock!: PolicyItem | undefined;

    public schemas: Schema[] = [];
    public tokens: Token[] = [];
    public modules: any[] = [];
    public tools: ToolMenu;

    public selectType: 'Block' | 'Module' = 'Block';

    public errors: any[] = [];
    public errorsCount: number = -1;
    public errorsMap: any;
    public currentView: string = 'blocks';
    public search: string = '';
    public searchModule: string = '';
    public storage: PolicyStorage;
    public copyBlocksMode: boolean = false;
    public eventVisible: string = 'All';
    public blockSearchData: any = null;

    public code!: string;
    public isSuggestionsEnabled = false;
    public nextBlock!: any;
    public nestedBlock!: any;

    public openType: 'Root' | 'Sub' = 'Root';

    public openSettings: boolean = false;
    public themes!: Theme[];
    public theme!: Theme;

    public readonly codeMirrorOptions = {
        theme: 'default',
        mode: 'policy-json-lang',
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
    public readonly componentsList: any = {
        favorites: [],
        uiComponents: [],
        serverBlocks: [],
        addons: [],
        unGrouped: [],
    };
    public readonly modulesList: any = {
        favorites: [],
        defaultModules: [],
        customModules: [],
        customTools: [],
    };
    private _searchTimeout!: any;
    private currentCMStyles?: any;

    public dropListConnector: any = {
        menu: null,
        body: null
    }

    private _disableComponentMenu: boolean = true;
    private _disableModuleMenu: boolean = true;
    private _disableToolMenu: boolean = true;
    private _lastUpdate: any;

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
        return this.currentBlock && (this.currentBlock === this.openFolder);
    }

    public get isTree(): boolean {
        return this.currentView === 'blocks';
    }

    public get disableComponentMenu(): boolean {
        return this._disableComponentMenu;
    }

    public get disableModuleMenu(): boolean {
        return this._disableModuleMenu;
    }

    public get disableToolMenu(): boolean {
        return this._disableToolMenu;
    }

    private treeOverview!: PolicyTreeComponent;

    public get isModuleValid(): boolean {
        return this.rootTemplate?.valid;
    }

    public get allSubModule(): PolicyModule[] {
        return this.policyTemplate.allModule;
    }

    public get policyDescription(): boolean {
        return this.openType === 'Root' && this.rootType === 'Policy';
    }

    public get moduleDescription(): boolean {
        return this.openType === 'Sub' || this.rootType === 'Module' || this.rootType === 'Tool';
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private changeDetector: ChangeDetectorRef,
        private informService: InformService,
        private registeredService: RegisteredService,
        private themeService: ThemeService,
        private wizardService: WizardService,
        private suggestionsService: SuggestionsService,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private modulesService: ModulesService,
        private toolsService: ToolsService,
        private analyticsService: AnalyticsService
    ) {
        this.options = new Options();
        this.storage = new PolicyStorage(localStorage);

        this.policyTemplate = new PolicyTemplate();
        this.openFolder = this.policyTemplate;
        this.rootTemplate = this.policyTemplate;
        this.tools = new ToolMenu();
    }

    public ngOnInit() {
        this.loading = true;
        this.options.load();
        this.theme = this.themeService.getCurrent();
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });

        this.themeService.load().subscribe((themes: any) => {
            this.themeService.setThemes(themes);
            this.themes = this.themeService.getThemes();
            this.theme = this.themeService.getCurrent();
            this.updateCodeMirrorStyles();
        }, ({ message }) => {
            console.error(message);
        });
    }

    public ngOnDestroy(): void {
        this.storage.destroy();
    }

    private loadData(): void {
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.currentView = 'blocks';
        this.policyId = this.route.snapshot.queryParams.policyId;
        this.moduleId = this.route.snapshot.queryParams.moduleId;
        this.toolId = this.route.snapshot.queryParams.toolId;

        if (this.policyId) {
            this.rootType = 'Policy';
            this.loadPolicy();
        } else if (this.moduleId) {
            this.rootType = 'Module';
            this.loadModule();
        } else if (this.toolId) {
            this.rootType = 'Tool';
            this.loadTool();
        } else {
            this.loading = false;
            return;
        }
    }

    private loadPolicy(): void {
        this.rootId = this.policyId;
        this.policyEngineService.policy(this.policyId).subscribe((policy: any) => {
            if (!policy) {
                this.policyTemplate = new PolicyTemplate();
                this.onOpenRoot(this.policyTemplate);
                this.loading = false;
                return;
            }

            this.policyTemplate = new PolicyTemplate(policy);
            this.onOpenRoot(this.policyTemplate);
            if (!this.policyTemplate.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.tokenService.getTokens(),
                this.policyEngineService.getBlockInformation(),
                this.schemaService.getSchemas(this.policyTemplate.topicId),
                this.modulesService.menuList(),
                this.toolsService.menuList()
            ]).subscribe((data) => {
                const tokens = data[0] || [];
                const blockInformation = data[1] || {};
                const schemas = data[2] || [];
                const modules = data[3] || [];
                const tools = data[4] || [];

                this.registeredService.registerConfig(blockInformation);
                this.tokens = tokens.map((e: any) => new Token(e));
                this.schemas = SchemaHelper.map(schemas) || [];
                this.modules = modules;
                this.tools.setItems(tools);

                this.policyTemplate.setTokens(this.tokens);
                this.policyTemplate.setSchemas(this.schemas);
                this.policyTemplate.setTools(this.tools.items);
                this.finishedLoad(this.policyTemplate);
            }, ({ message }) => {
                this.loading = false;
                console.error(message);
            });
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadModule(): void {
        this.rootId = this.moduleId;
        this.modulesService.getById(this.moduleId).subscribe((module: any) => {
            if (!module) {
                this.moduleTemplate = new ModuleTemplate();
                this.onOpenRoot(this.moduleTemplate);
                this.loading = false;
                return;
            }

            this.moduleTemplate = new ModuleTemplate(module);
            this.onOpenRoot(this.moduleTemplate);
            if (!this.moduleTemplate.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.policyEngineService.getBlockInformation(),
                this.schemaService.getSchemas(this.moduleTemplate.topicId),
                this.modulesService.menuList(),
                this.toolsService.menuList()
            ]).subscribe((data) => {
                const blockInformation = data[0] || {};
                const schemas = data[1] || [];
                const modules = data[2] || [];
                const tools = data[3] || [];

                this.registeredService.registerConfig(blockInformation);
                this.schemas = SchemaHelper.map(schemas) || [];
                this.modules = modules;
                this.tools.setItems(tools);

                this.moduleTemplate.setSchemas(this.schemas);
                this.moduleTemplate.setTools(this.tools.items);
                this.finishedLoad(this.moduleTemplate);
            }, ({ message }) => {
                this.loading = false;
                console.error(message);
            });
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }


    private loadTool(): void {
        this.rootId = this.toolId;
        this.toolsService.getById(this.toolId).subscribe((tool: any) => {
            if (!tool) {
                this.toolTemplate = new ToolTemplate();
                this.onOpenRoot(this.toolTemplate);
                this.loading = false;
                return;
            }

            this.toolTemplate = new ToolTemplate(tool);
            this.onOpenRoot(this.toolTemplate);
            if (!this.toolTemplate.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.policyEngineService.getBlockInformation(),
                this.tokenService.getTokens(),
                this.schemaService.getSchemas(this.toolTemplate.topicId),
                this.modulesService.menuList(),
                this.toolsService.menuList()
            ]).subscribe((data) => {
                const blockInformation = data[0] || {};
                const tokens = data[1] || [];
                const schemas = data[2] || [];
                const modules = data[3] || [];
                const tools = data[4] || [];

                this.registeredService.registerConfig(blockInformation);
                this.tokens = tokens.map((e: any) => new Token(e));
                this.schemas = SchemaHelper.map(schemas) || [];
                this.modules = modules;
                this.tools.setItems(tools);

                this.toolTemplate.setTokens(this.tokens);
                this.toolTemplate.setSchemas(this.schemas);
                this.toolTemplate.setTools(this.tools.items);

                this.finishedLoad(this.toolTemplate);
            }, ({ message }) => {
                this.loading = false;
                console.error(message);
            });
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private finishedLoad(root: PolicyRoot): void {
        this.readonly = root.readonly;
        this.codeMirrorOptions.readOnly = this.readonly;

        this.storage.load(root.id);
        this.checkState();

        root.subscribe(this.onConfigChange.bind(this));

        this.onSelect(this.openFolder.root);
        this.updateComponents();
        this.updateModules();
        this.updateTools();
        this.updateTemporarySchemas();

        setTimeout(() => { this.loading = false; }, 500);
    }

    public onConfigChange() {
        if (this._lastUpdate) {
            clearTimeout(this._lastUpdate);
        }
        this._lastUpdate = setTimeout(() => {
            this._lastUpdate = null;
            this.changeDetector.detectChanges();
            this.saveState();
            setTimeout(() => {
                if (this.treeOverview) {
                    this.treeOverview.render();
                }
            }, 10);
        }, 1000);
    }

    public select(name: string) {
        this.options.select(name);
        this.options.save();
    }

    public collapse(name: string) {
        this.options.collapse(name);
        this.options.save();
    }

    public change(name: string) {
        this.options.change(name);
        this.options.save();
    }

    public onSelect(block?: PolicyItem): boolean {
        this.nextBlock = null;
        this.nestedBlock = null;
        this.currentBlock = this.openFolder.getBlock(block);
        this.selectType = this.currentBlock?.isModule ? 'Module' : 'Block';
        this.openFolder.checkChange();
        this.changeDetector.detectChanges();
        this.findSuggestedBlocks(this.currentBlock);
        this.updateMenuStatus();
        return false;
    }

    public onView(type: string): void {
        this.loading = true;
        setTimeout(() => {
            this.changeView(type);
            this.loading = false;
        }, 0);
    }

    private changeView(type: string): void {
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
                this.openFolder.rebuild(root);
            } else if (type == 'json') {
                let code = '';
                if (this.currentView == 'blocks') {
                    code = this.objectToJson(this.openFolder.getJSON());
                } else if (this.currentView == 'yaml') {
                    code = this.yamlToJson(this.code);
                }
                this.code = code;
                this.codeMirrorOptions.mode = 'policy-json-lang';
            } else if (type == 'yaml') {
                let code = '';
                if (this.currentView == 'blocks') {
                    code = this.objectToYaml(this.openFolder.getJSON());
                }
                if (this.currentView == 'json') {
                    code = this.jsonToYaml(this.code);
                }
                this.code = code;
                this.codeMirrorOptions.mode = 'policy-yaml-lang';
            }
            this.currentView = type;
        } catch (error: any) {
            this.errors = [error.message];
        }
    }

    private findSuggestedBlocks(currentBlock: any) {
        if (this.isSuggestionsEnabled && currentBlock) {
            this.suggestionsService
                .suggestions(
                    this.generateSuggestionsInput(
                        currentBlock.parent,
                        currentBlock
                    )[0]
                )
                .subscribe((result) => {
                    if (this.currentBlock !== currentBlock) {
                        return;
                    }
                    const { next, nested } = result;
                    if (
                        next &&
                        this.currentBlock?.parent?.children &&
                        !this.currentBlock.parent.children[
                        this.currentBlock.parent.children.indexOf(
                            this.currentBlock
                        ) + 1
                        ]
                    ) {
                        this.nextBlock = {
                            icon: this.registeredService.getIcon(next),
                            type: next,
                            node: {
                                blockType: next,
                                permissionsNumber:
                                    this.currentBlock?.permissionsNumber,
                            },
                            name: this.registeredService.getName(next),
                        };
                    }

                    if (
                        nested &&
                        (!this.currentBlock?.children ||
                            !this.currentBlock.children.length)
                    ) {
                        this.nestedBlock = {
                            icon: this.registeredService.getIcon(nested),
                            type: nested,
                            node: {
                                blockType: nested,
                                permissionsNumber:
                                    this.currentBlock?.permissionsNumber,
                            },
                            name: this.registeredService.getName(nested),
                        };
                    }
                });
        }
    }

    private loadState(root: any) {
        if (!this.rootTemplate || !root) {
            return;
        }
        if (this.currentView !== root.view) {
            this.currentView = root.view;
            this.changeView(root.view);
        }
        if (root.view === 'yaml' || root.view === 'json') {
            this.code = root.value;
        }
        if (root.view === 'blocks') {
            const policy = this.jsonToObject(root.value);
            this.rootTemplate.rebuild(policy);
            this.errors = [];
            this.errorsCount = -1;
            this.errorsMap = {};
            this.openFolder =
                this.rootTemplate.getModule(this.openFolder) ||
                this.rootTemplate.getRootModule();
            this.currentBlock = this.openFolder.root;
            this.updateMenuStatus();
        }
        return true;
    }

    private rewriteState() {
        if (!this.rootTemplate) {
            return;
        }
        const json = this.rootTemplate.getJSON();
        const value = this.objectToJson(json);
        this.storage.set('blocks', value);
    }

    private clearState() {
        if (!this.rootTemplate) {
            return;
        }
        const json = this.rootTemplate.getJSON();
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

    public saveState() {
        if (!this.rootTemplate || this.readonly) {
            return;
        }
        if (this.currentView === 'blocks') {
            const json = this.objectToJson(this.rootTemplate.getJSON());
            this.storage.push(this.currentView, json);
        } else if (
            ['yaml', 'json'].includes(this.currentView) &&
            this.openType === 'Root'
        ) {
            this.storage.push(this.currentView, this.code);
        }
    }

    private checkState() {
        if (!this.rootTemplate || this.readonly) {
            return;
        }
        if (this.compareState(this.rootTemplate.getJSON(), this.storage.current)) {
            this.rewriteState();
        } else {
            const applyChangesDialog = this.dialog.open(ConfirmationDialogComponent, {
                data: {
                    dialogTitle: 'Apply latest changes',
                    dialogText: 'Do you want to apply latest changes?'
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

    @HostListener('document:paste', ['$event'])
    public paste(evt: ClipboardEvent) {
        if (this.currentBlock
            && this.copyBlocksMode
            && this.currentView === 'blocks'
            && !this.readonly) {
            evt.preventDefault();
            try {
                const parsedBlockData = JSON.parse(evt.clipboardData?.getData('text') || 'null');
                this.onPasteBlock(parsedBlockData);
            }
            catch {
                console.warn('Block data is incorrect');
                return;
            }
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

    public onInitViewer(event: PolicyTreeComponent) {
        this.treeOverview = event;
    }

    private updateMenuStatus() {
        this._disableComponentMenu = true;
        this._disableModuleMenu = true;
        this._disableToolMenu = true;
        if (this.isTree && this.openFolder && this.currentBlock) {
            if ((!this.currentBlock.isModule && !this.currentBlock.isTool) || this.currentBlock === this.openFolder) {
                this._disableComponentMenu = !this.currentBlock.canAddBlocks;
                this._disableModuleMenu = !this.currentBlock.canAddModules;
                this._disableToolMenu = !this.currentBlock.canAddTools;
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

    public setModuleFavorite(event: any, item: any) {
        event.preventDefault();
        event.stopPropagation();
        this.options.setModuleFavorite(item.uuid, !item.favorite);
        this.options.save();
        this.updateModules();
    }

    public onSearch(event: any) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this.updateComponents();
        }, 200);
    }

    public onModuleSearch(event: any) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
            this.updateModules();
            this.updateTools();
        }, 200);
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
            if (
                (search && block.search.indexOf(search) === -1) ||
                block?.deprecated
            ) {
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
        for (const module of this.modules) {
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

    private updateTools() {
        this.modulesList.customTools = [];

        const search = this.searchModule ? this.searchModule.toLowerCase() : null;
        for (const tool of this.tools.items) {
            if (search && tool.search.indexOf(search) === -1) {
                continue;
            }
            this.modulesList.customTools.push(tool);
        }
    }

    private updateTemporarySchemas(): void {
        const temporarySchemas: any[] = [];
        const toolIds = this.rootTemplate.getTools();
        const tools = this.tools.filter(toolIds);
        for (const tool of tools) {
            for (const schema of tool.schemas) {
                temporarySchemas.push(schema);
            }
        }
        this.openFolder.setTemporarySchemas(temporarySchemas);
    }

    public addSuggestionsBlock(type: any, nested: boolean = false) {
        this.currentBlock = this.createNewBlock(
            nested ? this.currentBlock : this.currentBlock?.parent,
            type
        );
        this.onSelect(this.currentBlock);
        this.updateMenuStatus();
    }

    public onSuggestionsClick() {
        this.isSuggestionsEnabled = !this.isSuggestionsEnabled;
        if (this.isSuggestionsEnabled && this.currentBlock) {
            this.onSelect(this.currentBlock);
        }
    }

    public onShowEvent(type: string) {
        this.eventVisible = type;
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
                const config = this.modules.find(e => e.uuid === event.data.name);
                const module = this.rootTemplate.newModule(config);
                event.data.parent?.addChild(module, event.data.index);
            }
            if (event.data.operation === 'tool') {
                const config = this.tools.find(event.data.name);
                const tool = this.rootTemplate.newTool(config);
                event.data.parent?.addChild(tool, event.data.index);
            }
        } else {
            this.changeDetector.detectChanges();
        }
        this.updateTemporarySchemas();
    }

    private createNewBlock(parent: any, type: string) {
        if (!parent) {
            return;
        }
        const newBlock = this.registeredService.getBlockConfig(type);
        return parent.createChild(newBlock);
    }

    public onAdd(btn: any) {
        this.currentBlock = this.openFolder.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const newBlock = this.registeredService.getBlockConfig(btn.type);
            this.currentBlock.createChild(newBlock);
        }
        this.updateMenuStatus();
    }

    public onDelete(block: any) {
        this.openFolder.removeBlock(block);
        this.updateTemporarySchemas();
        this.onSelect(this.openFolder.root);
        return false;
    }

    public onCreateModule() {
        this.currentBlock = this.rootTemplate.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const module = this.rootTemplate.newModule();
            this.currentBlock.addChild(module);
        }
        this.updateMenuStatus();
    }

    public onOpenModule(module: any) {
        if (module === this.openFolder || !this.saveCodeConfig()) {
            return;
        }
        const item = this.rootTemplate.getModule(module);
        if (item) {
            this.openType = 'Sub';
            this.openFolder = item;
            if (this.currentView === 'json') {
                this.code = this.objectToJson(this.openFolder.getJSON());
            }
            if (this.currentView === 'yaml') {
                this.code = this.objectToYaml(this.openFolder.getJSON());
            }
            this.changeDetector.detectChanges();
        }
        this.updateMenuStatus();
    }

    public onConvertToModule() {
        this.currentBlock = this.rootTemplate.getBlock(this.currentBlock);
        if (this.currentBlock) {
            if (this.currentBlock.search('module')) {
                this.informService.errorShortMessage(
                    `Block cannot be converted to module as we have a module in it.`,
                    'Invalid operation.'
                );
            } else {
                this.rootTemplate.convertModule(this.currentBlock);
            }
        }
        this.updateMenuStatus();
    }

    public onOpenRoot(root: PolicyRoot): void {
        if (root === this.openFolder || !this.saveCodeConfig()) {
            return;
        }
        this.rootTemplate = root;
        this.openFolder = root?.getRootModule();
        this.openType = 'Root';
        if (this.currentView === 'json') {
            this.code = this.objectToJson(this.openFolder.getJSON());
        }
        if (this.currentView === 'yaml') {
            this.code = this.objectToYaml(this.openFolder.getJSON());
        }
        this.changeDetector.detectChanges();
        this.updateMenuStatus();
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
        const tools = results.tools || [];
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
        for (const tool of tools) {
            if (!tool.isValid) {
                this.errors.push(tool);
            }
            for (const block of tool.blocks) {
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

    public onChangeSettings(event: boolean) {
        this.openSettings = false;
        this.themes = this.themeService.getThemes();
        this.theme = this.themeService.getCurrent();
        this.updateCodeMirrorStyles();
    }

    private errorMessage(errors: string[]) {
        if (errors && errors.length) {
            const text = errors.map((text) => `<div>${text}</div>`).join('');
            this.informService.errorShortMessage(text, 'The policy is invalid');
        }
    }

    public blockStyle(rule: ThemeRule) {
        return this.themeService.getStyleByRule(rule)
    }

    public getLegendText(rule: ThemeRule): string {
        rule.updateLegend(this.openFolder);
        return rule.legend;
    }

    private updateCodeMirrorStyles() {
        if (this.currentCMStyles) {
            this.currentCMStyles.remove();
            this.currentCMStyles = null;
        }
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `${this.theme.syntaxGroups
            .map(
                (item) => `.cm-${item.id} {
            color: ${item.color}
        }`
            )
            .join('')}`;
        this.currentCMStyles = style;
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    private saveCodeConfig() {
        if (!['json', 'yaml'].includes(this.currentView)) {
            return true;
        }
        this.errors = [];
        try {
            let root = null;
            if (this.currentView === 'json') {
                root = this.jsonToObject(this.code);
            } else if (this.currentView == 'yaml') {
                root = this.yamlToObject(this.code);
            }
            this.openFolder.rebuild(root);
        } catch (error: any) {
            this.errors = [error.message];
        }
        return this.errors.length === 0;
    }

    public onSettings() {
        this.openSettings = true;
    }

    public onSchemas() {
        switch (this.rootType) {
            case 'Policy': {
                this.router.navigate(['/schemas'], {
                    queryParams: {
                        type: 'policy',
                        topic: this.policyTemplate?.topicId
                    }
                });
                break;
            }
            case 'Module': {
                this.router.navigate(['/schemas'], {
                    queryParams: {
                        type: 'module'
                    }
                });
                break;
            }
            case 'Tool': {
                this.router.navigate(['/schemas'], {
                    queryParams: {
                        type: 'tool',
                        topic: this.toolTemplate?.topicId
                    }
                });
                break;
            }
        }
    }

    public setTheme(theme: Theme) {
        this.themeService.setCurrent(theme);
        this.themeService.saveTheme();
        this.theme = this.themeService.getCurrent();
        this.updateCodeMirrorStyles();
    }

    public onAddModule(item: any) {
        this.currentBlock = this.openFolder.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const module = this.rootTemplate.newModule(item);
            this.currentBlock.addChild(module);
        }
        this.updateMenuStatus();
    }

    public onAddTool(item: any) {
        this.currentBlock = this.openFolder.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const tool = this.rootTemplate.newTool(item);
            this.currentBlock.addChild(tool);
        }
        this.updateMenuStatus();
        this.updateTemporarySchemas();
    }

    public savePolicy() {
        this.asyncUpdatePolicy().subscribe();
    }

    public saveAsPolicy() {
        const dialogRef = this.dialog.open(SavePolicyDialog, {
            width: '500px',
            data: {
                policy: this.policyTemplate,
                action: this.policyTemplate.status === 'DRAFT'
                    ? PolicyAction.CREATE_NEW_POLICY
                    : null
            },
            autoFocus: false,
            disableClose: true
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && this.policyTemplate) {
                this.loading = true;
                const json = this.policyTemplate.getJSON();

                const policy = Object.assign({}, json, result.policy);

                if (result.action === PolicyAction.CREATE_NEW_POLICY) {
                    this.policyEngineService.pushClone(policy.id, {
                        policyTag: policy.policyTag,
                        name: policy.name,
                        topicDescription: policy.topicDescription,
                        description: policy.description
                    }).subscribe((result) => {
                        const { taskId, expectation } = result;
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href)
                            }
                        });
                    }, (e) => {
                        this.loading = false;
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
                        this.router.navigate(['task', taskId], {
                            queryParams: {
                                last: btoa(location.href)
                            }
                        });
                    }, (e) => {
                        this.loading = false;
                    });
                }
            }
        });
    }

    public validationPolicy() {
        this.loading = true;
        const json = this.policyTemplate.getJSON();
        const object = {
            topicId: this.policyTemplate.topicId,
            policyRoles: json?.policyRoles,
            policyGroups: json?.policyGroups,
            policyTopics: json?.policyTopics,
            policyTokens: json?.policyTokens,
            config: json?.config
        }
        this.policyEngineService.validate(object).subscribe((data: any) => {
            const { policy, results } = data;
            const config = policy.config;
            this.policyTemplate.rebuild(config);
            this.setErrors(results);
            this.onSelect(this.openFolder.root);
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
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
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
                disableClose: true,
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
                disableClose: true,
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

    private asyncUpdatePolicy(): Observable<void> {
        return new Observable<void>(subscriber => {
            this.changeView('blocks');
            const root = this.policyTemplate.getJSON();
            if (root) {
                this.loading = true;
                this.policyEngineService.update(this.policyId, root).subscribe((policy: any) => {
                    if (policy) {
                        this.updatePolicyTemplate(policy);
                    } else {
                        this.policyTemplate = new PolicyTemplate();
                        this.policyTemplate.setTokens(this.tokens);
                        this.policyTemplate.setSchemas(this.schemas);
                        this.policyTemplate.setTools(this.tools.items);
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

    private updatePolicyTemplate(policy: any) {
        this.policyTemplate = new PolicyTemplate(policy);
        this.policyTemplate.setTokens(this.tokens);
        this.policyTemplate.setSchemas(this.schemas);
        this.policyTemplate.setTools(this.tools.items);

        this.currentView = 'blocks';
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};

        this.clearState();
        this.onOpenRoot(this.policyTemplate);
        this.finishedLoad(this.policyTemplate);
    }

    public saveAsModule() {
        const module = this.moduleTemplate.getJSON();
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

    public onSaveModule() {
        this.changeView('blocks');
        const item = this.rootTemplate.getModule(this.currentBlock);
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
                    this.modules.push(result);
                    this.updateModules();
                    this.changeDetector.detectChanges()
                    setTimeout(() => { this.loading = false; }, 500);
                }, (e) => {
                    this.loading = false;
                });
            });
        }
    }

    public updateModule() {
        this.changeView('blocks');
        const module = this.moduleTemplate.getJSON();
        this.loading = true;
        this.modulesService.update(this.moduleId, module).subscribe((result) => {
            this.clearState();
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
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

    public validationModule() {
        this.loading = true;
        const module = this.moduleTemplate.getJSON();
        this.modulesService.validate(module).subscribe((data: any) => {
            const { module, results } = data;
            this.moduleTemplate.rebuild(module);
            this.setErrors(results);
            this.onOpenRoot(this.moduleTemplate);
            this.onSelect(this.openFolder.root);
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    public saveAsTool() {
        const tool = this.toolTemplate.getJSON();
        delete tool.id;
        delete tool.uuid;
        const dialogRef = this.dialog.open(NewModuleDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: { ...tool, type: 'tool' }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (!result) {
                return;
            }
            tool.name = result.name;
            tool.description = result.description;
            this.loading = true;
            this.toolsService.create(tool).subscribe((result) => {
                this.router.navigate(['/policy-configuration'], {
                    queryParams: { toolId: result.id }
                });
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public updateTool() {
        this.changeView('blocks');
        const tool = this.toolTemplate.getJSON();
        this.loading = true;
        this.toolsService.update(this.toolId, tool).subscribe((result) => {
            this.clearState();
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public tryPublishTool() {
        this.loading = true;
        this.toolsService.pushPublish(this.toolId).subscribe((result) => {
            const { taskId, expectation } = result;
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public validationTool() {
        this.loading = true;
        const tool = this.toolTemplate.getJSON();
        this.toolsService.validate(tool).subscribe((data: any) => {
            const { tool, results } = data;
            this.toolTemplate.rebuild(tool);
            this.setErrors(results);
            this.onOpenRoot(this.toolTemplate);
            this.onSelect(this.openFolder.root);
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    public openPolicyWizardDialog() {
        this.loading = true;
        forkJoin([
            this.tokenService.getTokens(),
            this.schemaService.getSchemas(),
            this.policyEngineService.all(),
        ]).subscribe((result) => {
            const tokens = result[0].map((token) => new Token(token));
            const schemas = result[1].map((schema) => new Schema(schema));
            const policies = result[2];
            this.wizardService.openPolicyWizardDialog(
                WizardMode.EDIT,
                (value) => {
                    if (value.create) {
                        this.loading = true;
                        this.wizardService
                            .getPolicyConfig(this.policyId, value.config)
                            .subscribe((result) => {
                                this.loading = false;
                                this.policyTemplate.setPolicyInfo(
                                    value.config.policy
                                );
                                const roles = value.config.roles;
                                const policy = this.policyTemplate.getJSON();
                                policy.policyRoles = roles.filter(
                                    (role: string) => role !== 'OWNER'
                                );
                                policy.config = result.policyConfig;
                                this.updatePolicyTemplate(policy);
                                if (value.saveState) {
                                    this.wizardService.setWizardPreset(
                                        this.policyId,
                                        {
                                            data: result?.wizardConfig,
                                            currentNode: value?.currentNode,
                                        }
                                    );
                                }
                            });
                    } else if (value.saveState) {
                        this.wizardService.setWizardPreset(this.policyId, {
                            data: value.config,
                            currentNode: value.currentNode,
                        });
                    } else {
                        this.wizardService.removeWizardPreset(this.policyId);
                    }
                },
                tokens,
                schemas,
                policies,
                this.policyTemplate
            );
        }, () => undefined, () => this.loading = false);
    }

    private generateSuggestionsInput(
        parent: PolicyBlock | null,
        selected: PolicyBlock
    ): any {
        if (!parent) {
            const res = {
                blockType: selected.blockType,
            };
            return [res, res];
        }
        const [result, conf] = this.generateSuggestionsInput(
            parent.parent,
            parent
        );
        conf.blockType = parent.blockType;
        conf.children = [];
        const childConfig: any = {};
        for (const child of parent.children) {
            if (child === selected) {
                childConfig.blockType = child.blockType;
                conf.children.push(childConfig);
                break;
            } else {
                conf.children.push({
                    blockType: child.blockType,
                });
            }
        }
        return [result, childConfig];
    }

    public onBlockSearch(block: any): void {
        const option = {
            config: this.rootTemplate.getConfig(),
            id: block?.id
        }
        this.loading = true;
        this.analyticsService.searchBlocks(option).subscribe((data: any) => {
            this.blockSearchData = { source: block, data };
            this.loading = false;
        }, (e) => {
            this.blockSearchData = null;
            this.loading = false;
        });
    }

    public onSearchAction(event: any): void {
        this.blockSearchData = null;
        if (event?.type === 'replace') {
            if (event.source && event.target) {
                (event.source as PolicyBlock).replaceConfig(event.target as PolicyBlock);
            }
        }
    }
}
