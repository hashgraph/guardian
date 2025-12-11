import { CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, HostListener, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractType, IContract, LocationType, PolicyAvailability, PolicyCategoryType, PolicyStatus, Schema, SchemaHelper, TagType, Token, UserPermissions } from '@guardian/interfaces';
import * as yaml from 'js-yaml';
import { DialogService } from 'primeng/dynamicdialog';
import { forkJoin, Observable, Subject } from 'rxjs';
import { WizardMode, WizardService } from 'src/app/modules/policy-engine/services/wizard.service';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ContractService } from 'src/app/services/contract.service';
import { InformService } from 'src/app/services/inform.service';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { TokenService } from 'src/app/services/token.service';
import { ToolsService } from 'src/app/services/tools.service';
import { SuggestionsService } from '../../../../services/suggestions.service';
import { ThemeService } from '../../../../services/theme.service';
import { NewModuleDialog } from '../../dialogs/new-module-dialog/new-module-dialog.component';
import { PublishPolicyDialog } from '../../dialogs/publish-policy-dialog/publish-policy-dialog.component';
import { PublishToolDialog } from '../../dialogs/publish-tool-dialog/publish-tool-dialog.component';
import { PolicyAction, SavePolicyDialog } from '../../dialogs/save-policy-dialog/save-policy-dialog.component';
import { StopResizingEvent } from '../../directives/resizing.directive';
import { CONFIGURATION_ERRORS } from '../../injectors/configuration.errors.injector';
import { RegisteredService } from '../../services/registered.service';
import { IPolicyCategory, ModuleTemplate, Options, PolicyBlock, PolicyModule, PolicyStorage, PolicyTemplate, Theme, ThemeRule, ToolMenu, ToolTemplate } from '../../structures';
import { OrderOption } from '../../structures/interfaces/order-option.interface';
import { PolicyFolder, PolicyItem, PolicyRoot } from '../../structures/policy-models/interfaces/types';
import { PolicyPropertiesComponent } from '../policy-properties/policy-properties.component';
import { PolicyTreeComponent } from '../policy-tree/policy-tree.component';
import {takeUntil} from 'rxjs/operators';
import { TestCodeDialog } from '../../dialogs/test-code-dialog/test-code-dialog.component';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';
import { DB_NAME, STORES_NAME } from 'src/app/constants';
import { IgnoreRule } from '@guardian/interfaces';
import { IgnoreRulesDialog } from "../../dialogs/ignore-rules-dialog/ignore-rules-dialog.component";
import { SaveToolDialog, ToolSaveAction } from '../../dialogs/save-tool-dialog/save-tool-dialog.component';
import { TagsService } from 'src/app/services/tag.service';
import { TagCreateDialog } from 'src/app/modules/tag-engine/tags-create-dialog/tags-create-dialog.component';
import { TagsHistory } from 'src/app/modules/tag-engine/models/tags-history';
import { TagsExplorerDialog } from 'src/app/modules/tag-engine/tags-explorer-dialog/tags-explorer-dialog.component';
import { MultipleTagsExplorerDialog } from 'src/app/modules/tag-engine/multiple-tags-explorer-dialog/multiple-tags-explorer-dialog.component';

/**
 * The page for editing the policy and blocks.
 */
@Component({
    selector: 'app-policy-configuration',
    templateUrl: './policy-configuration.component.html',
    styleUrls: [
        './policy-configuration.component.scss',
        '../../styles/properties.scss'
    ],
})
export class PolicyConfigurationComponent implements OnInit {
    private _searchTimeout!: any;
    private currentCMStyles?: any;
    private _lastUpdate: any;
    private treeOverview!: PolicyTreeComponent;
    @ViewChild(PolicyPropertiesComponent) propertiesComponent: PolicyPropertiesComponent;
    public loading: boolean = true;
    public options: Options;
    public readonly!: boolean;
    public user: UserPermissions = new UserPermissions();
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
    public wipeContracts: IContract[] = [];
    public schemas: Schema[] = [];
    public tokens: Token[] = [];
    public modules: any[] = [];
    public tools: ToolMenu;
    public selectType: 'Block' | 'Module' = 'Block';
    public errors: any[] = [];
    public errorsCount: number = -1;
    public warningsCount: number = -1;
    public infosCount: number = -1;
    public errorsMap: any;

    public warningsMap: Record<string, true> = {};
    public infosMap: Record<string, true> = {};
    public warningsListMap: Record<string, string[]> = {};
    public infosListMap: Record<string, string[]> = {};
    public validationLevel: 'error' | 'warning' | 'info' | 'success' | 'ok' = 'ok';

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
    public categories: IPolicyCategory[] = [];
    public allCategories: any = {
        appliedTechnologyTypeOptions: [],
        migrationActivityTypeOptions: [],
        projectScaleOptions: [],
        sectoralScopeOptions: [],
        subTypeOptions: [],
    };
    public policyCategoriesMapped: IPolicyCategory[] = [];
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
    public dropListConnector: any = {
        menu: null,
        body: null
    }

    private _destroy$ = new Subject<void>();
    private indexedDb: IndexedDbRegistryService;

    public ignoreRules: IgnoreRule[] = [];

    /**
     * Available presets to validation.
     */
    public readonly validationRuleOptions = [
        {
            key: 'hideAllWarnings',
            label: 'Warnings',
            hint: 'Non-critical warnings in validation results.',
            rule: { severity: 'warning' },
        },
        {
            key: 'hideAllInfos',
            label: 'Information',
            hint: 'Informational items in validation results.',
            rule: { severity: 'info' },
        },
        {
            key: 'hideDeprecatedBlocks',
            label: 'Deprecated blocks',
            hint: 'Warnings about deprecated blocks.',
            rule: { code: 'DEPRECATION_BLOCK' },
        },
        {
            key: 'hideDeprecatedProps',
            label: 'Deprecated properties',
            hint: 'Notifications about deprecated block properties.',
            rule: { code: 'DEPRECATION_PROP' },
        },
        {
            key: 'hideNoIncoming',
            label: 'Incoming events',
            hint: 'Reachability warnings for blocks with 0 incoming events.',
            rule: { code: 'REACHABILITY_NO_IN' },
        },
        {
            key: 'hideNoOutgoing',
            label: 'Outgoing events',
            hint: 'Reachability warnings for blocks with 0 outgoing events.',
            rule: { code: 'REACHABILITY_NO_OUT' },
        },
        {
            key: 'hideIsolated',
            label: 'Isolated blocks',
            hint: 'Reachability warnings for blocks without connecting events.',
            rule: { code: 'REACHABILITY_ISOLATED' }
        }
    ];

    public allBlocks: PolicyItem[] = [];
    public selectedBlocks = new Map<string, any>();
    public blockTagHistories = new Map<string, TagsHistory>();
    public tagSchemas: any[] = [];
    public tagOptions: string[] = [];
    public policy: any;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dialog: DialogService,
        private dialogService: DialogService,
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
        private analyticsService: AnalyticsService,
        private profileService: ProfileService,
        private contractService: ContractService,
        private tagsService: TagsService,
        @Inject(CONFIGURATION_ERRORS)
        private _configurationErrors: Map<string, any>,
        storage: IndexedDbRegistryService
    ) {
        this.options = new Options();
        this.storage = new PolicyStorage(storage);
        this.indexedDb = storage;

        this.policyTemplate = new PolicyTemplate();
        this.openFolder = this.policyTemplate;
        this.rootTemplate = this.policyTemplate;
        this.tools = new ToolMenu();
    }

    private get hasChanges() {
        return this.storage.isUndo;
    }

    public get validationCount(): number {
        if (this.validationLevel === 'error') {
            return Math.max(0, this.errorsCount);
        }
        if (this.validationLevel === 'warning') {
            return Math.max(0, this.warningsCount);
        }
        if (this.validationLevel === 'info') {
            return Math.max(0, this.infosCount);
        }
        return 0;
    }

    public get hasActiveRules(): boolean {
        const rules = this.ignoreRules ?? [];
        const defaultRules = this.getDefaultIgnoreRules();

        if (rules.length !== defaultRules.length) {
            return true;
        }

        const serialize = (r: IgnoreRule) => JSON.stringify(r);
        const defaultSet = new Set(defaultRules.map(serialize));

        return rules.some(r => !defaultSet.has(serialize(r)));
    }

    private _disableComponentMenu: boolean = true;

    public get disableComponentMenu(): boolean {
        return this._disableComponentMenu;
    }

    private _disableModuleMenu: boolean = true;

    public get disableModuleMenu(): boolean {
        return this._disableModuleMenu;
    }

    private _disableToolMenu: boolean = true;

    public get disableToolMenu(): boolean {
        return this._disableToolMenu;
    }

    public get menuList(): CdkDropList<any> {
        return this.dropListConnector.menu;
    }

    @ViewChild('menuList')
    public set menuList(value: CdkDropList<any>) {
        this.dropListConnector.menu = value;
    }

    public get isRootModule() {
        return this.currentBlock && (this.currentBlock === this.openFolder);
    }

    public get isTree(): boolean {
        return this.currentView === 'blocks';
    }

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

    private emptyWarningsStates(): void {
        this.warningsMap = {};
        this.warningsListMap = {};
        this.warningsCount = -1;
    }

    public emptyInfosStates(): void {
        this.infosMap = {};
        this.infosListMap = {};
        this.infosCount = -1;
    }

    private loadData(): void {
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.currentView = 'blocks';
        this.policyId = this.route.snapshot.queryParams.policyId;
        this.moduleId = this.route.snapshot.queryParams.moduleId;
        this.toolId = this.route.snapshot.queryParams.toolId;

        this.ensureStore(DB_NAME.POLICY_WARNINGS, STORES_NAME.IGNORE_RULES_STORE)
            .then(() => {
                return this.indexedDb.get<IgnoreRule[] | undefined>(
                    DB_NAME.POLICY_WARNINGS,
                    STORES_NAME.IGNORE_RULES_STORE,
                    this.policyId
                );
            })
            .then(async (rules) => {
                if (Array.isArray(rules)) {
                    this.ignoreRules = rules;
                    return;
                }

                this.ignoreRules = this.getDefaultIgnoreRules();

                try {
                    const db = await this.indexedDb.getDB(DB_NAME.POLICY_WARNINGS);
                    await db.put(
                        STORES_NAME.IGNORE_RULES_STORE,
                        this.ignoreRules,
                        this.policyId
                    );
                } catch {
                    //
                }
            })
            .catch(() => {
                this.ignoreRules = this.getDefaultIgnoreRules();
            });

        if (this._configurationErrors.has(this.policyId)) {
            this.setErrors(this._configurationErrors.get(this.policyId), 'policy');
            this._configurationErrors.delete(this.policyId);

            this.emptyWarningsStates()
            this.emptyInfosStates()
        }
        if (this._configurationErrors.has(this.moduleId)) {
            this.setErrors(this._configurationErrors.get(this.moduleId), 'module');
            this._configurationErrors.delete(this.moduleId);
        }
        if (this._configurationErrors.has(this.toolId)) {
            this.setErrors(this._configurationErrors.get(this.toolId), 'tool');
            this._configurationErrors.delete(this.toolId);
        }

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
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.policy(this.policyId),
            this.tagsService.getPublishedSchemas()
        ]).pipe(takeUntil(this._destroy$)).subscribe(([user, policy, tagSchemas]) => {
            this.user = new UserPermissions(user);
            this.owner = this.user?.did;

            this.tagSchemas = SchemaHelper.map(tagSchemas || []);

            if (!policy) {
                this.policyTemplate = new PolicyTemplate();
                this.onOpenRoot(this.policyTemplate);
                this.loading = false;
                return;
            }

            this.policyTemplate = new PolicyTemplate(policy);
            this.onOpenRoot(this.policyTemplate);

            this.policy = policy;
            this.allBlocks = this.policyTemplate.allBlocks;

            if (!this.policyTemplate.valid) {
                this.loading = false;
                return;
            }

            forkJoin([
                this.tokenService.menuList(),
                this.policyEngineService.getBlockInformation(),
                this.schemaService.getSchemas(this.policyTemplate.topicId),
                this.modulesService.menuList(),
                this.toolsService.menuList(),
                this.policyEngineService.getPolicyCategories(),
                this.contractService.getContracts({ type: ContractType.WIPE }),
            ]).pipe(takeUntil(this._destroy$)).subscribe( async (data) => {
                const tokens = data[0] || [];
                const blockInformation = data[1] || {};
                const schemas = data[2] || [];
                const modules = data[3] || [];
                const tools = data[4] || [];
                this.categories = data[5] || [];
                this.wipeContracts = data[6].body || [];

                this.registeredService.registerConfig(blockInformation);
                this.tokens = tokens.map((e: any) => new Token(e));
                this.schemas = SchemaHelper.map(schemas) || [];
                this.modules = modules;
                this.tools.setItems(tools);

                this.policyTemplate.setTokens(this.tokens);
                this.policyTemplate.setSchemas(this.schemas);
                this.policyTemplate.setTools(this.tools.items);
                await this.finishedLoad(this.policyTemplate);

                this.categories.forEach((item: IPolicyCategory) => {
                    switch (item.type) {
                        case PolicyCategoryType.APPLIED_TECHNOLOGY_TYPE:
                            this.allCategories.appliedTechnologyTypeOptions.push(item);
                            break;
                        case PolicyCategoryType.MITIGATION_ACTIVITY_TYPE:
                            this.allCategories.migrationActivityTypeOptions.push(item);
                            break;
                        case PolicyCategoryType.PROJECT_SCALE:
                            this.allCategories.projectScaleOptions.push(item);
                            break;
                        case PolicyCategoryType.SECTORAL_SCOPE:
                            this.allCategories.sectoralScopeOptions.push(item);
                            break;
                        case PolicyCategoryType.SUB_TYPE:
                            this.allCategories.subTypeOptions.push(item);
                            break;
                        default:
                            break;
                    }
                })

                if (this.policyTemplate?.categories?.length && this.policyTemplate?.categories.length > 0) {
                    this.policyCategoriesMapped = [];
                    this.policyTemplate?.categories?.forEach(id => {
                        const category = this.categories.find((cat: IPolicyCategory) => cat.id === id);
                        if (category) {
                            this.policyCategoriesMapped.push(category);
                        }
                    })
                }
                this.loadTagsData();
            }, ({ message }) => {
                this.loading = false;
                console.error(message);
            });
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadTagsData() {
        if (this.user.TAGS_TAG_READ) {
            const ids = this.allBlocks?.map(e => this.policy.id + '#' + e.id) || [];

            this.tagsService.search(TagType.PolicyBlock, ids).subscribe((data) => {
                if (this.allBlocks) {
                    for (const block of this.allBlocks) {
                        (block as any)._tags = data[this.policy.id + '#' + block.id];
                        
                        data[block.id]?.tags.forEach((tag: any) => {
                            const totalTagOptions = [
                                ...this.tagOptions,
                                tag.name,
                            ];
                            this.tagOptions = [
                                ...new Set(totalTagOptions),
                            ];
                        });

                        const target = this.policy.id + '#' + block.id;
                        let history: TagsHistory;
                        if ((block as any)._tags) {
                            history = new TagsHistory(
                                (block as any)._tags.entity || TagType.PolicyBlock,
                                (block as any)._tags.target || target,
                                this.owner,
                                this.policy.location || LocationType.LOCAL
                            );
                            history.setData((block as any)._tags.tags);
                            history.setDate((block as any)._tags.refreshDate);

                        } else {
                            history = new TagsHistory(
                                TagType.PolicyBlock,
                                target,
                                this.owner,
                                this.policy.location || LocationType.LOCAL
                            );
                        }
                        this.blockTagHistories.set(block.id, history);
                    }
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        } else {
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }
    }

    private loadModule(): void {
        this.rootId = this.moduleId;
        forkJoin([
            this.profileService.getProfile(),
            this.modulesService.getById(this.moduleId)
        ]).pipe(takeUntil(this._destroy$)).subscribe(([user, module]) => {
            this.user = new UserPermissions(user);

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
            ]).pipe(takeUntil(this._destroy$)).subscribe((data) => {
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
        forkJoin([
            this.profileService.getProfile(),
            this.toolsService.getById(this.toolId)
        ]).pipe(takeUntil(this._destroy$)).subscribe(([user, tool]) => {
            this.user = new UserPermissions(user);

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
                this.tokenService.menuList(),
                this.schemaService.getSchemas(this.toolTemplate.topicId),
                this.modulesService.menuList(),
                this.toolsService.menuList()
            ]).pipe(takeUntil(this._destroy$)).subscribe((data) => {
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

    private async finishedLoad(root: PolicyRoot): Promise<void> {
        this.readonly = root.readonly;
        this.codeMirrorOptions.readOnly = this.readonly;

        await this.storage.load(root.id, {
            view: 'blocks',
                value: this.objectToJson(root.getJSON())
        });

        const existing = await this.storage.getPolicyById(root.id);
        if (existing) {
            this.checkState();
        }

        root.subscribe(this.onConfigChange.bind(this));

        this.onSelect({ block: this.openFolder.root, isMultiSelect: false });
        this.updateComponents();
        this.updateModules();
        this.updateTools();
        this.updateTemporarySchemas();

        setTimeout(() => {
            this.loading = false;
            this.maybeShowSavepointsWarning()
        }, 500);
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
                .pipe(takeUntil(this._destroy$)).subscribe((result) => {
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

            this.emptyWarningsStates();
            this.emptyInfosStates();
            this.validationLevel = 'ok';

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

    private checkState() {
        if (!this.rootTemplate || this.readonly || !this.storage.current) {
            return;
        }

        if (this.compareState(this.rootTemplate.getJSON(), this.storage.current)) {
            this.rewriteState();
        } else {
            const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog',
                data: {
                    header: 'Apply latest changes',
                    text: `Do you want to apply latest changes?`,
                    buttons: [{
                        name: 'Close',
                        class: 'secondary'
                    }, {
                        name: 'Confirm',
                        class: 'primary'
                    }]
                },
            });
            dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result: string) => {
                if (result === 'Confirm') {
                    this.loadState(this.storage.current);
                } else {
                    this.rewriteState();

                    await this.storage.deleteById(this.policyId)
                }
            });
        }
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

    private createNewBlock(parent: any, type: string) {
        if (!parent) {
            return;
        }
        const newBlock = this.registeredService.getBlockConfig(type);
        return parent.createChild(newBlock);
    }

    private setErrors(results: any, type: string) {
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
        this.errorsCount = this.errors.length + commonErrors.length;
        this.errorsMap = {};

        this.emptyWarningsStates()
        this.emptyInfosStates()

        this.infosListMap = {};
        for (const element of this.errors) {
            this.errorsMap[element.id] = element.errors;
        }

        const collect = (
            arr: any[],
            prop: 'warnings' | 'infos',
            flagsTarget: Record<string, true>,
            listTarget: Record<string, string[]>
        ) => {
            for (const item of arr || []) {
                if (Array.isArray(item[prop]) && item[prop].length) {
                    flagsTarget[item.id] = true;
                    listTarget[item.id] = (listTarget[item.id] || []).concat(item[prop]);
                }
                for (const b of (item.blocks || [])) {
                    if (Array.isArray(b[prop]) && b[prop].length) {
                        flagsTarget[b.id] = true;
                        listTarget[b.id] = (listTarget[b.id] || []).concat(b[prop]);
                    }
                }
            }
        };

        collect(blocks,  'warnings', this.warningsMap, this.warningsListMap);
        collect(blocks,  'infos',    this.infosMap,    this.infosListMap);

        collect(modules, 'warnings', this.warningsMap, this.warningsListMap);
        collect(modules, 'infos',    this.infosMap,    this.infosListMap);

        collect(tools,   'warnings', this.warningsMap, this.warningsListMap);
        collect(tools,   'infos',    this.infosMap,    this.infosListMap);

        this.errorMessage(commonErrors, type);

        this.warningsCount = Object.keys(this.warningsMap || {}).length;
        this.infosCount = Object.keys(this.infosMap || {}).length;

        if ((this.errorsCount ?? 0) > 0) {
            this.validationLevel = 'error';
        } else if (this.warningsCount > 0) {
            this.validationLevel = 'warning';
        } else if (this.infosCount > 0) {
            this.validationLevel = 'info';
        } else {
            this.validationLevel = 'success';
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

    private onPasteBlock(block?: any) {
        if (this.currentBlock && block) {
            this.currentBlock.pasteChild(block);
        }
    }

    private errorMessage(errors: string[], type: string) {
        if (errors && errors.length) {
            const text = errors.map((text) => `<div>${text}</div>`).join('');
            this.informService.errorShortMessage(text, `The ${type} is invalid`);
        }
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

    private publishPolicy(options: { policyVersion: string, policyAvailability: PolicyAvailability }) {
        this.loading = true;
        this.policyEngineService.pushPublish(this.policyId, options).pipe(takeUntil(this._destroy$)).subscribe((result) => {
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

        const databaseName = DB_NAME.TABLES;
        const storeNames = [
            STORES_NAME.FILES_STORE,
            STORES_NAME.DRAFT_STORE
        ];
        const keyPrefix = `${this.policyId}__`;

        this.indexedDb.clearByKeyPrefixAcrossStores(
            databaseName,
            storeNames,
            keyPrefix
        );

        this.indexedDb
            .delete(DB_NAME.POLICY_WARNINGS, STORES_NAME.IGNORE_RULES_STORE, this.policyId)
            .then(() => { this.ignoreRules = []; })
            .catch(() => {
                //
            });
    }

    private dryRunPolicy() {
        this.loading = true;
        this.policyEngineService.dryRun(this.policyId).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (isValid) {
                this.clearState();
                this.loadData();
            } else {
                this.setErrors(errors, 'policy');

                this.emptyWarningsStates()
                this.emptyInfosStates()

                this.loading = false;
            }
        }, (e) => {
            console.error(e.error);
            this.loading = false;
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

        this.emptyWarningsStates()
        this.emptyInfosStates()

        this.validationLevel = 'ok'

        this.clearState();
        this.onOpenRoot(this.policyTemplate);
        this.finishedLoad(this.policyTemplate);
    }

    private asyncUpdatePolicy(): Observable<void> {
        return new Observable<void>(subscriber => {
            this.changeView('blocks');
            const root = this.policyTemplate.getJSON();
            if (root) {
                this.loading = true;
                this.policyEngineService.update(this.policyId, root).pipe(takeUntil(this._destroy$)).subscribe((policy: any) => {
                    if (policy) {
                        this.updatePolicyTemplate(policy);

                        this.remapCategories();
                    } else {
                        this.policyTemplate = new PolicyTemplate();
                        this.policyTemplate.setTokens(this.tokens);
                        this.policyTemplate.setSchemas(this.schemas);
                        this.policyTemplate.setTools(this.tools.items);
                    }
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                    subscriber.next();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    private remapCategories() {
        if (this.policyTemplate?.categories?.length && this.policyTemplate?.categories.length > 0) {
            this.policyCategoriesMapped = [];
            this.policyTemplate.categories.forEach(id => {
                const category = this.categories.find((cat: IPolicyCategory) => cat.id === id);
                if (category) {
                    this.policyCategoriesMapped.push(category);
                }
            });
        }
    }

    private generateSuggestionsInput(
        parent: PolicyBlock | null,
        selected: PolicyBlock
    ): any {
        if (!parent) {
            const res = {
                blockType: selected.blockType
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
                    blockType: child.blockType
                });
            }
        }
        return [result, childConfig];
    }

    public ngOnInit() {
        this.loading = true;
        this.options.load();
        this.theme = this.themeService.getCurrent();
        this.route.queryParams.pipe(takeUntil(this._destroy$)).subscribe(queryParams => {
            this.loadData();
        });

        this.themeService.load().pipe(takeUntil(this._destroy$)).subscribe((themes: any) => {
            this.themeService.setThemes(themes);
            this.themes = this.themeService.getThemes();
            this.theme = this.themeService.getCurrent();
            this.updateCodeMirrorStyles();
        }, ({ message }) => {
            console.error(message);
        });

        this.handleTagsUpdate();
    }

    public async ngOnDestroy(): Promise<void> {

        this.storage.destroy();

        this._destroy$.next();
        this._destroy$.complete();

        this.policyTemplate = undefined as any;

        this.changeDetector.detach();

        this.policyTemplate = undefined as any;
        this.treeOverview = undefined as any;
        this.currentBlock = undefined as any;
        this.openFolder = undefined as any;
        this.rootTemplate = undefined as any;

        if (this._lastUpdate) {
            clearTimeout(this._lastUpdate);
        }

        this.currentCMStyles?.remove()
    }

    public onConfigChange() {
        if (this._lastUpdate) {
            clearTimeout(this._lastUpdate);
        }
        this._lastUpdate = setTimeout( async () => {
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

    
    public owner: string;

    public onSelect(event: { block?: PolicyItem, isMultiSelect: boolean }): boolean {
        const block = event.block;
        const isMultiSelect = event.isMultiSelect;

        this.nextBlock = null;
        this.nestedBlock = null;
        this.currentBlock = this.openFolder.getBlock(block);
        this.selectType = this.currentBlock?.isModule ? 'Module' : 'Block';
        this.openFolder.checkChange();
        //TODO:
        // this.changeDetector.detectChanges();
        this.findSuggestedBlocks(this.currentBlock);
        this.updateMenuStatus();

        if (this.canEditTags() && this.currentBlock && !this.currentBlock.isRoot) {
            if (isMultiSelect) {
                if (!this.selectedBlocks.has(this.currentBlock.id)) {
                    this.selectedBlocks.set(this.currentBlock.id, this.currentBlock);
                } else {
                    this.selectedBlocks.delete(this.currentBlock.id);
                }
            } else {
                this.selectedBlocks.clear();
                this.selectedBlocks.set(this.currentBlock.id, this.currentBlock);
            }
        } else if (this.currentBlock?.isRoot && !isMultiSelect) {
            this.selectedBlocks.clear();
        }

        return false;
    }

    public onView(type: string): void {
        this.loading = true;
        setTimeout(() => {
            this.changeView(type);
            this.loading = false;
        }, 0);
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
            } catch {
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

    public addSuggestionsBlock(type: any, nested: boolean = false) {
        this.currentBlock = this.createNewBlock(
            nested ? this.currentBlock : this.currentBlock?.parent,
            type
        );
        this.onSelect({ block: this.currentBlock, isMultiSelect: false});
        this.updateMenuStatus();
    }

    public onSuggestionsClick() {
        this.isSuggestionsEnabled = !this.isSuggestionsEnabled;
        if (this.isSuggestionsEnabled && this.currentBlock) {
            this.onSelect({ block: this.currentBlock, isMultiSelect: false});
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
        this.onSelect({ block: this.openFolder.root, isMultiSelect: false });
        return false;
    }

    public onTest(block: any) {
        const dialogRef = this.dialogService.open(TestCodeDialog, {
            showHeader: false,
            header: 'Code',
            width: '1200px',
            styleClass: 'guardian-dialog',
            data: {
                block,
                folder: this.openFolder,
                readonly: this.readonly,
                policyId: this.rootId
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
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

    public async undoPolicy() {
        const item = await this.storage.undo();
        this.loadState(item);
    }

    public async redoPolicy() {
        const item = await this.storage.redo();
        this.loadState(item);
    }

    public onChangeSettings(event: boolean) {
        this.openSettings = false;
        this.themes = this.themeService.getThemes();
        this.theme = this.themeService.getCurrent();
        this.updateCodeMirrorStyles();
    }

    public blockStyle(rule: ThemeRule) {
        return this.themeService.getStyleByRule(rule)
    }

    public getLegendText(rule: ThemeRule): string {
        rule.updateLegend(this.openFolder);
        return rule.legend;
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
        this.asyncUpdatePolicy().pipe(takeUntil(this._destroy$)).subscribe();
    }

    public saveAsPolicy() {
        const dialogRef = this.dialog.open(SavePolicyDialog, {
            showHeader: false,
            width: '550px',
            styleClass: 'guardian-dialog',
            data: {
                policy: this.policyTemplate,
                action: this.policyTemplate.status === 'DRAFT'
                    ? PolicyAction.CREATE_NEW_POLICY
                    : null
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
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
                    }).pipe(takeUntil(this._destroy$)).subscribe((result) => {
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
                    this.policyEngineService.pushCreate(policy).pipe(takeUntil(this._destroy$)).subscribe((result) => {
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

        const ignoreRules = Array.isArray(this.ignoreRules)
            ? this.ignoreRules
            : this.getDefaultIgnoreRules();

        const object = {
            topicId: this.policyTemplate.topicId,
            policyRoles: json?.policyRoles,
            policyGroups: json?.policyGroups,
            policyTopics: json?.policyTopics,
            policyTokens: json?.policyTokens,
            categories: json?.categories,
            config: json?.config,
            ignoreRules
        }

        this.policyEngineService.validate(object).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { policy, results } = data;
            const config = policy.config;
            this.policyTemplate.rebuild(config);
            this.setErrors(results, 'policy');
            this.onSelect({ block: this.openFolder.root, isMultiSelect: false });
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    public setVersion() {
        const dialogRef = this.dialogService.open(PublishPolicyDialog, {
            showHeader: false,
            header: 'Publish Policy',
            width: '600px',
            styleClass: 'guardian-dialog',
            data: {
                policy: this.policyTemplate
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (options) => {
            if (options) {
                this.publishPolicy(options);
            }
        });
    }

    public draftPolicy() {
        this.loading = true;
        this.policyEngineService.draft(this.policyId).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            this.clearState();
            this.loadData();
        }, (e) => {
            this.loading = false;
        });

        const databaseName = DB_NAME.TABLES;
        const storeNames = [
            STORES_NAME.FILES_STORE,
            STORES_NAME.DRAFT_STORE
        ];
        const keyPrefix = `${this.policyId}__`;

        this.indexedDb.clearByKeyPrefixAcrossStores(
            databaseName,
            storeNames,
            keyPrefix
        );
    }

    public async tryPublishPolicy() {
        const isPolicyStorage = await this.storage.getPolicyById(this.policyId)

        if (!!isPolicyStorage) {
            const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog',
                data: {
                    header: 'Save Changes',
                    text: `You have unsaved changes. Do you want to save them?`,
                    buttons: [{
                        name: 'Cancel',
                        class: 'secondary'
                    }, {
                        name: 'Save',
                        class: 'primary'
                    }]
                },
            });
            dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe((result: string) => {
                if (result === 'Save') {
                    this.asyncUpdatePolicy().pipe(takeUntil(this._destroy$)).subscribe(() => {
                        this.setVersion();
                    });
                }
            });
        } else {
            this.setVersion();
        }
    }

    public async tryRunPolicy() {
        const isPolicyStorage = await this.storage.getPolicyById(this.policyId)

        if (!!isPolicyStorage) {
            const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'guardian-dialog',
                data: {
                    header: 'Save Changes',
                    text: `You have unsaved changes. Do you want to save them?`,
                    buttons: [{
                        name: 'Cancel',
                        class: 'secondary'
                    }, {
                        name: 'Save',
                        class: 'primary'
                    }]
                },
            });
            dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe((result: string) => {
                if (result === 'Save') {
                    this.asyncUpdatePolicy().pipe(takeUntil(this._destroy$)).subscribe(() => {
                        this.dryRunPolicy();
                    });
                }
            });
        } else {
            this.dryRunPolicy();
        }
    }

    public openPolicyWizardDialog() {
        this.loading = true;
        forkJoin([
            this.tokenService.getTokens(),
            this.schemaService.getSchemas(),
            this.policyEngineService.all(),
        ]).pipe(takeUntil(this._destroy$)).subscribe((result) => {
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
                            .pipe(takeUntil(this._destroy$)).subscribe((result) => {
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
                                this.remapCategories()
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

    public saveAsModule() {
        const module = this.moduleTemplate.getJSON();
        delete module.id;
        delete module.uuid;
        const dialogRef = this.dialogService.open(NewModuleDialog, {
            width: '650px',
            styleClass: 'custom-dialog',
            header: 'New Module',
            closable: true,
            data: {
                type: 'module'
            }
            // data: module
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (!result) {
                return;
            }
            module.name = result.name;
            module.description = result.description;
            this.loading = true;
            this.modulesService.create(module).pipe(takeUntil(this._destroy$)).subscribe((result) => {
                this.router.navigate(['/module-configuration'], {
                    queryParams: { moduleId: result.uuid }
                });
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

            const dialogRef = this.dialogService.open(NewModuleDialog, {
                width: '650px',
                styleClass: 'custom-dialog',
                header: 'New Module',
                closable: true,
                data: {
                    type: 'module'
                }
            });
            dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
                if (!result) {
                    return;
                }
                module.name = result.name;
                module.description = result.description;
                this.loading = true;
                this.modulesService.create(module).pipe(takeUntil(this._destroy$)).subscribe((result) => {
                    this.modules.push(result);
                    this.updateModules();
                    this.changeDetector.detectChanges()
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
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
        this.modulesService.update(this.moduleId, module).pipe(takeUntil(this._destroy$)).subscribe((result) => {
            this.clearState();
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public tryPublishModule() {
        this.loading = true;
        this.modulesService.publish(this.moduleId).pipe(takeUntil(this._destroy$)).subscribe((result) => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public validationModule() {
        this.loading = true;
        const module = this.moduleTemplate.getJSON();
        this.modulesService.validate(module).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { module, results } = data;
            this.moduleTemplate.rebuild(module);
            this.setErrors(results, 'module');
            this.onOpenRoot(this.moduleTemplate);
            this.onSelect({ block: this.openFolder.root, isMultiSelect: false });
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    public saveAsTool() {
        const dialogRef = this.dialog.open(SaveToolDialog, {
            showHeader: false,
            width: '550px',
            styleClass: 'guardian-dialog',
            data: {
                tool: this.toolTemplate,
                action: this.toolTemplate.status === 'DRAFT'
                    ? ToolSaveAction.CREATE_NEW_TOOL
                    : null
            }
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (result) => {
            if (result && this.toolTemplate) {
                this.loading = true;

                const json = this.toolTemplate.getJSON();
                const tool = Object.assign({}, json, result.tool);

                if (result.action === ToolSaveAction.CREATE_NEW_TOOL) {
                    delete tool._id;
                    delete tool.id;
                    delete tool.uuid;
                    delete tool.topicId;
                    delete tool.status;
                    delete tool.owner;
                    delete tool.version;
                    this.toolsService.create(tool).pipe(takeUntil(this._destroy$)).subscribe((result) => {
                        this.router.navigate(['/tool-configuration'], {
                            queryParams: { toolId: result.id }
                        });
                    }, (e) => {
                        this.loading = false;
                    });
                } else if (result.action === ToolSaveAction.CREATE_NEW_VERSION) {
                    delete tool._id;
                    delete tool.id;
                    delete tool.uuid;
                    delete tool.status;
                    delete tool.owner;
                    delete tool.version;
                    tool.previousVersion = json.version;

                    this.toolsService.create(tool).pipe(takeUntil(this._destroy$)).subscribe((result) => {
                        this.router.navigate(['/tool-configuration'], {
                            queryParams: { toolId: result.id }
                        });
                    }, (e) => {
                        this.loading = false;
                    });
                }
            }
        });
    }

    public updateTool() {
        this.changeView('blocks');
        const tool = this.toolTemplate.getJSON();
        this.loading = true;
        this.toolsService.update(this.toolId, tool).pipe(takeUntil(this._destroy$)).subscribe((result) => {
            this.clearState();
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public draftTool() {
        this.loading = true;
        this.toolsService.draft(this.toolId).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            this.clearState();
            this.loadData();
        }, (e) => {
            this.loading = false;
        });
    }

    public tryPublishTool() {
        this.setToolVersion();
    }

    public setToolVersion() {
        const dialogRef = this.dialogService.open(PublishToolDialog, {
            showHeader: false,
            header: 'Publish Tool',
            width: '600px',
            styleClass: 'guardian-dialog'
        });
        dialogRef.onClose.pipe(takeUntil(this._destroy$)).subscribe(async (options) => {
            if (options) {
                this.loading = true;
                this.toolsService.pushPublish(this.toolId, options).pipe(takeUntil(this._destroy$)).subscribe((result) => {
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
        });
    }

    public validationTool() {
        this.loading = true;
        const tool = this.toolTemplate.getJSON();
        this.toolsService.validate(tool).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { tool, results } = data;
            this.toolTemplate.rebuild(tool);
            this.setErrors(results, 'tool');
            this.onOpenRoot(this.toolTemplate);
            this.onSelect({ block: this.openFolder.root, isMultiSelect: false });
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    public async tryRunTool() {
        this.dryRunTool();
    }

    private dryRunTool() {
        this.loading = true;
        this.toolsService.dryRun(this.toolId).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (isValid) {
                this.clearState();
                this.loadData();
            } else {
                this.setErrors(errors, 'tool');
                this.loading = false;
            }
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public backToPolicies() {
        this.router.navigateByUrl('/policy-viewer');
    }

    public backToModules() {
        this.router.navigateByUrl('/modules');
    }

    public backToTools() {
        this.router.navigateByUrl('/tools');
    }

    public onBlockSearch(block: any): void {
        const option = {
            config: this.rootTemplate.getConfig(),
            id: block?.id
        }
        this.loading = true;
        this.analyticsService.searchBlocks(option).pipe(takeUntil(this._destroy$)).subscribe((data: any) => {
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

    onDroppedSection(event: CdkDragDrop<any[]>) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        this.options.save();
    }

    saveSizes(event: StopResizingEvent) {
        return (item: OrderOption) => {
            if (item.id === event.prev?.id) {
                item.size = event.prev.size;
            }
            if (item.id === event.next?.id) {
                item.size = event.next.size;
            }
            return item;
        }
    }

    stopResizingConfiguration(event: StopResizingEvent) {
        this.options.configurationOrder = this.options.configurationOrder.map(
            this.saveSizes(event)
        );
        this.options.save();
    }

    stopResizingProperties(event: StopResizingEvent) {
        this.options.propertiesOrder = this.options.propertiesOrder.map(
            this.saveSizes(event)
        );
        this.options.save();
    }

    onDragSection(event: any) {
        document.body.classList.add('inherit-cursor');
        document.body.classList.add('pointer-events-children-none');
        document.body.style.cursor = 'grabbing';
    }

    onDropSection(event: any) {
        document.body.classList.remove('inherit-cursor');
        document.body.classList.remove('pointer-events-children-none');
        document.body.style.cursor = '';
    }

    private shouldShowSavepointsWarning(): boolean {
        if (this.rootType !== 'Policy') {
            return false
        }

        const isDryOrDemo = this.policyTemplate?.isDryRun || this.policyTemplate?.isDemo;
        if (isDryOrDemo) {
            return false;
        }

        return this.compareState(this.rootTemplate.getJSON(), this.storage.current);
    }

    private maybeShowSavepointsWarning(): void {
        if (!this.shouldShowSavepointsWarning()) {
            return
        };

        this.policyEngineService.getSavepoints(this.policyId).subscribe({
            next: (resp) => {
                const items = resp?.items ?? [];
                if (!items.length) {
                    return;
                }

                const names = items.map((i: any) => (i?.name?.trim() || i?.id));
                const count = names.length;
                const list = names.map((n: any) => `• ${n}`).join('\n');

                const text =
                    `This policy has ${count} ${count === 1 ? 'savepoint' : 'savepoints'} configured:\n\n` +
                    `${list}\n\n` +
                    `Edits to the policy workflow in the area prior to the savepoints may result in errors or ` +
                    `inconsistencies during restore. Delete existing savepoints if you plan to make such changes.`;

                this.dialogService.open(CustomConfirmDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog warning-dialog',
                    data: {
                        header: 'Savepoints found',
                        text,
                        buttons: [{ name: 'OK', class: 'primary' }]
                    },
                });
            }
        });
    }

    private ensureStore(dbName: string, storeName: string, options?: IDBObjectStoreParameters): Promise<void> {
        return this.indexedDb.registerStore(dbName, { name: storeName, options });
    }

    public async setIgnoreRules(): Promise<void> {
        const databaseConnection = await this.indexedDb.getDB(DB_NAME.POLICY_WARNINGS);

        const dialogRef = this.dialog.open(IgnoreRulesDialog, {
            showHeader: false,
            width: '640px',
            styleClass: 'ignore-rule-dialog',
            data: {
                policyId: this.policyId,
                rules: this.ignoreRules ?? [],
                presetRuleOptions: this.validationRuleOptions,
            },
        });

        dialogRef.onClose
            .pipe(takeUntil(this._destroy$))
            .subscribe(async (result: IgnoreRule[] | null) => {
                if (result === null) {
                    return;
                }

                await databaseConnection.put(
                    STORES_NAME.IGNORE_RULES_STORE,
                    result,
                    this.policyId
                );

                this.ignoreRules = result;
            });
    }

    private getDefaultIgnoreRules(): IgnoreRule[] {
        return this.validationRuleOptions.map(
            (option) => option.rule as IgnoreRule
        );
    }

    public getSelectedBlock(): any {
        return this.currentBlock as any;
    }

    public onAddTagToBlocks() {
        const tagsHistory = [];
        for (const block of this.selectedBlocks.values()) {
            const tagHistory = this.blockTagHistories.get(block.id)
            if (tagHistory) {
                tagsHistory.push(tagHistory);
            }
        }

        if (tagsHistory.length > 0) {
            const dialogRef = this.dialog.open(MultipleTagsExplorerDialog, {
                width: '750px',
                height: '600px',
                closable: false,
                header: 'Tags',
                data: {
                    user: this.user,
                    service: this.tagsService,
                    histories: tagsHistory,
                    schemas: this.schemas,
                    items: Array.from(this.selectedBlocks.values())
                }
            });
            dialogRef
            .onClose
            .subscribe(async (result) =>
                result ? this.tagsService.tagsUpdated$.next() : null
            );
        }
    }

    public onAddTag() {
        if (this.canEditTags() && this.currentBlock) {
            const tagHistory = this.blockTagHistories.get(this.currentBlock.id);
            if (tagHistory) {
                const dialogRef = this.dialog.open(TagsExplorerDialog, {
                    width: '750px',
                    height: '600px',
                    closable: false,
                    header: 'Tags',
                    data: {
                        user: this.user,
                        service: this.tagsService,
                        history: tagHistory,
                        schemas: this.schemas
                    }
                });
                dialogRef
                .onClose
                .subscribe(async (result) =>
                    result ? this.tagsService.tagsUpdated$.next() : null
                );
            } else {
                const dialogRef = this.dialog.open(TagCreateDialog, {
                    width: '750px',
                    closable: true,
                    header: 'New Tag',
                    data: {
                        schemas: this.tagSchemas
                    }
                });
                dialogRef.onClose.subscribe(async (result) => {
                    if (result) {
                        this.onCreateTag(result, this.currentBlock!.id);
                    }
                });
            }
        }
    }

    private onCreateTag(tag: any, id: string) {
        const history = this.blockTagHistories.get(id);
        
        if (!history) {
            return;
        }

        tag = history.create(tag);

        this.loading = true;
        this.tagsService.create(tag).subscribe((data) => {
            history.add(data);
            this.tagsService.tagsUpdated$.next();
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    private handleTagsUpdate(): void {
        this.tagsService.tagsUpdated$.pipe(takeUntil(this._destroy$)).subscribe({
            next: () => this.loadData(),
        });
    }

    public canEditTags(): boolean {
        return this.policy?.status === PolicyStatus.PUBLISH;
    }
}
