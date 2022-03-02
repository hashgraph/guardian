import type { IUIServiceDeviceConfig } from '@entity/device-config';
import axios from 'axios';
import type { IUser } from '../user';
import type { IUIServiceDevice } from './IUIServiceDevice';

export async function getDeviceConfigFromUiService({
  installer,
  device,
  policyId,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  policyId: string;
  device: IUIServiceDevice;
  installer: IUser;
}): Promise<IUIServiceDeviceConfig> {
  const deviceConfig = (
    await axios.post(
      `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/download_config_btn`,
      {
        owner: device.owner,
        document: device.document,
      },
      {
        headers: {
          authorization: `Bearer ${installer.accessToken}`,
        },
      },
    )
  ).data.body;

  return deviceConfig;
}
