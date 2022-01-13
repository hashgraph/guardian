import assert from 'assert';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
import { createPolicies } from './createPolicies';
import { createTokens } from './createTokens';
import { grantTokenKvcToInstallers } from './grantTokenKvcToInstallers';
import { initInstallers } from './initInstallers';

export async function init() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const { GUARDIAN_TYMLEZ_API_KEY, GUARDIAN_TYMLEZ_SERVICE_BASE_URL } =
    await getBuildTimeConfig({ env: ENV });

  const tokens = await createTokens({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  });

  await createPolicies({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    tokens,
  });

  const installers = await initInstallers({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  });

  await grantTokenKvcToInstallers({
    tokens,
    installers,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    GUARDIAN_TYMLEZ_API_KEY,
  });
}
