import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ActionCallback } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { VcDocumentDefinition as VcDocument, VcHelper, Workers } from '@guardian/common';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Http request block
 */
@BasicBlock({
    blockType: 'httpRequestBlock',
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

    /**
     * Request document
     * @param method
     * @param url
     * @param headers
     * @param body
     */
    async requestDocument(method, url, headers, body): Promise<VcDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        const res = await new Workers().addNonRetryableTask({
            type: WorkerTaskType.HTTP_REQUEST,
            data: {
                payload: { method, url, headers, body }
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
            throw new Error('Document is not VC');
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

        const doc = await this.requestDocument(method, url, headers, requestBody ? JSON.parse(requestBody) : undefined);
        const item = PolicyUtils.createVC(ref, event.user, doc);

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, {data: item});
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, {data: item});
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments({data: item})
        }));
    }
}
