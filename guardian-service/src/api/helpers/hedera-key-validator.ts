import { checkHederaKey, Workers } from '@guardian/common';
import { AccountId, PrivateKey } from '@hiero-ledger/sdk';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Prove that a private key controls an account.
 *
 * This used to be inferred from a GET_USER_BALANCE probe whose result was discarded:
 * the pairing was assumed because that task built a signing client and did not throw.
 * PrivateKey.fromString() beside it only proves the key parses.
 *
 * Deriving the public key from the supplied private key and comparing it with the
 * account's on-chain public key proves the pair directly, and needs no signing, no fee
 * and no mutation - the account is read over the keyless GET_ACCOUNT_INFO_REST task.
 *
 * @throws Error('Invalid Hedera account or key.')
 */
export async function validateHederaAccountKey(
    hederaAccountId: string,
    hederaAccountKey: string,
    options?: { userId?: string; interception?: string }
): Promise<void> {
    try {
        AccountId.fromString(hederaAccountId);
        PrivateKey.fromString(hederaAccountKey);

        const info = await new Workers().addNonRetryableTask({
            type: WorkerTaskType.GET_ACCOUNT_INFO_REST,
            data: {
                hederaAccountId,
                payload: { userId: options?.userId ?? null }
            }
        }, {
            priority: 20,
            userId: options?.userId ?? null,
            interception: options?.interception ?? null
        });

        // the mirror node returns key as { _type, key }
        if (!checkHederaKey(hederaAccountKey, info?.key?.key)) {
            throw new Error('Key does not match the account');
        }
    } catch (error) {
        throw new Error('Invalid Hedera account or key.');
    }
}
