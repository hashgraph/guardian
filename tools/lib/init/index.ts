import assert from 'assert';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
import { addMeters } from './addMeters';
import { createPolicyPackages } from './createPolicyPackages';
import { createTokens } from './createTokens';
import { grantTokenKvcToInstallers } from './grantTokenKvcToInstallers';
import { initInstallers } from './initInstallers';
import { initRootAuthority } from './initRootAuthority';
import { registerNewInstallers } from './registerNewInstallers';

export async function init() {
  const { ENV, CLIENT_NAME } = process.env;

  assert(ENV, `ENV is missing`);
  assert(CLIENT_NAME, `CLIENT_NAME is missing`);

  const {
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    METER_INFOS,
  } = await getBuildTimeConfig({ env: ENV, clientName: CLIENT_NAME });

  await initRootAuthority({
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    GUARDIAN_TYMLEZ_API_KEY,
  });

  const tokens = await createTokens({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  });

  const policyPackages = await createPolicyPackages({
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

  await registerNewInstallers(
    policyPackages,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    GUARDIAN_TYMLEZ_API_KEY,
  );

  assert(METER_INFOS && METER_INFOS.length > 0, `METER_INFOS is missing`);
  await addMeters({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    policyPackages,
    meterInfos: METER_INFOS,
  });
}
