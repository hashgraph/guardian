import assert from 'assert';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import { loginToRootAuthority } from '../modules/ui-service/loginToRootAuthority';

export const makePolicyApi = ({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) => {
  const policyApi = Router();

  policyApi.post('/import-package', async (req: Request, res: Response) => {
    const inputPackage = req.body;

    assert(inputPackage, `package is missing`);

    const user = await loginToRootAuthority({
      uiServiceBaseUrl,
    });

    await axios.post(`${uiServiceBaseUrl}/api/package/import`, inputPackage, {
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
    });

    res.status(200).json({});
  });

  return policyApi;
};
