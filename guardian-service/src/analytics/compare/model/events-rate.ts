import { Status } from "./status.type";
import { EventModel } from "./event-model";


export class EventsRate {
    public items: any[];
    public type: Status;
    public totalRate: number;

    constructor(event1: EventModel, event2: EventModel) {
        this.items = [event1?.toObject(), event2?.toObject()];
        if (event1 && event2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (event1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }
}
