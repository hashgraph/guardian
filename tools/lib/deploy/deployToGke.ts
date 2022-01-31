import { promise as exec } from 'exec-sh';
import { resolve } from 'path';

export async function deployToGke({
  clientName,
  env,
  gcpProjectId,
  gkeCluster,
  region,
  imageTag,
}: {
  clientName: string;
  env: string;
  gcpProjectId: string;
  gkeCluster: string;
  region: string;
  imageTag: string;
}) {
  const fullEnv = `${clientName}-${env}`;
  await exec(
    [
      'gcloud',
      'config',
      'get-value',
      'project',
      '|',
      'grep',
      fullEnv,
      '||',
      `{ echo Invalid GCP project, expect ${fullEnv}; false; }`,
    ].join(' '),
  );

  console.log('Using GKE Cluster', { gkeCluster, region });
  await exec(
    [
      'gcloud',
      'container',
      'clusters',
      'get-credentials',
      gkeCluster,
      '--region',
      region,
    ].join(' '),
  );

  await exec(['helm', 'dependency', 'update'].join(' '), {
    cwd: resolve(__dirname, 'charts/guardian-root'),
  });

  await exec(
    [
      'helm',
      'upgrade',
      '--install',
      '--debug',
      `tymlez-guardian-${process.env.ENV}`,
      '.',

      `--set-string guardian-message-broker.image.repository="asia.gcr.io/${gcpProjectId}/guardian-message-broker"`,
      `--set-string guardian-message-broker.image.tag="${imageTag}"`,
      `--set-string guardian-message-broker.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      `--set-string guardian-service.image.repository="asia.gcr.io/${gcpProjectId}/guardian-service"`,
      `--set-string guardian-service.image.tag="${imageTag}"`,
      `--set-string guardian-service.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      `--set-string guardian-ui-service.image.repository="asia.gcr.io/${gcpProjectId}/guardian-ui-service"`,
      `--set-string guardian-ui-service.image.tag="${imageTag}"`,
      `--set-string guardian-ui-service.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      `--set-string guardian-tymlez-service.image.repository="asia.gcr.io/${gcpProjectId}/guardian-tymlez-service"`,
      `--set-string guardian-tymlez-service.image.tag="${imageTag}"`,
      `--set-string guardian-tymlez-service.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      // '--dry-run',
    ].join(' '),
    {
      cwd: resolve(__dirname, 'charts/guardian-root'),
    },
  );
}
