const { spawn } = require('child_process');
const kill = require('tree-kill');
const path = require('path');
const fs = require('fs');

const { sleep, GenerateTokens } = require("./helpers");

const { Accounts } = require("./test-suits/accounts");
const { Profiles } = require("./test-suits/profiles");
const { Schemas } = require("./test-suits/schemas");
const { Trustchains } = require("./test-suits/trustchains");
const { Policies } = require("./test-suits/policies");


const processes = [];

describe('Tests', async function () {
    before(async function () {
        this.timeout(10000000000);
        const pathArray = [
            [path.resolve(path.join('..', 'logger-service')), {}],
            [path.resolve(path.join('..', 'worker-service')), {}],
            [path.resolve(path.join('..', 'auth-service')), {}],
            [path.resolve(path.join('..', 'ipfs-client')), {IPFS_STORAGE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDZhY0FFMmM3QjA5ODdCMjU1ZGZFMjMxZTA0YzI5NDZBZWI0YzE5NkQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjAwNzIyNzg4MDgsIm5hbWUiOiJ0ZXN0In0.vzt0-vBlbKiUSeyBZ6i3qTBKVMR3RL7CnkEXVNqvSH4'}],
            [path.resolve(path.join('..', 'guardian-service')), {OPERATOR_ID: '0.0.29676495', OPERATOR_KEY: '302e020100300506032b6570042204202119d6291aab20289f12cdb27a0ae446d6b319054e3de81b03564532b8e03cad'}],
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
            console.info(path.parse(p[0]).name, 'was started');
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
