/**
 * Compare Options
 */
export interface ICompareOptions {
    /**
     * Properties
     * 0 - Don't compare
     * 1 - Only simple properties
     * 2 - All properties
     */
    propLvl: number;
    /**
     * Events
     * 0 - Don't compare
     * 1 - All events
     */
    childLvl: number;
    /**
     * Children
     * 0 - Don't compare
     * 1 - Only child blocks of the first level
     * 2 - All children
     */
    eventLvl: number;
    /**
     * UUID
     * 0 - Don't compare
     * 1 - All UUID
     */
    idLvl: number;
}
