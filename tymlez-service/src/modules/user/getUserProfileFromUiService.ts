import axios from 'axios';
import type { IUserProfile } from 'interfaces';
import type { IUser } from '../user';

export async function getUserProfileFromUiService({
  uiServiceBaseUrl,
  user,
}: {
  uiServiceBaseUrl: string;
  user: IUser;
}): Promise<IUserProfile | undefined> {
  return (
    await axios.get(`${uiServiceBaseUrl}/api/profile/user-state`, {
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
    })
  ).data;
}
