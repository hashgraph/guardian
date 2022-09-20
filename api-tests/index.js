const dotenv = require('dotenv');
dotenv.config();

const { spawn } = require('child_process');
const kill = require('tree-kill');
const path = require('path');

const { sleep, GenerateTokens } = require("./helpers");

const { Accounts } = require("./test-suits/accounts");
const { Profiles } = require("./test-suits/profiles");
const { Trustchains } = require("./test-suits/trustchains");


const processes = [];

describe('Tests', async function () {
    before(async function () {
        this.timeout(10000000000);
        const pathArray = [
            [path.resolve(path.join('..', 'logger-service')), {}],
            [path.resolve(path.join('..', 'worker-service')), {IPFS_STORAGE_API_KEY: process.env.IPFS_STORAGE_API_KEY}],
            [path.resolve(path.join('..', 'auth-service')), {HASHICORP_TOKEN: 'http://vault:8200}'}],
            [path.resolve(path.join('..', 'ipfs-client')), {IPFS_STORAGE_API_KEY: process.env.IPFS_STORAGE_API_KEY}],
            [path.resolve(path.join('..', 'guardian-service')), {OPERATOR_ID: process.env.OPERATOR_ID, OPERATOR_KEY: process.env.OPERATOR_KEY}],
            [path.resolve(path.join('..', 'api-gateway')), {}]
        ];
        for (let p of pathArray) {
            processes.push(
                spawn('npm start', {
                    cwd: p[0],
                    shell: true,
                    env: Object.assign(process.env, p[1])
                })
            )
            console.info(`"${path.parse(p[0]).name}"`, 'was started');
            await sleep(15000);
        }
        await sleep(10000);
    })

    beforeEach(GenerateTokens);

    Accounts();
    Profiles();
    // Schemas();
    Trustchains();
    // Policies();

    after(async function () {
        for (let proc of processes) {
            kill(proc.pid);
        }
    })
});
