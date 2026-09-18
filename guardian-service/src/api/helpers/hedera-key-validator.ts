import { checkHederaKey, Workers } from '@guardian/common';
import { AccountId, PrivateKey } from '@hiero-ledger/sdk';
import { WorkerTaskType } from '@guardian/interfaces';

// key types the mirror node reports as one comparable public key
const COMPARABLE_KEY_TYPES = ['ED25519', 'ECDSA_SECP256K1'];

/**
 * Prove that a private key controls an account.
 *
 * The profile-setup "Check hedera key" step only parsed the key and probed for the
 * account; the first real check came later at TopicHelper.create(). Comparing the
 * derived public key with the account's on-chain one proves the pair directly, with
 * no signing, fee or mutation.
 *
 * @throws Error('Invalid Hedera account or key.') with the underlying error as `cause`
 */
export async function validateHederaAccountKey(
    hederaAccountId: string,
    hederaAccountKey: string,
    options?: { userId?: string; interception?: string }
): Promise<void> {
    let info: any;
    try {
        AccountId.fromString(hederaAccountId);
        PrivateKey.fromString(hederaAccountKey);

        info = await new Workers().addNonRetryableTask({
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
    } catch (error) {
        // keep the cause: a NATS timeout and a wrong key otherwise read identically
        throw new Error('Invalid Hedera account or key.', { cause: error });
    }

    // a key-list account has no single key to compare against, and PublicKey.fromString
    // throws on its ProtobufEncoded hex - defer it to the signing operations downstream
    const keyType = info?.key?._type;
    if (keyType && !COMPARABLE_KEY_TYPES.includes(keyType)) {
        return;
    }

    // the mirror node returns key as { _type, key }
    if (!checkHederaKey(hederaAccountKey, info?.key?.key)) {
        throw new Error('Invalid Hedera account or key.', {
            cause: new Error(`Key does not match account '${hederaAccountId}'`),
        });
    }
}
