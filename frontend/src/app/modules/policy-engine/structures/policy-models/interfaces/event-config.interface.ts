import { PolicyItem } from "./types";

export interface IEventConfig {
    id?: string;
    actor: string;
    disabled: boolean;
    input: string;
    output: string;
    source: string | PolicyItem | null;
    target: string | PolicyItem | null;
}
