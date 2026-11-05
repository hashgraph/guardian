// Every wait in the suites takes its budget from here. The budgets are upper bounds sized for the
// local Solo network, where a Hedera transaction (an account, a token, a DID) takes a few seconds:
// a wait that runs out means something is broken, so it fails instead of waiting longer.
export const TIMEOUTS = {
    // the UI reacting to a user action: a dialog, a menu, a re-rendered list
    ui: 10000,
    // a request, or a UI state, that waits on a few Hedera transactions at most
    backend: 20000,
    // one call that publishes, imports or runs a whole policy: dozens of Hedera transactions
    longOperation: 120000,
};

// Pause between two reads of a condition that the backend reaches asynchronously.
export const POLL_INTERVAL = 200;
