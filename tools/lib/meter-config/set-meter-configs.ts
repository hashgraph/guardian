import assert from 'assert';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
const { readdir, readFile } = fs.promises;

export async function setMeterConfigs() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const { GUARDIAN_TYMLEZ_API_KEY, GUARDIAN_TYMLEZ_SERVICE_BASE_URL } =
    await getBuildTimeConfig({ env: ENV });
  const configFiles = await getConfigFilesSortedByDate();

  const meterConfigs = (
    await Promise.all(
      configFiles.map(async (file) => {
        return readFile(file, 'utf-8');
      }),
    )
  ).map((content) => JSON.parse(content));

  for (const config of meterConfigs) {
    console.log('Setting meter config for', config.did);
    await axios.post(
      `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/mrv/set-config`,
      config,
      {
        headers: {
          Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
        },
      },
    );
  }
}

/**
 * Return config files sorted by last modified date in ascending order
 */
async function getConfigFilesSortedByDate() {
  const configsDir = path.join(__dirname, 'configs');

  return (await readdir(configsDir))
    .map((file) => path.join(configsDir, file))
    .sort((fileA, fileB) => {
      const statA = fs.statSync(fileA);
      const statB = fs.statSync(fileB);

      if (statA.mtime > statB.mtime) {
        return 1;
      }

      if (statA.mtime < statB.mtime) {
        return -1;
      }

      return 0;
    });
}
