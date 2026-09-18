import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
    let toastService: any;

    function create(): any {
        toastService = jasmine.createSpyObj('ToastService', ['info', 'success', 'warn', 'error']);
        return new NotificationComponent(
            {} as any,
            {} as any,
            toastService as any,
            {} as any,
        );
    }

    // Every async task sends the same "Operation started" constant, so the toast looked
    // like a generic success and never said which operation had begun.
    describe('toastProgress', () => {
        it('replaces the generic constant with the action', () => {
            const component = create();

            component.toastProgress({ message: 'Operation started', action: 'Migrate data' });

            const [detail, summary] = toastService.info.calls.mostRecent().args;
            expect(detail).toContain('Migrate data');
            expect(detail).not.toBe('Operation started');
            expect(summary).toBe('Migrate data');
        });

        it('handles a progress notification with no message at all', () => {
            const component = create();

            component.toastProgress({ action: 'Publish policy' });

            expect(toastService.info.calls.mostRecent().args[0]).toContain('Publish policy');
        });

        it('passes a specific message through untouched', () => {
            const component = create();

            component.toastProgress({ message: 'Step 2 of 8', action: 'Import' });

            expect(toastService.info).toHaveBeenCalledWith('Step 2 of 8', 'Import');
        });

        it('falls back to a heading when there is no action', () => {
            const component = create();

            component.toastProgress({ message: 'Operation started' });

            expect(toastService.info).toHaveBeenCalledWith('Operation started', 'In progress');
        });
    });
});
