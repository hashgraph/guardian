import assert from 'assert';
import { getParameters } from './getParameters';

export const getBuildTimeConfig = async ({
  env,
}: {
  env: string;
}): Promise<IConfig> => {
  assert(
    env === 'local' || env === 'dev' || env === 'preprod' || env === 'prod',
    `Unsupported env: '${env}'.`,
  );

  const [
    GCP_PROJECT_ID,
    GCP_REGION,
    GKE_CLUSTER,
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  ] =
    env !== 'local'
      ? await getParameters([
          `/${env}/tymlez-platform/gcp-project-id`,
          `/${env}/tymlez-platform/gcp-region`,
          `/${env}/tymlez-platform/gke-cluster`,
          `/${env}/tymlez-platform/guardian-operator-id`,
          `/${env}/tymlez-platform/guardian-operator-key`,
          `/${env}/tymlez-platform/guardian-tymlez-api-key`,
          `/${env}/tymlez-platform/guardian-tymlez-service-base-url`,
        ])
      : [
          undefined,
          undefined,
          undefined,
          process.env.GUARDIAN_OPERATOR_ID,
          process.env.GUARDIAN_OPERATOR_KEY,
          'tymlezApiKey1',
          'http://localhost:3010',
        ];

  assert(GUARDIAN_OPERATOR_ID, `GUARDIAN_OPERATOR_ID is missing`);
  assert(GUARDIAN_OPERATOR_KEY, `GUARDIAN_OPERATOR_KEY is missing`);
  assert(GUARDIAN_TYMLEZ_API_KEY, `GUARDIAN_TYMLEZ_API_KEY is missing`);
  assert(
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    `GUARDIAN_TYMLEZ_SERVICE_BASE_URL is missing`,
  );

  return {
    GCP_PROJECT_ID,
    GCP_REGION,
    GKE_CLUSTER,
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
    GUARDIAN_TYMLEZ_API_KEY,
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  };
};

interface IConfig {
  GUARDIAN_OPERATOR_ID: string;
  GUARDIAN_OPERATOR_KEY: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;

  GCP_PROJECT_ID?: string;
  GCP_REGION?: string;
  GKE_CLUSTER?: string;
}
