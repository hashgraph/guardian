import axios from 'axios';

export async function registerNewInstallers({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
}) {
  await registerNewInstaller({
    GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
    GUARDIAN_TYMLEZ_API_KEY,
    username: 'Installer',
    policyTag: 'TymlezCET',
    installerInfo: {
      installerName: 'Installer 1',
      installerLicense: 'License 1',
    },
  });
}

async function registerNewInstaller({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  username,
  policyTag,
  installerInfo,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: string;
  policyTag: string;
  installerInfo: any;
}) {
  console.log('Registering new installer', { username, policyTag });

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/register-installer`,
    {
      username,
      policyTag,
      installerInfo,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
