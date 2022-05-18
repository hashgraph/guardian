import { ILog } from "../log.interface";
import { IPageParameters } from "../page-parameters.interface"

export interface IGetLogsMessage {
    filters?: { [x: string]: any }
    pageParameters?: IPageParameters;
    sortDirection?: 'ASC' | 'DESC';
}

export interface IGetLogsResponse {
    logs: ILog[];
    totalCount: number;
}

export interface IGetLogAttributesMessage {
    name: string;
    existingAttributes: string[];
}