import assert from 'assert';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import type { IToken } from 'interfaces';
import { loginToRootAuthority } from '../modules/ui-service/loginToRootAuthority';

export const makeTokenApi = ({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) => {
  const tokenApi = Router();

  tokenApi.get('/', async (req: Request, res: Response) => {
    const user = await loginToRootAuthority({
      uiServiceBaseUrl,
    });

    const { data: tokens } = (await axios.get(
      `${uiServiceBaseUrl}/api/tokens`,
      {
        headers: {
          authorization: `Bearer ${user.accessToken}`,
        },
      },
    )) as { data: IToken[] };

    res.status(200).json(tokens);
  });

  tokenApi.post('/create', async (req: Request, res: Response) => {
    const inputToken: IToken = req.body;

    assert(inputToken, `token is missing`);

    const user = await loginToRootAuthority({
      uiServiceBaseUrl,
    });

    const { data: allTokens } = (await axios.post(
      `${uiServiceBaseUrl}/api/tokens/create`,
      inputToken,
      {
        headers: {
          authorization: `Bearer ${user.accessToken}`,
        },
      },
    )) as { data: IToken[] };

    const createdToken = allTokens.find(
      (token) => token.tokenSymbol === inputToken.tokenSymbol,
    );

    assert(createdToken, `Failed to create token ${inputToken.tokenSymbol}`);

    res.status(200).json(createdToken);
  });

  return tokenApi;
};
