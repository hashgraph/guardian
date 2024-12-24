import { DetailsActivity, DetailsHistory } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * Statistic options
 */
export interface StatisticOptions {

}

/**
 * Statistic analytics
 */
export interface StatisticAnalytics {

}

/**
 * Statistic activity
 */
export interface StatisticActivity {

}

/**
 * Statistic
 */
export type Statistic = Message<StatisticOptions, StatisticAnalytics>;

/**
 * Statistic details
 */
export type StatisticDetails = DetailsActivity<Statistic, StatisticActivity>;
