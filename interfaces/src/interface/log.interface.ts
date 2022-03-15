import { LogType } from "../type/log.type"

export interface ILog {
    message?: string;
    type: LogType;
    attributes?: string[];
}