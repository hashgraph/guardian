export interface PolicyStorageItem {
    view: string;
    value: string;
}

export interface DocumentAutosaveStorageItem {
    value: string;
}

/**
 * Base class for storing states
 *
 * @export
 * @class Stack
 * @template T
 */
export class Stack<T> {
    private MAX_STACK_SIZE = 100;
    private stack: Array<T | null>;
    private stackSize: number;
    private stackIndex: number;
    private maxSize: number;

    constructor(maxSize: number) {
        if (maxSize > 0 && maxSize < this.MAX_STACK_SIZE) {
            this.maxSize = maxSize + 1;
        } else {
            this.maxSize = this.MAX_STACK_SIZE;
        }
        this.stack = new Array<T>(this.maxSize);
        this.stackSize = 0;
        this.stackIndex = 0;
    }

    public push(item: T): void {
        if (this.stackIndex > 0) {
            this.stackSize = this.stackSize - this.stackIndex;
            for (let index = 0; index < this.stackSize; index++) {
                this.stack[index] = this.stack[this.stackIndex];
                this.stackIndex++;
            }
        }
        this.stackSize++;
        this.stackIndex = 0;
        if (this.stackSize > this.maxSize) {
            this.stackSize = this.maxSize;
        }
        if (this.stackSize < 0) {
            this.stackSize = 0;
        }
        for (let index = this.maxSize - 1; index > 0; index--) {
            if (index > this.stackSize) {
                this.stack[index] = null;
            } else {
                this.stack[index] = this.stack[index - 1];
            }
        }
        this.stack[0] = item;
    }

    public pop(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        this.stackIndex = 0;
        let item = this.stack[0];
        for (let index = 0; index < this.maxSize; index++) {
            if (index >= this.stackSize) {
                this.stack[index] = null;
            } else {
                this.stack[index] = this.stack[index + 1];
            }
        }
        this.stackSize--;
        return item;
    }

    public undo(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        this.stackIndex++;
        if (this.stackIndex > this.stackSize) {
            this.stackIndex = this.stackSize;
        }
        return this.stack[this.stackIndex];
    }

    public redo(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        this.stackIndex--;
        if (this.stackIndex < 0) {
            this.stackIndex = 0;
        }
        return this.stack[this.stackIndex];
    }

    public current(): T | null {
        if (this.stackSize < 1) {
            return null;
        }
        if (this.stackIndex < 0) {
            this.stackIndex = 0;
        }
        return this.stack[this.stackIndex];
    }

    public clear(): void {
        this.stack = new Array<T>(this.maxSize);
        this.stackSize = 0;
        this.stackIndex = 0;
    }

    public isUndo(): boolean {
        return this.stackIndex < this.stackSize - 1;
    }

    public isRedo(): boolean {
        return this.stackIndex > 0;
    }
}
