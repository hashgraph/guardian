import type { UserState } from 'interfaces';

export interface IUser {
  accessToken: string;
  did: string;
  role: string;
  state: UserState;
  username: string;
}
