import { ApiResponse } from '../api/helpers/api-response.js';
import {
    CredentialRecord,
    DataBaseHelper,
    IAuthUser,
    MessageError,
    MessageResponse,
    PinoLogger,
    Wallet,
    KeyType,
} from '@guardian/common';
import {
    IntegrationType,
    CREDENTIAL_SERVICE_TYPES,
    MessageAPI,
    SERVICE_CREDENTIAL_SCHEMAS,
} from '@guardian/interfaces';

/**
 * Credential management API handlers
 */
export async function credentialAPI(logger: PinoLogger): Promise<void> {
    const credentialDb = new DataBaseHelper(CredentialRecord);

    /**
     * Validate fields against SERVICE_CREDENTIAL_SCHEMAS for the given serviceType.
     */
    function validateFields(serviceType: IntegrationType, fields: Record<string, string>): void {
        const schema = SERVICE_CREDENTIAL_SCHEMAS.find(s => s.serviceType === serviceType);
        if (!schema) {
            throw new Error(`Unknown service type: ${serviceType}`);
        }

        const requiredFieldNames = schema.fields.map(f => f.name);
        const providedFieldNames = Object.keys(fields || {});

        for (const name of providedFieldNames) {
            if (!requiredFieldNames.includes(name)) {
                throw new Error(`Unknown field '${name}' for service ${serviceType}`);
            }
        }

        for (const name of requiredFieldNames) {
            if (!fields[name] || fields[name].trim() === '') {
                throw new Error(`Required field '${name}' is missing or empty for service ${serviceType}`);
            }
        }
    }

    // ==================== SET_CREDENTIAL ====================

    ApiResponse(MessageAPI.SET_CREDENTIAL,
        async (msg: {
            user: IAuthUser,
            policyId?: string,
            serviceType: IntegrationType,
            dryRun?: boolean,
            fields: Record<string, string>,
        }) => {
            try {
                const { user, policyId, serviceType, fields, dryRun } = msg;

                if (!CREDENTIAL_SERVICE_TYPES.includes(serviceType)) {
                    throw new Error(`Invalid service type: ${serviceType}`);
                }

                validateFields(serviceType, fields);

                const ownerId = user.did;
                const isDryRun = !!dryRun;
                const keyPath = `${serviceType}/${policyId || 'global'}/${isDryRun ? 'dryrun' : 'production'}`;
                const wallet = new Wallet();
                await wallet.setUserKey(ownerId, KeyType.INTEGRATION_KEY, keyPath, JSON.stringify(fields), user.id);

                const filter: any = { ownerId, serviceType, dryRun: isDryRun };
                if (policyId) {
                    filter.policyId = policyId;
                } else {
                    filter.policyId = null;
                }

                let record = await credentialDb.findOne(filter);
                if (record) {
                    record.updateDate = new Date();
                    await credentialDb.update(record);
                } else {
                    record = await credentialDb.save({
                        ownerId,
                        serviceType,
                        policyId: policyId || null,
                        dryRun: isDryRun,
                    } as any);
                }

                await logger.info(`Credential set: service=${serviceType}, policyId=${policyId || 'global'}`, ['GUARDIAN_SERVICE'], user.id);

                return new MessageResponse(record);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    // ==================== GET_CREDENTIALS ====================

    ApiResponse(MessageAPI.GET_CREDENTIALS,
        async (msg: {
            user: IAuthUser,
            policyId?: string,
            ownerId?: string,
        }) => {
            try {
                const { user, policyId, ownerId } = msg;

                const filter: any = { ownerId: ownerId || user.did };
                if (policyId !== undefined) {
                    filter.policyId = policyId || null;
                }

                const records = await credentialDb.find(filter);
                return new MessageResponse(records);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    // ==================== DELETE_CREDENTIAL ====================

    ApiResponse(MessageAPI.DELETE_CREDENTIAL,
        async (msg: {
            user: IAuthUser,
            policyId?: string,
            serviceType: IntegrationType,
            dryRun?: boolean,
        }) => {
            try {
                const { user, policyId, serviceType, dryRun } = msg;

                const filter: any = {
                    ownerId: user.did,
                    serviceType,
                    dryRun: !!dryRun,
                };
                if (policyId) {
                    filter.policyId = policyId;
                } else {
                    filter.policyId = null;
                }

                const record = await credentialDb.findOne(filter);
                if (!record) {
                    throw new Error('Credential not found');
                }

                const keyPath = `${record.serviceType}/${record.policyId || 'global'}/${record.dryRun ? 'dryrun' : 'production'}`;
                try {
                    const wallet = new Wallet();
                    await wallet.setUserKey(record.ownerId, KeyType.INTEGRATION_KEY, keyPath, '', user.id);
                } catch (e) {
                    await logger.error(`Failed to delete secret from wallet: ${e.message}`, ['GUARDIAN_SERVICE'], user.id);
                }

                await credentialDb.delete(record);

                await logger.info(`Credential deleted: service=${serviceType}, policyId=${policyId || 'global'}`, ['GUARDIAN_SERVICE'], user.id);

                return new MessageResponse({ deleted: true });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });
}
