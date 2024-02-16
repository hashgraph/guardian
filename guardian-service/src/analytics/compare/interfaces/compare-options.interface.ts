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
    Title = 'Title', //Title
    Property = 'Property' //Title
}

/**
 * Ref
 * 0 - Default
 * 1 - None
 * 2 - Revert
 * 3 - Merge
 */
export enum IRefLvl {
    Default = 'Default', //Default
    None = 'None', //Don't compare
    Revert = 'Revert', //Revert
    Merge = 'Merge' //Merge
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
     * Ref
     */
    public readonly refLvl: IRefLvl;
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
        refLvl?: IRefLvl | string | number | null | undefined,
        owner?: string | null | undefined,
    ) {
        switch (propLvl) {
            case IPropertiesLvl.None:
            case '0':
            case 0: {
                this.propLvl = IPropertiesLvl.None;
                break;
            }
            case IPropertiesLvl.Simple:
            case '1':
            case 1: {
                this.propLvl = IPropertiesLvl.Simple;
                break;
            }
            case IPropertiesLvl.All:
            case '2':
            case 2: {
                this.propLvl = IPropertiesLvl.All;
                break;
            }
            default: {
                this.propLvl = IPropertiesLvl.All;
                break;
            }
        }
        switch (childLvl) {
            case IChildrenLvl.None:
            case '0':
            case 0: {
                this.childLvl = IChildrenLvl.None;
                break;
            }
            case IChildrenLvl.First:
            case '1':
            case 1: {
                this.childLvl = IChildrenLvl.First;
                break;
            }
            case IChildrenLvl.All:
            case '2':
            case 2: {
                this.childLvl = IChildrenLvl.All;
                break;
            }
            default: {
                this.childLvl = IChildrenLvl.All;
                break;
            }
        }
        switch (eventLvl) {
            case IEventsLvl.None:
            case '0':
            case 0: {
                this.eventLvl = IEventsLvl.None;
                break;
            }
            case IEventsLvl.All:
            case '1':
            case 1: {
                this.eventLvl = IEventsLvl.All;
                break;
            }
            default: {
                this.eventLvl = IEventsLvl.All;
                break;
            }
        }
        switch (idLvl) {
            case IIdLvl.None:
            case '0':
            case 0: {
                this.idLvl = IIdLvl.None;
                break;
            }
            case IIdLvl.All:
            case '1':
            case 1: {
                this.idLvl = IIdLvl.All;
                break;
            }
            default: {
                this.idLvl = IIdLvl.All;
                break;
            }
        }
        switch (keyLvl) {
            case IKeyLvl.Default:
            case '0':
            case 0: {
                this.keyLvl = IKeyLvl.Default;
                break;
            }
            case IKeyLvl.Description:
            case '1':
            case 1: {
                this.keyLvl = IKeyLvl.Description;
                break;
            }
            case IKeyLvl.Title:
            case '2':
            case 2: {
                this.keyLvl = IKeyLvl.Title;
                break;
            }
            case IKeyLvl.Property:
            case '3':
            case 3: {
                this.keyLvl = IKeyLvl.Property;
                break;
            }
            default: {
                this.keyLvl = IKeyLvl.Default;
                break;
            }
        }
        switch (refLvl) {
            case IRefLvl.Default:
            case '0':
            case 0: {
                this.refLvl = IRefLvl.Default;
                break;
            }
            case IRefLvl.None:
            case '1':
            case 1: {
                this.refLvl = IRefLvl.None;
                break;
            }
            case IRefLvl.Revert:
            case '2':
            case 2: {
                this.refLvl = IRefLvl.Revert;
                break;
            }
            case IRefLvl.Merge:
            case '3':
            case 3: {
                this.refLvl = IRefLvl.Merge;
                break;
            }
            default: {
                this.refLvl = IRefLvl.Default;
                break;
            }
        }
        this.owner = owner;
    }

    public static readonly default = new CompareOptions();
}