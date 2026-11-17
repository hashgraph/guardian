import { PolicyActionStatus, PolicyActionType } from '@guardian/interfaces';

/**
 * Kind of a row, as the user sees it:
 * - request: the policy needs the user's key or account to continue
 * - action: the user submitted a block action and the policy processes it
 * - remote: the user changed a setting of the policy (relayer account, discussion, disconnect)
 */
export type RequestKind = 'request' | 'action' | 'remote';

export interface IOperationInfo {
    title: string;
    reason: string;
    icon: string;
}

export interface IStatusInfo {
    label: string;
    tone: 'wait' | 'progress' | 'ok' | 'bad' | 'mute';
    icon: string;
}

interface IRequestOperation {
    title: string;
    reason: string;
}

/**
 * Operations the policy asks the user to approve (`document.type` of a request)
 */
const REQUEST_OPERATIONS: { [type: string]: IRequestOperation } = {
    'sign-and-send-role': {
        title: 'Select role',
        reason: 'Sign and publish your role selection'
    },
    'generate-did': {
        title: 'Generate DID document',
        reason: 'Create your identity document'
    },
    'sign-vc': {
        title: 'Sign document',
        reason: 'Sign a credential with your key'
    },
    'send-message': {
        title: 'Send message',
        reason: 'Publish a message from your account'
    },
    'send-messages': {
        title: 'Send messages',
        reason: 'Publish messages from your account'
    },
    'create-topic': {
        title: 'Create topic',
        reason: 'Create a Hedera topic with your account'
    },
    'associate-token': {
        title: 'Associate token',
        reason: 'Associate a token with your Hedera account'
    },
    'dissociate-token': {
        title: 'Dissociate token',
        reason: 'Remove a token association from your Hedera account'
    }
};

/**
 * Settings of the policy the user changes (`document.type` of a remote action)
 */
const REMOTE_OPERATIONS: { [type: string]: string } = {
    'add-relayer-account': 'Add relayer account',
    'create-policy-discussion': 'Create discussion',
    'create-policy-comment': 'Add comment',
    'disconnect-policy': 'Disconnect from policy'
};

/**
 * Document types the form view can render: the document is a signed credential
 */
const CREDENTIAL_TYPES = new Set(['sign-vc', 'sign-and-send-role']);

export function getRequestKind(row: any): RequestKind {
    switch (row?.type) {
        case PolicyActionType.REQUEST:
            return 'request';
        case PolicyActionType.REMOTE_ACTION:
            return 'remote';
        default:
            return 'action';
    }
}

export function getDocumentType(row: any): string {
    return row?.documentType || row?.document?.type || '';
}

export function isCredentialType(type: string): boolean {
    return CREDENTIAL_TYPES.has(type);
}

/**
 * `send_report` and `sendReport` become `Send report`
 */
export function humanize(value: string): string {
    const words = String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_\-\s]+/g, ' ')
        .trim()
        .toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function getOperationInfo(row: any): IOperationInfo {
    const kind = getRequestKind(row);
    const type = getDocumentType(row);
    if (kind === 'request') {
        const operation = REQUEST_OPERATIONS[type];
        return {
            title: operation?.title || humanize(type) || 'Request',
            reason: operation?.reason || 'The policy needs your approval to continue',
            icon: 'pi pi-key'
        };
    }
    if (kind === 'remote') {
        return {
            title: REMOTE_OPERATIONS[type] || humanize(type) || 'Policy setting',
            reason: 'Policy setting you changed',
            icon: 'pi pi-cog'
        };
    }
    return {
        title: humanize(row?.blockTag) || 'Block action',
        reason: 'Action you submitted',
        icon: 'pi pi-send'
    };
}

export function getStatusInfo(row: any): IStatusInfo {
    const request = getRequestKind(row) === 'request';
    switch (row?.status) {
        case PolicyActionStatus.NEW:
            if (request) {
                return row.loaded
                    ? { label: 'Awaiting your approval', tone: 'wait', icon: 'pi pi-clock' }
                    : { label: 'Not loaded yet', tone: 'mute', icon: 'pi pi-exclamation-circle' };
            }
            return { label: 'Processing', tone: 'progress', icon: 'pi pi-spin pi-spinner' };
        case PolicyActionStatus.COMPLETED:
            return request
                ? { label: 'Approved', tone: 'ok', icon: 'pi pi-check' }
                : { label: 'Done', tone: 'ok', icon: 'pi pi-check' };
        case PolicyActionStatus.REJECTED:
            return request
                ? { label: 'Rejected by you', tone: 'bad', icon: 'pi pi-times' }
                : { label: 'Rejected', tone: 'bad', icon: 'pi pi-times' };
        case PolicyActionStatus.CANCELED:
            return { label: 'Cancelled', tone: 'mute', icon: 'pi pi-ban' };
        case PolicyActionStatus.ERROR:
            return { label: 'Failed', tone: 'bad', icon: 'pi pi-exclamation-triangle' };
        default:
            return { label: 'Unknown', tone: 'mute', icon: 'pi pi-question-circle' };
    }
}

/**
 * Which document the Details dialog shows: the backend returns the reply when there is one
 */
export function getDocumentBanner(row: any): string {
    const request = getRequestKind(row) === 'request';
    switch (row?.status) {
        case PolicyActionStatus.COMPLETED:
            return request ? 'Showing your response' : 'Showing the result returned by the policy';
        case PolicyActionStatus.ERROR:
            return 'Showing the error report';
        case PolicyActionStatus.CANCELED:
            return 'Showing the cancelled action';
        default:
            return request ? 'Showing the request from the policy' : 'Showing the action you submitted';
    }
}

/**
 * `12 min ago`, `3 h ago`, `2 days ago`; an empty string for older dates, the caller shows them in full
 */
export function timeAgo(value: any, now: number = Date.now()): string {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) {
        return '';
    }
    const seconds = Math.max(0, Math.round((now - time) / 1000));
    if (seconds < 60) {
        return 'Just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    return '';
}

const MASK = '••••••';

/**
 * Secrets sent to the policy are not shown on the screen
 */
export function hideSecrets(document: any): any {
    if (!document || typeof document !== 'object') {
        return document;
    }
    const result = JSON.parse(JSON.stringify(document));
    if (result.relayerAccount && typeof result.relayerAccount === 'object' && result.relayerAccount.key) {
        result.relayerAccount.key = MASK;
    }
    if (typeof result.key === 'string' && result.key) {
        result.key = MASK;
    }
    return result;
}
