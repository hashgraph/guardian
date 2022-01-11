import assert from 'assert';
import axios from 'axios';
import { getBuildTimeConfig } from '../getBuildTimeConfig';

export async function initTokens() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const { GUARDIAN_TYMLEZ_API_KEY } = await getBuildTimeConfig({ env: ENV });

  const { data: existingTokens } = (await axios.get(
    'http://localhost:3010/tokens',
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  )) as { data: { tokenSymbol: string }[] };

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
    await axios.post('http://localhost:3010/tokens/create', token, {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    });
  }
}

const INIT_TOKENS = [
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
