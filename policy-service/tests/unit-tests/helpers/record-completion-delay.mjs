import { promisify } from 'node:util';

const RECORD_COMPLETION_DELAY = 1000;
const SHORT_COMPLETION_DELAY = 50;
const realSetTimeout = globalThis.setTimeout;

function setTimeoutWithShortRecordCompletion(callback, delay, ...args) {
    const recordCompletion = delay === RECORD_COMPLETION_DELAY
        && /record-action-step\.(js|ts)/.test(new Error().stack ?? '');
    return realSetTimeout(callback, recordCompletion ? SHORT_COMPLETION_DELAY : delay, ...args);
}
setTimeoutWithShortRecordCompletion[promisify.custom] = realSetTimeout[promisify.custom];

export function useShortRecordCompletion() {
    before(() => {
        globalThis.setTimeout = setTimeoutWithShortRecordCompletion;
    });
    after(() => {
        globalThis.setTimeout = realSetTimeout;
    });
}
