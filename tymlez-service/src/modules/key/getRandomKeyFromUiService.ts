import axios from 'axios';
import type { IUser } from '../user';

export async function getRandomKeyFromUiService({
  uiServiceBaseUrl,
  user,
}: {
  uiServiceBaseUrl: string;
  user: IUser;
}) {
  return (
    await axios.get(`${uiServiceBaseUrl}/api/profile/random-key`, {
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
    })
  ).data;
}
