import assert from 'assert';
import { getConfig } from '../getConfig';
import { deployToGke } from './deployToGke';
import { pushImages } from './pushImages';

export async function deploy() {
  assert(process.env.ENV, `ENV is missing`);
  assert(process.env.ENV !== 'local', `Cannot deploy to local`);

  const {
    GCP_PROJECT_ID,
    GUARDIAN_MONGO_USERNAME,
    GUARDIAN_MONGO_PASSWORD,
    GKE_CLUSTER,
    GEK_REGION,
  } = await getConfig({ env: process.env.ENV });

  assert(GCP_PROJECT_ID, `GCP_PROJECT_ID is missing`);
  assert(GUARDIAN_MONGO_USERNAME, `GUARDIAN_MONGO_USERNAME is missing`);
  assert(GUARDIAN_MONGO_PASSWORD, `GUARDIAN_MONGO_PASSWORD is missing`);
  assert(GKE_CLUSTER, `GKE_CLUSTER is missing`);
  assert(GEK_REGION, `GEK_REGION is missing`);

  const imageTag = process.env.GIT_TAG ?? Date.now().toString();

  await pushImages({
    gcpProjectId: GCP_PROJECT_ID,
    imageTag,
  });

  await deployToGke({
    gkeCluster: GKE_CLUSTER,
    gkeRegion: GEK_REGION,
    guardianMongoUsername: GUARDIAN_MONGO_USERNAME,
    guardianMongoPassword: GUARDIAN_MONGO_PASSWORD,
    imageTag,
  });
}
