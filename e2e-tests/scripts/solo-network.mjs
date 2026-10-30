#!/usr/bin/env node
/**
 * Creates (`up`) or removes (`down`) a throwaway local Hiero network with Solo, so the e2e suite
 * can run without testnet and without spending HBAR. Solo is pinned and run through npx, and its
 * state lives in e2e-tests/.solo, so a globally installed Solo and ~/.solo are never touched.
 *
 * Usage:
 *   node scripts/solo-network.mjs up      # deploys the network, writes .solo/solo.env
 *   node scripts/solo-network.mjs down    # destroys the network and removes .solo/
 *
 * After `up`, load the variables before starting Guardian and before ./entrypoint.sh:
 *   set -a; source .solo/solo.env; set +a
 *
 * Behind a TLS-intercepting proxy the kind node does not trust the proxy CA and every image pull
 * fails with `x509: certificate signed by unknown authority`. Point SOLO_EXTRA_CA_CERT at the PEM
 * bundle of the CA and `up` installs it in the node before Solo creates any pod.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { AccountCreateTransaction, AccountId, Client, Hbar, PrivateKey } from '@hiero-ledger/sdk';

export const SOLO_VERSION = '0.95.0';
export const KIND_CLUSTER_NAME = 'solo-cluster';
const SOLO_DEPLOYMENT_NAME = 'one-shot';
const MIN_NODE_MAJOR = 22;
const KIND_NODE_CONTAINER = `${KIND_CLUSTER_NAME}-control-plane`;
const EXTRA_CA_POLL_INTERVAL_MS = 500;

// Both are what one-shot publishes on 127.0.0.1, and what hiero-solo-action uses by default.
export const CONSENSUS_HOST = '127.0.0.1';
export const CONSENSUS_PORT = 35211;
export const MIRROR_REST_URL = 'http://127.0.0.1:38081';
const CONSENSUS_NODE_ACCOUNT = '0.0.3';

// Same funding as the operator the CI action creates; HBAR is free on a local network.
const OPERATOR_HBAR = 50_000_000;

const NETWORK_READY_TIMEOUT_MS = 5 * 60 * 1000;
const NETWORK_POLL_INTERVAL_MS = 2000;

const here = path.dirname(fileURLToPath(import.meta.url));
const e2eRoot = path.resolve(here, '..');
const repoRoot = path.resolve(e2eRoot, '..');
const soloStateDir = path.join(e2eRoot, '.solo');
const soloHome = path.join(soloStateDir, 'home');
const soloEnvFile = path.join(soloStateDir, 'solo.env');

/**
 * The genesis account (0.0.2, ED25519) of a one-shot `accounts.json`. One-shot predefines only
 * ECDSA accounts, so this is the only funded ED25519 key it hands out.
 */
export function selectGenesisAccount(accounts) {
    const genesis = (accounts.systemAccounts || []).find((account) => account.name === 'Operator' && account.privateKey);
    if (!genesis) {
        throw new Error('accounts.json holds no genesis account with a private key to fund the operator');
    }
    return { accountId: genesis.accountId, privateKey: genesis.privateKey };
}

export function overrideVariables() {
    return {
        OVERRIDE_NETWORK_CONFIGURATION: 'true',
        OVERRIDE_HEDERA_CONSENSUS_NODES: JSON.stringify({
            [`${CONSENSUS_HOST}:${CONSENSUS_PORT}`]: CONSENSUS_NODE_ACCOUNT,
        }),
        OVERRIDE_HEDERA_MIRROR_NODES: JSON.stringify([MIRROR_REST_URL]),
    };
}

/** Contents of solo.env without the contract file ids, which the upload script appends. */
export function renderSoloEnv({ operatorId, operatorKey }) {
    const variables = {
        HEDERA_NET: 'localnode',
        PREUSED_HEDERA_NET: 'localnode',
        LOCALNODE_ADDRESS: CONSENSUS_HOST,
        LOCALNODE_PROTOCOL: 'http',
        ...overrideVariables(),
        // Empty, so Guardian creates its own initialization topic instead of using a testnet one.
        INITIALIZATION_TOPIC_ID: '',
        OPERATOR_ID: operatorId,
        OPERATOR_KEY: operatorKey,
    };
    // Single quotes: the JSON values must survive `source` unchanged.
    return Object.entries(variables).map(([name, value]) => `${name}='${value}'`).join('\n') + '\n';
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: 'inherit', ...options });
    if (result.error) {
        throw new Error(`${command} could not be started: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
    }
}

function succeeds(command, args) {
    return spawnSync(command, args, { stdio: 'ignore' }).status === 0;
}

function soloCommand(args) {
    return ['npx', ['--yes', `@hiero-ledger/solo@${SOLO_VERSION}`, ...args], { env: { ...process.env, SOLO_HOME: soloHome } }];
}

function runSolo(args) {
    run(...soloCommand(args));
}

/** Absolute path of the optional extra CA bundle, undefined when none is configured. */
export function extraCaCertPath(env) {
    if (!env.SOLO_EXTRA_CA_CERT) {
        return undefined;
    }
    const certPath = path.resolve(env.SOLO_EXTRA_CA_CERT);
    if (!fs.existsSync(certPath)) {
        throw new Error(`SOLO_EXTRA_CA_CERT points to ${certPath}, which does not exist`);
    }
    return certPath;
}

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitUntil(condition, isAborted) {
    while (!isAborted() && !condition()) {
        await sleep(EXTRA_CA_POLL_INTERVAL_MS);
    }
    return !isAborted();
}

function kindNodeRunning() {
    const result = spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' });
    return result.status === 0 && result.stdout.split('\n').includes(KIND_NODE_CONTAINER);
}

/** Installs the CA in the kind node as soon as it can run commands, before Solo schedules pods. */
async function trustExtraCa(certPath, isDeployFinished) {
    const nodeReady = () => kindNodeRunning()
        && succeeds('docker', ['exec', KIND_NODE_CONTAINER, 'systemctl', 'is-active', '--quiet', 'containerd']);
    if (!(await waitUntil(nodeReady, isDeployFinished))) {
        return;
    }
    run('docker', ['cp', certPath, `${KIND_NODE_CONTAINER}:/usr/local/share/ca-certificates/extra-ca.crt`]);
    run('docker', ['exec', KIND_NODE_CONTAINER, 'sh', '-c', 'update-ca-certificates && systemctl restart containerd']);
}

async function deployNetwork(extraCaCert) {
    const [command, args, options] = soloCommand(['one-shot', 'single', 'deploy', '--minimal-setup', '--quiet-mode']);
    const solo = spawn(command, args, { stdio: 'inherit', ...options });
    const soloExited = new Promise((resolve, reject) => {
        solo.once('error', reject);
        solo.once('exit', (status) => (status === 0
            ? resolve()
            : reject(new Error(`solo one-shot single deploy exited with status ${status}`))));
    });

    let deployFinished = false;
    const caTrusted = extraCaCert ? trustExtraCa(extraCaCert, () => deployFinished) : Promise.resolve();
    try {
        await Promise.all([soloExited, caTrusted]);
    } catch (error) {
        solo.kill();
        throw error;
    } finally {
        deployFinished = true;
    }
}

function kindClusterExists() {
    const result = spawnSync('kind', ['get', 'clusters'], { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`kind get clusters failed: ${result.stderr}`);
    }
    return result.stdout.split('\n').includes(KIND_CLUSTER_NAME);
}

function preflight() {
    extraCaCertPath(process.env);
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    if (nodeMajor < MIN_NODE_MAJOR) {
        throw new Error(`Node ${MIN_NODE_MAJOR} or newer is required, found ${process.versions.node}`);
    }
    if (!succeeds('docker', ['info'])) {
        throw new Error('docker is not running or not installed');
    }
    if (!succeeds('kind', ['version'])) {
        throw new Error('kind is not installed or not on PATH');
    }
    if (!succeeds('kubectl', ['version', '--client'])) {
        throw new Error('kubectl is not installed or not on PATH');
    }
    if (kindClusterExists()) {
        throw new Error(`kind cluster '${KIND_CLUSTER_NAME}' already exists: run \`down\` first`);
    }
}

function canConnect(host, port) {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port });
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
    });
}

async function mirrorAnswers() {
    try {
        return (await fetch(`${MIRROR_REST_URL}/api/v1/accounts`)).status === 200;
    } catch {
        return false;
    }
}

async function waitForNetwork() {
    const deadline = Date.now() + NETWORK_READY_TIMEOUT_MS;
    while (!(await canConnect(CONSENSUS_HOST, CONSENSUS_PORT) && await mirrorAnswers())) {
        if (Date.now() > deadline) {
            throw new Error(`The network did not answer on ${CONSENSUS_HOST}:${CONSENSUS_PORT} and ${MIRROR_REST_URL}`);
        }
        await new Promise((resolve) => setTimeout(resolve, NETWORK_POLL_INTERVAL_MS));
    }
}

function readGenesisAccount() {
    const accountsFile = path.join(soloHome, `one-shot-${SOLO_DEPLOYMENT_NAME}`, 'accounts.json');
    if (!fs.existsSync(accountsFile)) {
        throw new Error(`Solo did not write ${accountsFile}`);
    }
    return selectGenesisAccount(JSON.parse(fs.readFileSync(accountsFile, 'utf8')));
}

/** Creates the ED25519 account Guardian and the suite run as, paid by the genesis account. */
async function createOperatorAccount(genesis) {
    const client = Client.forNetwork({ [`${CONSENSUS_HOST}:${CONSENSUS_PORT}`]: CONSENSUS_NODE_ACCOUNT })
        .setOperator(AccountId.fromString(genesis.accountId), PrivateKey.fromStringDer(genesis.privateKey));
    try {
        const operatorKey = PrivateKey.generateED25519();
        const response = await new AccountCreateTransaction()
            .setKeyWithoutAlias(operatorKey.publicKey)
            .setInitialBalance(new Hbar(OPERATOR_HBAR))
            .execute(client);
        const { accountId } = await response.getReceipt(client);
        return { operatorId: accountId.toString(), operatorKey: operatorKey.toStringDer() };
    } finally {
        client.close();
    }
}

function compileContracts() {
    const contractsDir = path.join(repoRoot, 'contracts');
    run('npm', ['install'], { cwd: contractsDir });
    // hardhat.config reads RPC_URL at load time, but `compile` never connects to it.
    run('npx', ['hardhat', 'compile'], { cwd: contractsDir, env: { ...process.env, RPC_URL: 'http://localhost:7546' } });
}

function uploadContractBytecode({ operatorId, operatorKey }) {
    run('node', [path.join(repoRoot, '.github', 'scripts', 'upload-contract-bytecode.mjs')], {
        env: {
            ...process.env,
            ...overrideVariables(),
            OPERATOR_ID: operatorId,
            OPERATOR_KEY: operatorKey,
            ENV_FILE: soloEnvFile,
        },
    });
}

async function up() {
    preflight();
    fs.mkdirSync(soloHome, { recursive: true });
    await deployNetwork(extraCaCertPath(process.env));
    await waitForNetwork();

    const operator = await createOperatorAccount(readGenesisAccount());
    compileContracts();
    fs.writeFileSync(soloEnvFile, renderSoloEnv(operator));
    uploadContractBytecode(operator);

    console.log(`\nLocal network is up. Operator ${operator.operatorId}. Load its settings with:`);
    console.log(`  set -a; source ${path.relative(process.cwd(), soloEnvFile)}; set +a`);
}

function down() {
    let destroyError;
    try {
        runSolo(['one-shot', 'single', 'destroy', '--quiet-mode']);
    } catch (error) {
        destroyError = error;
        console.error(`solo destroy failed, deleting the cluster anyway: ${error.message}`);
    }
    // destroy leaves the kind cluster behind.
    run('kind', ['delete', 'cluster', '--name', KIND_CLUSTER_NAME]);

    const resolved = path.resolve(soloStateDir);
    if (path.dirname(resolved) !== e2eRoot) {
        throw new Error(`Refusing to remove ${resolved}: it is not directly inside ${e2eRoot}`);
    }
    fs.rmSync(resolved, { recursive: true, force: true });

    if (destroyError) {
        throw destroyError;
    }
}

async function main(command) {
    switch (command) {
        case 'up':
            return up();
        case 'down':
            return down();
        default:
            throw new Error('Usage: solo-network.mjs up|down');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main(process.argv[2]).catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}
