import { differenceBy } from 'lodash';
import type { IUser } from '../user';
import { getMetersFromUiService } from './getMetersFromUiService';
import type { IUIServiceMeter } from './IUIServiceMeter';

export async function getNewMeters(
  uiServiceBaseUrl: string,
  policyId: string,
  installer: IUser,
  preAddMeters: IUIServiceMeter[],
) {
  const postAddMeters = await getMetersFromUiService({
    uiServiceBaseUrl,
    policyId,
    installer,
  });

  return differenceBy(postAddMeters, preAddMeters, (obj) => obj.id);
}
