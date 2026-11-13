// Stops the policy processes that policy-service forked for every published or dry-run policy.
// Each one is sent the DELETE_POLICY event it listens to, so it exits with code 0 and policy-service
// does not respawn it (a process killed by a signal is respawned). Nothing is removed from the database:
// Guardian starts a policy again when it is published, put in dry run, or at the next boot.
//
//   node scripts/stop-policies.mjs <dir with policy-service-*.log> <NATS host:port>
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect, headers, JSONCodec } from 'nats';

const POLICY_PROCESS = 'policy-service/dist/api/policy-process';
const STOP_TIMEOUT_MS = 30000;

export function runningPolicyPids(psOutput) {
    return psOutput.split('\n')
        .map((line) => line.trim().split(/\s+/))
        .filter(([, stat, ...command]) => command.join(' ').includes(POLICY_PROCESS) && !stat?.startsWith('Z'))
        .map(([pid]) => pid);
}

// policy-service logs `Process for with id <policyId> was started started PID: <pid>` for every fork.
export function policyIdsByPid(logTexts) {
    const ids = new Map();
    for (const text of logTexts) {
        for (const match of text.matchAll(/Process for with id (\w+) was started started PID: (\d+)/g)) {
            ids.set(match[2], match[1]);
        }
    }
    return ids;
}

export function deletePolicyMessage(policyId) {
    const messageHeaders = headers();
    messageHeaders.append('policyId', policyId);
    messageHeaders.append('messageId', crypto.randomUUID());
    return {
        subject: `${policyId}-policy-event-delete-policy`,
        headers: messageHeaders,
        data: JSONCodec().encode({ policyOwnerId: null }),
    };
}

const listPolicyPids = () => runningPolicyPids(execFileSync('ps', ['-eo', 'pid,stat,args'], { encoding: 'utf8' }));

async function stopPolicies(logDir, natsServer) {
    const pids = listPolicyPids();
    if (!pids.length) {
        console.log('no policy process is running');
        return;
    }
    const logs = fs.readdirSync(logDir)
        .filter((name) => /^policy-service-\d+\.log$/.test(name))
        .map((name) => fs.readFileSync(path.join(logDir, name), 'utf8'));
    const ids = policyIdsByPid(logs);
    const unknown = pids.filter((pid) => !ids.has(pid));
    if (unknown.length) {
        throw new Error(`no policy id in ${logDir}/policy-service-*.log for the policy processes ${unknown.join(', ')}`);
    }

    const connection = await connect({ servers: natsServer });
    for (const pid of pids) {
        const { subject, headers: messageHeaders, data } = deletePolicyMessage(ids.get(pid));
        connection.publish(subject, data, { headers: messageHeaders });
    }
    await connection.drain();

    const deadline = Date.now() + STOP_TIMEOUT_MS;
    let left = listPolicyPids();
    while (left.length && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        left = listPolicyPids();
    }
    if (left.length) {
        throw new Error(`policy processes still running after ${STOP_TIMEOUT_MS / 1000} s: ${left.join(', ')}`);
    }
    console.log(`stopped ${pids.length} policy processes`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [logDir, natsServer] = process.argv.slice(2);
    if (!logDir || !natsServer) {
        console.error('usage: stop-policies.mjs <dir with policy-service-*.log> <NATS host:port>');
        process.exit(2);
    }
    stopPolicies(logDir, natsServer).catch((error) => {
        console.error(`error: ${error.message}`);
        process.exit(1);
    });
}
