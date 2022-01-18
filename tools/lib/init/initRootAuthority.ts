import axios from 'axios';

export async function initRootAuthority({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
}: {
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
}) {
  await axios.post(
    `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/user/init-root-authority`,
    {},
    {
      headers: {
        Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
      },
    },
  );
}
