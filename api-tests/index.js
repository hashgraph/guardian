const { spawn } = require('child_process');
const kill  = require('tree-kill');
const path = require('path');
const fs = require('fs');

const {sleep, GenerateTokens} = require("./helpers");

const {Accounts} = require("./test-suits/accounts");
const {Profiles} = require("./test-suits/profiles");
const {Schemas} = require("./test-suits/schemas");
const {Tokens} = require("./test-suits/tokens");
const {Trustchains} = require("./test-suits/trustchains");
const {Policies} = require("./test-suits/policies");
const {Ipfs} = require("./test-suits/ipfs");


const processes = [];

describe('Tests', async function() {
    before(async function() {
        const configs = [
            {from: path.resolve(path.join('configs', 'guardian-service', '.env')) , to:path.resolve(path.join('..', 'guardian-service', '.env'))},
            {from: path.resolve(path.join('configs', 'ipfs-client', '.env')) , to:path.resolve(path.join('..', 'ipfs-client', '.env'))},
        ]

        for (let conf of configs) {
            fs.copyFileSync(conf.from, conf.to);
        }

        this.timeout(10000000000);
        const pathArray = [
            path.resolve(path.join('..', 'message-broker')),
            path.resolve(path.join('..', 'ipfs-client')),
            path.resolve(path.join('..', 'guardian-service')),
            path.resolve(path.join('..', 'ui-service'))
        ];
        for (let p of pathArray) {
            processes.push(
                spawn('npm start', {
                    cwd: p,
                    shell: true,
                })
            )
            console.log(p, 'was started');
            await sleep(15000);
        }
        await sleep(35000);
    })

    beforeEach(GenerateTokens);

    Accounts();
    Profiles();
    Schemas();
    Tokens();
    Trustchains();
    Policies();

    after(async function() {
        for (let proc of processes) {
            kill(proc.pid);
        }
    })
});
