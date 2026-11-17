import { Timestamp } from '@hiero-ledger/sdk';
import moment from 'moment';

/**
 * Timestamp
 */
export class TimestampUtils {
    /**
     * ISO format
     */
    public static ISO = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';
    /**
     * ISO8601 format
     */
    public static ISO8601 = 'YYYY-MM-DDTHH:mm:ss[Z]';

    /**
     * To JSON
     * @param item
     * @param format
     */
    public static toJSON(item: Timestamp, format: string = TimestampUtils.ISO): string {
        const d = item.toDate();
        return moment(d).utc().format(format);
    }

    /**
     * From JSON
     * @param json
     * @param format
     */
    public static fromJson(json: string, format: string = TimestampUtils.ISO): Timestamp {
        const d = moment.utc(json, format).toDate();
        return Timestamp.fromDate(d);
    }

    /**
     * Now time
     */
    public static now(): Timestamp {
        return Timestamp.fromDate(new Date());
    }

    /**
     * Equals
     * @param a
     * @param b
     */
    public static equals(a: Timestamp, b: Timestamp): boolean {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.seconds.equals(b.seconds) && a.nanos.equals(b.nanos);
    }

    /**
     * Less than
     * @param a
     * @param b
     */
    public static lessThan(a: Timestamp, b: Timestamp): boolean {
        if (a === b) {
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
