import { ApiResponse } from '@api/helpers/api-response';
import {
    BinaryMessageResponse,
    DatabaseServer,
    Logger,
    MessageError,
    MessageResponse,
    Policy,
    RecordImportExport,
} from '@guardian/common';
import { MessageAPI, PolicyEvents, PolicyType } from '@guardian/interfaces';
import { GuardiansService } from '@helpers/guardians';

/**
 * Check policy
 * @param policyId
 * @param owner
 */
export async function checkPolicy(policyId: string, owner: string): Promise<Policy> {
    const model = await DatabaseServer.getPolicyById(policyId);
    if (!model) {
        throw new Error('Unknown policy');
    }
    if (model.owner !== owner) {
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
    ApiResponse(MessageAPI.GET_RECORD_STATUS, async (msg) => {
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
    ApiResponse(MessageAPI.START_RECORDING, async (msg) => {
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
    ApiResponse(MessageAPI.STOP_RECORDING, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid parameters');
            }
            const { policyId, owner, options} = msg;
            await checkPolicy(policyId, owner);
            const guardiansService = new GuardiansService();
            const result = await guardiansService
                .sendPolicyMessage(PolicyEvents.STOP_RECORDING, policyId, options);

            if(!result) {
                throw new Error('Invalid record');
            }
   
            const items = await DatabaseServer.getRecord({ policyId: policyId, method: 'STOP' });
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
    ApiResponse(MessageAPI.GET_RECORDED_ACTIONS, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid parameters');
            }
            const { policyId, owner} = msg;
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
    ApiResponse(MessageAPI.RUN_RECORD, async (msg) => {
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
    ApiResponse(MessageAPI.STOP_RUNNING, async (msg) => {
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
}



// this.channel.getMessages<any, any>(PolicyEngineEvents.GET_RECORD, async (msg) => {
//     try {
//         const { policyId, uuid } = msg;
//         const actions = await DatabaseServer.getRecord({ policyId, uuid });
//         return new MessageResponse(actions);
//     } catch (error) {
//         new Logger().error(error, ['GUARDIAN_SERVICE']);
//         return new MessageError(error);
//     }
// });

// this.channel.getMessages<any, any>(PolicyEngineEvents.RECORD_EXPORT_FILE, async (msg) => {
//     try {
//         const { policyId, owner } = msg;
//         const policy = await DatabaseServer.getPolicyById(policyId);
//         if (!policy) {
//             throw new Error(`Cannot export policy ${policyId}`);
//         }
//         if (policy.owner !== owner) {
//             throw new Error('Invalid owner.');
//         }

//         let uuid = msg.uuid;
//         if (!uuid || uuid === 'last') {
//             const items = await DatabaseServer.getRecord({ policyId, method: 'STOP' });
//             uuid = items[items.length - 1]?.uuid;
//         }
        
//         const zip = await RecordImportExport.generate(uuid);
//         const file = await zip.generateAsync({
//             type: 'arraybuffer',
//             compression: 'DEFLATE',
//             compressionOptions: {
//                 level: 3,
//             },
//         });
//         console.log('File size: ' + file.byteLength);
//         return new BinaryMessageResponse(file);
//     } catch (error) {
//         new Logger().error(error, ['GUARDIAN_SERVICE']);
//         console.error(error);
//         return new MessageError(error);
//     }
// });