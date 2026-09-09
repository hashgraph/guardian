#!/usr/bin/env node
/**
 * Uploads the compiled retire/wipe contract bytecode to a Hedera network as files, and prints the
 * four Hedera File IDs Guardian expects in WIPE_CONTRACT_FILE_ID, RETIRE_CONTRACT_FILE_ID,
 * RETIRE_SINGLE_FILE_ID and RETIRE_DOUBLE_FILE_ID.
 *
 * guardian-service deploys its contracts from those File IDs
 * (guardian-service/src/api/helpers/contract-api.ts), and the ones shipped in
 * configs/.env..guardian.system are testnet files. A freshly provisioned local network holds no
 * such files, so every 013_contracts spec would fail on the first deploy: this script recreates
 * them from the artifacts of `contracts/`.
 *
 * Because the bytecode is compiled from the same commit as the event ABIs in
 * guardian-service/src/api/contract.service.ts, this also removes the drift described in
 * e2e-tests/pending-issues/contract-bytecode-must-match-the-service-abi.md.
 *
 * Usage:
 *   OPERATOR_ID=0.0.1234 OPERATOR_KEY=302e...  node upload-contract-bytecode.mjs
 *
 * Environment:
 *   OPERATOR_ID          MANDATORY, the account paying for the file creations
 *   OPERATOR_KEY         MANDATORY, its private key (DER hex or raw), it also becomes the file key
 *   HEDERA_NET           localnode (default) | testnet | previewnet | mainnet
 *   LOCALNODE_ADDRESS    default 127.0.0.1, only used when HEDERA_NET=localnode
 *   CONTRACTS_DIR        default <repo>/contracts, where `npx hardhat compile` wrote artifacts/
 *   GITHUB_OUTPUT        when set, the ids are also appended to it as wipe/retire/
 *                        retireSingle/retireDouble
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    AccountId,
    Client,
    FileAppendTransaction,
    FileCreateTransaction,
    Hbar,
    PrivateKey,
} from '@hiero-ledger/sdk';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACTS_DIR = process.env.CONTRACTS_DIR || path.join(REPO_ROOT, 'contracts');

/** Output name -> hardhat artifact, relative to `contracts/artifacts`. */
const CONTRACTS = {
    wipe: 'src/wipe/Wipe.sol/Wipe.json',
    retire: 'src/retire/Retire.sol/Retire.json',
    retireSingle: 'src/retire/retire-single-token/RetireSingleToken.sol/RetireSingleToken.json',
    retireDouble: 'src/retire/retire-double-token/RetireDoubleToken.sol/RetireDoubleToken.json',
};

// ContractCreateTransaction reads the bytecode file as ASCII hex, which is also what
// HederaSDKHelper.ensureHexBytecodeFile (worker-service) checks for before deploying.
// FileCreate carries the first chunk, FileAppend the rest; 4096 keeps every chunk well inside
// the transaction size limit.
const CHUNK_SIZE = 4096;
const MAX_FEE = new Hbar(20);

function fail(message) {
    console.error(`::error::${message}`);
    process.exit(1);
}

function createClient() {
    const network = process.env.HEDERA_NET || 'localnode';
    switch (network) {
        case 'localnode': {
            const address = process.env.LOCALNODE_ADDRESS || '127.0.0.1';
            // The same topology common/src/hedera-modules/environment.ts hardcodes for localnode.
            return Client.forNetwork({ [`${address}:50211`]: new AccountId(3) });
        }
        case 'testnet':
            return Client.forTestnet();
        case 'previewnet':
            return Client.forPreviewnet();
        case 'mainnet':
            return Client.forMainnet();
        default:
            return fail(`Unknown HEDERA_NET '${network}'`);
    }
}

function readBytecode(name, artifactPath) {
    const file = path.join(CONTRACTS_DIR, 'artifacts', artifactPath);
    if (!fs.existsSync(file)) {
        fail(`Artifact for '${name}' not found at ${file}; run \`npx hardhat compile\` in ${CONTRACTS_DIR} first`);
    }
    const { bytecode } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof bytecode !== 'string' || !/^0x[0-9a-fA-F]+$/.test(bytecode)) {
        fail(`Artifact ${file} does not carry a hex 'bytecode' field`);
    }
    return bytecode.slice(2);
}

async function uploadBytecode(client, fileKey, name, hex) {
    const created = await new FileCreateTransaction()
        .setKeys([fileKey])
        .setContents(hex.slice(0, CHUNK_SIZE))
        .setMaxTransactionFee(MAX_FEE)
        .execute(client);
    const { fileId } = await created.getReceipt(client);

    for (let offset = CHUNK_SIZE; offset < hex.length; offset += CHUNK_SIZE) {
        const appended = await new FileAppendTransaction()
            .setFileId(fileId)
            .setContents(hex.slice(offset, offset + CHUNK_SIZE))
            .setMaxChunks(Number.MAX_SAFE_INTEGER)
            .setMaxTransactionFee(MAX_FEE)
            .execute(client);
        await appended.getReceipt(client);
    }

    console.log(`uploaded ${name}: ${fileId} (${hex.length / 2} bytes of bytecode)`);
    return fileId.toString();
}

/** The env variable each output feeds, for the summary printed at the end. */
const ENV_VARIABLE = {
    wipe: 'WIPE_CONTRACT_FILE_ID',
    retire: 'RETIRE_CONTRACT_FILE_ID',
    retireSingle: 'RETIRE_SINGLE_FILE_ID',
    retireDouble: 'RETIRE_DOUBLE_FILE_ID',
};

const { OPERATOR_ID, OPERATOR_KEY } = process.env;
if (!OPERATOR_ID || !OPERATOR_KEY) {
    fail('OPERATOR_ID and OPERATOR_KEY are mandatory');
}

const operatorKey = PrivateKey.fromStringDer(OPERATOR_KEY);
const client = createClient().setOperator(AccountId.fromString(OPERATOR_ID), operatorKey);

const fileIds = {};
try {
    for (const [name, artifactPath] of Object.entries(CONTRACTS)) {
        fileIds[name] = await uploadBytecode(client, operatorKey.publicKey, name, readBytecode(name, artifactPath));
    }
} finally {
    client.close();
}

// Printed unconditionally and in env-file form, so running this by hand is all it takes to fill in
// the *_FILE_ID variables of a configs/.env.<env>.guardian.system file. The workflow reads
// GITHUB_OUTPUT instead, which is only written when Actions provides it.
console.log('\nPaste into your configs/.env.<env>.guardian.system:');
for (const [name, id] of Object.entries(fileIds)) {
    console.log(`${ENV_VARIABLE[name]}="${id}"`);
}

if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        Object.entries(fileIds).map(([name, id]) => `${name}=${id}\n`).join(''),
    );
}
