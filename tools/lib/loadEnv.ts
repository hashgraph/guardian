import assert from 'assert';
import fs from 'fs';
import { template } from 'lodash';
import { getConfig } from './getConfig';

const { readFile, writeFile } = fs.promises;

export const loadEnv = async (): Promise<void> => {
  assert(process.env.ENV, 'ENV is missing');

  console.log(`--- Loading ENV for ${process.env.ENV}`);

  const {
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
    GUARDIAN_TYMLEZ_API_KEY,
  } = await getConfig({
    env: process.env.ENV,
  });

  console.log('Updating ./ui-service/.env.docker');
  await updateTemplate({
    templateFile: './ui-service/.env.docker.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
    },
  });

  console.log('Updating ./ui-service/.env');
  await updateTemplate({
    templateFile: './ui-service/.env.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
    },
  });

  console.log('Updating ./tymlez-service/.env.docker');
  await updateTemplate({
    templateFile: './tymlez-service/.env.docker.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      GUARDIAN_TYMLEZ_API_KEY,
    },
  });

  console.log('Updating ./tymlez-service/.env');
  await updateTemplate({
    templateFile: './tymlez-service/.env.template',
    data: {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      GUARDIAN_TYMLEZ_API_KEY,
    },
  });

  console.log('Updating ./guardian-service/config.json');
  await writeFile(
    './guardian-service/config.json',
    JSON.stringify(
      {
        OPERATOR_ID: GUARDIAN_OPERATOR_ID,
        OPERATOR_KEY: GUARDIAN_OPERATOR_KEY,
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
