import { Status } from '../types/status.type.js';
import { EventModel } from '../models/event.model.js';
import { Rate } from './rate.js';

/**
 * Calculates the difference between two Events
 */
export class EventsRate extends Rate<EventModel> {
    constructor(event1: EventModel, event2: EventModel) {
        super(event1, event2);
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
