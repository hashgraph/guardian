import { Timestamp } from "@hashgraph/sdk";
import moment from 'moment';

export class TimestampUtils {
    public static ISO = "YYYY-MM-DDTHH:mm:ss.SSS[Z]";
    public static ISO8601 = "YYYY-MM-DDTHH:mm:ss[Z]";

    public static toJSON(item: Timestamp, format: string = this.ISO): string {
        const d = item.toDate();
        return moment(d).utc().format(format);
    }

    public static fromJson(json: string, format: string = this.ISO): Timestamp {
        const d = moment.utc(json, format).toDate();
        return Timestamp.fromDate(d);
    }

    public static now(): Timestamp {
        return Timestamp.fromDate(new Date());
    }

    public static equals(a: Timestamp, b: Timestamp): boolean {
        if (a == b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.seconds.equals(b.seconds) && a.nanos.equals(b.nanos);
    }

    public static lessThan(a: Timestamp, b: Timestamp): boolean {
        if (a == b) {
            return false;
        }
        if (!a || !b) {
            return false;
        }
        if (a.seconds.equals(b.seconds)) {
            return a.nanos.lessThan(b.nanos);
        }
        a.seconds.lessThan(b.seconds);
    }
}