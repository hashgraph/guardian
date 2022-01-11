import assert from 'assert';
import axios from 'axios';
import fs from 'fs';
import { take } from 'lodash';
import path from 'path';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
const { readdir, readFile } = fs.promises;

export async function initSchemas() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const { GUARDIAN_TYMLEZ_API_KEY } = await getBuildTimeConfig({ env: ENV });
  const schemaFiles = await getSchemaFiles();

  const schemas = (
    await Promise.all(
      schemaFiles.map(async (file) => {
        return readFile(file, 'utf-8');
      }),
    )
  ).map((content) => JSON.parse(content));

  for (const schema of schemas) {
    console.log('Importing schema', schema.uuid);
    await axios.post(
      'http://localhost:3010/schema/import',
      { schema, publish: true },
      {
        headers: {
          Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
        },
      },
    );
  }
}

async function getSchemaFiles() {
  const configsDir = path.join(__dirname, 'schemas');
  return (await readdir(configsDir)).map((file) => path.join(configsDir, file));
}
