import assert from 'assert';
import axios from 'axios';
import pLimit from 'p-limit';
import { IPolicyPackage } from '../../../tymlez-service/src/entity/policy-package';
import { UserName } from '../../../tymlez-service/src/modules/user';

export async function addMeters(
  GUARDIAN_TYMLEZ_API_KEY: string,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string,
  policyPackages: IPolicyPackage[],
) {
  const meterIds = [
    'paul debug 1',
    'paul debug 2',
    'paul debug 3',
    'paul debug 4',
    'paul debug 5',
    'paul debug 6',
  ];

  const limit = pLimit(1);

  await Promise.all(
    meterIds.map((meterId) =>
      limit(() =>
        addMeter({
          GUARDIAN_TYMLEZ_API_KEY,
          GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
          policyPackages,
          username: 'Installer',
          policyTag: 'TymlezCET',
          meterOptions: {
            projectId: meterId,
            projectName: '1',
            sensorType: '1',
            capacity: '1',
          },
        }),
      ),
    ),
  );
}

async function addMeter({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  policyPackages,
  username,
  policyTag,
  meterOptions,
}: {
  policyPackages: IPolicyPackage[];
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: UserName;
  policyTag: string;
  meterOptions: any;
}) {
  console.log('Adding meter', { username, policyTag, meterOptions });

  const cetPolicyPackage = policyPackages.find(
    (pkg) => pkg.policy.inputPolicyTag === policyTag,
  );
  assert(cetPolicyPackage, `Cannot find ${policyTag} Package`);

  const sensorSchema = cetPolicyPackage.schemas.find(
    (schema) => schema.inputName === 'Inverter',
  );

  assert(sensorSchema, `Cannot find sensor schema`);

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/policy/block/tag/${cetPolicyPackage.policy.id}/add_sensor_bnt`,
    {
      block: {
        type: sensorSchema.uuid,
        '@context': ['https://localhost/schema'],
        ...meterOptions,
      },
      username,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
