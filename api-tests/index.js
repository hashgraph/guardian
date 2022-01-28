const { spawn } = require('child_process');
const kill  = require('tree-kill');
const path = require('path');
const fs = require('fs');

const processes = []

function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time)
    })
}


describe('Tests', function() {
    before(async function() {
        const configs = [
            {from: path.resolve(path.join('configs', 'guardian-service', 'config.json')) , to:path.resolve(path.join('..', 'guardian-service', 'config.json'))},
            {from: path.resolve(path.join('configs', 'ui-service', '.env')) , to:path.resolve(path.join('..', 'ui-service', '.env'))},
            {from: path.resolve(path.join('configs', 'ipfs-client', '.env')) , to:path.resolve(path.join('..', 'ipfs-client', '.env'))},
        ]

        for (let conf of configs) {
            fs.copyFileSync(conf.from, conf.to);
        }

        this.timeout(10000000000);
        const pathArray = [
            path.resolve(path.join('..', 'message-broker')),
            path.resolve(path.join('..', 'guardian-service')),
            path.resolve(path.join('..', 'ui-service'))
        ];
        for (let p of pathArray) {
            processes.push(
                spawn('npm start', {
                    cwd: p,
                    shell: true,
                    // detached: true
                })
            )
            await sleep(5000);
        }
    })

    it('test', async function() {
        this.timeout(10000000000);
        await sleep(1000);
    })

    after(async function() {
        for (let proc of processes) {
            kill(proc.pid);
        }
    })
});
