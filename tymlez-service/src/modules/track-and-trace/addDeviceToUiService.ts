import axios from 'axios';
import type { IUser } from '../user';
import assert from 'assert';
import type { PolicyPackage } from '@entity/policy-package';

export async function addDeviceToUiService({
  policyPackage,
  installer,
  deviceInfo,
  policyId,
  uiServiceBaseUrl,
}: {
  policyPackage: PolicyPackage;
  uiServiceBaseUrl: string;
  policyId: string;
  deviceInfo: any;
  installer: IUser;
}): Promise<void> {
  const inverterSchema = policyPackage.schemas.find(
    (schema) => schema.inputName === 'TymlezDevice',
  );

  assert(inverterSchema, `Cannot find TymlezDevice schema`);

  console.log('Adding device to UI Service', {
    installer: installer.username,
    inverterSchema: inverterSchema.inputName,
    deviceInfo,
    policyId,
  });

  await axios.post(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/add_sensor_bnt`,
    {
      type: inverterSchema.uuid,
      '@context': ['https://localhost/schema'],
      ...deviceInfo,
    },
    {
      headers: {
        authorization: `Bearer ${installer.accessToken}`,
      },
    },
  );
}
