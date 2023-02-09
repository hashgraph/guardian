import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Options } from './options';
import { PolicyBlockModel, PolicyModel } from '../../structures/policy-model';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
import { TokenService } from 'src/app/services/token.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Schema, SchemaHelper, Token } from '@guardian/interfaces';
import { RegisteredBlocks } from '../../registered-blocks';

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

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private route: ActivatedRoute,
        private router: Router,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
    ) {
        this.options = new Options();
        this.policyModel = new PolicyModel();
    }

    ngOnInit() {
        this.loading = true;
        this.options.load();
        this.route.queryParams.subscribe(queryParams => {
            this.loadPolicy();
        });
    }

    select(name: string) {
        this.options.select(name);
        this.options.save();
    }

    loadPolicy(): void {
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.currentView = 'blocks';
        this.policyId = this.route.snapshot.queryParams['policyId'];

        if (!this.policyId) {
            this.policyModel = new PolicyModel();
            this.loading = false;
            return;
        }

        this.policyEngineService.policy(this.policyId).subscribe((policy: any) => {
            if (!policy) {
                this.policyModel = new PolicyModel();
                this.loading = false;
                return;
            }

            this.policyModel = new PolicyModel(policy);

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

    finishedLoad() {
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

        // this.onSelect(this.policyModel.root);
        // if (this.treeFlatOverview) {
        //     this.treeFlatOverview.selectItem(this.currentBlock);
        // }

        this.updateComponents();

        setTimeout(() => { this.loading = false; }, 500);
    }

    updateComponents() {
        const all = this.registeredBlocks.getAll();
        this.componentsList.favorites = [];
        this.componentsList.uiComponents = [];
        this.componentsList.serverBlocks = [];
        this.componentsList.addons = [];
        this.componentsList.unGrouped = [];
        for (const block of all) {
            if (block.header === 'UI Components') {
                this.componentsList.uiComponents.push(block);
            } else if (block.header === 'Server Blocks') {
                this.componentsList.serverBlocks.push(block);
            } else if (block.header === 'Addons') {
                this.componentsList.addons.push(block);
            } else {
                this.componentsList.unGrouped.push(block);
            }
            block.favorite = this.options.getFavorites(block.type);
            if (block.favorite) {
                this.componentsList.favorites.push(block);
            }
        }
        console.log(this.componentsList);
    }

    setFavorite(item: any) {
        this.options.setFavorites(item.type, !item.favorite);
        this.options.save();
        this.updateComponents();
    }
}
