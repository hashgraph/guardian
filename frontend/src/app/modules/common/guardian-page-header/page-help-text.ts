/**
 * Help text shown under each main page title.
 * Keys are referenced from templates via <guardian-page-header helpKey="...">.
 */
export const PAGE_HELP_TEXT: Readonly<Record<string, string>> = {
    policies: 'Author and govern the policies in this workspace. Track what is in execution on Hedera, what is being prepared, and what has been imported from external Standard Registries.',
    schemas: 'Schemas defined inside a specific policy. They describe the documents like projects, monitoring reports, and certificates that the policy receives, validates, and emits.',
    'schema-rules': 'Validation rules attached to a policy schema. Use them to enforce conditions on incoming documents like required fields, allowed value ranges, and cross-field consistency before the policy accepts the data.',
    'schema-templates': 'Standardized schema definitions shared across policies. Use them to enforce consistent data structures and field requirements without redefining them for each policy.',
    artifacts: 'Static files attached to a policy, including calculation specs, policy documentation, and supporting media. Artifacts travel with the policy when published and stay versioned alongside it.',
    tools: 'Reusable building blocks that policies can import. Each tool bundles its own blocks, schemas, and logic so you can ship a calculation, a verification, or a workflow once and use it across many policies.',
    modules: 'Reusable groups of policy logic. A module bundles blocks, schemas, and configuration so policies can import the same logic instead of redefining it. Useful for shared validation steps, common workflows, or methodology stages.',
    formulas: 'Reusable mathematical expressions referenced by policy logic and schemas. They cover emission factors, baseline calculations, scoring rules, and any other value derived from incoming data.',

    tokens: 'Hedera-native tokens minted, burned, and managed by your policies. Each token has its own treasury, supply controls, and KYC settings; configure them here and link them to the policy steps that mint or transfer them.',
    contracts: 'Smart contracts that wipe (burn) tokens from holder accounts. Use them to enforce supply controls; for example, retiring credits when they are consumed by a downstream offset claim, or removing invalid issuances.',
    'relayer-accounts': 'Hedera operator accounts that broker transactions on behalf of users by paying network fees, signing transfers, and serving as the on-chain identity for relayer-driven flows. Update balances and review usage here.',

    roles: 'Create and manage roles which bundle a set of permissions like issuing credentials, approving documents, and configuring policies.',
    users: 'View users within the workspace and assign roles to grant or revoke permissions.',
    'external-policies': 'Policies imported from another Standard Registry on the Hedera network. Approve a remote policy to make it available alongside the policies authored in this workspace.',
    'service-status': 'Review the status of Guardian services.',
    'worker-tasks': 'Long-running background jobs that the platform runs on your behalf, like publishing policies, importing schemas, and migrating data. Track progress, retry failed work, and clear out finished tasks here.',
    logs: 'View the logs for visibility into Guardian services and activities. Exported logs may also be useful for troubleshooting purposes.',
    branding: 'Update the look and feel of this workspace according to your preferences.',
    settings: 'The Hedera and IPFS account and key details associated with this workspace.',

    notifications: 'Notifications are collected here related to account activities.',
    profile: 'Your account, security, Hedera identity, and identity documents for this workspace.',
};
