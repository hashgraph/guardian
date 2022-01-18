import axios from 'axios';
import type { IUser } from '../user';
import type { IUIServiceMeter } from './IUIServiceMeter';

export async function getMetersFromUiService({
  uiServiceBaseUrl,
  policyId,
  installer,
}: {
  uiServiceBaseUrl: string;
  policyId: string;
  installer: IUser;
}): Promise<IUIServiceMeter[]> {
  const {
    data: { data: meters },
  } = await axios.get(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/sensors_grid`,
    {
      headers: {
        authorization: `Bearer ${installer.accessToken}`,
      },
    },
  );

  return meters;
}
