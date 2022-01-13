import assert from 'assert';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import type { IToken } from 'interfaces';
import { loginToUiService } from '../modules/user';

export const makeTokenApi = ({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) => {
  const tokenApi = Router();

  tokenApi.get('/', async (req: Request, res: Response) => {
    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    const { data: tokens } = (await axios.get(
      `${uiServiceBaseUrl}/api/tokens`,
      {
        headers: {
          authorization: `Bearer ${rootAuthority.accessToken}`,
        },
      },
    )) as { data: IToken[] };

    res.status(200).json(tokens);
  });

  tokenApi.post('/create', async (req: Request, res: Response) => {
    const inputToken: IToken = req.body;

    assert(inputToken, `token is missing`);

    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    const { data: allTokens } = (await axios.post(
      `${uiServiceBaseUrl}/api/tokens/create`,
      inputToken,
      {
        headers: {
          authorization: `Bearer ${rootAuthority.accessToken}`,
        },
      },
    )) as { data: IToken[] };

    const createdToken = allTokens.find(
      (token) => token.tokenSymbol === inputToken.tokenSymbol,
    );

    assert(createdToken, `Failed to create token ${inputToken.tokenSymbol}`);

    res.status(200).json(createdToken);
  });

  tokenApi.post('/user-kyc', async (req: Request, res: Response) => {
    const inputGrantKyc: IGrantKycInput = req.body;

    assert(inputGrantKyc, `input is missing`);

    const rootAuthority = await loginToUiService({
      uiServiceBaseUrl,
      username: 'RootAuthority',
    });

    axios.post(`${uiServiceBaseUrl}/api/tokens/user-kyc`, inputGrantKyc, {
      headers: {
        authorization: `Bearer ${rootAuthority.accessToken}`,
      },
    });

    res.status(200).json(inputGrantKyc);
  });

  return tokenApi;
};

interface IGrantKycInput {
  tokenId: string;
  username: string;
  value: boolean;
}
