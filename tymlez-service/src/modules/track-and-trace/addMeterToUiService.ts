import axios from 'axios';
import type { IUser } from '../user';
import assert from 'assert';
import type { PolicyPackage } from '@entity/policy-package';

export async function addMeterToUiService({
  policyPackage,
  installer,
  meterId,
  policyId,
  uiServiceBaseUrl,
}: {
  policyPackage: PolicyPackage;
  uiServiceBaseUrl: string;
  policyId: string;
  meterId: string;
  installer: IUser;
}): Promise<void> {
  const inverterSchema = policyPackage.schemas.find(
    (schema) => schema.inputName === 'Inverter',
  );

  assert(inverterSchema, `Cannot find inverter schema`);

  await axios.post(
    `${uiServiceBaseUrl}/policy/block/tag2/${policyId}/add_sensor_bnt`,
    {
      type: inverterSchema.uuid,
      '@context': ['https://localhost/schema'],
      // Paul Debug: need to use new schema
      projectId: meterId,
      projectName: '1',
      sensorType: '1',
      capacity: '1',
    },
    {
      headers: {
        authorization: `Bearer ${installer.accessToken}`,
      },
    },
  );
}
