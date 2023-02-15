import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Options } from './options';
import { PolicyModel } from '../../structures/policy.model';
import { PolicyBlockModel } from "../../structures/policy-block.model";
import { PolicyModuleModel } from "../../structures/policy-module.model";
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { TokenService } from 'src/app/services/token.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Schema, SchemaHelper, Token } from '@guardian/interfaces';
import { RegisteredBlocks } from '../../registered-blocks';
import { PolicyStorage } from '../../structures/storage';

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

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private route: ActivatedRoute,
        private router: Router,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private changeDetector: ChangeDetectorRef,
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

                this.templateModules = [{
                    uuid: '1',
                    name: 'Default 1',
                    description: 'description 1',
                    tag: 'd1',
                    type: 'DEFAULT',
                    config: {}
                }, {
                    uuid: '2',
                    name: 'Default 2',
                    description: 'description 1',
                    tag: 'd2',
                    type: 'DEFAULT',
                    config: {}
                }, {
                    uuid: '3',
                    name: 'Custom 1',
                    description: 'description 1',
                    tag: 'c1',
                    type: 'CUSTOM',
                    config: {}
                }]

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

        // this.policyStorage.load(this.policyModel.id);
        // this.checkState();

        // this.policyModel.subscribe(() => {
        //     this.saveState();
        //     setTimeout(() => {
        //         if (this.eventsOverview) {
        //             this.eventsOverview.render();
        //         }
        //     }, 10);
        // });

        this.onSelect(this.policyModel.root);
        // if (this.treeFlatOverview) {
        //     this.treeFlatOverview.selectItem(this.currentBlock);
        // }

        this.updateComponents();
        this.updateModules();

        setTimeout(() => { this.loading = false; }, 500);
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
        console.log(this.componentsList);
    }

    private updateModules() {
        this.modulesList.favorites = [];
        this.modulesList.defaultModules = [];
        this.modulesList.customModules = [];

        const search = this.searchModule ? this.searchModule.toLowerCase() : null;
        for (const module of this.templateModules) {
            module.isDefault = module.type === 'DEFAULT';

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
        console.log(this.modulesList);
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

    public savePolicy() {
        throw '';
    }

    public saveAsPolicy() {
        throw '';
    }

    public tryPublishPolicy() {
        throw '';
    }

    public draftPolicy() {
        throw '';
    }

    public tryRunPolicy() {
        throw '';
    }

    public validationPolicy() {
        throw '';
    }

    public undoPolicy() {
        const item = this.policyStorage.undo();
        // this.loadState(item);
        throw '';
    }

    public redoPolicy() {
        const item = this.policyStorage.redo();
        // this.loadState(item);
        throw '';
    }

    public onView(type: string) {
        this.loading = true;
        setTimeout(() => {
            // this.chanceView(type);
            this.loading = false;
            throw '';
        }, 0);
    }

    public onShowEvent(type: string) {
        this.eventVisible = type;
    }

    public onSelect(block: any) {
        this.currentBlock = this.policyModel.getBlock(block);
        this.selectModeType = this.currentBlock?.isModule ? 'Module' : 'Block';
        this.policyModel.checkChange();
        this.changeDetector.detectChanges();
        return false;
    }

    public onAdd(btn: any) {
        this.currentBlock = this.policyModel.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const newBlock = this.registeredBlocks.newBlock(btn.type);
            newBlock.tag = this.policyModel.getNewTag('Block');
            this.currentBlock.createChild(newBlock);
        }
    }

    public onDelete(block: any) {
        this.policyModel.removeBlock(block);
        return false;
    }

    public onDeleteModule(item: any) {

    }

    public onReorder(blocks: any[]) {
        throw '';
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

    public onOpenPolicy() {
        this.openModule = this.policyModel;
        this.openModeType = 'Policy';
        this.changeDetector.detectChanges();
    }

    public get leftMenu(): boolean {
        return (this.openModeType === 'Policy' && this.selectModeType === 'Module');
    }
}
