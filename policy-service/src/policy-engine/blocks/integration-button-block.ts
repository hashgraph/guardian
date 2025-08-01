import { EventBlock } from '../helpers/decorators/index.js';
import { LocationType, SchemaEntity, SchemaHelper, DocumentCategoryType } from '@guardian/interfaces';
import { IPolicyAddonBlock, IPolicyEventState, IPolicyGetData, IPolicyInterfaceBlock, AnyBlockType } from '../policy-engine.interface.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { generateConfigForIntegrationBlock, VcHelper, IntegrationServiceFactory, HederaDidDocument, VcDocumentDefinition, VcDocument } from '@guardian/common';
import { PolicyUtils } from '../helpers/utils.js';
import { FilterQuery } from '@mikro-orm/core';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'integrationButtonBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: generateConfigForIntegrationBlock(PropertyType, ChildrenType, ControlType, PolicyInputEventType, PolicyOutputEventType),
    variables: []
})
export class IntegrationButtonBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            integrationType: ref.options.integrationType || '',
            requestName: ref.options.requestName || '',
            buttonName: ref.options.buttonName
        }
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: PolicyUser, blockData: {
        /**
         * Document
         */
        document: any,
        /**
         * Tag
         */
        tag: any
    }): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        const requestNameSplited = ref.options.requestName.split('_');

        const params = {};

        Object.entries(ref.options.requestParams).forEach(([key, value]: [string, string]) => {
            if (key.startsWith('path_')) {
                const keyName = key.split('path_')[1];

                if (!params[keyName]) {
                    const valueFromPath = this.getFieldByPath(blockData, value);

                    if (valueFromPath) {
                        params[keyName] = valueFromPath;
                    }
                }
            } else {
                params[key] = value;
            }
        })

        const methodName = requestNameSplited[requestNameSplited.length - 1];

        const dataForRequest = IntegrationServiceFactory.getDataForRequest(
            ref.options.integrationType,
            IntegrationServiceFactory.getAvailableMethods(ref.options.integrationType)[methodName],
            params
        );

        const dataForRequestStr = JSON.stringify(dataForRequest);

        if (ref.options.getFromCache) {
            const cachedData = await ref.databaseServer.getVcDocument({
                'option.requestParams': dataForRequestStr,
                policyId: ref.policyId,
            } as FilterQuery<VcDocument>);

            if (cachedData?.document?.credentialSubject[0]?.data) {
                return JSON.parse(cachedData.document?.credentialSubject[0]?.data)
            }
        }

        const integrationService = IntegrationServiceFactory.create(ref.options.integrationType);
        const {
            data: responseFromRequest,
            fromCsv,
        } = await integrationService.executeRequest(methodName, params);

        const policyOwnerCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, user.userId);
        const policyOwnerDid = await policyOwnerCred.loadDidDocument(ref, user.userId);
        const integrationVCClass = await this.createIntegrationVC(policyOwnerDid, JSON.stringify(responseFromRequest), ref, user.userId, fromCsv, dataForRequestStr);

        const mintVcDocument = PolicyUtils.createVC(ref, user, integrationVCClass);

        mintVcDocument.type = DocumentCategoryType.INTEGRATION;
        mintVcDocument.schema = `#${integrationVCClass.getSubjectType()}`;
        mintVcDocument.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
        mintVcDocument.option = {
            requestParams: dataForRequestStr,
        };

        const state: IPolicyEventState = { data: mintVcDocument };

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            documents: ExternalDocuments(mintVcDocument)
        }));
        ref.backup();

        return responseFromRequest;
    }

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
     * Create Integration VC
     * @param didDocument
     * @param data
     * @param ref
     * @param userId
     * @param fromCsv
     * @private
     */
    private async createIntegrationVC(
        didDocument: HederaDidDocument,
        data: string,
        ref: AnyBlockType,
        userId: string,
        fromCsv: boolean,
        requestParams: string,
    ): Promise<VcDocumentDefinition> {
        const vcHelper = new VcHelper();
        const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.INTEGRATION_DATA);
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            data,
            requestParams,
            userId,
            fromCsv: !!fromCsv,
        }

        const uuid = await ref.components.generateUUID();
        const mintVC = await vcHelper.createVerifiableCredential(
            vcSubject,
            didDocument,
            null,
            { uuid }
        );

        return mintVC;
    }
}
