/**
 * Properties
 */
export enum IPropertiesLvl {
    None = 'None', //Don't compare
    Simple = 'Simple', //Only simple properties
    All = 'All' //All properties
}

/**
 * Events
 */
export enum IEventsLvl {
    None = 'None', //Don't compare
    All = 'All' //All events
}

/**
 * Children
 */
export enum IChildrenLvl {
    None = 'None', //Don't compare
    First = 'First', //Only child blocks of the first level
    All = 'All' //All children
}

/**
 * UUID
 * 0 - Don't compare
 * 1 - All UUID
 */
export enum IIdLvl {
    None = 'None', //Don't compare
    All = 'All' // All UUID
}

/**
 * Key
 * 0 - Default
 * 1 - Description
 * 2 - Title
 */
export enum IKeyLvl {
    Default = 'Default', //Default
    Description = 'Description', //Description
    Title = 'Title' //Title
}

/**
 * Compare Options
 */
export class CompareOptions {
    /**
     * Properties
     */
    public readonly propLvl: IPropertiesLvl;
    /**
     * Children
     */
    public readonly childLvl: IChildrenLvl;
    /**
     * Events
     */
    public readonly eventLvl: IEventsLvl;
    /**
     * UUID
     */
    public readonly idLvl: IIdLvl;
    /**
     * Key
     */
    public readonly keyLvl: IKeyLvl;
    /**
     * Permissions
     */
    public readonly owner: string;

    constructor(
        propLvl?: IPropertiesLvl | string | number | null | undefined,
        childLvl?: IChildrenLvl | string | number | null | undefined,
        eventLvl?: IEventsLvl | string | number | null | undefined,
        idLvl?: IIdLvl | string | number | null | undefined,
        keyLvl?: IKeyLvl | string | number | null | undefined,
        owner?: string | null | undefined,
    ) {
        switch (propLvl) {
            case '0':
            case 0: {
                this.propLvl = IPropertiesLvl.None;
            }
            case '1':
            case 1: {
                this.propLvl = IPropertiesLvl.Simple;
            }
            case '2':
            case 2: {
                this.propLvl = IPropertiesLvl.All;
            }
            default: {
                this.propLvl = IPropertiesLvl.All;
            }
        }
        switch (childLvl) {
            case '0':
            case 0: {
                this.childLvl = IChildrenLvl.None;
            }
            case '1':
            case 1: {
                this.childLvl = IChildrenLvl.First;
            }
            case '2':
            case 2: {
                this.childLvl = IChildrenLvl.All;
            }
            default: {
                this.childLvl = IChildrenLvl.All;
            }
        }
        switch (eventLvl) {
            case '0':
            case 0: {
                this.eventLvl = IEventsLvl.None;
            }
            case '1':
            case 1: {
                this.eventLvl = IEventsLvl.All;
            }
            default: {
                this.eventLvl = IEventsLvl.All;
            }
        }
        switch (idLvl) {
            case '0':
            case 0: {
                this.idLvl = IIdLvl.None;
            }
            case '1':
            case 1: {
                this.idLvl = IIdLvl.All;
            }
            default: {
                this.idLvl = IIdLvl.All;
            }
        }
        switch (keyLvl) {
            case '0':
            case 0: {
                this.keyLvl = IKeyLvl.Default;
            }
            case '1':
            case 1: {
                this.keyLvl = IKeyLvl.Description;
            }
            case '2':
            case 2: {
                this.keyLvl = IKeyLvl.Title;
            }
            default: {
                this.keyLvl = IKeyLvl.Default;
            }
        }
        this.owner = owner;
    }

    public static readonly default = new CompareOptions();
}