#!/usr/bin/env node

import {spawnSync} from 'child_process';
import {Command} from 'commander';

import {PolicyPublisher} from './helpers/policy-publisher.helper.js';
import {ContractPublisher, Network,} from './helpers/contract-publisher.helper.js';
import {ContractHelper} from './helpers/contract.helper.js';

import {TopicHelper} from './helpers/topic.helper.js';

const GUARDIAN_REPOSITORY = 'https://github.com/hashgraph/guardian';

/**
 * Clones the guardian repository
 * @returns {void}
 * @throws {Error} if the clone fails
 */
function cloneGuardian() {
    const clone = spawnSync('git', ['clone', GUARDIAN_REPOSITORY], {
        stdio: 'inherit',
    });

    if (clone.status !== 0) {
        console.log('Error cloning the guardian repository');
        console.log(clone.stderr.toString());
        process.exit(1);
    }
}

/**
 * Checks out a specific version of guardian
 * @param {string} version - the version to checkout
 * @returns {void}
 * @throws {Error} if the checkout fails
 */
function useVersion(version: string) {
    const checkout = spawnSync('git', ['checkout', `v${version}`], {
        stdio: 'inherit',
    });

    if (checkout.status !== 0) {
        console.log('Error checking out the version');
        console.log(checkout.stderr.toString());
        process.exit(1);
    }
}

/**
 * Lists all local guardian versions
 * @returns {void}
 * @throws {Error} if the listing fails
 */
function listLocalReleaseVersions() {
    const list = spawnSync('git', ['tag']);

    if (list.status !== 0) {
        console.log('Error listing local release versions');
        console.log(list.stderr.toString());
        process.exit(1);
    } else {
        console.log(list.stdout.toString());
    }
}

/**
 * Lists all guardian versions of Main repository
 * @returns {void}
 * @throws {Error} if the listing fails
 */
function listRemoteReleaseVersions() {
    const lsRemote = spawnSync('git', [
        'ls-remote',
        '--tags',
        GUARDIAN_REPOSITORY,
    ]);

    if (lsRemote.status !== 0) {
        console.log('Error listing remote release versions');
        process.exit(1);
    } else {
        const result = lsRemote.stdout.toString();
        const tags = result.match(/v?\d+\.\d+\.\d+.*/g);
        if (tags) {
            tags.forEach((tag: string) => console.log(tag));
        }
    }
}

/**
 * Builds Docker Images of the current guardian project
 * @returns {void}
 * @throws {Error} if the build fails
 */
function buildDocker() {
    const build = spawnSync('docker-compose', ['build'], {
        stdio: 'inherit',
    });

    if (build.status !== 0) {
        console.log('Error building the project');
        console.log(build.stderr.toString());
        process.exit(1);
    }
}

/**
 * Installs node packages for the given project using npm or yarn
 * @param projectDir
 * @param npm
 * @returns {void}
 * @throws {Error} if the installation fails
 */
function installNodePacakges(projectDir: string, npm = false) {
    console.log(`Installing packages for ${projectDir}`);

    let cmd: string;
    let args: string[];

    if (npm) {
        cmd = 'npm';
        args = ['install'];
    } else {
        cmd = 'yarn';
        args = ['install'];
    }

    const install = spawnSync(cmd, args, {
        stdio: 'inherit',
        cwd: projectDir,
    });

    if (install.status !== 0) {
        console.log('Error installing packages');
        process.exit(1);
    }
}

/**
 * Builds the given project using npm or yarn
 * @param projectDir
 * @param npm
 * @returns {void}
 * @throws {Error} if the build fails
 */
function buildPackage(projectDir: string, npm = false) {
    console.log(`Building ${projectDir}`);

    let cmd: string;
    let args: string[];

    if (npm) {
        cmd = 'npm';
        args = ['run', 'build'];
    } else {
        cmd = 'yarn';
        args = ['build'];
    }

    const build = spawnSync(cmd, args, {
        stdio: 'inherit',
        cwd: projectDir,
    });

    if (build.status !== 0) {
        console.log('Error building the project');
        process.exit(1);
    }
}

/**
 * Builds all services of the current guardian project
 * @param npm
 * @returns {void}
 * @throws {Error} if the build fails
 */
function buildNode(npm = false) {
    const services = [
        'interfaces',
        'common',
        'api-gateway',
        'logger-service',
        'mrv-sender',
        'topic-viewer',
        'tree-viewer',
        'analytics-service',
        'auth-service',
        'worker-service',
        'guardian-service',
        'frontend',
    ];

    const cwd = process.cwd();
    for (const service of services) {
        const projectDir = `${cwd}/${service}`;

        installNodePacakges(projectDir, npm);

        buildPackage(projectDir, npm);
    }
}

/**
 * Removes all docker images of the current guardian project
 * @returns {void}
 * @throws {Error} if the removal fails
 */
function cleanDocker() {
    const getImages = spawnSync(
        'docker',
        ['images', '--filter=reference=guardian_*', '--format', '{{.ID}}'],
        {
            stdio: 'inherit',
        }
    );

    if (getImages.status !== 0) {
        console.log('Error listing docker images');
        console.log(getImages.stderr.toString());
        process.exit(1);
    }

    const images = getImages.stdout
        .toString()
        .split('\n')
        .filter((image: string) => image !== '');

    const rmi = spawnSync('docker', ['rmi', ...images], {
        stdio: 'inherit',
    });

    if (rmi.status !== 0) {
        console.log('Error remove docker images');
        console.log(rmi.stderr.toString());
        process.exit(1);
    }
}

/**
 * Removes node module and dist folder of a specific module
 * @param projectDir
 * @returns {void}
 * @throws {Error} if the removal fails
 */
function cleanNodeService(projectDir: string) {
    const clean = spawnSync('rm', ['-rf', 'node_modules', 'dist'], {
        stdio: 'inherit',
        cwd: projectDir,
    });

    if (clean.status !== 0) {
        console.log('Error cleaning node service');
        console.log(clean.stderr.toString());
        process.exit(1);
    }
}

/**
 * Removes node module and dist folder of all modules
 * @returns {void}
 * @throws {Error} if the removal fails
 */
function cleanNode() {
    const services = [
        'interfaces',
        'common',
        'api-gateway',
        'logger-service',
        'mrv-sender',
        'topic-viewer',
        'tree-viewer',
        'analytics-service',
        'auth-service',
        'worker-service',
        'guardian-service',
        'frontend',
    ];

    const cwd = process.cwd();
    for (const service of services) {
        const projectDir = `${cwd}/${service}`;

        cleanNodeService(projectDir);
    }
}

/**
 * Starts the guardian application using docker-compose
 * @returns {void}
 * @throws {Error} if the start fails
 */
function restartDocker() {
    const start = spawnSync('docker-compose', ['restart'], {
        stdio: 'inherit',
    });

    if (start.status !== 0) {
        console.log('Error starting docker containers');
        console.log(start.stderr.toString());
        process.exit(1);
    }
}

/**
 * Starts the guardian application using docker-compose
 * @returns {void}
 * @throws {Error} if the start fails
 */
function startDocker() {
    const start = spawnSync('docker-compose', ['up', '-d', '--no-build'], {
        stdio: 'inherit',
    });

    if (start.status !== 0) {
        console.log('Error starting docker containers');
        console.log(start.stderr.toString());
        process.exit(1);
    }
}

/**
 * Stops the guardian application using docker-compose
 * @returns {void}
 * @throws {Error} if the stop fails
 */
function stopDocker() {
    const stop = spawnSync('docker-compose', ['stop'], {
        stdio: 'inherit',
    });

    if (stop.status !== 0) {
        console.log('Error stopping docker containers');
        console.log(stop.stderr.toString());
        process.exit(1);
    }
}

/**
 * Destroys the guardian application using docker-compose
 * @returns {void}
 * @throws {Error} if the destroy fails
 */
function destroyDocker() {
    const destroy = spawnSync('docker-compose', ['down', '-v'], {
        stdio: 'inherit',
    });

    if (destroy.status !== 0) {
        console.log('Error destroying docker containers');
        console.log(destroy.stderr.toString());
        process.exit(1);
    }
}

/**
 * Starts the external services: vault, Nats, mongo, ipfs-node using docker-compose
 * @returns {void}
 * @throws {Error} if the start fails
 */
function startExternalServices() {
    const start = spawnSync(
        'docker-compose',
        [
            '-f',
            'docker-compose-dev.yml',
            'up',
            '-d',
            'message-broker',
            'mongo',
            'ipfs-node',
        ],
        {
            stdio: 'inherit',
        }
    );

    if (start.status !== 0) {
        console.log('Error starting docker containers');
        console.log(start.stderr.toString());
        process.exit(1);
    }
}

/**
 * Stops the external services: vault, Nats, mongo, ipfs-node using docker-compose
 * @returns {void}
 * @throws {Error} if the start fails
 */
function stopExternalServices() {
    const stop = spawnSync(
        'docker-compose',
        [
            '-f',
            'docker-compose-dev.yml',
            'stop',
            'message-broker',
            'mongo',
            'ipfs-node',
        ],
        {
            stdio: 'inherit',
        }
    );

    if (stop.status !== 0) {
        console.log('Error stopping docker containers');
        console.log(stop.stderr.toString());
        process.exit(1);
    }
}

/**
 * Stops the external services: vault, Nats, mongo, ipfs-node using docker-compose
 * @returns {void}
 * @throws {Error} if the start fails
 */
function destroyExternalServices() {
    const stop = spawnSync(
        'docker-compose',
        ['-f', 'docker-compose-dev.yml', 'down', '-v'],
        {
            stdio: 'inherit',
        }
    );

    if (stop.status !== 0) {
        console.log('Error stopping docker containers');
        console.log(stop.stderr.toString());
        process.exit(1);
    }
}

/**
 * Starts the guardian application using pm2
 * @returns {void}
 * @throws {Error} if the start fails
 */
function startPm2() {
    const services = [
        'api-gateway',
        'logger-service',
        'mrv-sender',
        'topic-viewer',
        'analytics-service',
        'auth-service',
        'worker-service',
        'guardian-service',
        'frontend',
    ];

    startExternalServices();

    const cwd = process.cwd();
    for (const service of services) {
        const projectDir = `${cwd}/${service}`;

        const start = spawnSync(
            'pm2',
            ['start', '"npm run start"', '-n', service],
            {
                stdio: 'inherit',
                cwd: projectDir,
            }
        );

        if (start.status !== 0) {
            console.log('Error starting service');
            console.log(start.stderr.toString());
            process.exit(1);
        }
    }
}

/**
 * Retarts the guardian application using pm2
 * @returns {void}
 * @throws {Error} if the start fails
 */
function restartPm2() {
    const services = [
        'api-gateway',
        'logger-service',
        'mrv-sender',
        'topic-viewer',
        'analytics-service',
        'auth-service',
        'worker-service',
        'guardian-service',
        'frontend',
    ];

    startExternalServices();

    const cwd = process.cwd();
    for (const service of services) {
        const projectDir = `${cwd}/${service}`;

        const start = spawnSync('pm2', ['restart', service], {
            stdio: 'inherit',
            cwd: projectDir,
        });

        if (start.status !== 0) {
            console.log('Error starting service');
            console.log(start.stderr.toString());
            process.exit(1);
        }
    }
}

/**
 * Stops the guardian application using pm2
 * @returns {void}
 * @throws {Error} if the stop fails
 */
function stopPm2() {
    const services = [
        'api-gateway',
        'logger-service',
        'mrv-sender',
        'topic-viewer',
        'analytics-service',
        'auth-service',
        'worker-service',
        'guardian-service',
        'frontend',
    ];

    stopExternalServices();

    for (const service of services) {
        const stop = spawnSync('pm2', ['stop', service], {
            stdio: 'inherit',
        });

        if (stop.status !== 0) {
            console.log('Error stopping service');
            console.log(stop.stderr.toString());
            process.exit(1);
        }
    }
}

/**
 * Delete all guardian application running by pm2
 * @returns {void}
 * @throws {Error} if the destroy fails
 */
function destroyPm2() {
    const services = [
        'api-gateway',
        'logger-service',
        'mrv-sender',
        'topic-viewer',
        'analytics-service',
        'auth-service',
        'worker-service',
        'guardian-service',
        'frontend',
    ];

    destroyExternalServices();

    for (const service of services) {
        const destroy = spawnSync('pm2', ['delete', service], {
            stdio: 'inherit',
        });

        if (destroy.status !== 0) {
            console.log('Error destroying service');
            console.log(destroy.stderr.toString());
            process.exit(1);
        }
    }
}

/**
 * Main function of the guardian-cli
 * Runs the commander program and parses the arguments passed to the cli
 * All the commands are defined here
 * create, use, list, list-remote, build, clean, start, stop, destroy
 * create: clones the guardian repository and creates a new project
 * use: uses a specific version of guardian
 * list: lists all local guardian versions
 * list-remote: lists all remote guardian versions
 * build: builds the current guardian project
 * clean: cleans the artifacts of the current guardian project
 * start: starts guardian application
 * stop: stops guardian application
 * destroy: destroys the current guardian project
 *
 * @returns {void}
 *
 */
function main() {
    const program = new Command();

    program.option('-v, --version', 'output the current version', () => {
        console.log('0.0.1');
    });

    program
        .command('create')
        .description('create a new guardian project')
        .action(() => {
            cloneGuardian();
        });

    program
        .command('use <version>')
        .description('use a specific version of guardian')
        .action((version) => {
            useVersion(version);
        });

    program
        .command('ls')
        .description('list all local guardian versions')
        .action(() => {
            listLocalReleaseVersions();
        });

    program
        .command('ls-remote')
        .description('list all remote guardian versions')
        .action(() => {
            listRemoteReleaseVersions();
        });

    program
        .command('build')
        .description('build the current guardian project')
        .option('-d --docker', 'build the project in a docker container')
        .option('-n --npm', 'use npm to install dependencies')
        .option('-y --yarn', 'use yarn to install dependencies')
        .action((options) => {
            if (options.docker) {
                buildDocker();
            } else if (options.npm) {
                buildNode(true);
            } else if (options.yarn) {
                buildNode();
            } else {
                console.log('Please specify a build option');
            }
        });

    program
        .command('clean')
        .description('clean the artifacts of the current guardian project')
        .option('-d --docker', 'clean docker images')
        .option('-n --node', 'clean node modules and dists')
        .action((options) => {
            if (options.docker) {
                cleanDocker();
            } else if (options.node) {
                cleanNode();
            } else {
                console.log('Please specify a clean option');
            }
        });

    program
        .command('start')
        .description('start guardian application')
        .option('-d --docker', 'start guardian using docker')
        .option('-p --pm2', 'start guardian using pm2')
        .action((options) => {
            if (options.docker) {
                startDocker();
            } else if (options.pm2) {
                startPm2();
            } else {
                console.log('Please specify a start option');
            }
        });

    program
        .command('restart')
        .description('restart guardian application')
        .option('-d --docker', 'start guardian using docker')
        .option('-p --pm2', 'start guardian using pm2')
        .action((options) => {
            if (options.docker) {
                restartDocker();
            } else if (options.pm2) {
                restartPm2();
            } else {
                console.log('Please specify a start option');
            }
        });

    program
        .command('stop')
        .description('stop guardian application')
        .option('-d --docker', 'stop guardian using docker')
        .option('-p --pm2', 'stop guardian using pm2')
        .action((options) => {
            if (options.docker) {
                stopDocker();
            } else if (options.pm2) {
                stopPm2();
            } else {
                console.log('Please specify a stop option');
            }
        });

    program
        .command('destroy')
        .description('destroy the current guardian project')
        .option('-d --docker', 'destroy docker images')
        .option('-p --pm2', 'destroy node modules and dists')
        .action((options) => {
            if (options.docker) {
                destroyDocker();
            } else if (options.pm2) {
                destroyPm2();
            } else {
                console.log('Please specify a destroy option');
            }
        });

    program
        .command('publish-policies')
        .description('Import and publish policies')
        .argument('<policies-directory>', 'Path to policiy files')
        .option(
            '-c --config-file-path <path>',
            'Path to config file',
            './config.json'
        )
        .option(
            '-b --base-url <url>',
            'Base guardian URL',
            'http://localhost:3002/'
        )
        .option('-u --user <user>', 'User', 'StandardRegistry')
        .option('-p --password <password>', 'Password', 'test')
        .option('-o --output <path>', 'Output information file path')
        .action(async (policiesDirectory, options) => {
            try {
                console.log(options);
                await PolicyPublisher.publish(
                    policiesDirectory,
                    options.configFilePath,
                    options.baseUrl,
                    options.user,
                    options.password,
                    options.output
                );
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('deploy-contract-file')
        .description('Deploy contract file')
        .argument('<contract-path>', 'Path to contract file')
        .argument('<contract-name>', 'Contract name')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (contractPath, contractName, account, key, options) => {
            try {
                const contractByteCode =
                    await ContractPublisher.compileContract(
                        contractPath,
                        contractName
                    );
                const contractFileId =
                    await ContractPublisher.deployContractFile(
                        contractByteCode,
                        {
                            operatorId: account,
                            operatorKey: key,
                        },
                        options.network
                    );
                console.log(
                    `${contractName} contract file identifier - ${contractFileId}`
                );
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('deploy-contract')
        .description('Deploy contract file')
        .argument('<contract-file-id>', 'Contract file identifier')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-g --gas <gas>', 'Gas')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (contractFileId, account, key, options) => {
            try {
                const contractId = await ContractPublisher.deployContract(
                    contractFileId,
                    options.gas && parseInt(options.gas, 10),
                    {
                        operatorId: account,
                        operatorKey: key,
                    },
                    options.network
                );
                console.log(
                    `${contractFileId} contract identifier - ${contractId}`
                );
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('propose-owner')
        .description('Propose new owner for contract')
        .argument('<contract-id>', 'Contract identifier')
        .argument('<new-owner-address>', 'New owner hedera account id or evm address')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-g --gas <gas>', 'Gas')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (contractId, newOwnerAddress, account, key, options) => {
            try {
                const receipt = await ContractHelper.proposeOwner(
                    contractId,
                    newOwnerAddress,
                    options.gas && parseInt(options.gas, 10),
                    { operatorId: account, operatorKey: key },
                    options.network
                );
                console.log(`Owner proposed for ${contractId}. Status: ${receipt.status.toString()}`);
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('claim-owner')
        .description('Claim ownership for contract')
        .argument('<contract-id>', 'Contract identifier')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-g --gas <gas>', 'Gas')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (contractId, account, key, options) => {
            try {
                const receipt = await ContractHelper.claimOwner(
                    contractId,
                    options.gas && parseInt(options.gas, 10),
                    { operatorId: account, operatorKey: key },
                    options.network
                );
                console.log(`Ownership claimed for ${contractId}. Status: ${receipt.status.toString()}`);
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('remove-owner')
        .description('Remove owner from contract')
        .argument('<contract-id>', 'Contract identifier')
        .argument('<owner-address>', 'Owner hedera account id or evm address')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-g --gas <gas>', 'Gas')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (contractId, ownerAddress, account, key, options) => {
            try {
                const receipt = await ContractHelper.removeOwner(
                    contractId,
                    ownerAddress,
                    options.gas && parseInt(options.gas, 10),
                    { operatorId: account, operatorKey: key },
                    options.network
                );
                console.log(`Owner removed from ${contractId}. Status: ${receipt.status.toString()}`);
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    // -------------------- TOPIC COMMANDS --------------------

    program
        .command('create-topic')
        .description('Create new Hedera topic')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-m --memo <memo>', 'Topic memo')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (account, key, options) => {
            try {
                const topicId = await TopicHelper.createTopic(
                    account,
                    key,
                    options.memo,
                    options.network
                );

                console.log(`Topic created: ${topicId}`);
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('topic-info')
        .description('Get Hedera topic info')
        .argument('<topic-id>', 'Topic identifier')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (topicId, account, key, options) => {
            try {
                const info = await TopicHelper.getTopicInfo(
                    account,
                    key,
                    topicId,
                    options.network
                );

                console.log(JSON.stringify(info, null, 2));
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('topic-messages')
        .description('Read messages from Hedera topic')
        .argument('<topic-id>', 'Topic identifier')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .option('--start-time <iso>', 'Start time (ISO, default: from epoch)')
        .option('--limit <number>', 'Max messages to fetch (default: 50)', '50')
        .action(async (topicId, account, key, options) => {
            try {
                const limit = options.limit
                    ? parseInt(options.limit, 10)
                    : 50;

                const messages = await TopicHelper.getMessages(
                    account,
                    key,
                    topicId,
                    {
                        startTime: options.startTime,
                        limit,
                    },
                    options.network
                );

                console.log(JSON.stringify(messages, null, 2));
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('topic-last-message')
        .description('Read last message from Hedera topic (naive, via full scan)')
        .argument('<topic-id>', 'Topic identifier')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .action(async (topicId, account, key, options) => {
            try {
                const messages = await TopicHelper.getMessages(
                    account,
                    key,
                    topicId,
                    {
                        limit: 50,
                    },
                    options.network
                );

                if (!messages.length) {
                    console.log('No messages in topic');
                    return;
                }

                const last = messages[messages.length - 1];

                console.log(JSON.stringify(last, null, 2));
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program
        .command('publish-topic-message')
        .description('Publish message to Hedera topic')
        .argument('<topic-id>', 'Topic identifier')
        .argument('<account>', 'Hedera account id')
        .argument('<key>', 'Hedera private key')
        .argument('<message>', 'Message to publish (string or JSON)')
        .option('-n --network <network>', 'Network', Network.TESTNET)
        .option('-j --json', 'Treat <message> as JSON and stringify it')
        .action(async (topicId, account, key, message, options) => {
            try {
                let payload = message;

                if (options.json) {
                    try {
                        const parsed = JSON.parse(message);
                        payload = JSON.stringify(parsed);
                    } catch (e) {
                        console.error('Invalid JSON in <message> argument');
                        process.exit(1);
                    }
                }

                const result = await TopicHelper.publishMessage(
                    account,
                    key,
                    topicId,
                    payload,
                    options.network
                );

                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        });

    program.parse(process.argv);
}

main();
