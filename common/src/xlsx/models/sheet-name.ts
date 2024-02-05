
export class SheetName {
    private readonly nameCache = new Set<string>();

    public getSheetName(name: string, size: number): string {
        const id = ((name || '')
            .replace(/[\*,\?,\:,\\,\/,\[,\]]/ig, '')
            .slice(0, Math.min(size, 30)));
        if (this.nameCache.has(id)) {
            const base = id.slice(0, Math.min(size - 3, 27));

            let index = 0;
            let newId = base;
            do {
                index++;
                newId = base + ' ' + index;
            } while (this.nameCache.has(newId));

            this.nameCache.add(newId);
            return newId;

        } else {
            this.nameCache.add(id);
            return id;
        }
    }

    public getSchemaName(name: string): string {
        return this.getSheetName(name, 30);
    }

    public getToolName(name: string): string {
        return this.getSheetName(name, 23) + ' (tool)';
    }

    public getEnumName(name: string): string {
        return this.getSheetName(name, 23) + ' (enum)';
    }
}
