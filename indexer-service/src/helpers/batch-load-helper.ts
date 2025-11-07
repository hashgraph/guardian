export class BatchLoadHelper {
    public static get DEFAULT_BATCH_SIZE() { return 10000 };

    public static async load<T>(
        iterattor: { hasNext: () => Promise<boolean>, next: () => Promise<any> },
        batchSize: number,
        batchCb: (batch: T[], counter?: { batchIndex: number, loadedTotal: number }) => Promise<void>,
    ) {
        if (!batchSize || batchSize <= 0)
            batchSize = this.DEFAULT_BATCH_SIZE;

        const counter = {
            batchIndex: 0,
            loadedTotal: 0
        };

        while (await iterattor.hasNext()) {
            const agg = [];
            while (await iterattor.hasNext() && (agg.length < batchSize)) {
                const document = await iterattor.next();
                if (document) {
                    agg.push(document);
                }
            }

            counter.batchIndex++;
            counter.loadedTotal += agg.length;

            //Call per batch callback
            if (agg.length > 0 && batchCb)
                await batchCb(agg, counter);
        }
    }
}