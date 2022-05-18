import { PolicyInputEventType, PolicyOutputEventType } from "./policy-event-type";

export enum ChildrenType {
    None = 'None',
    Special = 'Special',
    Any = 'Any',
}

export enum ControlType {
    UI = 'UI',
    Special = 'Special',
    Server = 'Server',
    None = 'None',
}

export interface BlockAbout {
    label: string,
    title: string,
    post: boolean,
    get: boolean,
    input?: PolicyInputEventType[],
    output?: PolicyOutputEventType[],
    children: ChildrenType,
    control: ControlType,
}