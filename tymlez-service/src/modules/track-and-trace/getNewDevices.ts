import { differenceBy } from 'lodash';
import type { IUser } from '../user';
import { getDevicesFromUiService } from './getDevicesFromUiService';
import type { IUIServiceDevice } from './IUIServiceDevice';

export async function getNewDevices({
  installer,
  policyId,
  preAddDevices,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  policyId: string;
  installer: IUser;
  preAddDevices: IUIServiceDevice[];
}) {
  const postAddDevices = await getDevicesFromUiService({
    uiServiceBaseUrl,
    policyId,
    installer,
  });

  return differenceBy(postAddDevices, preAddDevices, (obj) => obj.id);
}
