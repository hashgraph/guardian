import assert from 'assert';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ITokenResponse } from './ITokenResponse';
import { promisify } from 'util';
import glob from 'glob';
import { template } from 'lodash';
import pLimit from 'p-limit';
import { IPolicy } from './IPolicy';
import type { IPolicyPackage } from '../../../tymlez-service/src/entity/policy-package';

const globAsync = promisify(glob);

const { readdir, readFile } = fs.promises;

export async function createPolicyPackages({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  tokens,
}: {
  GUARDIAN_TYMLEZ_API_KEY: string;
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  tokens: ITokenResponse[];
}) {
  const templateData = {
    CET_TOKEN_ID: findToken(tokens, 'TYM_CET').tokenId,
    CRU_TOKEN_ID: findToken(tokens, 'TYM_CRU').tokenId,
  };

  const policyFolders = await getPolicyFolders();

  const policyPackages = await Promise.all(
    policyFolders.map(async (folder) => {
      const files = await globAsync(`**/*.json`, { cwd: folder });

      const policyFiles = files.filter((file) => file === 'policy.json');
      assert(
        policyFiles.length === 1,
        `Number of policy.json is ${policyFiles.length}, expect 1`,
      );

      const schemaFiles = files.filter((file) => file.startsWith('schemas/'));
      const tokenFiles = files.filter((file) => file.startsWith('tokens/'));

      return {
        policy: (await parsePolicyPackageFile({
          folder,
          file: policyFiles[0],
          templateData,
        })) as IPolicy,
        schemas: await Promise.all(
          schemaFiles.map((file) =>
            parsePolicyPackageFile({ folder, file, templateData }),
          ),
        ),
        tokens: await Promise.all(
          tokenFiles.map(async (file) =>
            parsePolicyPackageFile({ folder, file, templateData }),
          ),
        ),
      };
    }),
  );

  const limit = pLimit(1);

  return await Promise.all(
    policyPackages.map((policyPackage) =>
      limit(async () => {
        console.log('Importing policy', policyPackage.policy.name);
        const { data: importedPackage } = await axios.post(
          `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/policy/import-package`,
          { package: policyPackage, publish: true },
          {
            headers: {
              Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
            },
          },
        );

        return importedPackage as IPolicyPackage;
      }),
    ),
  );
}

function findToken(tokens: ITokenResponse[], tokenSymbol: string) {
  const token = tokens.find((token) => token.tokenSymbol === tokenSymbol);
  assert(token, `Failed to find token ${tokenSymbol}`);
  return token;
}

async function parsePolicyPackageFile({
  folder,
  file,
  templateData,
}: {
  folder: string;
  file: string;
  templateData: any;
}) {
  const content = await readFile(path.join(folder, file), 'utf8');
  const compiledTemplate = template(content);
  return JSON.parse(compiledTemplate(templateData));
}

async function getPolicyFolders() {
  const policiesDir = path.join(__dirname, 'policies');
  return (await readdir(policiesDir, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.join(policiesDir, dirent.name));
}
