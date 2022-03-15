import axios from 'axios';
import pLimit from 'p-limit';
import type { InstallerUserName } from '../../../tymlez-service/src/modules/user';
import type { IDeviceInfo } from '../getBuildTimeConfig';

export async function addDevices({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  deviceInfos,
}: {
  GUARDIAN_TYMLEZ_API_KEY: string;
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  deviceInfos: IDeviceInfo[];
}) {
  const limit = pLimit(1);

  await Promise.all(
    deviceInfos
      .filter((deviceInfo) => deviceInfo.deviceType === 'consumption')
      .map((deviceInfo) =>
        limit(() =>
          addDevice({
            GUARDIAN_TYMLEZ_API_KEY,
            GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
            username: 'Installer',
            policyTag: 'TymlezCET',
            deviceInfo,
          }),
        ),
      ),
  );

  await Promise.all(
    deviceInfos
      .filter((deviceInfo) => deviceInfo.deviceType === 'generation')
      .map((deviceInfo) =>
        limit(() =>
          addDevice({
            GUARDIAN_TYMLEZ_API_KEY,
            GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
            username: 'Installer',
            policyTag: 'TymlezCRU',
            deviceInfo,
          }),
        ),
      ),
  );

  await Promise.all(
    deviceInfos
      .filter((deviceInfo) => deviceInfo.deviceType === 'generation-forecast')
      .map((deviceInfo) =>
        limit(() =>
          addDevice({
            GUARDIAN_TYMLEZ_API_KEY,
            GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
            username: 'Installer',
            policyTag: 'TymlezCRUF',
            deviceInfo,
          }),
        ),
      ),
  );
}

async function addDevice({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  username,
  policyTag,
  deviceInfo,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: InstallerUserName;
  policyTag: string;
  deviceInfo: IDeviceInfo;
}) {
  console.log('Adding device', { username, policyTag, deviceInfo });

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/add-device`,
    {
      username,
      policyTag,
      deviceId: deviceInfo.deviceId,
      deviceInfo: deviceInfo,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
