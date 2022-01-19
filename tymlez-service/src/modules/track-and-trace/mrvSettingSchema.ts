import Joi from 'joi';
import type { IMrvSetting } from './IMrvSetting';

export const mrvSettingSchema = Joi.object<IMrvSetting>({
  mrvCarbonAmount: Joi.number().required(),
  mrvEnergyAmount: Joi.number().required(),
  mrvTimestamp: Joi.string().required(),
  mrvDuration: Joi.number().required(),
});
