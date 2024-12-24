import { DetailsActivity, DetailsHistory } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Label options
 */
export interface LabelOptions {

}

/**
 * Label analytics
 */
export interface LabelAnalytics {

}

/**
 * Label activity
 */
export interface LabelActivity {

}

/**
 * Label
 */
export type Label = Message<LabelOptions, LabelAnalytics>;

/**
 * Label details
 */
export type LabelDetails = DetailsActivity<Label, LabelActivity>;
