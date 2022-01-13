import assert from 'assert';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import { differenceBy } from 'lodash';
import {
  getAllSchemasFromUiService,
  publishSchemasToUiService,
} from '../modules/schema';
import { v4 as uuidv4 } from 'uuid';
import { loginToUiService, IUser, UserName } from '../modules/user';
import {
  getAllPoliciesFromUiService,
  IPolicy,
  publishPolicyToUiService,
} from '../modules/policy';
import type { ISchema } from 'interfaces';
import type { MongoRepository } from 'typeorm';
import type { PolicyPackage } from '@entity/policy-package';

export const makePolicyApi = ({
  uiServiceBaseUrl,
  policyPackageRepository,
}: {
  uiServiceBaseUrl: string;
  policyPackageRepository: MongoRepository<PolicyPackage>;
}) => {
  const policyApi = Router();

  policyApi.post('/import-package', async (req: Request, res: Response) => {
    const { package: inputPackage, publish } =
      req.body as IImportPolicyPackageRequestBody;

    assert(inputPackage, `package is missing`);

    const policyPackage = await policyPackageRepository.findOne({
      where: {
        'policy.inputPolicyTag': { $eq: inputPackage.policy.policyTag },
      },
    });

    if (policyPackage) {
      console.log(
        `Policy package '${inputPackage.policy.policyTag}' was imported before.`,
      );
      res.status(200).json(policyPackage);
      return;
    }

    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    const preImportSchemas = await getAllSchemasFromUiService({
      uiServiceBaseUrl,
      rootAuthority,
    });

    const importedPolicy = await importPolicyPackage({
      rootAuthority,
      inputPackage,
      uiServiceBaseUrl,
    });

    const newSchemas = await publishSchemas(
      uiServiceBaseUrl,
      rootAuthority,
      preImportSchemas,
    );

    if (publish && importedPolicy.status !== 'PUBLISHED') {
      console.log(`Publishing policy`, {
        id: importedPolicy.id,
        name: importedPolicy.name,
        policyTag: importedPolicy.policyTag,
        config: {
          id: importedPolicy.config.id,
        },
      });
      await publishPolicyToUiService({
        policyId: importedPolicy.id,
        uiServiceBaseUrl,
        rootAuthority,
      });
    }

    const newPolicyPackage = policyPackageRepository.create({
      policy: {
        ...importedPolicy,
        inputPolicyTag: inputPackage.policy.policyTag,
      },
      schemas: newSchemas.map((schema) => ({
        ...schema,
        inputName: inputPackage.schemas.find((inputSchema) =>
          schema.name.startsWith(inputSchema.name),
        )!.name,
      })),
    });

    await policyPackageRepository.save(newPolicyPackage);

    res.status(200).json(newPolicyPackage);
  });

  policyApi.get('/list', async (req: Request, res: Response) => {
    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    assert(rootAuthority.did, `rootAuthority.did is missing`);

    const allPolicies = await getAllPoliciesFromUiService(
      uiServiceBaseUrl,
      rootAuthority,
    );

    res.status(200).json(allPolicies);
  });

  policyApi.post(
    '/block/tag/:policyId/:tag',
    async (req: Request, res: Response) => {
      const { policyId, tag } = req.params;
      const { block, username } = req.body as {
        block: any;
        username: UserName | undefined;
      };

      assert(block, `block is missing`);
      assert(username, `username is missing`);
      assert(policyId, `policyId is missing`);
      assert(tag, `tag is missing`);

      const user = await loginToUiService({
        uiServiceBaseUrl,
        username,
      });

      axios.post(
        `${uiServiceBaseUrl}/policy/block/tag/${policyId}/${tag}`,
        block,
        {
          headers: {
            authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      res.status(200).json(block);
    },
  );

  return policyApi;
};

async function publishSchemas(
  uiServiceBaseUrl: string,
  rootAuthority: IUser,
  preImportSchemas: ISchema[],
) {
  const postImportSchemas = await getAllSchemasFromUiService({
    uiServiceBaseUrl,
    rootAuthority,
  });

  const newSchemas = differenceBy(
    postImportSchemas,
    preImportSchemas,
    (obj) => obj.uuid,
  );

  console.log(
    `Publishing schemas`,
    newSchemas.map((schema) => ({
      id: schema.id,
      uuid: schema.uuid,
      name: schema.name,
    })),
  );

  await publishSchemasToUiService({
    uiServiceBaseUrl,
    rootAuthority,
    schemaIds: newSchemas.map((schema) => schema.id),
  });

  return newSchemas;
}

async function importPolicyPackage({
  inputPackage,
  rootAuthority,
  uiServiceBaseUrl,
}: {
  rootAuthority: IUser;
  inputPackage: IImportPolicyPackage;
  uiServiceBaseUrl: string;
}) {
  assert(rootAuthority.did, `rootAuthority.did is missing`);

  const newPolicyConfigId = uuidv4();

  const packageImportData = {
    ...inputPackage,
    policy: {
      ...inputPackage.policy,
      config: {
        ...inputPackage.policy.config,
        id: newPolicyConfigId,
      },
      owner: rootAuthority.did,
      status: undefined,
      topicId: undefined,
    },
  };

  const { data: allPolicies } = (await axios.post(
    `${uiServiceBaseUrl}/api/package/import`,
    packageImportData,
    {
      headers: {
        authorization: `Bearer ${rootAuthority.accessToken}`,
      },
    },
  )) as {
    data: IPolicy[];
  };

  const importedPolicy = allPolicies.find(
    (policy) => policy.config.id === newPolicyConfigId,
  );

  assert(
    importedPolicy,
    `Failed to import policy package ${inputPackage.policy.config.id} ${inputPackage.policy.name}`,
  );
  return importedPolicy;
}

interface IImportPolicyPackageRequestBody {
  package: IImportPolicyPackage;
  publish: boolean;
}

interface IImportPolicyPackage {
  policy: {
    id: string;
    name: string;
    policyTag: string;
    config: {
      id: string;
    };
  };
  schemas: {
    name: string;
  }[];
}
