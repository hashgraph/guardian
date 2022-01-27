import axios from 'axios';
import type { IUser } from '../user';
import assert from 'assert';
import type { PolicyPackage } from '@entity/policy-package';

export async function addMeterToUiService({
  policyPackage,
  installer,
  meterInfo,
  policyId,
  uiServiceBaseUrl,
}: {
  policyPackage: PolicyPackage;
  uiServiceBaseUrl: string;
  policyId: string;
  meterInfo: any;
  installer: IUser;
}): Promise<void> {
  const inverterSchema = policyPackage.schemas.find(
    (schema) => schema.inputName === 'TymlezDevice',
  );

  assert(inverterSchema, `Cannot find TymlezDevice schema`);

  await axios.post(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/add_sensor_bnt`,
    {
      type: inverterSchema.uuid,
      '@context': ['https://localhost/schema'],
      ...meterInfo,
    },
    {
      headers: {
        authorization: `Bearer ${installer.accessToken}`,
      },
    },
  );
}
