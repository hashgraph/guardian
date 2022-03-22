import { Component, OnInit } from '@angular/core';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaHelper, SchemaStatus, Token } from 'interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TokenService } from 'src/app/services/token.service';
import { RegisteredBlocks } from '../../registered-blocks';
import { PolicyAction, SavePolicyDialog } from '../../save-policy-dialog/save-policy-dialog.component';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import * as yaml from 'js-yaml';

/**
 * The page for editing the policy and blocks.
 */
@Component({
    selector: 'app-policy-configuration',
    templateUrl: './policy-configuration.component.html',
    styleUrls: ['./policy-configuration.component.css']
})
export class PolicyConfigurationComponent implements OnInit {
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

    colGroup1 = true;
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

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog
    ) {
        this.newBlockType = 'interfaceContainerBlock';
    }

    ngOnInit() {
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            this.loadPolicy();
        });
    }

    loadPolicy(): void {
        const policyId = this.route.snapshot.queryParams['policyId'];
        if (!policyId) {
            this.policy = null;
            this.loading = false;
            return;
        }

        this.policyId = policyId;
        forkJoin([
            this.schemaService.getSchemes(),
            this.tokenService.getTokens(),
            this.policyEngineService.policy(policyId)
        ]).subscribe((data: any) => {
            const schemes = data[0] || [];
            const tokens = data[1] || [];
            const policy = data[2];
            this.schemes = SchemaHelper.map(schemes) || [];
            this.schemes.unshift({
                type: ""
            } as any);

            this.tokens = tokens.map((e: any) => new Token(e));
            this.setPolicy(policy);
            setTimeout(() => {
                this.loading = false;
            }, 500);
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
        }
    }

    onDelete(block: BlockNode) {
        this.removeBlock(this.blocks, block);
        this.setBlocks(this.blocks[0]);
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
}




