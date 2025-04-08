import { ApiResponse } from './helpers/api-response.js';
import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    ExternalPolicy,
    RunFunctionAsync,
    Users,
    MessageServer,
    MessageType,
    PolicyMessage,
    MessageAction,
    PolicyImportExport
} from '@guardian/common';
import { ExternalPolicyStatus, IOwner, MessageAPI, PolicyAvailability } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';
import { PolicyEngine } from '../policy-engine/policy-engine.js';
import { ImportMode, ImportPolicyOptions, PolicyImportExportHelper } from '../helpers/import-helpers/index.js'

/**
 * Prepare policy for preview by message
 * @param messageId
 * @param user
 * @param notifier
 * @param logger
 */
async function preparePolicyPreviewMessage(
    messageId: string,
    user: IOwner,
    notifier: INotifier,
    logger: PinoLogger
): Promise<any> {
    notifier.start('Resolve Hedera account');
    if (!messageId) {
        throw new Error('Policy ID in body is empty');
    }

    await logger.info(`Import policy by message`, ['GUARDIAN_SERVICE']);

    const users = new Users();
    const root = await users.getHederaAccount(user.creator);

    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    const message = await messageServer.getMessage<PolicyMessage>(messageId);
    if (message.type !== MessageType.InstancePolicy) {
        throw new Error('Invalid Message Type');
    }

    if (!message.document) {
        throw new Error('file in body is empty');
    }

    notifier.completedAndStart('Parse policy files');
    const policyToImport: any = await PolicyImportExport.parseZipFile(message.document, true);

    policyToImport.topicId = message.getTopicId();
    policyToImport.availability = message.availability;
    policyToImport.restoreTopicId = message.restoreTopicId;

    notifier.completed();
    return policyToImport;
}


async function addPolicy(
    messageId: string,
    owner: IOwner,
    logger: PinoLogger,
    notifier: INotifier
) {
    const users = new Users();
    notifier.start('Resolve Hedera account');
    const root = await users.getHederaAccount(owner.creator);
    notifier.completed();
    const policyToImport = await PolicyImportExportHelper.loadPolicyMessage(messageId, root, notifier);
    const result = await PolicyImportExportHelper.importPolicy(
        ImportMode.VIEW,
        (new ImportPolicyOptions(logger))
            .setComponents(policyToImport)
            .setUser(owner)
            .setAdditionalPolicy({ messageId }),
        notifier
    );
    if (result?.errors?.length) {
        const message = PolicyImportExportHelper.errorsMessage(result.errors);
        notifier.error(message);
        await logger.warn(message, ['GUARDIAN_SERVICE']);

        return result;
    }

    const policyEngine = new PolicyEngine(logger);
    await policyEngine.startView(result.policy, owner, logger, notifier);

    return result;
}

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
        async (msg: { filters: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { filters } = msg;
                const item = await DatabaseServer.getExternalPolicy(filters);
                if (!item) {
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
     * @param {any} msg - filters
     *
     * @returns {any} - external policies
     */
    ApiResponse(MessageAPI.GROUP_EXTERNAL_POLICY_REQUESTS,
        async (msg: { filters: { full: boolean, pageIndex: string, pageSize: string }, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { filters, owner } = msg;
                const { full, pageIndex, pageSize } = filters;
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                let limit: number;
                let offset: number;
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    limit = _pageSize;
                    offset = _pageIndex * _pageSize;
                } else {
                    offset = 0;
                    limit = 100;
                }
                const [items, count] = await DatabaseServer.groupExternalPoliciesAndCount(owner, offset, limit, full);
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
                const policyToImport = await preparePolicyPreviewMessage(messageId, owner, emptyNotifier(), logger);
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
                const item = await DatabaseServer.getExternalPolicy({ messageId, creator: owner.creator });
                if (item) {
                    return new MessageError(`Item is already exist.`);
                }
                const policyToImport = await preparePolicyPreviewMessage(messageId, owner, emptyNotifier(), logger);
                if (policyToImport.availability !== PolicyAvailability.PUBLIC) {
                    return new MessageError(`Policy is private.`);
                }
                if (!policyToImport.restoreTopicId) {
                    return new MessageError(`Policy is private.`);
                }
                const externalPolicy = await DatabaseServer.createExternalPolicy({
                    uuid: policyToImport.policy.uuid,
                    name: policyToImport.policy.name,
                    description: policyToImport.policy.description,
                    version: policyToImport.policy.version,
                    topicId: policyToImport.topicId,
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
     * 
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.APPROVE_EXTERNAL_POLICY_ASYNC,
        async (msg: { messageId: string, owner: IOwner, task: any }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { messageId, owner, task } = msg;

                const items = await DatabaseServer.getExternalPolicies({ messageId });
                if (!items || !items.length) {
                    return new MessageError('Item does not exist.');
                }

                const policy = await DatabaseServer.getPolicy({ messageId });
                const notifier = await initNotifier(task);
                RunFunctionAsync(async () => {
                    let errors: any[] = [];
                    if (!policy) {
                        const result = await addPolicy(messageId, owner, logger, notifier);
                        errors = result.errors;
                    }

                    for (const item of items) {
                        item.status = ExternalPolicyStatus.APPROVED;
                        await DatabaseServer.updateExternalPolicy(item);
                    }

                    notifier.result({ id: messageId, errors });
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


    /**
     * 
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.APPROVE_EXTERNAL_POLICY,
        async (msg: { messageId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { messageId, owner } = msg;

                const items = await DatabaseServer.getExternalPolicies({ messageId });
                if (!items || !items.length) {
                    return new MessageError('Item does not exist.');
                }

                const policy = await DatabaseServer.getPolicy({ messageId });
                const notifier = emptyNotifier();

                let errors: any[] = [];
                if (!policy) {
                    const result = await addPolicy(messageId, owner, logger, notifier);
                    errors = result.errors;
                }

                for (const item of items) {
                    item.status = ExternalPolicyStatus.APPROVED;
                    await DatabaseServer.updateExternalPolicy(item);
                }

                notifier.result({ id: messageId, errors });

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * 
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.REJECT_EXTERNAL_POLICY_ASYNC,
        async (msg: { messageId: string, owner: IOwner, task: any }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { messageId, owner, task } = msg;

                const items = await DatabaseServer.getExternalPolicies({ messageId });
                if (!items || !items.length) {
                    return new MessageError('Item does not exist.');
                }

                const notifier = await initNotifier(task);
                RunFunctionAsync(async () => {
                    for (const item of items) {
                        item.status = ExternalPolicyStatus.REJECTED;
                        await DatabaseServer.updateExternalPolicy(item);
                    }

                    notifier.result({ id: messageId, errors: [] });
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


    /**
     * 
     *
     * @param {any} msg - policy label id
     *
     * @returns {any} - policy label
     */
    ApiResponse(MessageAPI.REJECT_EXTERNAL_POLICY,
        async (msg: { messageId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { messageId, owner } = msg;

                const items = await DatabaseServer.getExternalPolicies({ messageId });
                if (!items || !items.length) {
                    return new MessageError('Item does not exist.');
                }

                for (const item of items) {
                    item.status = ExternalPolicyStatus.REJECTED;
                    await DatabaseServer.updateExternalPolicy(item);
                }
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

}