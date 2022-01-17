import assert from 'assert';
import axios from 'axios';
import { IPolicyPackage } from '../../../tymlez-service/src/entity/policy-package';
import { UserName } from '../../../tymlez-service/src/modules/user';

export async function registerNewInstallers(
  policyPackages: IPolicyPackage[],
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string,
  GUARDIAN_TYMLEZ_API_KEY: string,
) {
  await registerNewInstaller({
    policyPackages,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    GUARDIAN_TYMLEZ_API_KEY,
    username: 'Installer',
    policyTag: 'TymlezCET',
    installerOptions: {
      field0: 'paul debug',
    },
  });
}

async function registerNewInstaller({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  policyPackages,
  username,
  policyTag,
  installerOptions,
}: {
  policyPackages: IPolicyPackage[];
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: UserName;
  policyTag: string;
  installerOptions: any;
}) {
  console.log('Registering new installer', { username, policyTag });

  const cetPolicyPackage = policyPackages.find(
    (pkg) => pkg.policy.inputPolicyTag === policyTag,
  );
  assert(cetPolicyPackage, `Cannot find ${policyTag} Package`);

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/register-installer`,
    {
      username,
      policyId: cetPolicyPackage.policy.id,
      installerOptions,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
