// Runs a copy of an e2e-tests shell script in a throwaway checkout where npm, npx and node are stubs
// that append the command line to a log, and fail when it contains failingCommand.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const STUBBED_COMMANDS = ['npm', 'npx', 'node'];

export function createSandbox(scriptName, { yarnrc = 'nodeLinker: node-modules\n\nyarnPath: .yarn/releases/yarn-9.9.9.cjs\n' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'script-sandbox-'));
    fs.mkdirSync(path.join(root, 'e2e-tests', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(root, 'frontend'));
    fs.mkdirSync(path.join(root, 'bin'));
    fs.copyFileSync(path.join(scriptsDir, scriptName), path.join(root, 'e2e-tests', 'scripts', scriptName));
    fs.writeFileSync(path.join(root, '.yarnrc.yml'), yarnrc);
    for (const command of STUBBED_COMMANDS) {
        const stub = `#!/usr/bin/env bash
line="${command} $*"
echo "$line" >> "$COMMAND_LOG"
[[ -n "\${FAILING_COMMAND:-}" && "$line" == *"$FAILING_COMMAND"* ]] && exit 7
exit 0
`;
        fs.writeFileSync(path.join(root, 'bin', command), stub, { mode: 0o755 });
    }
    return {
        root,
        run(args, { failingCommand = '' } = {}) {
            const commandLog = path.join(root, 'commands.log');
            fs.writeFileSync(commandLog, '');
            const result = spawnSync('bash', [path.join(root, 'e2e-tests', 'scripts', scriptName), ...args], {
                encoding: 'utf8',
                env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, COMMAND_LOG: commandLog, FAILING_COMMAND: failingCommand },
            });
            const logged = fs.readFileSync(commandLog, 'utf8').trimEnd();
            return { ...result, commands: logged ? logged.split('\n') : [] };
        },
        remove() { fs.rmSync(root, { recursive: true }); },
    };
}

export const positionOf = (commands, fragment) => commands.findIndex((command) => command.includes(fragment));
