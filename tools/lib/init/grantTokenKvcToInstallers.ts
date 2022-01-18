import axios from 'axios';
import { ITokenResponse } from './ITokenResponse';

export async function grantTokenKvcToInstallers({
  GUARDIAN_TYMLEZ_API_KEY,
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL,
  installers,
  tokens,
}: {
  tokens: ITokenResponse[];
  installers: string[];
  GUARDIAN_TYMLEZ_SERVICE_BASE_URL: string;
  GUARDIAN_TYMLEZ_API_KEY: string;
}) {
  for (let token of tokens) {
    for (let installer of installers) {
      console.log('Granting KYC', { tokenId: token.tokenId, installer });
      await axios.post(
        `${GUARDIAN_TYMLEZ_SERVICE_BASE_URL}/tokens/user-kyc`,
        {
          tokenId: token.tokenId,
          username: installer,
          value: true,
        },
        {
          headers: {
            Authorization: `Api-Key ${GUARDIAN_TYMLEZ_API_KEY}`,
          },
        },
      );
    }
  }
}
