import type { IIsoDate } from '@entity/IIsoDate';
import type { ITimeSpanMsec } from '@entity/ITimeSpanMsec';

export interface IMrvSetting {
  mrvEnergyAmount: number;
  mrvCarbonAmount: number;
  mrvTimestamp: IIsoDate;
  mrvDuration: ITimeSpanMsec;
}
