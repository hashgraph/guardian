const { exec } = require('child_process');
const path = require('path');

describe('Tests', function() {
    before(async function() {
        exec(`npm --prefix ${path.resolve(path.join('..', 'message-broker'))} start`, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
        });
        exec(`npm --prefix ${path.resolve(path.join('..', 'guardian-service'))} start`, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
        })
        exec(`npm --prefix ${path.resolve(path.join('..', 'ui-service'))} start`, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
        })
    })

    it('test', async function() {
        this.timeout(10000000000);
        await new Promise(resolve => {
            setTimeout(() => {
                resolve()
            }, 100000);
        })
    })
});
