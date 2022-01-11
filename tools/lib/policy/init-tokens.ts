import assert from 'assert';
import axios from 'axios';
import { getBuildTimeConfig } from '../getBuildTimeConfig';

export async function initTokens() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const { GUARDIAN_TYMLEZ_API_KEY, GUARDIAN_TYMLEZ_SERVICE_BASE_URL } =
    await getBuildTimeConfig({ env: ENV });

  const existingTokens = await getExistingToken({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  });

  const pendingTokens = INIT_TOKENS.filter(
    (initToken) =>
      !existingTokens.some(
        (existingToken) => existingToken.tokenSymbol === initToken.tokenSymbol,
      ),
  );

  console.log(
    'Creating tokens',
    pendingTokens.map((token) => token.tokenSymbol),
  );

  for (const token of pendingTokens) {
    await axios.post(
      `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/tokens/create`,
      token,
      {
        headers: {
          Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
        },
      },
    );
  }

  return await getExistingToken({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  });
}

async function getExistingToken({
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  GUARDIAN_TYMLEZ_API_KEY,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
}) {
  return (
    (await axios.get(`${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/tokens`, {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    })) as { data: ITokenResponse[] }
  ).data;
}

const INIT_TOKENS: ITokenRequest[] = [
  {
    tokenName: 'Tymlez CET',
    tokenSymbol: 'TYM_CET',
    tokenType: 'fungible',
    decimals: '2',
    initialSupply: '0',
    enableAdmin: true,
    changeSupply: true,
    enableFreeze: true,
    enableKYC: true,
    enableWipe: true,
  },
  {
    tokenName: 'Tymlez CRU',
    tokenSymbol: 'TYM_CRU',
    tokenType: 'non-fungible',
    decimals: '0',
    initialSupply: '0',
    enableAdmin: true,
    changeSupply: true,
    enableFreeze: true,
    enableKYC: true,
    enableWipe: true,
  },
];

interface ITokenRequest {
  tokenName: string;
  tokenSymbol: string;
  tokenType: string;
  decimals: string;
  initialSupply: string;
  enableAdmin: boolean;
  changeSupply: boolean;
  enableFreeze: boolean;
  enableKYC: boolean;
  enableWipe: boolean;
}

interface ITokenResponse {
  tokenId: string;
  tokenSymbol: string;
}
