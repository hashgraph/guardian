import axios from 'axios';
import pLimit from 'p-limit';
import { InstallerUserName } from '../../../tymlez-service/src/modules/user';
import { IMeterInfo } from '../getBuildTimeConfig';

export async function addMeters({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  meterInfos,
}: {
  GUARDIAN_TYMLEZ_API_KEY: string;
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  meterInfos: IMeterInfo[];
}) {
  const limit = pLimit(1);

  await Promise.all(
    meterInfos.map((meterInfo) =>
      limit(() =>
        addMeter({
          GUARDIAN_TYMLEZ_API_KEY,
          GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
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
  username,
  policyTag,
  meterInfo,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: InstallerUserName;
  policyTag: string;
  meterInfo: IMeterInfo;
}) {
  console.log('Adding meter', { username, policyTag, meterInfo });

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/add-meter`,
    {
      username,
      policyTag,
      meterId: meterInfo.meterId,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
