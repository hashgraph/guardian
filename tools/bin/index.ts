import Yargs from 'yargs/yargs';
import { deploy } from '../lib/deploy';
import { loadEnv } from '../lib/loadEnv';
import { setMeterConfigs } from '../lib/meter-config';
import { initSchemas } from '../lib/schema';
import { initTokens } from '../lib/token';

async function main(): Promise<void> {
  const rootYargs = Yargs(process.argv.slice(2));

  await rootYargs
    .command('deploy', 'Deploy', {}, deploy)
    .command('load-env', 'Load environment variables', {}, loadEnv)
    .command('set-meter-configs', 'Set meter configs', {}, setMeterConfigs)
    .command('init-schemas', 'Init schemas', {}, initSchemas)
    .command('init-tokens', 'Init tokens', {}, initTokens)

    .demandCommand()
    .strict()
    .help().argv;
}

main().catch((err) => {
  console.error('Failed to execute', err);
  process.exit(1);
});
