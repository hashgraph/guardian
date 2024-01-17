export interface IStep {
    index: number;
    level: number;
    label: string;
    blockTag: string;
    blockId: string;
    hasAction?: boolean;
}
