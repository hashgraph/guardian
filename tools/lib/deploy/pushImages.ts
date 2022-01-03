import { promise as exec } from 'exec-sh';

export async function pushImages({
  gcpProjectId,
  imageTag,
}: {
  gcpProjectId: string;
  imageTag: string;
}) {
  console.log('Pushing images to ', { gcpProjectId, imageTag });

  await pushImage({
    gcpProjectId,
    imageName: 'guardian-message-broker',
    imageTag,
  });

  await pushImage({
    gcpProjectId,
    imageName: 'guardian-service',
    imageTag,
  });

  await pushImage({
    gcpProjectId,
    imageName: 'guardian-ui-service',
    imageTag,
  });

  await pushImage({
    gcpProjectId,
    imageName: 'guardian-mrv-sender',
    imageTag,
  });
}

async function pushImage({
  gcpProjectId,
  imageName,
  imageTag,
}: {
  gcpProjectId: string;
  imageName: string;
  imageTag: string;
}) {
  await exec(
    [
      `docker`,
      `tag`,
      imageName,
      `asia.gcr.io/${gcpProjectId}/${imageName}:${imageTag}`,
    ].join(' '),
  );

  await exec(
    [
      `docker`,
      `push`,
      `asia.gcr.io/${gcpProjectId}/${imageName}:${imageTag}`,
    ].join(' '),
  );

  await exec(
    [
      `docker`,
      `tag`,
      imageName,
      `asia.gcr.io/${gcpProjectId}/${imageName}:latest`,
    ].join(' '),
  );

  await exec(
    [`docker`, `push`, `asia.gcr.io/${gcpProjectId}/${imageName}:latest`].join(
      ' ',
    ),
  );
}
