import assert from 'assert';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
import { initTokens } from './init-tokens';
import { promisify } from 'util';
import glob from 'glob';

const globAsync = promisify(glob);

const { readdir, readFile } = fs.promises;

export async function initPolicies() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const tokens = await initTokens();

  const { GUARDIAN_TYMLEZ_API_KEY, GUARDIAN_TYMLEZ_SERVICE_BASE_URL } =
    await getBuildTimeConfig({ env: ENV });
  const policyFolders = await getPolicyFolders();

  const policies = await Promise.all(
    policyFolders.map(async (folder) => {
      const files = await globAsync(`**/*`, { cwd: folder });
      console.log('******* 1', folder, files);
    }),
  );

  // for (const policy of policies) {
  //   console.log('Importing policy', policy.uuid);
  //   await axios.post(
  //     `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/policy/import`,
  //     { policy, schemas, tokens },
  //     {
  //       headers: {
  //         Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
  //       },
  //     },
  //   );
  // }
}

async function getPolicyFolders() {
  const policiesDir = path.join(__dirname, 'policies');
  return (await readdir(policiesDir)).map((file) =>
    path.join(policiesDir, file),
  );
}
