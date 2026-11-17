import assert from 'node:assert/strict';
import { ContractType, WorkerTaskType } from '@guardian/interfaces';
import { getContractVersion, syncRetireContracts, syncWipeContracts } from '../../dist/api/contract.service.js';

const contractRows = (type) => [
    { contractId: '0.0.1001', lastSyncEventTimeStamp: '1', version: '1.0.1', type },
    { contractId: '0.0.1002', lastSyncEventTimeStamp: '1', version: '1.0.1', type },
    { contractId: '0.0.1003', lastSyncEventTimeStamp: '1', version: '1.0.1', type },
];

const fakeDatabase = (type) => ({ find: async () => contractRows(type) });

// the worker answers the event query of each contract: no event, or the error of that contract
const fakeWorkers = (failing) => {
    const queried = [];
    return {
        queried,
        addNonRetryableTask: async (task) => {
            assert.equal(task.type, WorkerTaskType.GET_CONTRACT_EVENTS);
            queried.push(task.data.contractId);
            if (failing.includes(task.data.contractId)) {
                throw new Error(`no matching event for ${task.data.contractId}`);
            }
            return [];
        },
        addRetryableTask: async () => [],
    };
};

for (const [name, sync, type] of [
    ['syncWipeContracts', syncWipeContracts, ContractType.WIPE],
    ['syncRetireContracts', syncRetireContracts, ContractType.RETIRE],
]) {
    describe(`${name}`, () => {
        it('synchronizes every contract when none fails', async () => {
            const workers = fakeWorkers([]);

            await sync(fakeDatabase(type), workers, {});

            assert.deepEqual(workers.queried.sort(), ['0.0.1001', '0.0.1002', '0.0.1003']);
        });

        it('goes on with the other contracts when one of them fails', async () => {
            const workers = fakeWorkers(['0.0.1001']);

            await assert.rejects(() => sync(fakeDatabase(type), workers, {}));

            assert.deepEqual(workers.queried.sort(), ['0.0.1001', '0.0.1002', '0.0.1003']);
        });

        it('still reports the failure, naming every contract that failed', async () => {
            const workers = fakeWorkers(['0.0.1001', '0.0.1003']);

            await assert.rejects(
                () => sync(fakeDatabase(type), workers, {}),
                (error) => {
                    assert.match(error.message, /2 /);
                    assert.match(error.message, /0\.0\.1001: no matching event for 0\.0\.1001/);
                    assert.match(error.message, /0\.0\.1003: no matching event for 0\.0\.1003/);
                    assert.doesNotMatch(error.message, /0\.0\.1002/);
                    return true;
                }
            );
        });
    });
}

describe('getContractVersion', () => {
    const versionLog = (topic, version) => ({
        topics: [Buffer.from(topic.slice(2), 'hex')],
        data: Buffer.from(
            version.map((part) => part.toString(16).padStart(64, '0')).join(''),
            'hex'
        ),
    });

    it('reads the version a current contract announced', async () => {
        const { ethers } = await import('ethers');
        const topic = new ethers.Interface(['event VersionInfo(uint256[3])']).getEvent('VersionInfo').topicHash;

        assert.equal(await getContractVersion(versionLog(topic, [1, 0, 1])), '1.0.1');
    });

    it('treats a contract that announced no version as the first generation', async () => {
        assert.equal(await getContractVersion(null), '1.0.0');
        assert.equal(await getContractVersion(undefined), '1.0.0');
    });

    it('reports a version event it cannot identify instead of claiming 1.0.0', async () => {
        const { ethers } = await import('ethers');
        // the event of the earlier bytecode generation: Version(uint256[3])
        const topic = new ethers.Interface(['event Version(uint256[3])']).getEvent('Version').topicHash;

        await assert.rejects(
            () => getContractVersion(versionLog(topic, [1, 0, 1])),
            /cannot identify the version/i
        );
    });
});
