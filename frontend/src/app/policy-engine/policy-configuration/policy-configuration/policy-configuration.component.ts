import { Component, OnInit } from '@angular/core';
import { BlockNode } from '../../data-source/tree-data-source';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaStatus, Token } from 'interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NewPolicyDialog } from '../../new-policy-dialog/new-policy-dialog.component';
import { TokenService } from 'src/app/services/token.service';

const allPermissions: any = [
    {
        value: 'ROOT_AUTHORITY',
        name: 'Root Authority',
    },
    {
        value: 'INSTALLER',
        name: 'Installer',
    },
    {
        value: 'AUDITOR',
        name: 'Auditor',
    },
    {
        value: 'ORIGINATOR',
        name: 'Originator',
    },
];

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

    colGroup1 = false;
    colGroup2 = false;

    permissions!: any[];

    indexBlock: number = 0;

    constructor(
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
            this.policyEngineService.loadPolicy(policyId)
        ]).subscribe((data: any) => {
            const schemes = data[0] || [];
            const tokens = data[1] || [];
            const policy = data[2];
            this.schemes = Schema.mapRef(schemes) || [];
            this.schemes = this.schemes.filter(s=>s.status == SchemaStatus.PUBLISHED);
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
        policy.policyPoles = policy.policyPoles || [];
        policy.config = policy.config || {
            blockType: 'interfaceContainerBlock',
        };
        const root = policy.config;
        this.currentView = 'blocks';
        this.readonly = policy.status == 'PUBLISH';
        this.policy = policy;
        this.permissions = allPermissions;
        this.setBlocks(root);
        this.indexBlock = this.allBlocks.length + 1;
    }

    setBlocks(root: BlockNode) {
        this.root = root;
        this.blocks = [root];
        this.currentBlock = root;
        this.allBlocks = this.all(root, []);
        this.allBlocks.forEach((b => {
            if (!b.id) b.id = this.generateUUIDv4();
        }))
    }

    all(block: BlockNode, allBlocks: BlockNode[]) {
        allBlocks.push(block);
        if (block.children) {
            for (let index = 0; index < block.children.length; index++) {
                const element = block.children[index];
                this.all(element, allBlocks);
            }
        }
        return allBlocks;
    }

    onSelect(block: BlockNode) {
        this.currentBlock = block;
        return false;
    }

    onAdd(type: string) {
        if (this.currentBlock) {
            this.currentBlock.children = this.currentBlock.children || [];
            const newBlock: BlockNode = {
                id: this.generateUUIDv4(),
                tag: `Block${this.indexBlock}`,
                blockType: type,
                children: []
            };
            this.currentBlock.children.push(newBlock);
            this.setBlocks(this.blocks[0]);
            this.currentBlock = newBlock;
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
            if(element.id == block.id) {
                blocks.splice(index, 1);
                return blocks;
            }
            if(element.children) {
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

    generateUUIDv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async savePolicy() {
        await this.onView('blocks');
        const root = this.blocks[0];
        if (root) {
            this.loading = true;
            this.policy.config = root;
            this.policyEngineService.savePolicy(this.policyId, this.policy).subscribe((policy) => {
                this.setPolicy(policy);
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    publishPolicy() {
        this.loading = true;
        this.policyEngineService.publishPolicy(this.policyId).subscribe((policies: any) => {
            this.loadPolicy();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    saveAsPolicy() {
        const dialogRef = this.dialog.open(NewPolicyDialog, {
            width: '500px',
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                const policy = Object.assign({}, this.policy, result);
                delete policy.id;
                delete policy.status;
                delete policy.owner;
                this.policyEngineService.createPolicy(policy).subscribe((policies: any) => {
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
        } else {
            this.colGroup2 = !this.colGroup2;
        }
    }

    async onView(type: string) {
        if (type == this.currentView) {
            return;
        }

        this.loading = true;
        if (type == 'blocks') {
            let root = null;
            try {
                if (this.currentView == 'json') {
                    root = await this.jsonToObject(this.code);
                }
                if (this.currentView == 'yaml') {
                    root = await this.yamlToObject(this.code);
                }
            } catch (error) {
                console.error(error)
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
                    code = await this.objectToJson(this.root);
                }
                if (this.currentView == 'yaml') {
                    code = await this.yamlToJson(this.code);
                }
            } catch (error) {
                console.error(error)
                this.loading = false;
                return;
            }
            this.code = code;
        }
        if (type == 'yaml') {
            let code = "";
            try {
                if (this.currentView == 'blocks') {
                    code = await this.objectToYaml(this.root);
                }
                if (this.currentView == 'json') {
                    code = await this.jsonToYaml(this.code);
                }
            } catch (error) {
                console.error(error)
                this.loading = false;
                return;
            }
            this.code = code;
        }
        this.currentView = type;
        this.loading = false;
    }

    async objectToJson(root: any): Promise<string> {
        return JSON.stringify(root, null, 2);
    }

    async jsonToObject(json: string): Promise<any> {
        return JSON.parse(json);
    }

    async objectToYaml(root: any): Promise<string> {
        return new Promise((resolve, reject) => {
            this.policyEngineService.toYAML(root).subscribe((data: any) => {
                resolve(data.yaml);
            }, (e) => {
                reject();
            });
        });
    }

    async yamlToObject(yaml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.policyEngineService.fromYAML(yaml).subscribe((data: any) => {
                resolve(data.json);
            }, (e) => {
                reject();
            });
        });
    }

    async yamlToJson(yaml: string): Promise<string> {
        const root = await this.yamlToObject(yaml);
        return await this.objectToJson(root);
    }

    async jsonToYaml(json: string): Promise<string> {
        const root = await this.jsonToObject(json);
        return await this.objectToYaml(root);
    }

    getIcon(blockType: string) {
        if (blockType == 'interfaceContainerBlock') {
            return 'tab';
        }
        if (blockType == 'interfaceDocumentsSource') {
            return 'table_view';
        }
        if (blockType == 'informationBlock') {
            return 'info';
        }
        if (blockType == 'requestVcDocument') {
            return 'dynamic_form';
        }
        if (blockType == 'sendToGuardian') {
            return 'send';
        }
        if (blockType == 'interfaceAction') {
            return 'flash_on';
        }
        if (blockType == 'interfaceStepBlock') {
            return 'vertical_split';
        }
        if (blockType == 'mintDocument') {
            return 'paid';
        }
        if (blockType == 'externalDataBlock') {
            return 'cloud';
        }
        return 'code'
    }
}
