import { PolicyBlockModel } from "../block.model";

export interface IEventConfig {
    id: string;
    actor: string;
    disabled: boolean;
    input: string;
    output: string;
    source: string | PolicyBlockModel | null;
    target: string | PolicyBlockModel | null;
}
