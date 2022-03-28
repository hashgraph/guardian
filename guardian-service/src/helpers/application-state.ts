import { Singleton } from '@helpers/decorators/singleton';

export enum ApplicationStates {
    STARTED,
    INITIALIZING,
    READY
}

@Singleton
export class ApplicationState {
    private state: ApplicationStates;

    constructor() {
        this.state = ApplicationStates.STARTED
    }

    public getState(): ApplicationStates {
        return this.state;
    }

    public updateState(state: ApplicationStates): void {
        if (this.state > state) {
            throw new Error('State change error')
        }
        this.state = state;
    }
}
