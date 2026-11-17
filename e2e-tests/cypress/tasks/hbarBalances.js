// Every env key that names a Guardian account the suite logs in as. The HBAR a run costs is
// spread over all of them - the registry pays for contract deploys and policy publishing, the
// second registry for imports, the registrants for their own transactions - so a report built
// on the registry alone understates the bill.
const ACCOUNT_ENV_KEYS = [
    'SRUser', 'SR2User', 'User', 'User2', 'Installer', 'Installer2',
    'PPUser', 'VVBUser', 'MainSRUser', 'MainUser', 'DepSRUser', 'DepUser',
];

// The gateway waits on a backend reply with no deadline of its own, so a missing service would
// otherwise keep the run waiting before its first spec without a word.
const REQUEST_TIMEOUT_MS = 30000;

function resolveApiServer(config) {
    return config.env.apiServer
        ? (config.env.apiServer.endsWith('/') ? config.env.apiServer : `${config.env.apiServer}/`)
        : `http://localhost:${config.env.portApi}/`;
}

async function requestJson(apiServer, path, options, timeoutMs) {
    let response;
    try {
        response = await fetch(`${apiServer}${path}`, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
        if (error.name === 'TimeoutError') {
            throw new Error(`${path} did not answer within ${timeoutMs / 1000} s`, { cause: error });
        }
        throw new Error(`${path} failed: ${error.cause?.message ?? error.message}`, { cause: error });
    }
    if (!response.ok) {
        throw new Error(`${path} answered with status ${response.status}`);
    }
    return response.json();
}

// Reads one account's HBAR balance through the API, in Hbar.
// Throws with a short reason so callers can report the account as unreadable rather than as zero.
async function readHbarBalance(apiServer, username, password, timeoutMs) {
    const post = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const { refreshToken } = await requestJson(apiServer, 'accounts/login/', post({ username, password }), timeoutMs);
    const { accessToken } = await requestJson(apiServer, 'accounts/access-token/', post({ refreshToken }), timeoutMs);
    const balanceBody = await requestJson(apiServer, 'accounts/balance', { headers: { authorization: `Bearer ${accessToken}` } }, timeoutMs);
    if (!balanceBody?.balance) {
        throw new Error('accounts/balance returned no balance');
    }
    const { balance } = balanceBody;
    const hbarBalance = parseFloat(balance);
    if (Number.isNaN(hbarBalance)) {
        throw new Error(`could not parse the balance "${balance}"`);
    }
    return hbarBalance;
}

// Snapshots the balance of every configured account, keyed by username, and says why an account
// could not be read. Unreadable accounts - not registered on this instance, no Hedera account yet,
// a stack that does not answer - are left out rather than recorded as zero.
async function snapshotHbarBalances(config, { requestTimeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const apiServer = resolveApiServer(config);
    const password = config.env.Password;
    const usernames = [...new Set(ACCOUNT_ENV_KEYS.map((key) => config.env[key]).filter(Boolean))];
    const balances = new Map();

    console.log(`[HBAR balance] reading the balance of ${usernames.length} accounts from ${apiServer} ...`);
    await Promise.all(usernames.map(async (username) => {
        try {
            balances.set(username, await readHbarBalance(apiServer, username, password, requestTimeoutMs));
        } catch (error) {
            console.warn(`[HBAR balance] ${username}: ${error.message}`);
        }
    }));

    return balances;
}

module.exports = { snapshotHbarBalances };
