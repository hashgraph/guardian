import { Status } from "../types/status.type";


export interface IRate<T> {
    items: T[];
    type: Status;
    totalRate: number;
}
