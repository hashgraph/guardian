import { CompareOptions, IChildrenLvl, IEventsLvl, IIdLvl, IKeyLvl, IRefLvl, IPropertiesLvl, RecordComparator, RecordLoader } from '../analytics/index.js';
import { ApiResponse } from '../api/helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    IRecordResult,
    Logger,
    MessageError,
    MessageResponse,
    Policy,
    RecordImportExport,
} from '@guardian/common';
import { IOwner, MessageAPI, PolicyEvents, PolicyType } from '@guardian/interfaces';
import { GuardiansService } from '../helpers/guardians.js';

/**
 * Compare results
 * @param policyId
 * @param owner
 */
export async function compareResults(details: any): Promise<any> {
    if (details) {
        const options = new CompareOptions(
            IPropertiesLvl.All,
            IChildrenLvl.None,
            IEventsLvl.None,
            IIdLvl.None,
            IKeyLvl.Default,
            IRefLvl.Default,
            null
        );
        const documents: IRecordResult[] = details.documents;
        const recorded: IRecordResult[] = details.recorded;
        const comparator = new RecordComparator(options);
        const loader = new RecordLoader(options);
        const recordedModel = await loader.createModel(recorded);
        const documentsModel = await loader.createModel(documents);
        const results = comparator.compare([recordedModel, documentsModel]);
        const result = results[0];
        return result;
    } else {
        return null;
    }
}

/**
 * Check policy
 * @param policyId
 * @param owner
 */
export async function checkPolicy(
    policyId: string,
    user: IOwner
): Promise<Policy> {
    const model = await DatabaseServer.getPolicyById(policyId);
    if (!model) {
        throw new Error('Unknown policy');
    }
    if (model.owner !== user.owner) {
        throw new Error('Invalid owner.');
    }
    if (model.status !== PolicyType.DRY_RUN) {
        throw new Error(`Policy is not in Dry Run`);
    }
    return model;
}

/**
 * Connect to the message broker methods of working with records.
 */
export async function recordAPI(): Promise<void> {
    /**
     * Get recording or running status
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORD_STATUS,
        async (msg: { policyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORD_STATUS, policyId, null);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Start recording
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.START_RECORDING,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.START_RECORDING, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Stop recording
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.STOP_RECORDING,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.STOP_RECORDING, policyId, options);

                if (!result) {
                    throw new Error('Invalid record');
                }

                const items = await DatabaseServer.getRecord({ policyId, method: 'STOP' });
                const uuid = items[items.length - 1]?.uuid;

                const zip = await RecordImportExport.generate(uuid);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                });
                return new BinaryMessageResponse(file);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get recorded actions
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORDED_ACTIONS,
        async (msg: { policyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORDED_ACTIONS, policyId, null);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Run record
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.RUN_RECORD,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const zip = options.file;
                delete options.file;
                const recordToImport = await RecordImportExport.parseZipFile(Buffer.from(zip.data));
                const guardiansService = new GuardiansService();

                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.RUN_RECORD, policyId, {
                        records: recordToImport.records,
                        results: recordToImport.results,
                        options
                    });
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Stop running
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.STOP_RUNNING,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.STOP_RUNNING, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get record results
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORD_RESULTS,
        async (msg: { policyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const details: any = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORD_RESULTS, policyId, null);

                const report = await compareResults(details);
                const total = report?.total;
                const info = report?.right;
                const table = report?.documents?.report || [];

                const documents = [];
                for (let i = 1; i < table.length; i++) {
                    const row = table[i];
                    if (row.right) {
                        const index = row.right.attributes;
                        const document = details?.documents?.[index];
                        documents.push({
                            type: row.document_type,
                            rate: row.total_rate,
                            schema: row.right_schema,
                            document
                        })
                    }
                }

                return new MessageResponse({
                    info,
                    total,
                    details,
                    documents
                });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get record results
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORD_DETAILS,
        async (msg: { policyId: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const details: any = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORD_RESULTS, policyId, null);

                const result = await compareResults(details);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Fast Forward
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.FAST_FORWARD,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.FAST_FORWARD, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Retry Step
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.RECORD_RETRY_STEP,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.RECORD_RETRY_STEP, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Skip Step
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.RECORD_SKIP_STEP,
        async (msg: { policyId: string, owner: IOwner, options: any }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.RECORD_SKIP_STEP, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
