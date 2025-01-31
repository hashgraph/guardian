import { Analytics, DataBaseHelper } from '@indexer/common';

/**
 * Create default entities
 */
export async function fixtures(): Promise<void> {
    const em = DataBaseHelper.getEntityManager();
    if ((await em.count(Analytics)) === 0) {
        await em.persistAndFlush(
            em.create(Analytics, {
                registries: 0,
                methodologies: 0,
                projects: 0,
                totalIssuance: 0,
                totalSerialized: 0,
                totalFungible: 0,
                date: new Date(),
            })
        );
    }
}
