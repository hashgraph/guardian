import { PropertiesModel } from './properties.model';

/**
 * Block Properties Model
 * @extends IWeightModel
 */
export class BlockPropertiesModel extends PropertiesModel {
    /**
     * Block permissions
     */
    private readonly permissions: string[];

    constructor(json: any) {
        const prop = Object.assign({}, json, {
            id: undefined,
            blockType: undefined,
            tag: undefined,
            permissions: undefined,
            artifacts: undefined,
            events: undefined,
            children: undefined,
        });

        super(prop);

        if (Array.isArray(json.permissions)) {
            this.permissions = json.permissions;
        } else {
            this.permissions = [];
        }
        this.permissions.sort();
    }

    /**
     * Get permissions
     * @public
     */
    public getPermissionsList(): string[] {
        return this.permissions.slice();
    }
}
