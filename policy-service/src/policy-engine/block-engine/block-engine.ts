import { DatabaseServer } from "@guardian/common";
import { BlockData, BlockResult } from "./block-result.js";
import { ComponentsService } from '../helpers/components-service.js';
import { IPolicyBlock } from "../policy-engine.interface.js";
import { PolicyComponentsUtils } from "../policy-components-utils.js";
import { EventActor, PolicyLink } from "../interfaces/index.js";
import { PolicyUser } from "../policy-user.js";

/**
 * Block Validator
 */
export class BlockEngine {
    public readonly policyId: string;
    private instance: IPolicyBlock;
    private result: BlockResult;
    private inputEvents: Map<string, Function>;
    private outputEvents: Set<string>;

    constructor(policyId: string) {
        this.policyId = policyId;
        this.result = {
            input: [],
            output: [],
            errors: [],
            logs: []
        }
    }

    public async build(config: any): Promise<IPolicyBlock> {
        console.debug('----- 1 ');

        try {
            const policy = await DatabaseServer.getPolicyById(this.policyId);
            const { tools } = await PolicyComponentsUtils.RegeneratePolicy(policy);
            const components = new ComponentsService(policy, this.policyId);
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
            this.result.errors.push(error?.toString());
        }

        console.debug('----- 2 ');

        return this.instance;
    }

    public async run(user: PolicyUser, data: BlockData): Promise<BlockResult> {
        try {
            console.debug('----- 3 ', user);

            if (!this.instance) {
                throw new Error('Invalid instance.');
            }
            if (!data) {
                throw new Error('Invalid data.');
            }
            const doc = await this._getDocument(data);
            this.result.input = doc;
            await this._run(user, data, doc);
        } catch (error) {
            this.result.errors.push(error?.toString());
        }
        return this.result;
    }

    public getResult(): BlockResult {
        return this.result;
    }


    private async _getDocument(data: BlockData): Promise<any[]> {
        // let documents: any[];
        // if (Array.isArray(state.data)) {
        //     documents = state.data;
        // } else {
        //     documents = [state.data];
        // }
        return data.document;
    }


    private async _run(user: PolicyUser, data: BlockData, doc: any[]) {
        console.debug('----- 4 ');
        const callback = this.inputEvents.get(data.input);
        if (!callback) {
            throw new Error('Invalid input event type.');
        }

        if (!this.outputEvents.has(data.output)) {
            throw new Error('Invalid output event type.');
        }

        console.debug('----- 5 ');
        return new Promise((resolve, reject) => {
            try {
                const outputObject: any = { resolve, reject };
                const outputFunction: any = function (event: any) {
                    this.resolve();
                }
                const link = new PolicyLink(null, data.output, this.instance, outputObject, EventActor.EventInitiator, outputFunction);
                this.instance.addSourceLink(link);

                console.debug('----- 6 ');
                const event: any = {
                    type: data.input,
                    inputType: data.input,
                    outputType: null,
                    policyId: this.policyId,
                    source: null,
                    sourceId: null,
                    target: null,
                    targetId: null,
                    user,
                    data: doc
                };
                callback.call(this.instance, event);
            } catch (error) {
                reject(error);
            }
        });
    }
}