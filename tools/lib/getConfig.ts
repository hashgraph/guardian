import assert from 'assert';
import { getParameters } from './getParameters';

export const getConfig = async ({ env }: { env: string }): Promise<IConfig> => {
  assert(
    env === 'local' || env === 'dev' || env === 'prod',
    `Unsupported env: '${env}'.`,
  );

  const {
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
    GUARDIAN_ADDRESS_BOOK,
    GUARDIAN_VC_TOPIC_ID,
    GUARDIAN_DID_TOPIC_ID,
  } = await getOperatorInfo(env);

  assert(GUARDIAN_OPERATOR_ID, `GUARDIAN_OPERATOR_ID is missing`);
  assert(GUARDIAN_OPERATOR_KEY, `GUARDIAN_OPERATOR_KEY is missing`);

  const localEnv = {
    GUARDIAN_OPERATOR_ID,
    GUARDIAN_OPERATOR_KEY,
    GUARDIAN_ADDRESS_BOOK,
    GUARDIAN_VC_TOPIC_ID,
    GUARDIAN_DID_TOPIC_ID,
  };

  if (env !== 'local') {
    const [
      GCP_PROJECT_ID,
      GUARDIAN_MONGO_USERNAME,
      GUARDIAN_MONGO_PASSWORD,
      GKE_CLUSTER,
      GEK_REGION,
    ] = await getParameters([
      `/${env}/tymlez-platform/gcp-project-id`,
      `/${env}/tymlez-platform/guardian-mongo-username`,
      `/${env}/tymlez-platform/guardian-mongo-password`,
      `/${env}/tymlez-platform/gke-cluster`,
      `/${env}/tymlez-platform/gke-region`,
    ]);

    return {
      ...localEnv,

      GCP_PROJECT_ID,
      GUARDIAN_MONGO_USERNAME,
      GUARDIAN_MONGO_PASSWORD,
      GKE_CLUSTER,
      GEK_REGION,
    };
  }

  return localEnv;
};

async function getOperatorInfo(env: string) {
  if (env !== 'local') {
    const [
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      GUARDIAN_ADDRESS_BOOK,
      GUARDIAN_VC_TOPIC_ID,
      GUARDIAN_DID_TOPIC_ID,
    ] = await getParameters([
      `/${env}/tymlez-platform/guardian-operator-id`,
      `/${env}/tymlez-platform/guardian-operator-key`,
      `/${env}/tymlez-platform/guardian-address-book`,
      `/${env}/tymlez-platform/guardian-vc-topic-id`,
      `/${env}/tymlez-platform/guardian-did-topic-id`,
    ]);

    return {
      GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY,
      GUARDIAN_ADDRESS_BOOK,
      GUARDIAN_VC_TOPIC_ID,
      GUARDIAN_DID_TOPIC_ID,
    };
  } else {
    return {
      GUARDIAN_OPERATOR_ID: process.env.GUARDIAN_OPERATOR_ID,
      GUARDIAN_OPERATOR_KEY: process.env.GUARDIAN_OPERATOR_KEY,
      GUARDIAN_ADDRESS_BOOK: process.env.GUARDIAN_ADDRESS_BOOK,
      GUARDIAN_VC_TOPIC_ID: process.env.GUARDIAN_VC_TOPIC_ID,
      GUARDIAN_DID_TOPIC_ID: process.env.GUARDIAN_DID_TOPIC_ID,
    };
  }
}

interface IConfig {
  GUARDIAN_OPERATOR_ID: string;
  GUARDIAN_OPERATOR_KEY: string;
  GUARDIAN_ADDRESS_BOOK?: string;
  GUARDIAN_VC_TOPIC_ID?: string;
  GUARDIAN_DID_TOPIC_ID?: string;

  GCP_PROJECT_ID?: string;
  GUARDIAN_MONGO_USERNAME?: string;
  GUARDIAN_MONGO_PASSWORD?: string;
  GKE_CLUSTER?: string;
  GEK_REGION?: string;
}
