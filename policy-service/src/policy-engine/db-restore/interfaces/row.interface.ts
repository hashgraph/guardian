import { ObjectId } from "mongodb";

export interface Row {
    _id: ObjectId;
    _restoreId: string;
}
