import axios from 'axios';
import type { IUser } from '../user';

export async function getUserKycFromUiService({
  tokenId,
  username,
  rootAuthority,
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
  tokenId: string;
  username: string;
  rootAuthority: IUser;
}): Promise<IUserKycFromUiService> {
  return (
    await axios.get(
      `${uiServiceBaseUrl}/api/tokens/associate-users?tokenId=${tokenId}&username=${username}`,
      {
        headers: {
          authorization: `Bearer ${rootAuthority.accessToken}`,
        },
      },
    )
  ).data;
}

interface IUserKycFromUiService {
  associated: boolean;
  balance: string;
  hBarBalance: string;
  frozen: boolean;
  kyc: boolean;
}
