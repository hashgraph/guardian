import axios from 'axios';
import type { IUser } from './IUser';

export async function loginToRootAuthority({
  uiServiceBaseUrl,
}: {
  uiServiceBaseUrl: string;
}) {
  const { data: user } = (await axios.post(
    `${uiServiceBaseUrl}/api/account/login`,
    { username: 'RootAuthority', password: 'test' },
    {},
  )) as { data: IUser };

  return user;
}
