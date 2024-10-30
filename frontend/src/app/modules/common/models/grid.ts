import { UserPermissions } from "@guardian/interfaces";

export interface IColumn {
    id: string | string[];
    title: string;
    type: string;
    size: string;
    minSize: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}