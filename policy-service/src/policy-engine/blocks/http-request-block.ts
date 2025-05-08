import { BasicBlock } from '../helpers/decorators/basic-block.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ActionCallback } from '../helpers/decorators/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { PolicyUtils } from '../helpers/utils.js';
import { VcDocumentDefinition as VcDocument, VcHelper, Workers } from '@guardian/common';
import { LocationType, WorkerTaskType } from '@guardian/interfaces';
import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Http request block
 */
@BasicBlock({
    blockType: 'httpRequestBlock',
    actionType: LocationType.REMOTE,
    commonBlock: false,
    about: {
        label: 'Request data',
        title: `Add 'Request Data' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: []
})
export class HttpRequestBlock {

    /**
     * Get object property by path
     * @param obj
     * @param fieldPath
     * @private
     */
    private getFieldByPath(obj: any, fieldPath: string): string {
        const fieldPathArray = fieldPath.split('.');

        let currentValue = obj;

        let currentField = fieldPathArray.shift();
        while (currentField) {
            if (currentValue === undefined) {
                currentValue = '';
                break;
            }
            currentValue = currentValue[currentField];
            currentField = fieldPathArray.shift();
        }

        return currentValue;
    }

    /**
     * Replace variables to values in string
     * @param input
     * @param variablesObj
     * @private
     */
    private replaceVariablesInString(input: string, variablesObj: any): string {
        let result = input;
        const regExp = /\$\{.+?\}/gm;
        let variableItem = regExp.exec(input);
        while (variableItem !== null) {
            const variable = variableItem[0];
            const varPath = variable.substr(2, variable.length - 3);

            const variableValue = this.getFieldByPath(variablesObj, varPath);
            result = result.replace(variable, variableValue)

            variableItem = regExp.exec(input);
        }
        return result;
    }

    private validateProtocol(url: string): void {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol.replace(':', '').toLowerCase();

        const raw = process.env.ALLOWED_PROTOCOLS || '';
        const allowedProtocols = raw
            .split(',')
            .map(p => p.trim().toLowerCase())
            .filter(Boolean);

        if (!allowedProtocols.includes(protocol)) {
            throw new Error(
                `Protocol "${parsedUrl.protocol}" is not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`
            );
        }
    }

    private isPrivateIP(ip: string, family: number): boolean {
        if (family === 4) {
            const octets = ip.split('.').map(Number);
            if (octets.length !== 4 || octets.some(o => isNaN(o))) {
                return false;
            }

            const [a, b] = octets;
            return (
                a === 10 ||
                (a === 172 && b >= 16 && b <= 31) ||
                (a === 192 && b === 168) ||
                a === 127 ||
                (a === 169 && b === 254)
            );
        }

        if (family === 6) {
            const normalized = ip.toLowerCase();

            return (
                normalized === '::1' ||
                normalized.startsWith('fc') ||
                normalized.startsWith('fd') ||
                normalized.startsWith('fe80')
            );
        }

        return false;
    }

    private async validatePrivateIp(url: string): Promise<void> {
        const blockPrivate = process.env.BLOCK_PRIVATE_IP === 'true';
        if (!blockPrivate) {
            return;
        }

        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;

        const directFamily = net.isIP(hostname);
        if (directFamily) {
            if (this.isPrivateIP(hostname, directFamily)) {
                throw new Error(`Blocked request to private IP address: ${hostname}`);
            }
            return;
        }

        try {
            const { address, family } = await dns.lookup(hostname);
            if (this.isPrivateIP(address, family)) {
                throw new Error(`Blocked request to private IP address: ${address}`);
            }
        } catch (error) {
            throw new Error(`Failed to resolve host "${hostname}": ${error.message}`);
        }
    }

    /**
     * Request document
     * @param method
     * @param url
     * @param headers
     * @param body
     * @param userId
     */
    async requestDocument(method, url, headers, body, userId: string | null): Promise<VcDocument> {
        this.validateProtocol(url);
        await this.validatePrivateIp(url)

        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        const res = await new Workers().addNonRetryableTask({
            type: WorkerTaskType.HTTP_REQUEST,
            data: {
                payload: { method, url, headers, body, userId, maxRedirects: 0 }
            }
        }, 10);
        if (!res) {
            throw new Error('Invalid response');
        }

        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const result = await VCHelper.verifySchema(res);
            verify = result.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(res);
            }
        } catch (error) {
            ref.error(`Verify VC: ${PolicyUtils.getErrorMessage(error)}`)
            verify = false;
        }

        if (!verify) {
            throw new Error('Received data is not VC');
        }

        return VcDocument.fromJsonTree(res);
    }

    /**
     * Action callback
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
        event.data.data = event.data.data || {};

        const variablesObj: any = {
            did: event?.user?.did,
            username: event?.user.username
        }

        let inputObject;
        if (Array.isArray(event.data?.data)) {
            variablesObj.documents = inputObject = (event?.data?.data as IPolicyDocument[])?.map(i => i.document);
        } else {
            variablesObj.document = inputObject = (event?.data?.data as IPolicyDocument)?.document;
        }

        const method = ref.options.method;
        const url = this.replaceVariablesInString(ref.options.url, variablesObj);
        const headers = {};
        if (Array.isArray(ref.options.headers)) {
            for (const header of ref.options.headers) {
                headers[header.name] = this.replaceVariablesInString(header.value, variablesObj)
            }
        }
        const requestBody = this.replaceVariablesInString(JSON.stringify(inputObject), variablesObj);

        const doc = await this.requestDocument(method, url, headers, requestBody ? JSON.parse(requestBody) : undefined, event?.user?.userId);
        const item = PolicyUtils.createVC(ref, event.user, doc);

        const state: IPolicyEventState = { data: item };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, state);
        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                documents: ExternalDocuments(item)
            })
        );
        ref.backup();
    }
}
