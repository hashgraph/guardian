import { PolicyTestAutomationService } from './policy-test-automation.service';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('PolicyTestAutomationService stored state', () => {
    let service: PolicyTestAutomationService;
    let get: jasmine.Spy;
    let put: jasmine.Spy;

    beforeEach(() => {
        get = jasmine.createSpy('get').and.returnValue(Promise.resolve(undefined));
        put = jasmine.createSpy('put').and.returnValue(Promise.resolve());
        const zone: any = { run: (fn: () => void) => fn() };
        const recordService: any = {};
        const wsService: any = { recordSubscribe: () => ({ unsubscribe: () => {} }) };
        service = new PolicyTestAutomationService(zone, recordService, wsService);
        spyOn<any>(service, 'getDb').and.returnValue(Promise.resolve({ get, put }));
    });

    it('loads the stored stage when nothing loaded the policy first', async () => {
        get.and.returnValue(Promise.resolve({
            policyId: 'policy-1',
            captureNextFormSubmit: false,
            testCases: [],
            stopStage: 'warning'
        }));
        await service.ensureLoaded('policy-1');
        expect(get).toHaveBeenCalledTimes(1);
        expect(service.state.stopStage).toBe('warning');
    });

    it('does not restart a load already running for the same policy', async () => {
        service.loadForPolicy('policy-1');
        await service.ensureLoaded('policy-1');
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('does not write while the first read is still in flight', async () => {
        let releaseGet: (value: any) => void = () => {};
        get.and.returnValue(new Promise((resolve) => {
            releaseGet = resolve;
        }));
        service.loadForPolicy('policy-1');
        await service.setStopStage('save');
        expect(put).not.toHaveBeenCalled();
        releaseGet(undefined);
        await flush();
    });

    it('keeps the cases captured during a recording when the policy is adopted again', async () => {
        await service.ensureLoaded('policy-1');
        service.reset();
        service.captureTestCase({
            policyId: 'policy-1',
            blockId: 'block-1',
            title: 'Case',
            document: {},
            result: { recordActionId: 'a-1', id: 'doc-1', type: 'vc' }
        } as any);
        await service.ensureLoaded('policy-1');
        expect(service.state.testCases.length).toBe(1);
    });

    it('writes the stage together with those cases after the stop flow adopts the policy', async () => {
        await service.ensureLoaded('policy-1');
        service.reset();
        service.captureTestCase({
            policyId: 'policy-1',
            blockId: 'block-1',
            title: 'Case',
            document: {},
            result: { recordActionId: 'a-1', id: 'doc-1', type: 'vc' }
        } as any);
        await service.ensureLoaded('policy-1');
        await service.setStopStage('warning');
        const written = put.calls.mostRecent().args[1];
        expect(written.stopStage).toBe('warning');
        expect(written.testCases.length).toBe(1);
    });

    it('carries nothing from one policy into another', async () => {
        get.and.returnValue(Promise.resolve({
            policyId: 'policy-a',
            captureNextFormSubmit: false,
            testCases: [{ id: 'case-a', name: 'A', recordActionId: 'a-1', input: {}, outputs: [] }],
            stopStage: 'warning'
        }));
        await service.ensureLoaded('policy-a');
        expect(service.state.testCases.length).toBe(1);
        get.and.returnValue(Promise.resolve(undefined));
        await service.ensureLoaded('policy-b');
        expect(service.state.testCases.length).toBe(0);
        expect(service.state.stopStage).toBeNull();
        await service.setStopStage('save');
        const written = put.calls.mostRecent().args[1];
        expect(written.policyId).toBe('policy-b');
        expect(written.testCases.length).toBe(0);
    });

    it('keeps the stored test cases when the stage is written after the read', async () => {
        const stored = [{ id: 'case-1', name: 'Case', recordActionId: 'a-1', input: {}, outputs: [] }];
        get.and.returnValue(Promise.resolve({
            policyId: 'policy-1',
            captureNextFormSubmit: false,
            testCases: stored,
            stopStage: 'warning'
        }));
        await service.ensureLoaded('policy-1');
        await service.setStopStage('save');
        expect(put).toHaveBeenCalledTimes(1);
        const written = put.calls.mostRecent().args[1];
        expect(written.testCases.length).toBe(1);
        expect(written.stopStage).toBe('save');
    });
});
