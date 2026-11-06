export const fullWorkerRun = process.env.PREVIEW_ALL_WORKER_TESTS === '1';

export const itInFullWorkerRun = fullWorkerRun ? it : it.skip;
