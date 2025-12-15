import { GenerateUUIDv4 } from '@guardian/interfaces';

type ZeroCallback = (id: string, timestamp: number) => void;

export class RecordActionStep {
  public readonly id: string;
  public readonly timestemp: number;
  public counter: number;
  private callbackFired = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly callback: ZeroCallback;

  constructor(callback: ZeroCallback, initialCounter = 0) {
    this.id = GenerateUUIDv4();
    this.timestemp = Date.now();
    this.callback = callback;
    this.counter = initialCounter;
  }

  public inc(): void {
    this.counter += 1;
    // console.log(this.counter, 'counter 123123')
    // // console.log(this.callbackFired, 'this.callbackFired 123123')
    this.callbackFired = false;
    this.clearTimer();
  }

  public dec(): void {
    this.counter = Math.max(0, this.counter - 1);
    // console.log(this.counter, 'counter 123123')

    this.clearTimer();
    if (this.callbackFired) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.callbackFired && this.counter === 0) {
        this.callbackFired = true;
        this.callback(this.id, this.timestemp);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
