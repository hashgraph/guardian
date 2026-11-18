// Runs a copy of an e2e-tests shell script in a throwaway checkout where npm, npx, node and docker are stubs
// that append the command line, and the CYPRESS_* variables it got, to logs, and fail when it contains failingCommand.
// scriptPath is relative to e2e-tests.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const STUBBED_COMMANDS = ['npm', 'npx', 'node', 'docker'];

// A caller that has CYPRESS_* exported (a run in progress) must not change what the script under test hands to Cypress.
const withoutCypressVariables = (environment) => Object.fromEntries(Object.entries(environment).filter(([name]) => !name.startsWith('CYPRESS_')));

export function createSandbox(scriptName, {
    yarnrc = 'nodeLinker: node-modules\n\nyarnPath: .yarn/releases/yarn-9.9.9.cjs\n',
    scriptPath = path.join('scripts', scriptName),
} = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'script-sandbox-'));
    fs.mkdirSync(path.join(root, 'e2e-tests', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(root, 'frontend'));
    fs.mkdirSync(path.join(root, 'bin'));
    const script = path.join(root, 'e2e-tests', scriptPath);
    fs.copyFileSync(path.join(scriptsDir, '..', scriptPath), script);
    fs.writeFileSync(path.join(root, '.yarnrc.yml'), yarnrc);
    for (const command of STUBBED_COMMANDS) {
        const stub = `#!/usr/bin/env bash
line="${command} $*"
echo "$line" >> "$COMMAND_LOG"
env | grep '^CYPRESS_' | sort | sed "s|^|${command}: |" >> "$COMMAND_LOG.env"
[[ -n "\${FAILING_COMMAND:-}" && "$line" == *"$FAILING_COMMAND"* ]] && exit 7
exit 0
`;
        fs.writeFileSync(path.join(root, 'bin', command), stub, { mode: 0o755 });
    }
    return {
        root,
        run(args, { failingCommand = '', env = {} } = {}) {
            const commandLog = path.join(root, 'commands.log');
            fs.writeFileSync(commandLog, '');
            fs.writeFileSync(`${commandLog}.env`, '');
            const result = spawnSync('bash', [script, ...args], {
                encoding: 'utf8',
                env: { ...withoutCypressVariables(process.env), ...env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, COMMAND_LOG: commandLog, FAILING_COMMAND: failingCommand },
            });
            const lines = (file) => {
                const logged = fs.readFileSync(file, 'utf8').trimEnd();
                return logged ? logged.split('\n') : [];
            };
            return { ...result, commands: lines(commandLog), cypressVariables: lines(`${commandLog}.env`) };
        },
        remove() { fs.rmSync(root, { recursive: true }); },
    };
}

export const positionOf = (commands, fragment) => commands.findIndex((command) => command.includes(fragment));
