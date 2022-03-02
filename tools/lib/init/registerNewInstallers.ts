import axios from 'axios';
import type { IPolicyPackage } from '../../../tymlez-service/src/entity/policy-package';
import type { UserName } from '../../../tymlez-service/src/modules/user';

export async function registerNewInstallers({
  policyPackages,
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
}: {
  policyPackages: IPolicyPackage[];
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
}) {
  await Promise.all(
    policyPackages.map(async (policyPackage) => {
      await registerNewInstaller({
        GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
        GUARDIAN_TYMLEZ_API_KEY,
        username: 'Installer',
        policyTag: policyPackage.policy.inputPolicyTag,
        installerInfo: {
          installerName: 'Installer 1',
          installerLicense: 'License 1',
        },
      });
    }),
  );
}

async function registerNewInstaller({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  username,
  policyTag,
  installerInfo,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: UserName;
  policyTag: string;
  installerInfo: any;
}) {
  console.log('Registering new installer', { username, policyTag });

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/register-installer`,
    {
      username,
      policyTag,
      installerInfo,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
