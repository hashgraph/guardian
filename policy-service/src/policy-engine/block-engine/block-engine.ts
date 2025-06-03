import { DatabaseServer, Policy as PolicyCollection } from "@guardian/common";
import { BlockData, BlockResult } from "./block-result.js";
import { ComponentsService } from '../helpers/components-service.js';
import { IPolicyBlock, IPolicyDocument, IPolicyEventState } from "../policy-engine.interface.js";
import { PolicyComponentsUtils } from "../policy-components-utils.js";
import { EventActor, IPolicyEvent, PolicyLink } from "../interfaces/index.js";
import { PolicyUser } from "../policy-user.js";
import { DocumentSignature, DocumentStatus } from "@guardian/interfaces";

class DebugComponentsService extends ComponentsService {
    private controller: BlockEngine;

    constructor(policy: PolicyCollection, policyId: string, controller: BlockEngine) {
        super(policy, policyId);
        this.controller = controller;
    }

    /**
     * Write log message
     * @param message
     * @protected
     */
    public override info(message: string, attributes: string[] | null, userId?: string | null) {
        this.controller.addLog(message);
    }

    /**
     * Write error message
     * @param message
     * @protected
     */
    public override error(message: string, attributes: string[] | null, userId?: string | null) {
        this.controller.addError(message);
        this.controller.stop();
    }

    /**
     * Write warn message
     * @param message
     * @protected
     */
    public override warn(message: string, attributes: string[] | null, userId?: string | null) {
        this.controller.addLog(message);
    }

    /**
     * Write debug message
     * @param message
     * @protected
     */
    public override debug(message: any) {
        if (message) {
            if (typeof message === 'string') {
                this.controller.addLog(message);
            } else {
                this.controller.addLog(JSON.stringify(message));
            }
        }
    }
}

/**
 * Block Validator
 */
export class BlockEngine {
    public readonly policyId: string;
    private instance: IPolicyBlock;
    private result: BlockResult;
    private inputEvents: Map<string, Function>;
    private outputEvents: Set<string>;
    private outputObject: any;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.result = {
            input: [],
            output: [],
            errors: [],
            logs: []
        }
    }

    public addLog(message: string) {
        this.result.logs.push(message);
    }

    public addError(message: string) {
        this.result.errors.push(message);
    }

    public setInput(doc: any) {
        this.result.input = doc;
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

    public async build(config: any): Promise<IPolicyBlock> {
        this.addLog('Building...')
        try {
            const policy = await DatabaseServer.getPolicyById(this.policyId);
            const { tools } = await PolicyComponentsUtils.RegeneratePolicy(policy);
            const components = new DebugComponentsService(policy, this.policyId, this);
            await components.registerPolicy(policy);
            for (const tool of tools) {
                await components.registerTool(tool);
            }
            this.instance = await PolicyComponentsUtils.BuildInstance(
                policy,
                this.policyId,
                config,
                null,
                components,
                []
            )

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
            const docs: IPolicyDocument[] = this._getDocuments(user, data);
            this.setInput(docs);
            await this._run(user, data, docs);
        } catch (error) {
            this.addError(error?.toString());
        }
        return this.getResult();
    }

    private _getDocuments(user: PolicyUser, data: BlockData): IPolicyDocument[] {
        let document = data?.document;
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
            "id": "urn:uuid:00000000-0000-0000-0000-000000000000",
            "type": ["VerifiableCredential"],
            "issuer": user.did,
            "issuanceDate": date,
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "credentialSubject": [json],
            "proof": {
                "type": "Ed25519Signature2018",
                "created": date,
                "verificationMethod": user.did + "#did-root-key",
                "proofPurpose": "assertionMethod",
                "jws": "..."
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
                const outputFunction: any = function (event: IPolicyEvent<IPolicyEventState>) {
                    this.setOutput(event.data?.data);
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