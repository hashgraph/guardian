export enum PolicyInputEventType {
    TimerEvent = 'TimerEvent',
    StartTimerEvent = 'StartTimerEvent',
    StopTimerEvent = 'StopTimerEvent',
    RefreshEvent = 'RefreshEvent',
    RunEvent = 'RunEvent'
}

export enum PolicyOutputEventType {
    TimerEvent = 'TimerEvent',
    RunEvent = 'RunEvent',
    RefreshEvent = 'RefreshEvent',
    DropdownEvent = 'DropdownEvent',
}