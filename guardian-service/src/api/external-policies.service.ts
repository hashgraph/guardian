import { ApiResponse } from './helpers/api-response.js';
import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    RunFunctionAsync,
    Users,
    MessageServer,
    MessageType,
    PolicyMessage,
    PolicyImportExport,
    INotificationStep,
    NewNotifier
} from '@guardian/common';
import { ExternalPolicyStatus, IOwner, MessageAPI, PolicyAvailability } from '@guardian/interfaces';
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
    notifier: INotificationStep,
    logger: PinoLogger,
    userId: string | null
): Promise<any> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_PARSE_FILE = 'Parse policy files';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_PARSE_FILE);
    notifier.start();

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    if (!messageId) {
        throw new Error('Policy ID in body is empty');
    }

    await logger.info(`Import policy by message`, ['GUARDIAN_SERVICE'], userId);

    const users = new Users();
    const root = await users.getHederaAccount(user.creator, userId);

    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = await messageServer
        .getMessage<PolicyMessage>({ messageId, loadIPFS: true, userId, interception: userId });
    if (message.type !== MessageType.InstancePolicy) {
        throw new Error('Invalid Message Type');
    }

    if (!message.document) {
        throw new Error('file in body is empty');
    }
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_PARSE_FILE);
    const policyToImport: any = await PolicyImportExport.parseZipFile(message.document, true);

    policyToImport.topicId = message.getTopicId();
    policyToImport.availability = message.availability;
    policyToImport.restoreTopicId = message.restoreTopicId;
    policyToImport.actionsTopicId = message.actionsTopicId;
    policyToImport.recordsTopicId = message.recordsTopicId;
    notifier.completeStep(STEP_PARSE_FILE);

    notifier.complete();
    return policyToImport;
}

async function addPolicy(
    messageId: string,
    owner: IOwner,
    logger: PinoLogger,
    notifier: INotificationStep,
    userId: string | null
) {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_LOAD_MESSAGE = 'Load message';
    const STEP_IMPORT_POLICY = 'Import policy';
    const STEP_START_POLICY = 'Parse policy files';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT, 1);
    notifier.addStep(STEP_LOAD_MESSAGE, 5);
    notifier.addStep(STEP_IMPORT_POLICY, 90);
    notifier.addStep(STEP_START_POLICY, 4);
    notifier.start();

    const users = new Users();
    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const root = await users.getHederaAccount(owner.creator, userId);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_LOAD_MESSAGE);
    const policyToImport = await PolicyImportExportHelper.loadPolicyMessage(
        messageId,
        root,
        notifier.getStep(STEP_LOAD_MESSAGE),
        userId
    );
    notifier.completeStep(STEP_LOAD_MESSAGE);

    notifier.startStep(STEP_IMPORT_POLICY);
    const result = await PolicyImportExportHelper.importPolicy(
        ImportMode.VIEW,
        (new ImportPolicyOptions(logger))
            .setComponents(policyToImport)
            .setUser(owner)
            .setAdditionalPolicy({ messageId }),
        notifier.getStep(STEP_IMPORT_POLICY),
        userId
    );
    notifier.completeStep(STEP_IMPORT_POLICY);

    if (result?.errors?.length) {
        const message = PolicyImportExportHelper.errorsMessage(result.errors);
        notifier.fail(message);
        await logger.warn(message, ['GUARDIAN_SERVICE'], userId);

        return result;
    }

    notifier.startStep(STEP_START_POLICY);
    const policyEngine = new PolicyEngine(logger);
    await policyEngine.startView(result.policy, owner, logger, notifier);
    notifier.completeStep(STEP_START_POLICY);

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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Get external policies
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Get external policies
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Preview external policy
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
     */
    ApiResponse(MessageAPI.PREVIEW_EXTERNAL_POLICY,
        async (msg: { messageId: string, owner: IOwner }) => {
            try {
                const { messageId, owner } = msg;
                const policyToImport = await preparePolicyPreviewMessage(messageId, owner, NewNotifier.empty(), logger, owner?.id);
                return new MessageResponse(policyToImport);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Import external policy
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
                const policyToImport = await preparePolicyPreviewMessage(messageId, owner, NewNotifier.empty(), logger, owner?.id);
                if (policyToImport.availability !== PolicyAvailability.PUBLIC) {
                    return new MessageError(`Policy is private.`);
                }
                if (!policyToImport.restoreTopicId || !policyToImport.actionsTopicId) {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Approve external policy
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
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
                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    let errors: any[] = [];
                    if (!policy) {
                        const result = await addPolicy(messageId, owner, logger, notifier, owner?.id);
                        errors = result.errors;
                    }

                    for (const item of items) {
                        item.status = ExternalPolicyStatus.APPROVED;
                        await DatabaseServer.updateExternalPolicy(item);
                    }

                    notifier.result({ id: messageId, errors });
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.fail(error);
                });

                return new MessageResponse(task);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Approve external policy
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
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
                const notifier = NewNotifier.empty();

                let errors: any[] = [];
                if (!policy) {
                    const result = await addPolicy(messageId, owner, logger, notifier, owner?.id);
                    errors = result.errors;
                }

                for (const item of items) {
                    item.status = ExternalPolicyStatus.APPROVED;
                    await DatabaseServer.updateExternalPolicy(item);
                }

                notifier.result({ id: messageId, errors });

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Reject external policy
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
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

                const notifier = await NewNotifier.create(task);
                RunFunctionAsync(async () => {
                    for (const item of items) {
                        item.status = ExternalPolicyStatus.REJECTED;
                        await DatabaseServer.updateExternalPolicy(item);
                    }

                    notifier.result({ id: messageId, errors: [] });
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.fail(error);
                });

                return new MessageResponse(task);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Reject external policy
     *
     * @param {any} msg - messageId
     *
     * @returns {any} - external policy
     */
    ApiResponse(MessageAPI.REJECT_EXTERNAL_POLICY,
        async (msg: { messageId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { messageId } = msg;

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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

}