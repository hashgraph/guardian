import { SimpleChange } from '@angular/core';
import { Subject, of } from 'rxjs';
import { AsyncProgressComponent } from './async-progress.component';

// The page shows a task through one GET and the task-status pushes of the WebSocket. A GET that
// lands while the gateway still runs the task callback returns no result, and a push can be lost:
// the component has to keep asking until the task settles.
describe('AsyncProgressComponent result delivery', () => {
    let pushes: Subject<any>;
    let responses: Map<string, any[]>;
    let requested: string[];
    let component: AsyncProgressComponent;

    const inProgress = (taskId: string) => ({ taskId, action: 'Create random key', info: { completed: false } });
    const finished = (taskId: string, result: any) => ({ taskId, action: 'Create random key', info: { completed: true }, result });

    const create = () => {
        const taskService = {
            get: (taskId: string) => {
                requested.push(taskId);
                const queue = responses.get(taskId) || [];
                return of(queue.length > 1 ? queue.shift() : queue[0]);
            }
        };
        const wsService = { taskSubscribe: (next: (task: any) => void) => pushes.subscribe(next) };
        const route = { snapshot: { queryParams: {}, params: {} }, params: of({}) };
        component = new AsyncProgressComponent(
            wsService as any, route as any, taskService as any, {} as any, {} as any, {} as any, {} as any, new Map()
        );
        component.inputTaskId = 'task-1';
        return component;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        pushes = new Subject();
        responses = new Map();
        requested = [];
    });

    afterEach(() => {
        component?.ngOnDestroy();
        vi.useRealTimers();
    });

    it('asks again until the result arrives when the first answer has none and no push comes', () => {
        responses.set('task-1', [inProgress('task-1'), inProgress('task-1'), finished('task-1', { id: '0.0.1' })]);
        const completed: any[] = [];
        create().completed.subscribe((result) => completed.push(result));

        component.ngOnInit();
        expect(completed).toEqual([]);
        vi.advanceTimersByTime(10000);

        expect(completed).toEqual([{ id: '0.0.1' }]);
    });

    it('stops asking once the task has settled', () => {
        responses.set('task-1', [inProgress('task-1'), finished('task-1', { id: '0.0.1' })]);
        create().ngOnInit();
        vi.advanceTimersByTime(10000);
        const settledAfter = requested.length;

        vi.advanceTimersByTime(60000);

        expect(requested.length).toBe(settledAfter);
    });

    it('stops asking when the push delivers the result, and reports it once', () => {
        responses.set('task-1', [inProgress('task-1')]);
        const completed: any[] = [];
        create().completed.subscribe((result) => completed.push(result));
        component.ngOnInit();

        pushes.next(finished('task-1', { id: '0.0.2' }));
        const afterPush = requested.length;
        vi.advanceTimersByTime(60000);

        expect(completed).toEqual([{ id: '0.0.2' }]);
        expect(requested.length).toBe(afterPush);
    });

    it('reports a failed task found by asking again', () => {
        responses.set('task-1', [inProgress('task-1'), { taskId: 'task-1', info: { completed: true }, error: { message: 'boom' } }]);
        const errors: any[] = [];
        create().error.subscribe((error) => errors.push(error));
        component.ngOnInit();

        vi.advanceTimersByTime(10000);

        expect(errors.length).toBe(1);
    });

    it('stops asking when it is destroyed', () => {
        responses.set('task-1', [inProgress('task-1')]);
        create().ngOnInit();
        component.ngOnDestroy();
        const atDestroy = requested.length;

        vi.advanceTimersByTime(60000);

        expect(requested.length).toBe(atDestroy);
    });

    it('follows a new task id given to a live instance', () => {
        responses.set('task-1', [inProgress('task-1')]);
        responses.set('task-2', [inProgress('task-2')]);
        const completed: any[] = [];
        create().completed.subscribe((result) => completed.push(result));
        component.ngOnInit();

        component.inputTaskId = 'task-2';
        component.ngOnChanges({ inputTaskId: new SimpleChange('task-1', 'task-2', false) });
        pushes.next(finished('task-1', { id: 'old' }));
        pushes.next(finished('task-2', { id: 'new' }));

        expect(requested).toContain('task-2');
        expect(completed).toEqual([{ id: 'new' }]);
    });
});
