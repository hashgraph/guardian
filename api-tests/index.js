const { spawn } = require('child_process');
const path = require('path');

async function Run() {

    function sleep(time) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, time);
        })
    }

    const pathArray = [
        [path.resolve(path.join('..', 'logger-service')), { GUARDIAN_ENV: 'develop' }],
        [path.resolve(path.join('..', 'notification-service')), { GUARDIAN_ENV: 'develop' }],
        [path.resolve(path.join('..', 'worker-service')), {
            IPFS_STORAGE_KEY: process.env.IPFS_STORAGE_KEY,
            IPFS_STORAGE_PROOF: process.env.IPFS_STORAGE_PROOF,
            GUARDIAN_ENV: 'develop'
        }],
        [path.resolve(path.join('..', 'auth-service')), {
            HASHICORP_ADDRESS: `http://${process.env.HASHICORP_HOST}:${process.env.HASHICORP_PORT}`,
            GUARDIAN_ENV: 'develop',
            ACCESS_TOKEN_UPDATE_INTERVAL: '30000000'
        }],
        [path.resolve(path.join('..', 'policy-service')), {
            OPERATOR_ID: process.env.OPERATOR_ID,
            OPERATOR_KEY: process.env.OPERATOR_KEY,
            GUARDIAN_ENV: 'develop'
        }],
        [path.resolve(path.join('..', 'guardian-service')), {
            OPERATOR_ID: process.env.OPERATOR_ID,
            OPERATOR_KEY: process.env.OPERATOR_KEY,
            GUARDIAN_ENV: 'develop'
        }],
        [path.resolve(path.join('..', 'api-gateway')), { GUARDIAN_ENV: 'develop' }]
    ];
    for (let p of pathArray) {
        const process = spawn('npm start', {
            cwd: p[0],
            shell: true,
            detached: true,
            env: Object.assign(process.env, p[1])
        })
        process.on('message', () => {
            console.log(p, message);
        });
        process.on('exit', (code) => {
            console.log(p, 'exit with code', code)
        })
        process
        processes.push(
            process
        )
        console.info(`"${path.parse(p[0]).name}"`, 'was started');
        await sleep(20000);
    }
    await sleep(10000);
}

var done = (function wait() {
    if (!done) setTimeout(wait, 1000)
})();

Run().then(() => {
    console.log('services started');
});
