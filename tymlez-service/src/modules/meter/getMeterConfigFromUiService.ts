import type { IUIServiceMeterConfig } from '@entity/meter-config';
import axios from 'axios';
import type { IUser } from '../user';
import type { IUIServiceMeter } from './IUIServiceMeter';

export async function getMeterConfigFromUiService({
  installer,
  meter,
  policyId,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  policyId: string;
  meter: IUIServiceMeter;
  installer: IUser;
}): Promise<IUIServiceMeterConfig> {
  const meterConfig = (
    await axios.post(
      `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/download_config_btn`,
      {
        owner: meter.owner,
        document: meter.document,
      },
      {
        headers: {
          authorization: `Bearer ${installer.accessToken}`,
        },
      },
    )
  ).data.body;

  return meterConfig;
}
