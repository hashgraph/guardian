import axios from 'axios';
import { UserName } from '../../../tymlez-service/src/modules/user';

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
    installerOptions: {
      field0: 'paul debug',
    },
  });
}

async function registerNewInstaller({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  username,
  policyTag,
  installerOptions,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
  username: UserName;
  policyTag: string;
  installerOptions: any;
}) {
  console.log('Registering new installer', { username, policyTag });

  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/track-and-trace/register-installer`,
    {
      username,
      policyTag,
      installerOptions,
    },
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
