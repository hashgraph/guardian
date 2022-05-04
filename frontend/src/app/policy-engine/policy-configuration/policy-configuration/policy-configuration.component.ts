import { Component, HostListener, OnInit } from '@angular/core';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaHelper, SchemaStatus, Token } from 'interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TokenService } from 'src/app/services/token.service';
import { RegisteredBlocks } from '../../registered-blocks';
import { PolicyAction, SavePolicyDialog } from '../../helpers/save-policy-dialog/save-policy-dialog.component';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import * as yaml from 'js-yaml';
import { Clipboard } from '@angular/cdk/clipboard';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';

/**
 * The page for editing the policy and blocks.
 */
@Component({
    selector: 'app-policy-configuration',
    templateUrl: './policy-configuration.component.html',
    styleUrls: ['./policy-configuration.component.css']
})
export class PolicyConfigurationComponent implements OnInit {
    @HostListener('document:copy', ['$event'])
    copy() {
        if (this.currentBlock 
            && this.copyBlocksMode 
            && this.currentView === 'blocks'
            && !this.readonly) {
            this.clipboard.copy(JSON.stringify(this.currentBlock));
        }
    }
    
    @HostListener('document:paste', ['$event'])
    paste(evt: ClipboardEvent) {
        if (this.currentBlock 
            && this.copyBlocksMode 
            && this.currentView === 'blocks'
            && !this.readonly) {
            let parsedBlockData;
            try {
                parsedBlockData = JSON.parse(evt.clipboardData?.getData('text') || "null");
            }
            catch {
                console.warn("Can't parse block data");
                return;
            }

            this.onCopyBlock(parsedBlockData);
        }
    }

    loading: boolean = true;

    blocks: BlockNode[] = [];
    allBlocks: BlockNode[] = [];
    root!: BlockNode;
    newBlockType: string;
    policy!: any;
    readonly!: boolean;
    currentView: string = 'blocks';
    code!: string;
    currentBlock!: BlockNode;
    schemes!: Schema[];
    tokens!: Token[];
    policyId!: string;
    errors: any[] = [];
    errorsCount: number = -1;
    errorsMap: any;
    private _undoDepth: number = 0;

    colGroup1 = false;
    colGroup2 = false;
    colGroup3 = true;

    indexBlock: number = 0;

    codeMirrorOptions: any = {
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
    propTab: string = 'Properties';
    policyTab: string = 'Description';
    private blockToCopy?: BlockNode;
    copyBlocksMode: boolean = false;

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private clipboard: Clipboard
    ) {
        this.newBlockType = 'interfaceContainerBlock';
    }

    ngOnInit() {
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            this.loadPolicy();
        });
    }

    loadPolicy(loadState:boolean = true): void {
        const policyId = this.route.snapshot.queryParams['policyId'];
        if (!policyId) {
            this.policy = null;
            this.loading = false;
            return;
        }

        this.policyId = policyId;
        forkJoin([
            this.tokenService.getTokens(),
            this.policyEngineService.policy(policyId)
        ]).subscribe((data: any) => {
            const tokens = data[0] || [];
            const policy = data[1];
            this.tokens = tokens.map((e: any) => new Token(e));
            this.setPolicy(policy);
            if (!policy) {
                setTimeout(() => { this.loading = false; }, 500);
                return;
            }

            if (!this.compareStateAndConfig(this.objectToJson(policy?.config)) && !this.readonly && loadState) {
                const applyChanesDialog = this.dialog.open(ConfirmationDialogComponent, {
                    data: {
                        dialogTitle: "Apply latest changes",
                        dialogText: "Do you want to apply latest changes?"
                    }
                })
                applyChanesDialog.afterClosed().subscribe((result) => {
                    if (result) {
                        this.loadState();
                    }
                    else {
                        this.clearState();
                        this.saveState();
                    }
                })
                
            } else {
                this.clearState();
                this.saveState();
            }
            
            this.schemaService.getSchemes(policy.topicId).subscribe((data2: any) => {
                const schemes = data2 || [];
                this.schemes = SchemaHelper.map(schemes) || [];
                this.schemes.unshift({ type: "" } as any);
                setTimeout(() => { this.loading = false; }, 500);
            }, (e) => {
                this.loading = false;
                console.error(e.error);
            });
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    setPolicy(policy: any) {
        if (!policy) {
            return;
        }
        policy.policyRoles = policy.policyRoles || [];
        policy.policyTopics = policy.policyTopics || [];
        policy.config = policy.config || {
            blockType: 'interfaceContainerBlock',
        };
        const root = policy.config;
        this.currentView = 'blocks';
        this.readonly = policy.status == 'PUBLISH';
        this.policy = policy;
        this.setBlocks(root);
        this.indexBlock = this.allBlocks.length + 1;
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.codeMirrorOptions.readOnly = this.readonly;
    }

    setBlocks(root: BlockNode) {
        this.root = root;
        this.blocks = [root];
        this.currentBlock = root;
        this.allBlocks = this.all(root);
        this.allBlocks.forEach((b => {
            if (!b.id) b.id = this.registeredBlocks.generateUUIDv4();
        }));
    }

    all(block: BlockNode) {
        let allBlocks: BlockNode[] = [];
        this.children(block, allBlocks);
        allBlocks = allBlocks.sort((a, b) => (a.tag < b.tag ? -1 : 1));
        return allBlocks;
    }

    children(block: BlockNode, allBlocks: BlockNode[]) {
        allBlocks.push(block);
        if (block.children) {
            for (let index = 0; index < block.children.length; index++) {
                const element = block.children[index];
                this.children(element, allBlocks);
            }
        }
        return allBlocks;
    }

    onSelect(block: BlockNode) {
        this.currentBlock = block;
        return false;
    }

    prepareChildrenBlockToCopy(blocks: BlockNode[]) {
        if (!blocks) {
            return;
        }

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            block.id = this.registeredBlocks.generateUUIDv4();
            block.tag = `Block_${this.indexBlock}`;
            this.indexBlock++;
            this.prepareChildrenBlockToCopy(block.children);
        }
    }

    onCopyBlock(block?: BlockNode) {
        if (this.currentBlock && block) {
            block.id = this.registeredBlocks.generateUUIDv4();
            block.tag = `Block_${this.indexBlock}`;
            this.indexBlock++;
            this.prepareChildrenBlockToCopy(block.children);
            this.currentBlock.children = this.currentBlock.children || [];
            this.currentBlock.children.push(block);
            this.setBlocks(this.blocks[0]);
            this.saveState();
        }
    }

    onAdd(type: any) {
        if (this.currentBlock) {
            this.currentBlock.children = this.currentBlock.children || [];
            let permissions = undefined;
            if (this.currentBlock.permissions) {
                permissions = this.currentBlock.permissions.slice();
            }
            const newBlock = this.registeredBlocks.newBlock(type, permissions, this.indexBlock);
            this.currentBlock.children.push(newBlock);
            this.setBlocks(this.blocks[0]);
            this.indexBlock++;
            this.saveState();
        }
    }

    onDelete(block: BlockNode) {
        this.removeBlock(this.blocks, block);
        this.setBlocks(this.blocks[0]);
        this.saveState();
        return false;
    }

    removeBlock(blocks: BlockNode[], block: BlockNode) {
        for (let index = 0; index < blocks.length; index++) {
            const element = blocks[index];
            if (element.id == block.id) {
                blocks.splice(index, 1);
                return blocks;
            }
            if (element.children) {
                element.children = this.removeBlock(element.children, block);
            }
        }
        return blocks;
    }

    onReorder(blocks: BlockNode[]) {
        this.setBlocks(blocks[0]);
        this.saveState();
    }

    compareStateAndConfig(JSONconfig: string) {
        const states = localStorage[this.policyId] && JSON.parse(localStorage[this.policyId]);
        if (!states) {
            return true;
        }

        const state = states[states.length - 1] && JSON.parse(states[states.length - 1]);
        if (!state) {
            return true;
        }
        if (state.view === 'json' || state.view === 'blocks') {
            return state.value === JSONconfig;
        }
        if (state.view === 'yaml') {
            return this.yamlToJson(state.value) === JSONconfig;
        }

        return true;
    }

    async loadState(states?:any, number?: number) {
        let stateValues = states || ( localStorage[this.policyId] && JSON.parse(localStorage[this.policyId]));
        if (!stateValues) {
            return false;
        }

        let root: any = {};
        if (typeof number !== 'number') {
            root = JSON.parse(stateValues[stateValues.length - 1]);
        } else if (number >= 0) {
            const stateValue = stateValues[number];
            if (!stateValue) {
                return false;
            } 

            root = JSON.parse(stateValue);
        }

        if (!root.view) {
            return false;
        }
        if (this.currentView !== root.view) {
            this.currentView = root.view;
            await this.onView(root.view);
        }
        if (root.view === 'yaml' || root.view === 'json') {
            this.code = root.value;
        }
        if (root.view === 'blocks') {
            const rootBlock = this.jsonToObject(root.value);
            this.setBlocks(rootBlock);
            this.indexBlock = this.allBlocks.length + 1;
            this.errors = [];
            this.errorsCount = -1;
            this.errorsMap = {};
        }

        return true;
    }

    clearState() {
        localStorage.removeItem(this.policyId);
    }

    saveState() {
        if (this.readonly) {
            return;
        }
        
        let stateValue = localStorage[this.policyId] && JSON.parse(localStorage[this.policyId]);
        if (stateValue && stateValue.length > 5) {
            stateValue.shift();
            localStorage.setItem(this.policyId, JSON.stringify(stateValue));
        }
        else if (!stateValue) {
            stateValue = [];
        }

        let state = "";
        if (this.currentView == 'blocks') {
            state = JSON.stringify({
                view: this.currentView,
                value: this.objectToJson(this.root)
            });
        }
        if (this.currentView == 'yaml') {
            state = JSON.stringify({
                view: this.currentView,
                value: this.code
            });
        }
        if (this.currentView == 'json') {
            state = JSON.stringify({
                view: this.currentView,
                value: this.code
            });
        }

        if (this._undoDepth) {
            stateValue.slice(0, stateValue.length - this._undoDepth -1);
            this._undoDepth = 0;
        }

        stateValue.push(state);
        localStorage.setItem(this.policyId, JSON.stringify(stateValue));
    }

    hasChild(_: number, node: BlockNode) {
        return !!node.children && node.children.length > 0
    };

    getChildren = (node: BlockNode) => node.children;

    isSelect(block: BlockNode) {
        return this.currentBlock == block;
    }

    async savePolicy() {
        await this.onView('blocks');
        const root = this.blocks[0];
        if (root) {
            this.loading = true;
            this.policy.config = root;
            this.policyEngineService.update(this.policyId, this.policy).subscribe((policy) => {
                this.setPolicy(policy);
                if (this.compareStateAndConfig(this.objectToJson(root))) {
                    this.clearState();
                }
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setVersion() {
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
        this.policyEngineService.publish(this.policyId, version).subscribe((data: any) => {
            const { policies, isValid, errors } = data;
            if (isValid) {
                this.loadPolicy(false);
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
                this.loading = false;
            }
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    validationPolicy() {
        this.loading = true;
        this.policyEngineService.validate({
            policyRoles: this.policy?.policyRoles,
            policyTopics: this.policy?.policyTopics,
            config: this.root
        }).subscribe((data: any) => {
            const { policy, results } = data;
            const root = policy.config;
            this.setBlocks(root);
            const blocks = results.blocks;
            const errors = blocks.filter((block: any) => !block.isValid);

            this.errors = errors;
            this.errorsCount = errors.length;
            this.errorsMap = {};
            for (let i = 0; i < errors.length; i++) {
                const element = errors[i];
                this.errorsMap[element.id] = element.errors;
            }
            this.blocks = [this.root];
            this.currentBlock = this.root;
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    saveAsPolicy() {
        const dialogRef = this.dialog.open(SavePolicyDialog, {
            width: '500px',
            disableClose: true,
            data: {
                policy: this.policy,
                action: this.policy.status === 'DRAFT'
                    ? PolicyAction.CREATE_NEW_POLICY
                    : null
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                const policy = Object.assign({}, this.policy, result.policy);
                delete policy.id;
                delete policy.status;
                delete policy.owner;
                delete policy.version;

                if (result.action === PolicyAction.CREATE_NEW_POLICY) {
                    delete policy.uuid;
                }
                else if (result.action === PolicyAction.CREATE_NEW_VERSION) {
                    policy.previousVersion = this.policy.version;
                }

                this.policyEngineService.create(policy).subscribe((policies: any) => {
                    const last = policies[policies.length - 1];
                    this.router.navigate(['/policy-configuration'], { queryParams: { policyId: last.id } });
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
        });
    }

    onColGroup(n: number) {
        if (n == 1) {
            this.colGroup1 = !this.colGroup1;
        } else if (n == 2) {
            this.colGroup2 = !this.colGroup2;
        } else {
            this.colGroup3 = !this.colGroup3;
        }
    }

    async onView(type: string) {
        if (type == this.currentView) {
            return;
        }

        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.loading = true;
        if (type == 'blocks') {
            let root = null;
            try {
                if (this.currentView == 'json') {
                    root = this.jsonToObject(this.code);
                }
                if (this.currentView == 'yaml') {
                    root = this.yamlToObject(this.code);
                }
            } catch (error: any) {
                this.errors = [error.message];
                this.loading = false;
                return;
            }
            this.setBlocks(root);
            this.indexBlock = this.allBlocks.length + 1;
        }
        if (type == 'json') {
            let code = "";
            try {
                if (this.currentView == 'blocks') {
                    code = this.objectToJson(this.root);
                }
                if (this.currentView == 'yaml') {
                    code = this.yamlToJson(this.code);
                }
            } catch (error: any) {
                this.errors = [error.message];
                this.loading = false;
                return;
            }
            this.code = code;
            this.codeMirrorOptions.mode = 'application/ld+json';
        }
        if (type == 'yaml') {
            let code = "";
            try {
                if (this.currentView == 'blocks') {
                    code = this.objectToYaml(this.root);
                }
                if (this.currentView == 'json') {
                    code = this.jsonToYaml(this.code);
                }
            } catch (error: any) {
                this.errors = [error.message];
                this.loading = false;
                return;
            }
            this.code = code;
            this.codeMirrorOptions.mode = 'text/x-yaml';
        }
        this.currentView = type;
        this.loading = false;
    }

    objectToJson(root: any): string {
        return JSON.stringify(root, null, 2);
    }

    jsonToObject(json: string): any {
        return JSON.parse(json);
    }

    objectToYaml(root: any): string {
        return yaml.dump(root, {
            indent: 4,
            lineWidth: -1,
            noRefs: false,
            noCompatMode: true
        });
    }

    yamlToObject(yamlString: string): any {
        return yaml.load(yamlString);
    }

    yamlToJson(yaml: string): string {
        const root = this.yamlToObject(yaml);
        return this.objectToJson(root);
    }

    jsonToYaml(json: string): string {
        const root = this.jsonToObject(json);
        return this.objectToYaml(root);
    }

    async undoPolicy() {
        const stateValues = localStorage[this.policyId] && JSON.parse(localStorage[this.policyId]);
        if (!stateValues) {
            return;
        }

        if (await this.loadState(stateValues, stateValues.length - 2 - this._undoDepth)) {
            this._undoDepth++;
        }
    }

    async redoPolicy() {
        const stateValues = localStorage[this.policyId] && JSON.parse(localStorage[this.policyId]);
        if (!stateValues) {
            return;
        }

        if (await this.loadState(stateValues, stateValues.length - this._undoDepth)) {
            this._undoDepth--;
        }    
    }
}
