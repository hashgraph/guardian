import { BlockErrorActions, DocumentSignature, DocumentStatus, PolicyStatus } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common';
import { BlockData, BlockResult, IDebugContext } from './block-result.js';
import { IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { EventActor, IPolicyEvent, PolicyLink } from '../interfaces/index.js';
import { PolicyUser } from '../policy-user.js';
import { DebugComponentsService } from './debug-components-service.js';

/**
 * Block Validator
 */
export class BlockEngine {
    public readonly policyId: string;
    private readonly result: BlockResult;
    private instance: IPolicyBlock;
    private inputEvents: Map<string, Function>;
    private outputEvents: Set<string>;
    private outputObject: any;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.result = {
            input: {
                documents: []
            },
            output: [],
            errors: [],
            logs: []
        }
    }

    public addLog(message: string) {
        this.result.logs.push(String(message));
    }

    public addError(message: string) {
        this.result.errors.push(message);
    }

    public setInput(doc: IDebugContext) {
        this.result.input = doc;
    }

    public getInput(): IDebugContext {
        return this.result.input;
    }

    public setOutput(doc: any) {
        this.result.output = doc;
    }

    public getResult(): BlockResult {
        return this.result;
    }

    public stop() {
        this.outputObject?.resolve();
    }

    public error(error?: string) {
        this.outputObject?.reject(error);
    }

    private async getBlockRoot(id: string) {
        const policy = await DatabaseServer.getPolicyById(id);
        if (policy) {
            return policy;
        }
        const tool = await DatabaseServer.getToolById(id);
        if (tool) {
            return tool;
        }
        const module = await DatabaseServer.getModuleById(id);
        return module;
    }

    public async build(config: any): Promise<IPolicyBlock> {
        this.addLog('Building...')
        try {

            const parent = await this.getBlockRoot(this.policyId);
            const { tools } = await PolicyComponentsUtils.RegeneratePolicy(parent);
            parent.status = PolicyStatus.DRY_RUN;

            const components = new DebugComponentsService(parent, this.policyId, this);
            await components.registerPolicy(parent);
            for (const tool of tools) {
                await components.registerTool(tool);
            }
            this.instance = await PolicyComponentsUtils.BuildInstance(
                parent,
                this.policyId,
                config,
                null,
                components,
                []
            )
            if (this.instance) {
                if (this.instance.options) {
                    this.instance.options.onErrorAction = BlockErrorActions.DEBUG;
                } else {
                    this.instance.options = { onErrorAction: BlockErrorActions.DEBUG };
                }
            }

            this.inputEvents = new Map<string, Function>();
            this.outputEvents = new Set<string>();
            for (const [type, callback] of this.instance.actions) {
                this.inputEvents.set(type, callback);
            }
            for (const type of this.instance.outputActions) {
                this.outputEvents.add(type);
            }
        } catch (error) {
            this.addError(error?.toString());
        }
        this.addLog('Done');

        return this.instance;
    }

    public async run(user: PolicyUser, data: BlockData): Promise<BlockResult> {
        this.addLog('Running...')
        try {
            if (!this.instance) {
                throw new Error('Invalid instance.');
            }
            if (!data) {
                throw new Error('Invalid data.');
            }
            const inputData = await this._getInputData(user, data);
            const timeoutPromise = new Promise<any>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Timeout exceed.`));
                }, 25 * 1000);
            });
            await Promise.race([
                this._run(user, data, inputData),
                timeoutPromise
            ]);
        } catch (error) {
            this.addError(error?.toString());
        }
        return this.getResult();
    }

    private async _getInputData(user: PolicyUser, data: BlockData): Promise<IPolicyDocument[]> {
        if (data.type === 'history') {
            const item = await DatabaseServer.getDebugContext(data.document);
            if (item && item.policyId === this.policyId && item.document) {
                const context = item.document;
                this.setInput(context);
                return context.documents;
            } else {
                throw new Error('Invalid history.');
            }
        } else {
            const docs: IPolicyDocument[] = this._getDocuments(user, data);
            this.setInput({ documents: docs });
            return docs;
        }
    }

    private _getDocuments(user: PolicyUser, data: BlockData): IPolicyDocument[] {
        const document = data?.document;
        if (!document) {
            throw new Error('Invalid document.');
        }
        if (Array.isArray(document)) {
            const docs: IPolicyDocument[] = [];
            for (const d of document) {
                const doc = this._getDocument(user, d);
                docs.push(doc);
            }
            return docs;
        } else {
            const doc = this._getDocument(user, document);
            return [doc];
        }
    }

    private _getDocument(user: PolicyUser, document: any): IPolicyDocument {
        if (document.document) {
            document = document.document
        }

        if (document.credentialSubject) {
            return this._createVcDocument(user, document);
        } else {
            const vc = this._createVc(user, document);
            return this._createVcDocument(user, vc);
        }
    }

    private _createVcDocument(user: PolicyUser, vc: any): IPolicyDocument {
        return {
            policyId: this.policyId,
            tag: 'test',
            hash: '',
            document: vc,
            owner: user.did,
            group: user.group,
            hederaStatus: DocumentStatus.NEW,
            signature: DocumentSignature.NEW
        };
    }

    private _createVc(user: PolicyUser, json: any): any {
        const date = (new Date()).toISOString();
        return {
            'id': 'urn:uuid:00000000-0000-0000-0000-000000000000',
            'type': ['VerifiableCredential'],
            'issuer': user.did,
            'issuanceDate': date,
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            'credentialSubject': [json],
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': date,
                'verificationMethod': user.did + '#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': '...'
            }
        }
    }

    private async _run(user: PolicyUser, data: BlockData, doc: IPolicyDocument[]) {
        const callback = this.inputEvents.get(data.input);
        if (!callback) {
            throw new Error('Invalid input event type.');
        }

        if (!this.outputEvents.has(data.output)) {
            throw new Error('Invalid output event type.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.outputObject = { resolve, reject };
                const outputFunction: any = function (outputEvent: IPolicyEvent<IPolicyEventState>) {
                    this.setOutput(outputEvent.data?.data);
                    this.addLog('Done');
                    this.stop();
                }
                const link = new PolicyLink(
                    null,
                    data.output,
                    this.instance,
                    this as any,
                    EventActor.EventInitiator,
                    outputFunction
                );
                this.instance.addSourceLink(link);
                const event: IPolicyEvent<IPolicyEventState> = {
                    type: data.input,
                    inputType: data.input,
                    outputType: null,
                    policyId: this.policyId,
                    source: null,
                    sourceId: null,
                    target: null,
                    targetId: null,
                    user,
                    data: {
                        data: doc
                    }
                };
                callback.call(this.instance, event);
            } catch (error) {
                reject(error);
            }
        });
    }
}