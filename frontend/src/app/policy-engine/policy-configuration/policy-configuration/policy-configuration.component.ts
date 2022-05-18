import { Component, HostListener, OnInit } from '@angular/core';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaHelper, SchemaStatus, Token } from 'interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TokenService } from 'src/app/services/token.service';
import { BlockGroup, RegisteredBlocks } from '../../registered-blocks';
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
    copy(event: ClipboardEvent) {
        if (this.currentBlock
            && this.copyBlocksMode
            && this.currentView === 'blocks'
            && !this.readonly) {
            event.preventDefault();
            navigator.clipboard.writeText(JSON.stringify(this.currentBlock));
        }
    }

    @HostListener('document:paste', ['$event'])
    paste(evt: ClipboardEvent) {
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
    blockToCopy?: BlockNode;
    copyBlocksMode: boolean = false;
    groupBlocks: any = {
        Main: [],
        Documents: [],
        Tokens: [],
        Calculate: [],
        Report: [],
        UnGroupedBlocks: []
    };
    allEvents: any[] = [];

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

        (window as any)._render = () => {
            const events = this.allEvents;
            debugger;

            const all = document.querySelectorAll(`*[block-instance]`);
            let maxRight = 0;
            for (let i = 0; i < all.length; i++) {
                const element = all[i];
                const box = element.getBoundingClientRect();
                maxRight = Math.max(maxRight, box.right);
            }
            maxRight = maxRight + 50;
            const mapRight: any = {};

            const canvas = document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0px';
            canvas.style.left = '0px';
            document.body.appendChild(canvas);
            const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // function drawArrow(
            //     ctx: CanvasRenderingContext2D,
            //     points: number[],
            //     arrowWidth: number,
            //     color: string
            // ) {
            //     var headlen = 7;
            //     ctx.save();
            //     ctx.strokeStyle = color;
            //     ctx.beginPath();
            //     for (let i = 0; i < points.length; i++) {
            //         const fx = points[i];
            //         const fy = points[i + 1];
            //         const tx = points[i + 2];
            //         const ty = points[i + 3];

            //     }



            //     var angle = Math.atan2(toy - fromy, tox - fromx);




            //     ctx.moveTo(fromx, fromy);
            //     ctx.lineTo(tox, toy);
            //     ctx.lineWidth = arrowWidth;
            //     ctx.stroke();
            //     ctx.beginPath();
            //     ctx.moveTo(tox, toy);
            //     ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7),
            //         toy - headlen * Math.sin(angle - Math.PI / 7));
            //     ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 7),
            //         toy - headlen * Math.sin(angle + Math.PI / 7));
            //     ctx.lineTo(tox, toy);
            //     ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 7),
            //         toy - headlen * Math.sin(angle - Math.PI / 7));
            //     ctx.stroke();
            //     ctx.restore();
            // }

            for (const event of events) {
                const divStart = document.querySelector(`*[block-instance="${event.source?.tag}"]`);
                const divStop = document.querySelector(`*[block-instance="${event.target?.tag}"]`);
                if (divStart && divStop) {
                    const boxStart = divStart.getBoundingClientRect();
                    const boxStop = divStop.getBoundingClientRect();
                    const left = Math.min(boxStart.right, boxStop.right);
                    const top = Math.min(boxStart.top, boxStop.top);
                    const bottom = Math.max(boxStart.top, boxStop.top);
                    const right = Math.max(boxStart.right, boxStop.right);
                    const isTop = boxStart.top > boxStop.top;

                    let topPosition = top + 16;
                    let width = right - left + 50;
                    let height = bottom - top;
                    let offset = 8;
                    if (isTop) {
                        topPosition = topPosition - offset;
                        height = height + 2 * offset;
                    } else {
                        topPosition = topPosition + offset;
                        height = height - 2 * offset;
                    }

                    let r = left + width;
                    if (r < maxRight) {
                        r = maxRight;
                    }
                    while (mapRight[r]) {
                        r = r + 5;
                    }
                    mapRight[r] = true;
                    width = r - left;

                    const w = 1;
                    const start = (isTop ? boxStop.right : boxStart.right) - left;
                    const end = (isTop ? boxStart.right : boxStop.right) - left;
                    const polygon: string = `polygon(
                        ${start}px 0px, 
                        ${width}px 0px, 
                        ${width}px ${height}px, 
                        ${end}px ${height}px, 
                        ${end}px ${height - w}px, 
                        ${width - w}px ${height - w}px, 
                        ${width - w}px ${w}px, 
                        ${start}px ${w}px 
                    )`;
                    const div = document.createElement('div');
                    div.style.position = 'absolute';
                    div.style.top = `${topPosition}px`;
                    div.style.left = `${left + 30}px`;
                    div.style.height = `${height}px`;
                    div.style.width = `${width}px`;
                    div.style.zIndex = '999';
                    // div.style.shapeOutside = polygon;
                    div.style.clipPath = polygon;
                    div.style.background = '#000';
                    document.body.appendChild(div);
                }
            }
        }
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
            this.tokenService.getTokens(),
            this.policyEngineService.blockAbout(),
            this.policyEngineService.policy(policyId)
        ]).subscribe((data: any) => {
            const tokens = data[0] || [];
            const blockAbout = data[1] || {};
            const policy = data[2];

            this.registeredBlocks.registerConfig(blockAbout);

            this.tokens = tokens.map((e: any) => new Token(e));
            this.setPolicy(policy);
            if (!policy) {
                setTimeout(() => { this.loading = false; }, 500);
                return;
            }

            if (!this.compareStateAndConfig(this.objectToJson(policy?.config)) && !this.readonly) {
                const applyChanesDialog = this.dialog.open(ConfirmationDialogComponent, {
                    data: {
                        dialogTitle: "Apply latest changes",
                        dialogText: "Do you want to apply latest changes?"
                    },
                    disableClose: true
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
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.codeMirrorOptions.readOnly = this.readonly;
    }

    setBlocks(root: BlockNode) {
        this.root = root;
        this.blocks = [root];
        this.onSelect(this.root);

        const tagMap: any = {};
        this.allEvents = [];
        this.allBlocks = this.all(root);
        this.allBlocks.forEach((b => {
            if (!b.id) {
                b.id = this.registeredBlocks.generateUUIDv4();
            };
            if (!b.events) {
                b.events = [];
            }
            b.events.forEach(((e: any) => {
                this.allEvents.push({ ...e });
            }));
            tagMap[b.tag] = b;
        }));


        this.allEvents.forEach(((e: any) => {
            if (!e.id) {
                e.id = this.registeredBlocks.generateUUIDv4();
            };
            if (e.source) {
                e.source = tagMap[e.source];
            }
            if (e.target) {
                e.target = tagMap[e.target];
            }
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
        const allowedChildren = this.registeredBlocks.getAllowedChildren(block.blockType);
        const groupBlocks: any = {};
        const unGroupedBlocks: any[] = [];
        for (const key in BlockGroup) {
            this.groupBlocks[key] = [];
        }

        for (let i = 0; i < allowedChildren.length; i++) {
            const allowedChild = allowedChildren[i];
            const type = allowedChild.type;
            if (!allowedChild.group) {
                allowedChild.group = this.registeredBlocks.getGroup(allowedChild.type);
            }
            if (!allowedChild.header) {
                allowedChild.header = this.registeredBlocks.getHeader(allowedChild.type);
            }
            if (!groupBlocks[allowedChild.group]) {
                groupBlocks[allowedChild.group] = {};
            }
            if (allowedChild.group === BlockGroup.UnGrouped) {
                unGroupedBlocks.push({
                    type: type,
                    icon: this.registeredBlocks.getIcon(type),
                    name: this.registeredBlocks.getName(type),
                    title: this.registeredBlocks.getTitle(type)
                });
                continue;
            }
            if (!groupBlocks[allowedChild.group][allowedChild.header]) {
                groupBlocks[allowedChild.group][allowedChild.header] = [];
            }
            groupBlocks[allowedChild.group][allowedChild.header].push({
                type: type,
                icon: this.registeredBlocks.getIcon(type),
                name: this.registeredBlocks.getName(type),
                title: this.registeredBlocks.getTitle(type)
            });
        }

        const groupBlockKeys = Object.keys(groupBlocks);
        for (let i = 0; i < groupBlockKeys.length; i++) {
            const groupName = groupBlockKeys[i];
            const groupsWithHeaders = groupBlocks[groupName];
            const groupsWithHeadersKeys = Object.keys(groupsWithHeaders);
            for (let j = 0; j < groupsWithHeadersKeys.length; j++) {
                const subGroupName = groupsWithHeadersKeys[j];
                const subGroupElements = groupsWithHeaders[groupsWithHeadersKeys[j]];
                this.groupBlocks[groupName].push({
                    name: subGroupName
                });
                this.groupBlocks[groupName] = this.groupBlocks[groupName].concat(subGroupElements);
            }
        }

        this.groupBlocks.unGroupedBlocks = unGroupedBlocks;
        return false;
    }

    prepareChildrenBlockToCopy(blocks: BlockNode[]) {
        if (!blocks) {
            return;
        }

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            block.id = this.registeredBlocks.generateUUIDv4();
            block.tag = this.getNewTag();
            this.prepareChildrenBlockToCopy(block.children);
        }
    }

    onCopyBlock(block?: BlockNode) {
        if (this.currentBlock && block) {
            block.id = this.registeredBlocks.generateUUIDv4();
            block.tag = this.getNewTag();
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
            const newBlock = this.registeredBlocks.newBlock(type, permissions);
            newBlock.tag = this.getNewTag();
            this.currentBlock.children.push(newBlock);
            this.setBlocks(this.blocks[0]);
            this.saveState();
        }
    }

    getNewTag(): string {
        const nameMap: any = {};
        for (let block of this.allBlocks) {
            nameMap[block.tag] = true;
        }
        let name = 'Block';
        for (let i = 1; i < 1000; i++) {
            name = `Block_${i}`;
            if (!nameMap[name]) {
                return name;
            }
        }
        return 'Block';
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

    async loadState(states?: any, number?: number) {
        let stateValues = states || (localStorage[this.policyId] && JSON.parse(localStorage[this.policyId]));
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
            stateValue.slice(0, stateValue.length - this._undoDepth - 1);
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
            this.onSelect(this.root);
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

    updateEvents() {
        this.allBlocks.forEach((b) => {
            const events = b.events || [];
            b.events = [];
            for (let event of events) {
                const e = this.allEvents.find((e: any) => e.id == event.id);
                if (e) {
                    const event = {
                        id: e.id,
                        source: e.source ? e.source.tag : "",
                        target: e.target ? e.target.tag : "",
                        output: e.output || "",
                        input: e.input || "",
                        disabled: !!e.disabled,
                    };
                    if (event.source == b.tag || event.target == b.tag) {
                        b.events.push(event)
                    }
                }
            }
        });
    }

    async onView(type: string) {
        this.updateEvents();

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
