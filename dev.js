const execSync = require('child_process').execSync;
const spaw = require('child_process').spawn;
const fs = require('fs');

(async () => {
    const buildAndWatch = async (folder, skipWatch = false) => {
        const log = (message) => console.log(`${folder}: ${message}`);

        await execSync(`npm install --prefix ${folder}`, { stdio: 'inherit', shell: true });

        if (skipWatch) {
            log('skip watch project')
            return;
        }

        if (!fs.existsSync(folder + '/dist/')) {
            await execSync(`npm run build --prefix ${folder}`, { stdio: 'inherit', shell: true });
        }

        await new Promise((resolve) => {
            log('Watching changes...');
            const child = spaw('npm', ['run', 'dev', '--prefix', folder], { shell: true });

            child.stdout.on('data', log);
            child.stderr.on('data', log);

            child.on('close', (code) => {
                resolve(code)
            });
        });

    }
    console.log('Building and watching...');
    await Promise.all([
        "interfaces",
        "common",
        "logger-helper",
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