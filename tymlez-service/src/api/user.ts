import assert from 'assert';
import { Request, Response, Router } from 'express';
import {
  initInstaller,
  initRootAuthority,
  InstallerUserName,
  loginToUiService,
} from '../modules/user';

export const makeUserApi = ({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) => {
  const userApi = Router();

  userApi.post(
    '/init-installer/:username',
    async (req: Request, res: Response) => {
      const { username } = req.params as { username: InstallerUserName };

      assert(
        username === 'Installer' || username === 'Installer2',
        `Unexpected username: ${username}`,
      );

      const user = await initInstaller({ uiServiceBaseUrl, username });

      res.status(200).json(user);
    },
  );

  userApi.post('/init-root-authority', async (req: Request, res: Response) => {
    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    await initRootAuthority(rootAuthority, uiServiceBaseUrl);

    res.status(200).json(rootAuthority);
  });

  return userApi;
};
