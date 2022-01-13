import axios from 'axios';

export async function initInstallers({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
}: {
  GUARDIAN_TYMLEZ_API_KEY: string;
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
}) {
  const installers = ['Installer' /*, 'Installer2'*/];

  for (const installer of installers) {
    console.log('Initializing installer', installer);

    await axios.post(
      `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/user/init-installer/${installer}`,
      {},
      {
        headers: {
          Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
        },
      },
    );
  }

  return installers;
}
