import assert from 'assert';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
import { addDevices } from './addDevices';
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
    DEVICE_INFOS,
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

  await registerNewInstallers({
    policyPackages,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    GUARDIAN_TYMLEZ_API_KEY,
  });

  assert(DEVICE_INFOS && DEVICE_INFOS.length > 0, `DEVICE_INFOS is missing`);
  await addDevices({
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    deviceInfos: DEVICE_INFOS,
  });
}
