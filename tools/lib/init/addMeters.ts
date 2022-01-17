import assert from 'assert';
import axios from 'axios';
import pLimit from 'p-limit';
import { IPolicyPackage } from '../../../tymlez-service/src/entity/policy-package';
import { InstallerUserName } from '../../../tymlez-service/src/modules/user';
import { IMeterInfo } from '../getBuildTimeConfig';

export async function addMeters({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  meterInfos,
  policyPackages,
}: {
  GUARDIAN_TYMLEZ_API_KEY: string;
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  policyPackages: IPolicyPackage[];
  meterInfos: IMeterInfo[];
}) {
  const limit = pLimit(1);

  await Promise.all(
    meterInfos.map((meterInfo) =>
      limit(() =>
        addMeter({
          GUARDIAN_TYMLEZ_API_KEY,
          GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
          policyPackages,
          username: 'Installer',
          policyTag: 'TymlezCET',
          meterInfo,
        }),
      ),
    ),
  );
}

async function addMeter({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  policyPackages,
  username,
  policyTag,
  meterInfo,
}: {
  policyPackages: IPolicyPackage[];
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: InstallerUserName;
  policyTag: string;
  meterInfo: IMeterInfo;
}) {
  console.log('Adding meter', { username, policyTag, meterInfo });

  const cetPolicyPackage = policyPackages.find(
    (pkg) => pkg.policy.inputPolicyTag === policyTag,
  );
  assert(cetPolicyPackage, `Cannot find ${policyTag} Package`);

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/add-meter`,
    {
      username,
      policyId: cetPolicyPackage.policy.id,
      meterId: meterInfo.meterId,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
