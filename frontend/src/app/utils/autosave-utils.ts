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
