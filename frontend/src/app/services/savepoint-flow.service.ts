import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SavepointFlowService {
    private ready$ = new BehaviorSubject<boolean>(true);
    private skipOnce = false;

    markBusy(): void { this.ready$.next(false); }

    markReady(): void { this.ready$.next(true); }

    waitReadyOnce() { return this.ready$.pipe(filter(Boolean), take(1)); }

    setSkipOnce(): void { this.skipOnce = true; }

    consumeSkipOnce(): boolean {
        const v = this.skipOnce; this.skipOnce = false; return v;
    }
}
