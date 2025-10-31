export class DataList {
    public data: any[];
    public count: number;
    public full: boolean;
    public needUpdate: boolean;

    constructor() {
        this.data = [];
        this.count = 0;
        this.full = true;
        this.needUpdate = false;
    }

    public setData(data: any[], count: number) {
        this.data = Array.isArray(data) ? data : [];
        this.count = count;
        this.full = this.data.length >= count;
        this.needUpdate = false;
    }

    public after(data: any[], count: number, target?: string): boolean {
        data = Array.isArray(data) ? data : [];

        const index = this.data.findIndex((d) => d.id === target);
        if (index !== -1) {
            this.data = this.data.slice(0, index + 1);
        }
        this.data = this.data.concat(data);

        if (this.count !== count) {
            this.count = count;
            this.needUpdate = true;
        }
        this.full = this.data.length >= count;
        return this.full;
    }

    public before(data: any[], count: number, target?: string) {
        data = Array.isArray(data) ? data : [];

        const index = this.data.findIndex((d) => d.id === target);
        if (index !== -1) {
            this.data = this.data.slice(index);
        }
        this.data = data.concat(this.data);

        this.needUpdate = false;
        this.count = count;
        this.full = this.data.length >= count;

        return this.needUpdate;
    }

    public getLast() {
        return this.data[this.data.length - 1];
    }

    public getFirst() {
        return this.data[0];
    }

    public getUsers() {
        const users = new Map<string, any>();
        for (const message of this.data) {
            if (!users.has(message.sender)) {
                users.set(message.sender, message)
            }
        }
        return Array.from(users.values());
    }
}
