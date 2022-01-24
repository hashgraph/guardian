import type { IIsoDate } from '@entity/IIsoDate';
import type { IMetricTon } from '@entity/IMetricTon';
import type { ITimeSpanMsec } from '@entity/ITimeSpanMsec';
import type { kWh } from '@entity/kWh';

export interface IMrvSetting {
  mrvEnergyAmount: kWh;
  mrvCarbonAmount: IMetricTon;
  mrvTimestamp: IIsoDate;
  mrvDuration: ITimeSpanMsec;
}
