const execSync = require('child_process').execSync;
const spaw = require('child_process').spawn;
const fs = require('fs');

(async () => {
    const buildAndWatch = async (folder, skipWatch = false) => {
        const log = (message) => console.log(`${folder}: ${message}`);

        await execSync(`yarn --cwd ${folder}`, { stdio: 'inherit', shell: true });

        if (skipWatch) {
            log('skip watch project')
            return;
        }

        await execSync(`yarn --cwd ${folder} build`, { stdio: 'inherit', shell: true });

        await new Promise((resolve) => {
            log('Watching changes...');
            const child = spaw('yarn', ['--cwd', folder, 'dev'], { shell: true });

            child.stdout.on('data', log);
            child.stderr.on('data', log);

            child.on('close', (code) => {
                resolve(code)
            });
        });

    }
    await execSync('yarn', { stdio: 'inherit', shell: true })
    console.log('Building and watching...');
    await Promise.all([
        "interfaces",
        "common",
        "logger-service",
        "frontend",
        "auth-service",
        "guardian-service",
        "api-gateway",
        "mrv-sender",
        "ipfs-client",
        "topic-viewer"
    ].map(project => buildAndWatch(project, project === "frontend")));
})();