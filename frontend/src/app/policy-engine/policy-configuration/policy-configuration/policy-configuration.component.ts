import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { BlockNode } from '../../helpers/tree-data-source/tree-data-source';
import { SchemaService } from 'src/app/services/schema.service';
import { Schema, SchemaHelper, SchemaStatus, Token } from '@guardian/interfaces';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { forkJoin, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TokenService } from 'src/app/services/token.service';
import { RegisteredBlocks } from '../../registered-blocks';
import { BlockGroup } from "../../structures/types/block-group.type";
import { PolicyAction, SavePolicyDialog } from '../../helpers/save-policy-dialog/save-policy-dialog.component';
import { SetVersionDialog } from 'src/app/schema-engine/set-version-dialog/set-version-dialog.component';
import * as yaml from 'js-yaml';
import { Clipboard } from '@angular/cdk/clipboard';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { EventsOverview } from '../../helpers/events-overview/events-overview';
import { PolicyBlockModel, PolicyModel } from '../../structures/policy-model';
import { PolicyStorage } from '../../structures/policy-storage';
import { TreeFlatOverview } from '../../helpers/tree-flat-overview/tree-flat-overview';
import { SaveBeforeDialogComponent } from '../../helpers/save-before-dialog/save-before-dialog.component';
import { TasksService } from 'src/app/services/tasks.service';
import { InformService } from 'src/app/services/inform.service';

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
    styleUrls: ['./policy-configuration.component.css']
})
export class PolicyConfigurationComponent implements OnInit {
    loading: boolean = true;
    policyModel: PolicyModel;
    currentBlock: PolicyBlockModel | undefined;
    newBlockType: string;
    readonly!: boolean;
    currentView: string = 'blocks';
    code!: string;

    schemas!: Schema[];
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
    eventVisible: string = 'All';
    eventsOverview!: EventsOverview;
    treeFlatOverview!: TreeFlatOverview;
    policyStorage: PolicyStorage;

    operationMode: OperationMode = OperationMode.none;
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;

    constructor(
        public registeredBlocks: RegisteredBlocks,
        private schemaService: SchemaService,
        private tokenService: TokenService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
        private taskService: TasksService,
        private informService: InformService
    ) {
        this.newBlockType = 'interfaceContainerBlock';
        this.policyModel = new PolicyModel();
        this.policyStorage = new PolicyStorage(localStorage);
    }

    private get hasChanges() {
        return this.policyStorage.isUndo;
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
            this.policyModel = new PolicyModel();
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

            if (!this.policyModel.valid) {
                setTimeout(() => { this.loading = false; }, 500);
                return;
            }

            this.schemaService.getSchemas(this.policyModel.topicId).subscribe((data2: any) => {
                const schemas = data2 || [];
                this.schemas = SchemaHelper.map(schemas) || [];
                this.schemas.unshift({ type: "" } as any);
                setTimeout(() => { this.loading = false; }, 500);
            }, (e) => {
                this.loading = false;
                console.error(e.error);
            });

            this.policyStorage.load(this.policyModel.id);
            this.checkState();
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    setPolicy(policy: any) {
        if (!policy) {
            this.policyModel = new PolicyModel();
            return;
        }
        this.policyModel = new PolicyModel(policy);
        this.currentView = 'blocks';
        this.readonly = this.policyModel.readonly;
        this.errors = [];
        this.errorsCount = -1;
        this.errorsMap = {};
        this.codeMirrorOptions.readOnly = this.readonly;
        this.onSelect(this.policyModel.root);
        this.policyModel.subscribe(() => {
            this.saveState();
            setTimeout(() => {
                if (this.eventsOverview) {
                    this.eventsOverview.render();
                }
            }, 10);
        })
        if (this.treeFlatOverview) {
            this.treeFlatOverview.selectItem(this.currentBlock);
        }
    }

    updateTopMenu(block?: PolicyBlockModel) {
        if (!block) {
            return;
        }

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
    }

    public onInitViewer(event: EventsOverview) {
        this.eventsOverview = event;
    }

    public onInitTree(event: TreeFlatOverview) {
        this.treeFlatOverview = event;
    }

    public onSelect(block: any) {
        this.currentBlock = this.policyModel.getBlock(block);
        this.policyModel.checkChange();
        this.updateTopMenu(this.currentBlock)
        return false;
    }

    public onAdd(type: string) {
        this.currentBlock = this.policyModel.getBlock(this.currentBlock);
        if (this.currentBlock) {
            const newBlock = this.registeredBlocks.newBlock(type as any);
            newBlock.tag = this.policyModel.getNewTag();
            this.currentBlock.createChild(newBlock);
        }
    }

    public onDelete(block: BlockNode) {
        this.policyModel.removeBlock(block);
        this.onSelect(this.policyModel.root);
        if (this.treeFlatOverview) {
            this.treeFlatOverview.selectItem(this.currentBlock);
        }
        return false;
    }

    public onReorder(blocks: BlockNode[]) {
        const root = blocks[0];
        if (root) {
            this.policyModel.rebuild(root.getJSON());
        } else {
            this.policyModel.rebuild();
        }
        this.onSelect(this.policyModel.root);
        if (this.treeFlatOverview) {
            this.treeFlatOverview.selectItem(this.currentBlock);
        }
    }

    public onColGroup(n: number) {
        if (n == 1) {
            this.colGroup1 = !this.colGroup1;
        } else if (n == 2) {
            this.colGroup2 = !this.colGroup2;
        } else {
            this.colGroup3 = !this.colGroup3;
        }
    }

    onTreeChange(event: any) {
        setTimeout(() => {
            if (this.eventsOverview) {
                this.eventsOverview.render();
            }
        }, 10);
    }

    onShowEvent(type: string) {
        this.eventVisible = type;
    }

    onView(type: string) {
        this.loading = true;
        setTimeout(() => {
            this.chanceView(type);
            this.loading = false;
        }, 0);
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

    public savePolicy() {
        this.doSavePolicy().subscribe();
    }

    public tryPublishPolicy() {
        if (this.hasChanges) {
            const dialogRef = this.dialog.open(SaveBeforeDialogComponent, {
                width: '500px',
                autoFocus: false,
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    this.doSavePolicy().subscribe(() => {
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
                    this.doSavePolicy().subscribe(() => {
                        this.dryRunPolicy();
                    });
                }
            });
        } else {
            this.dryRunPolicy();
        }
    }

    private doSavePolicy(): Observable<void> {
        return new Observable<void>(subscriber => {
            this.chanceView('blocks');
            const root = this.policyModel.getJSON();
            if (root) {
                this.loading = true;
                this.policyEngineService.update(this.policyId, root).subscribe((policy) => {
                    this.setPolicy(policy);
                    this.clearState();
                    this.loading = false;
                    subscriber.next();
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
            }
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

            this.onSelect(this.policyModel.root);
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
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

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        console.error(error.error);
        this.loading = false;
        this.taskId = undefined;
    }

    onAsyncCompleted() {
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

    private checkState() {
        if (!this.readonly &&
            !this.compareState(
                this.policyModel.getJSON(),
                this.policyStorage.current
            )
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

    onCopyBlock(block?: any) {
        if (this.currentBlock && block) {
            this.currentBlock.copyChild(block);
        }
    }

    @HostListener('document:copy', ['$event'])
    copy(event: ClipboardEvent) {
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
}
