import assert from 'assert';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loginToUiService } from '../modules/ui-service';

export const makePolicyApi = ({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) => {
  const policyApi = Router();

  policyApi.post('/import-package', async (req: Request, res: Response) => {
    const { package: inputPackage, publish } =
      req.body as IImportPolicyPackageRequestBody;

    assert(inputPackage, `package is missing`);

    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

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
      data: IUiServiceImportPolicyPackageResponse[];
    };

    const importedPolicy = allPolicies.find(
      (policy) => policy.config.id === newPolicyConfigId,
    );

    assert(
      importedPolicy,
      `Failed to import policy package ${inputPackage.policy.config.id} ${inputPackage.policy.name}`,
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
      await axios.post(
        `${uiServiceBaseUrl}/policy/publish/${importedPolicy.id}`,
        {},
        {
          headers: {
            authorization: `Bearer ${rootAuthority.accessToken}`,
          },
        },
      );
    }

    res.status(200).json(importedPolicy);
  });

  policyApi.get('/list', async (req: Request, res: Response) => {
    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    assert(rootAuthority.did, `rootAuthority.did is missing`);

    const { data: allPolicies } = (await axios.get(
      `${uiServiceBaseUrl}/api/get-policy-list`,
      {
        headers: {
          authorization: `Bearer ${rootAuthority.accessToken}`,
        },
      },
    )) as {
      data: IUiServiceImportPolicyPackageResponse[];
    };

    res.status(200).json(allPolicies);
  });

  return policyApi;
};

interface IUiServiceImportPolicyPackageResponse {
  id: string;
  status: string;
  name: string;
  policyTag: string;
  config: {
    id: string;
  };
}

interface IImportPolicyPackageRequestBody {
  package: {
    policy: {
      id: string;
      name: string;
      policyTag: string;
      config: {
        id: string;
      };
    };
  };
  publish: boolean;
}
