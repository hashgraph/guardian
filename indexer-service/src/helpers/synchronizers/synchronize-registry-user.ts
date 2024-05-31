// import { DataBaseHelper } from '@indexer/common';
// import { MessageType, MessageAction } from '@indexer/interfaces';
// import { textSearch } from '../text-search-options.js';

// function filter() {
//     return {
//         $or: [
//             {
//                 'analytics.textSearch': null,
//             },
//         ],
//     };
// }

// export async function syncRegistryUsers() {
//     const em = DataBaseHelper.getEntityManager();
//     const collection = em.getCollection('message');
//     const registries = await collection
//         .find({
//             type: { $in: [MessageType.STANDARD_REGISTRY] },
//         })
//         .toArray();
//     const users = await collection.find({
//         type: { $in: [MessageType.DID_DOCUMENT] },
//         topicId: {
//             $in: registries.map(
//                 (registry) => registry.options.registrantTopicId
//             ),
//         },
//         'options.did': {
//             $ne: registries.map((registry) => registry.options.did),
//         },
//         ...filter(),
//     });
//     let index = 0;
//     const count = await users.count();
//     while (await users.hasNext()) {
//         index++;
//         console.log(`Sync registry-users ${index}/${count}`);
//         const document = await users.next();
//         const registry = registries.find(
//             (item) => item.options.registrantTopicId === document.topicId
//         );
//         const analytics: any = {
//             textSearch: textSearch(document),
//             registryId: registry.consensusTimestamp,
//         };
//         await collection.updateOne(
//             {
//                 _id: document._id,
//             },
//             {
//                 $set: {
//                     analytics,
//                 },
//             },
//             {
//                 upsert: false,
//             }
//         );
//     }
// }
