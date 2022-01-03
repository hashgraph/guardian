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
    GUARDIAN_ADDRESS_BOOK,
    GUARDIAN_VC_TOPIC_ID,
    GUARDIAN_DID_TOPIC_ID,
  } = await getConfig({
    env: process.env.ENV,
  });

  console.log('Updating ./ui-service/.env.docker');
  await updateTemplate({
    templateFile: './ui-service/.env.docker.template',
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
  });

  console.log('Updating ./ui-service/.env');
  await updateTemplate({
    templateFile: './ui-service/.env.template',
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
  });

  console.log('Updating ./guardian-service/config.json');
  await writeFile(
    './guardian-service/config.json',
    JSON.stringify(
      {
        OPERATOR_ID: GUARDIAN_OPERATOR_ID,
        OPERATOR_KEY: GUARDIAN_OPERATOR_KEY,
        ADDRESS_BOOK: GUARDIAN_ADDRESS_BOOK,
        VC_TOPIC_ID: GUARDIAN_VC_TOPIC_ID,
        DID_TOPIC_ID: GUARDIAN_DID_TOPIC_ID,
      },
      undefined,
      2,
    ),
  );
};

async function updateTemplate({
  templateFile,
  GUARDIAN_OPERATOR_ID,
  GUARDIAN_OPERATOR_KEY,
}: {
  templateFile: string;
  GUARDIAN_OPERATOR_ID: string;
  GUARDIAN_OPERATOR_KEY: string;
}) {
  const templateContent = await readFile(templateFile, 'utf-8');
  await writeFile(
    templateFile.replace('.template', ''),
    template(templateContent)({
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
    }),
  );
}
