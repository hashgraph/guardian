import { distinctUntilChanged, interval, map, Observable, of, startWith, switchMap, timer } from "rxjs";

export function getMinutesAgoStream(
    getLastSavedAt: () => Date | undefined
): Observable<string | null> {
    return timer(0, 60_000).pipe(
        map(() => {
            const lastSavedAt = getLastSavedAt();
            if (!lastSavedAt) return null;

            const minutes = Math.floor((Date.now() - lastSavedAt.getTime()) / 60000);
            if (minutes < 1) return 'Last saved less than a minute ago';
            if (minutes === 1) return 'Last saved 1 minute ago';
            return `Last saved ${minutes} minutes ago`;
        }),
        distinctUntilChanged(),
    );
}

export async function autosaveValueChanged(data: any, previousAutosave: any) {
    const notValid = !data || Object.keys(data).length == 0 || Object.values(data).every(
        v => !v || v === null || (Array.isArray(v) && v.length === 0)
    );
    let notEqual = true;
    if (previousAutosave) {
        notEqual = Object.keys(data).some(
            key => data[key] !== previousAutosave[key]
        );
    }

    return !notValid && notEqual;
}
