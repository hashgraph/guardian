import { ApiResponse } from './helpers/api-response.js';
import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    ExternalPolicy,
    RunFunctionAsync,
    Users
} from '@guardian/common';
import { ExternalPolicyStatus, IOwner, MessageAPI } from '@guardian/interfaces';
import { emptyNotifier, initNotifier } from '../helpers/notifier.js';
import { PolicyEngine } from '../policy-engine/policy-engine.js';
import { ImportMode, ImportPolicyOptions, PolicyImportExportHelper } from '../helpers/import-helpers/index.js'

/**
 * Connect to the message broker methods of working with formula.
 */
export async function externalPoliciesAPI(logger: PinoLogger): Promise<void> {
    /**
     * Get external policy
     *
     * @param {any} msg - external policy id
     *
     * @returns {any} - external policy
     */
    ApiResponse(MessageAPI.GET_EXTERNAL_POLICY_REQUEST,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getExternalPolicyById(id);
                if (!(item && item.owner === owner.owner)) {
                    return new MessageError('Item does not exist.');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * 
     *
     * @param {any} msg - filters
     *
     * @returns {any} - external policies
     */
    ApiResponse(MessageAPI.GET_EXTERNAL_POLICY_REQUESTS,
        async (msg: { filters: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { filters } = msg;
                const { query, pageIndex, pageSize } = filters;

                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }
                const [items, count] = await DatabaseServer.getExternalPoliciesAndCount(query, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * 
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
     */
    ApiResponse(MessageAPI.PREVIEW_EXTERNAL_POLICY,
        async (msg: { messageId: string, owner: IOwner }) => {
            try {
                const { messageId, owner } = msg;
                const policyEngine = new PolicyEngine(logger);
                const policyToImport = await policyEngine
                    .preparePolicyPreviewMessage(messageId, owner, emptyNotifier(), logger);
                return new MessageResponse(policyToImport);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * 
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
     */
    ApiResponse(MessageAPI.IMPORT_EXTERNAL_POLICY,
        async (msg: { messageId: string, owner: IOwner }) => {
            try {
                const { messageId, owner } = msg;
                const policyEngine = new PolicyEngine(logger);
                const policyToImport = await policyEngine
                    .preparePolicyPreviewMessage(messageId, owner, emptyNotifier(), logger);

                const externalPolicy = await DatabaseServer.createExternalPolicy({
                    uuid: policyToImport.policy.uuid,
                    name: policyToImport.policy.name,
                    description: policyToImport.policy.description,
                    version: policyToImport.policy.version,
                    topicId: policyToImport.policy.topicId,
                    instanceTopicId: policyToImport.policy.instanceTopicId,
                    messageId,
                    policyTag: policyToImport.policy.policyTag,
                    owner: owner.owner,
                    creator: owner.creator,
                    username: owner.username,
                    status: ExternalPolicyStatus.NEW
                });

                return new MessageResponse(externalPolicy);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Publish policy label
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.APPROVE_EXTERNAL_POLICY_ASYNC,
        async (msg: { policyId: string, owner: IOwner, task: any }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { policyId, owner, task } = msg;

                const item = await DatabaseServer.getExternalPolicyById(policyId);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === ExternalPolicyStatus.APPROVED) {
                    return new MessageError(`Item is already approved.`);
                }
                if (item.status === ExternalPolicyStatus.REJECTED) {
                    return new MessageError(`Item is already rejected.`);
                }

                const notifier = await initNotifier(task);
                RunFunctionAsync(async () => {
                    const users = new Users();
                    notifier.start('Resolve Hedera account');
                    const root = await users.getHederaAccount(owner.creator);
                    notifier.completed();
                    const policyToImport = await PolicyImportExportHelper.loadPolicyMessage(item.messageId, root, notifier);
                    const result = await PolicyImportExportHelper.importPolicy(
                        ImportMode.VIEW,
                        (new ImportPolicyOptions(logger))
                            .setComponents(policyToImport)
                            .setUser(owner)
                            .setAdditionalPolicy({
                                messageId: item.messageId
                            }),
                        notifier
                    );
                    if (result?.errors?.length) {
                        const message = PolicyImportExportHelper.errorsMessage(result.errors);
                        notifier.error(message);
                        await logger.warn(message, ['GUARDIAN_SERVICE']);
                        return;
                    }

                    const policyEngine = new PolicyEngine(logger);
                    await policyEngine.startView(result.policy, owner, logger, notifier);

                    item.status = ExternalPolicyStatus.APPROVED;
                    await DatabaseServer.updateExternalPolicy(item);

                    notifier.result({
                        id: item.id,
                        policyId: result.policy.id,
                        errors: result.errors
                    });
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE']);
                    notifier.error(error);
                });

                return new MessageResponse(task);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}