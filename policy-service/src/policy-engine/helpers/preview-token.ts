import { Token } from '@guardian/common/entity/token';
import { Workers } from '@guardian/common/helpers/workers';
import { WorkerTaskType } from '@guardian/interfaces';
import { IPolicyBlock } from '../policy-engine.interface.js';
import { RecordActionStep } from '../record-action-step.js';
import { PreviewScope } from './preview.js';

interface IPreviewTokenRelationship {
    frozen: boolean | null;
    kyc: boolean | null;
    balance?: string;
}

type PreviewTokenAccount = Record<string, IPreviewTokenRelationship>;

const accounts = new WeakMap<RecordActionStep, Map<string, Promise<PreviewTokenAccount>>>();

export function getPreviewTokenAccount(actionStatus: RecordActionStep, accountId: string): Promise<PreviewTokenAccount> | undefined {
    return accounts.get(actionStatus)?.get(accountId);
}

async function loadAccount(ref: IPolicyBlock, accountId: string, userId: string | null): Promise<PreviewTokenAccount> {
    const relationships: unknown = ref.dryRun
        ? await ref.databaseServer.getVirtualHederaAccountInfo(accountId)
        : await new Workers().addNonRetryableTask({
            type: WorkerTaskType.GET_ACCOUNT_TOKENS_REST,
            data: { hederaAccountId: accountId, payload: { userId } }
        }, { priority: 20, dryRun: ref.dryRun, mockId: ref.mockId });
    if (!relationships || typeof relationships !== 'object' || Array.isArray(relationships)) {
        throw new Error('Invalid token account state');
    }
    const result: PreviewTokenAccount = {};
    for (const [tokenId, relationship] of Object.entries(relationships)) {
        if (!relationship || typeof relationship !== 'object'
            || (relationship.frozen !== null && typeof relationship.frozen !== 'boolean')
            || (relationship.kyc !== null && typeof relationship.kyc !== 'boolean')) {
            throw new Error('Invalid token relationship state');
        }
        result[tokenId] = structuredClone(relationship);
    }
    return result;
}

export async function applyPreviewTokenAction(ref: IPolicyBlock, token: Token, accountId: string, action: string, userId: string | null): Promise<boolean> {
    const actionStatus = PreviewScope.current();
    if (!actionStatus?.preview) {
        throw new Error('Token preview requires an active preview');
    }
    let store = accounts.get(actionStatus);
    if (!store) {
        store = new Map();
        accounts.set(actionStatus, store);
    }
    let loading = store.get(accountId);
    if (!loading) {
        loading = loadAccount(ref, accountId, userId);
        store.set(accountId, loading);
    }
    const state = await loading;
    const relationship = state[token.tokenId];
    if (action === 'associate') {
        if (relationship) {
            throw new Error('Token already associated');
        }
        state[token.tokenId] = {
            frozen: token.enableFreeze ? false : null,
            kyc: token.enableKYC ? false : null,
            ...(!ref.dryRun ? { balance: '0' } : {})
        };
        return true;
    }
    if (!relationship) {
        throw new Error('Token is not associated');
    }
    if (action === 'dissociate') {
        if (!ref.dryRun && relationship.balance && Number(relationship.balance) !== 0) {
            throw new Error('Token balance is not zero');
        }
        delete state[token.tokenId];
        return true;
    }
    switch (action) {
        case 'freeze':
        case 'unfreeze': {
            const frozen = action === 'freeze';
            if (relationship.frozen === null || (!ref.dryRun && !token.enableFreeze)) {
                throw new Error(frozen ? 'Can not be frozen' : 'Can not be unfrozen');
            }
            if (ref.dryRun && relationship.frozen === frozen) {
                throw new Error(frozen ? 'Token already frozen' : 'Token already unfrozen');
            }
            relationship.frozen = frozen;
            return true;
        }
        case 'grantKyc':
        case 'revokeKyc': {
            const granted = action === 'grantKyc';
            if (relationship.kyc === null || (!ref.dryRun && !token.enableKYC)) {
                throw new Error(granted ? 'Can not be granted kyc' : 'Can not be revoked kyc');
            }
            if (ref.dryRun && relationship.kyc === granted) {
                throw new Error(granted ? 'Token already granted kyc' : 'Token already revoked kyc');
            }
            relationship.kyc = granted;
            return true;
        }
        default:
            throw new Error(`Unknown token preview action: ${action}`);
    }
}
