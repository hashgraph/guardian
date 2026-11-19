import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deletePolicyMessage, policyIdsByPid, runningPolicyPids } from './stop-policies.mjs';

const PS_OUTPUT = `  PID STAT COMMAND
  101 Sl   node dist/index.js
  202 Sl   /usr/local/bin/node /repo/policy-service/dist/api/policy-process
  303 Z    [node] <defunct>
  404 Ssl  /usr/local/bin/node /repo/policy-service/dist/api/policy-process
  505 Z    /usr/local/bin/node /repo/policy-service/dist/api/policy-process
`;

describe('runningPolicyPids', () => {
    it('lists the live policy processes and skips zombies and other node processes', () => {
        assert.deepEqual(runningPolicyPids(PS_OUTPUT), ['202', '404']);
    });
});

describe('policyIdsByPid', () => {
    it('maps each pid to the policy it was started for, the latest start winning', () => {
        const logs = [
            '2026-11-13T13:01:01.289Z [POLICY,aaa]: Process for with id aaa was started started PID: 202',
            '2026-11-13T13:01:02.000Z [POLICY,bbb]: Start policy',
            '2026-11-13T13:05:00.000Z [POLICY,ccc]: Process for with id ccc was started started PID: 202',
            '2026-11-13T13:06:00.000Z [POLICY,ddd]: Process for with id ddd was started started PID: 404',
        ].join('\n');
        assert.deepEqual([...policyIdsByPid([logs])], [['202', 'ccc'], ['404', 'ddd']]);
    });
});

describe('deletePolicyMessage', () => {
    it('addresses the DELETE_POLICY event of the policy, with the policy id header the process checks', () => {
        const message = deletePolicyMessage('aaa');
        assert.equal(message.subject, 'aaa-policy-event-delete-policy');
        assert.equal(message.headers.get('policyId'), 'aaa');
        assert.match(message.headers.get('messageId'), /^[0-9a-f-]{36}$/);
        assert.deepEqual(JSON.parse(new TextDecoder().decode(message.data)), { policyOwnerId: null });
    });
});
