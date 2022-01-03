import { promise as exec } from 'exec-sh';
import { resolve } from 'path';

export async function deployToGke({
  gkeCluster,
  gkeRegion,
  guardianMongoUsername,
  guardianMongoPassword,
  imageTag,
}: {
  gkeCluster: string;
  gkeRegion: string;
  guardianMongoUsername: string;
  guardianMongoPassword: string;
  imageTag: string;
}) {
  await exec(
    [
      'gcloud',
      'container',
      'clusters',
      'get-credentials',
      gkeCluster,
      '--region',
      gkeRegion,
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

      `--set-string mongodb.auth.rootUser="${guardianMongoUsername}"`,
      `--set-string mongodb.auth.rootPassword="${guardianMongoPassword}"`,

      `--set-string guardian-message-broker.image.tag="${imageTag}"`,
      `--set-string guardian-message-broker.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      `--set-string guardian-service.image.tag="${imageTag}"`,
      `--set-string guardian-service.configmap.data.DB_USER="${guardianMongoUsername}"`,
      `--set-string guardian-service.configmap.data.DB_PASSWORD="${guardianMongoPassword}"`,
      `--set-string guardian-service.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      `--set-string guardian-ui-service.image.tag="${imageTag}"`,
      `--set-string guardian-ui-service.configmap.data.DB_USER="${guardianMongoUsername}"`,
      `--set-string guardian-ui-service.configmap.data.DB_PASSWORD="${guardianMongoPassword}"`,
      `--set-string guardian-ui-service.configmap.data.DEPLOY_VERSION="${imageTag}"`,

      // '--dry-run',
    ].join(' '),
    {
      cwd: resolve(__dirname, 'charts/guardian-root'),
    },
  );
}
