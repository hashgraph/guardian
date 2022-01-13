import assert from 'assert';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
import { addMeters } from './addMeters';
import { createPolicyPackages } from './createPolicyPackages';
import { createTokens } from './createTokens';
import { grantTokenKvcToInstallers } from './grantTokenKvcToInstallers';
import { initInstallers } from './initInstallers';
import { registerNewInstallers } from './registerNewInstallers';

export async function init() {
  const { ENV } = process.env;

  assert(ENV, `ENV is missing`);

  const { GUARDIAN_TYMLEZ_API_KEY, GUARDIAN_TYMLEZ_SERVICE_BASE_URL } =
    await getBuildTimeConfig({ env: ENV });

  // Paul Debug: TODO
  // Initialize RootAuthority

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

  await addMeters(
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    policyPackages,
  );

  // Paul Debug: TODO
  // Save Download Meter Config to MongDB > tymlez_db, and allow tymlez-platform to send MRV
}
