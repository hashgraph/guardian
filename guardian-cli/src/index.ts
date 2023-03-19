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

  program.command('list-remote')
    .description('list all remote guardian versions')

  program.command('build')
    .description('build the current guardian project')
    .option('-d --docker', 'build the project in a docker container')
    .option('-n --npm', 'use npm to install dependencies')
    .option('-y --yarn', 'use yarn to install dependencies')

  program.command('clean')
    .description('clean the artifacts of the current guardian project')
    .option('-d --docker', 'clean docker images')
    .option('-n --node', 'clean node modules and dists')

  program.command('start')
    .description('start guardian application')
    .option('-d --docker', 'start guardian using docker')
    .option('-p --pm2', 'start guardian using pm2')

  program.command('stop')
    .description('stop guardian application')
    .option('-d --docker', 'stop guardian using docker')
    .option('-p --pm2', 'stop guardian using pm2')

  program.command('destroy')
    .description('destroy the current guardian project')
    .option('-d --docker', 'destroy docker images')
    .option('-p --pm2', 'destroy node modules and dists')

  program.parse();
}

main();