export enum RecordMethod {
  Start = 'START',
  Stop = 'STOP',
  Action = 'ACTION',
  Generate = 'GENERATE'
}

/**
 * Status carried by the `RECORD_UPDATE_BROADCAST` and `TEST_UPDATE_BROADCAST`
 * WebSocket frames during policy recording and replay.
 *
 * Single source of truth for the wire-format status shared between
 * policy-service (emitter) and the frontend (subscriber).
 */
export enum RecordStatus {
    New = 'New',
    Recording = 'Recording',
    Running = 'Running',
    Stopped = 'Stopped',
    Error = 'Error',
    Finished = 'Finished',
}