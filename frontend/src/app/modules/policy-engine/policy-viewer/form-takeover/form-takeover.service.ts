import { ComponentRef, Injectable, Type, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

/**
 * Viewer-scoped host for a form that takes over the content area of the policy viewer.
 * Only one takeover can be open at a time.
 */
@Injectable()
export class FormTakeoverService {
    private host: ViewContainerRef | null = null;
    private ref: ComponentRef<any> | null = null;
    private closedSub?: Subscription;

    public readonly active$ = new BehaviorSubject<boolean>(false);

    public setHost(vcr: ViewContainerRef | null): void {
        this.host = vcr;
        if (!vcr && this.ref) {
            // The host view is already destroyed together with the takeover component
            this.release();
        }
    }

    public open<T>(component: Type<T>, inputs: Record<string, unknown>): ComponentRef<T> {
        if (!this.host) {
            throw new Error('Form takeover host is not available');
        }
        this.close();
        const ref = this.host.createComponent(component);
        for (const [key, value] of Object.entries(inputs)) {
            ref.setInput(key, value);
        }
        this.ref = ref;
        const closed = (ref.instance as any).closed;
        this.closedSub = closed?.subscribe(() => {
            if (this.ref === ref) {
                this.close();
            }
        });
        ref.changeDetectorRef.detectChanges();
        this.active$.next(true);
        return ref;
    }

    public close(): void {
        const ref = this.ref;
        if (!ref) {
            return;
        }
        this.release();
        ref.destroy();
    }

    private release(): void {
        this.closedSub?.unsubscribe();
        this.closedSub = undefined;
        this.ref = null;
        if (this.active$.value) {
            this.active$.next(false);
        }
    }
}
