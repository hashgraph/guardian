import axios from 'axios';
import type { IUser } from '../user';
import type { IUIServiceDevice } from './IUIServiceDevice';

export async function getDevicesFromUiService({
  uiServiceBaseUrl,
  policyId,
  installer,
}: {
  uiServiceBaseUrl: string;
  policyId: string;
  installer: IUser;
}): Promise<IUIServiceDevice[]> {
  const {
    data: { data: devices },
  } = await axios.get(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/sensors_grid`,
    {
      headers: {
        authorization: `Bearer ${installer.accessToken}`,
      },
    },
  );

  return devices;
}
