#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { Command } from 'commander';

const GUARDIAN_REPOSITORY = 'https://github.com/hashgraph/guardian';

/**
 * Clones the guardian repository
 * @returns {void}
 * @throws {Error} if the clone fails
 */
function cloneGuardian() {
  const clone = spawnSync('git', ['clone', GUARDIAN_REPOSITORY], {
    stdio: 'inherit'
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
    stdio: 'inherit'
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
    console.log(list.stdout.toString())
  }
}

/**
 * Lists all guardian versions of Main repository
 * @returns {void}
 * @throws {Error} if the listing fails
 */
function listRemoteReleaseVersions() {
  const lsRemote = spawnSync('git', ['ls-remote', '--tags', GUARDIAN_REPOSITORY]);

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
    stdio: 'inherit'
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
    cwd: projectDir,
  });

  if(build.status !== 0) {
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
    'auth-service',
    'worker-service',
    'guardian-service',
    'frontend',
  ]

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
  const getImages = spawnSync('docker', ['images', '--filter=reference=guardian_*', '--format', '{{.ID}}'], {
    stdio: 'pipe'
  });

  if (getImages.status !== 0) {
    console.log('Error listing docker images');
    console.log(getImages.stderr.toString());
    process.exit(1);
  }

  const images = getImages.stdout.toString().split('\n').filter((image: string) => image !== '');

  const rmi = spawnSync('docker', ['rmi', ...images], {
    stdio: 'inherit'
  })

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
    'auth-service',
    'worker-service',
    'guardian-service',
    'frontend',
  ]

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
async function startDocker() {
  const start = spawnSync('docker-compose', ['up', '-d', '--no-build'])

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
async function stopDocker() {
  const stop = spawnSync('docker-compose', ['stop'])

  if (stop.status !== 0) {
    console.log('Error stopping docker containers');
    console.log(stop.stderr.toString());
    process.exit(1);
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

  program.command('create')
    .description('create a new guardian project')
    .action(() => {
      cloneGuardian();
    });

  program.command('use <version>')
    .description('use a specific version of guardian')
    .action((version) => {
      useVersion(version);
    });

  program.command('ls')
    .description('list all local guardian versions')
    .action(() => {
      listLocalReleaseVersions();
    });

  program.command('ls-remote')
    .description('list all remote guardian versions')
    .action(() => {
      listRemoteReleaseVersions();
    });

  program.command('build')
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

  program.command('clean')
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

  program.command('start')
    .description('start guardian application')
    .option('-d --docker', 'start guardian using docker')
    .option('-p --pm2', 'start guardian using pm2')
    .action((options) => {
      if (options.docker) {
        startDocker();
      }
    });

  program.command('stop')
    .description('stop guardian application')
    .option('-d --docker', 'stop guardian using docker')
    .option('-p --pm2', 'stop guardian using pm2')
    .action((options) => {
      if (options.docker) {
        stopDocker();
      }
    });

  program.command('destroy')
    .description('destroy the current guardian project')
    .option('-d --docker', 'destroy docker images')
    .option('-p --pm2', 'destroy node modules and dists')

  program.parse();
}

main();