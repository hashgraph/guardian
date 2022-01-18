import axios from 'axios';
import type { IUser } from '../user';
import assert from 'assert';
import type { PolicyPackage } from '@entity/policy-package';

export async function addMeterToUiService({
  policyPackage,
  installer,
  meterId,
  meterLabel,
  policyId,
  uiServiceBaseUrl,
}: {
  policyPackage: PolicyPackage;
  uiServiceBaseUrl: string;
  policyId: string;
  meterId: string;
  meterLabel: string;
  installer: IUser;
}): Promise<void> {
  const inverterSchema = policyPackage.schemas.find(
    (schema) => schema.inputName === 'TymlezMeter',
  );

  assert(inverterSchema, `Cannot find inverter schema`);

  await axios.post(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/add_sensor_bnt`,
    {
      type: inverterSchema.uuid,
      '@context': ['https://localhost/schema'],
      field0: meterId,
      field1: meterLabel,
    },
    {
      headers: {
        authorization: `Bearer ${installer.accessToken}`,
      },
    },
  );
}
