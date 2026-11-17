const { MongoClient } = require('mongodb');

// Database names the services use when GUARDIAN_ENV is empty (guardian-service and auth-service configs).
const DATABASES = ['guardian_db', 'auth_db'];
const DID_FIELDS = ['did', 'owner', 'creator', 'parent'];

// Cypress runs either on the host or inside the runner container, so fall back to the docker
// host alias when `localhost` is not the MongoDB of the stack.
function candidateUrls(config) {
    return config.env.mongoUrl
        ? [config.env.mongoUrl]
        : ['mongodb://localhost:27017', 'mongodb://host.docker.internal:27017'];
}

async function connect(config) {
    const errors = [];
    for (const url of candidateUrls(config)) {
        const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
        try {
            await client.connect();
            return client;
        } catch (error) {
            errors.push(`${url}: ${error.message}`);
            await client.close();
        }
    }
    throw new Error(`No reachable MongoDB. Tried:\n${errors.join('\n')}`);
}

// Removes every row that belongs to a registry DID (its user, child users, DID and VC documents,
// topics, schemas, roles), so the instance looks like one that never held that registry: the
// state a disaster-recovery restore starts from. Resolves with the number of deleted rows.
async function forgetRegistry(config, did) {
    if (!did || !did.startsWith('did:')) {
        throw new Error(`forgetRegistry needs a DID, got "${did}"`);
    }
    const client = await connect(config);
    try {
        const filter = { $or: DID_FIELDS.map((field) => ({ [field]: did })) };
        let deleted = 0;
        for (const name of DATABASES) {
            const database = client.db(name);
            for (const { name: collection } of await database.listCollections({ type: 'collection' }).toArray()) {
                const result = await database.collection(collection).deleteMany(filter);
                deleted += result.deletedCount;
            }
        }
        return deleted;
    } finally {
        await client.close();
    }
}

module.exports = { forgetRegistry };
