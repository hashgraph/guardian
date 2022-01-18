import assert from 'assert';
import fs from 'fs';
import { template } from 'lodash';
import { getBuildTimeConfig } from './getBuildTimeConfig';

const { readFile, writeFile } = fs.promises;

export const loadEnv = async (): Promise<void> => {
  assert(process.env.ENV, 'ENV is missing');
  assert(process.env.CLIENT_NAME, 'CLIENT_NAME is missing');

  console.log(`--- Loading ENV for ${process.env.ENV}`);

  const {
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
    GUARDIAN_TYMLEZ_API_KEY,
    WEB3_STORAGE_TOKEN
  } = await getBuildTimeConfig({
    env: process.env.ENV,
    clientName: process.env.CLIENT_NAME,
  });

  console.log('Updating ./ui-service/.env.docker');
  await updateTemplate({
    templateFile: './ui-service/.env.docker.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      WEB3_STORAGE_TOKEN
    },
  });

  console.log('Updating ./ui-service/.env');
  await updateTemplate({
    templateFile: './ui-service/.env.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      WEB3_STORAGE_TOKEN
    },
  });

  console.log('Updating ./tymlez-service/.env.docker');
  await updateTemplate({
    templateFile: './tymlez-service/.env.docker.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      GUARDIAN_TYMLEZ_API_KEY,
      WEB3_STORAGE_TOKEN
    },
  });

  console.log('Updating ./tymlez-service/.env');
  await updateTemplate({
    templateFile: './tymlez-service/.env.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      GUARDIAN_TYMLEZ_API_KEY,
      WEB3_STORAGE_TOKEN
    },
  });

  console.log('Updating ./guardian-service/config.json');
  console.log('web3storgage: '+WEB3_STORAGE_TOKEN)
  await writeFile(
    './guardian-service/config.json',
    JSON.stringify(
      {
        OPERATOR_ID: GUARDIAN_OPERATOR_ID,
        OPERATOR_KEY: GUARDIAN_OPERATOR_KEY,
        WEB3_STORAGE_TOKEN
      },
      undefined,
      2,
    ),
  );
};

async function updateTemplate({
  templateFile,
  data,
}: {
  templateFile: string;
  data: object;
}) {
  const templateContent = await readFile(templateFile, 'utf-8');
  await writeFile(
    templateFile.replace('.template', ''),
    template(templateContent)(data),
  );
}
