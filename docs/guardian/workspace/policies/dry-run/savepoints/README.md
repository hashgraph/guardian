# Savepoints

Savepoints allow users to capture and restore the state of a policy execution at specific moments during a dry run.

* Savepoints have names, each savepoint represents a specific Policy execution path.
* Savepoints are used to restore execution context to continue execution from the same point. They can be renamed, or deleted.
* Multiple savepoints per policy are supported, up to 5 in total per policy.
* The active savepoint is protected from accidental deletion.
* Bulk operations (delete all, apply multiple) are available.

All major data requests in the UI — including navigation, groups, blocks, and virtual users — can be executed in the context of a specific savepoint by using the savepointIds parameter. This ensures the dry-run session reproduces the exact saved state.
