const { spawn } = require('child_process');
const kill  = require('tree-kill');
const path = require('path');

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
            console.log('spawned ', p);
        }
    })

    it('test', async function() {
        this.timeout(10000000000);
        await sleep(1000);
    })

    after(async function() {
        for (let proc of processes) {
            kill(proc.pid);
            console.log('killed ', proc)
        }
    })
});
