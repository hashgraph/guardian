import { ApiResponse } from './helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    Formula,
    FormulaImportExport,
    PolicyImportExport,
    Users,
    ExternalPolicy
} from '@guardian/common';
import { EntityStatus, IOwner, MessageAPI, PolicyStatus, SchemaEntity, SchemaStatus } from '@guardian/interfaces';
import { getFormulasData, publishFormula } from './helpers/formulas-helpers.js';
import { emptyNotifier } from '../helpers/notifier.js';

/**
 * Connect to the message broker methods of working with formula.
 */
export async function externalPoliciesAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new formula
     *
     * @param payload - formula
     *
     * @returns {any} new formula
     */
    ApiResponse(MessageAPI.CREATE_EXTERNAL_POLICY,
        async (msg: { externalPolicy: ExternalPolicy, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters.');
                }
                const { externalPolicy, owner } = msg;

                if (!externalPolicy) {
                    return new MessageError('Invalid object.');
                }

                // return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}