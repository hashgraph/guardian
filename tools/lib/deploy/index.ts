import assert from 'assert';
import { promise as exec } from 'exec-sh';
import { STS } from 'aws-sdk';
import { getBuildTimeConfig } from '../getBuildTimeConfig';
import { deployToGke } from './deployToGke';
import { pushImages } from './pushImages';

const sts = new STS();

export async function deploy() {
  const { ENV, CLIENT_NAME, GIT_TAG } = process.env;

  assert(ENV, `ENV is missing`);
  assert(ENV !== 'local', `Cannot deploy to local`);
  assert(CLIENT_NAME, `CLIENT_NAME is missing`);

  const { Arn: callerArn } = await sts.getCallerIdentity().promise();
  const fullEnv = `${CLIENT_NAME}-${ENV}`;
  assert(
    callerArn?.includes(`/ci-${fullEnv}`),
    `AWS caller: ${callerArn} not allow to deploy to ${fullEnv}`,
  );

  const { GCP_PROJECT_ID, GCP_REGION, GKE_CLUSTER } = await getBuildTimeConfig({
    env: ENV,
    clientName: CLIENT_NAME,
  });

  assert(GCP_PROJECT_ID, `GCP_PROJECT_ID is missing`);
  assert(GCP_REGION, `GCP_REGION is missing`);
  assert(GKE_CLUSTER, `GKE_CLUSTER is missing`);

  const imageTag = GIT_TAG ?? Date.now().toString();

  await exec(['docker-compose', 'build'].join(' '));

  await exec(['gcloud', 'auth', 'configure-docker'].join(' '));

  await pushImages({
    gcpProjectId: GCP_PROJECT_ID,
    imageTag,
  });

  await deployToGke({
    gkeCluster: GKE_CLUSTER,
    region: GCP_REGION,
    imageTag,
    gcpProjectId: GCP_PROJECT_ID,
    clientName: CLIENT_NAME,
    env: ENV,
  });
}
