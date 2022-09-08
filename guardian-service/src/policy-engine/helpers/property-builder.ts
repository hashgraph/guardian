import {
    AnyBlockProperties,
    ArrayProperties,
    CheckboxProperties,
    GroupProperties,
    InputProperties,
    PropertyType,
    SelectProperties
} from "@policy-engine/interfaces/block-about";

/**
 * Property Builder
 */
export class PropertyBuilder {
    public static Input(
        name: string,
        label: string,
        title: string,
        defaultValue: any
    ): InputProperties {
        return {
            name: name,
            label: label,
            title: title,
            type: PropertyType.Input,
            default: defaultValue
        };
    }

    public static Checkbox(
        name: string,
        label: string,
        title: string,
        defaultValue: boolean
    ): CheckboxProperties {
        return {
            name: name,
            label: label,
            title: title,
            type: PropertyType.Checkbox,
            default: defaultValue
        };
    }

    public static Select(
        name: string,
        label: string,
        title: string,
        defaultValue: any,
        items: any[]
    ): SelectProperties {
        return {
            name: name,
            label: label,
            title: title,
            type: PropertyType.Select,
            default: defaultValue,
            items: items
        };
    }

    public static Group(
        name: string,
        label: string,
        title: string,
        properties: AnyBlockProperties[]
    ): GroupProperties {
        return {
            name: name,
            label: label,
            title: title,
            type: PropertyType.Group,
            properties: properties
        };
    }

    public static Array(
        name: string,
        label: string,
        title: string,
        itemLabel: string,
        properties: AnyBlockProperties[]
    ): ArrayProperties {
        return {
            name: name,
            label: label,
            title: title,
            type: PropertyType.Array,
            items: {
                label: itemLabel,
                properties: properties
            }
        };
    }

}