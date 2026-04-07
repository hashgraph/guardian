/**
 * Server-side token manager for the Guardian Indexer API.
 *
 * Auth chain (discovered from MGS SSO flow):
 *   1. POST /accounts/loginByEmail  → { refreshToken }       (1 year)
 *   2. POST /accounts/access-token  → { accessToken }        (24 hours)
 *   3. POST /accounts/sso/generate  → { token } (indexer)    (14 days)
 *
 * The indexer token (step 3) is what gets sent as Bearer on every API call.
 * This module handles the full chain and refreshes proactively before expiry.
 *
 * Backwards compat: if INDEXER_API_TOKEN is set, it's used as-is (no auto-auth).
 */

const GUARDIAN_API_URL = process.env.GUARDIAN_API_URL
const GUARDIAN_EMAIL = process.env.GUARDIAN_EMAIL
const GUARDIAN_PASSWORD = process.env.GUARDIAN_PASSWORD
const GUARDIAN_USER_ID = process.env.GUARDIAN_USER_ID
const INDEXER_API_URL = process.env.INDEXER_API_URL!

// Buffer before expiry to trigger proactive refresh (5 minutes)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

interface TokenState {
  /** The Bearer token used for indexer API calls */
  indexerToken: string
  /** Unix ms when the indexer token expires */
  indexerExpiresAt: number
  /** Long-lived refresh token from login (1 year) */
  refreshToken: string
  /** Unix ms when the refresh token expires */
  refreshExpiresAt: number
}

let state: TokenState | null = null
let pendingAuth: Promise<string> | null = null

function decodeJwtExp(token: string): number {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString()
  )
  // MGS uses "exp" (standard) for indexer tokens, "expireAt" (ms) for guardian tokens
  if (payload.exp) return payload.exp * 1000
  if (payload.expireAt) return payload.expireAt
  throw new Error("JWT has no exp or expireAt claim")
}

function extractIndexerHost(): string {
  // e.g. "https://indexer.guardianservice.app/api/v1/testnet" → "indexer.guardianservice.app"
  return new URL(INDEXER_API_URL).host
}

async function login(): Promise<{ refreshToken: string; refreshExpiresAt: number }> {
  const body: Record<string, string> = {
    email: GUARDIAN_EMAIL!,
    password: GUARDIAN_PASSWORD!,
  }
  if (GUARDIAN_USER_ID) {
    body.userId = GUARDIAN_USER_ID
  }

  const res = await fetch(`${GUARDIAN_API_URL}/accounts/loginByEmail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Guardian login failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  // When multiple users match the email and no userId provided,
  // the API returns { success: false, posibleUsers: [...] }
  if (data.success === false && data.posibleUsers) {
    throw new Error(
      "Multiple users found for this email. Set GUARDIAN_USER_ID in .env to select one. " +
      `Available users: ${JSON.stringify(data.posibleUsers.map((u: { user: { id: string; username: string; role: string }; tenant?: { name: string } }) => ({
        userId: u.user.id,
        username: u.user.username,
        role: u.user.role,
        tenant: u.tenant?.name ?? "no-tenant",
      })))}`
    )
  }

  // Response shape: { success: true, login: { refreshToken, ... } }
  const refreshToken = data.login?.refreshToken ?? data.refreshToken
  if (!refreshToken) {
    throw new Error(`Login response missing refreshToken. Keys: ${JSON.stringify(Object.keys(data))}`)
  }

  return {
    refreshToken,
    refreshExpiresAt: decodeJwtExp(refreshToken),
  }
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(`${GUARDIAN_API_URL}/accounts/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Guardian access-token refresh failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.accessToken
}

async function generateIndexerToken(accessToken: string): Promise<{ indexerToken: string; indexerExpiresAt: number }> {
  const callbackUrl = `https://${extractIndexerHost()}/sso`

  const res = await fetch(`${GUARDIAN_API_URL}/accounts/sso/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ callbackUrl }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Guardian SSO generate failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const token = data.token ?? data.accessToken
  if (!token) {
    throw new Error(`SSO generate response missing token: ${JSON.stringify(data)}`)
  }

  return {
    indexerToken: token,
    indexerExpiresAt: decodeJwtExp(token),
  }
}

/** Run the full auth chain: login → access-token → sso/generate */
async function fullAuth(): Promise<TokenState> {
  const { refreshToken, refreshExpiresAt } = await login()
  const accessToken = await getAccessToken(refreshToken)
  const { indexerToken, indexerExpiresAt } = await generateIndexerToken(accessToken)
  return { indexerToken, indexerExpiresAt, refreshToken, refreshExpiresAt }
}

/** Refresh just the indexer token using the existing refresh token */
async function refreshAuth(currentState: TokenState): Promise<TokenState> {
  const accessToken = await getAccessToken(currentState.refreshToken)
  const { indexerToken, indexerExpiresAt } = await generateIndexerToken(accessToken)
  return {
    ...currentState,
    indexerToken,
    indexerExpiresAt,
  }
}

function isAutoAuthConfigured(): boolean {
  return !!(GUARDIAN_API_URL && GUARDIAN_EMAIL && GUARDIAN_PASSWORD)
}

/**
 * Returns a valid Bearer token for the indexer API.
 *
 * - If INDEXER_API_TOKEN is set, returns it (static, backwards-compat).
 * - Otherwise, manages the full login → refresh → SSO token chain automatically.
 * - Concurrent calls are deduplicated (only one auth request in-flight at a time).
 */
export async function getIndexerToken(): Promise<string> {
  // Static token takes precedence (backwards compat)
  if (process.env.INDEXER_API_TOKEN) {
    return process.env.INDEXER_API_TOKEN
  }

  if (!isAutoAuthConfigured()) {
    throw new Error(
      "No auth configured. Set either INDEXER_API_TOKEN (static) " +
      "or GUARDIAN_API_URL + GUARDIAN_EMAIL + GUARDIAN_PASSWORD (auto-auth) in .env"
    )
  }

  const now = Date.now()

  // Token exists and not near expiry → use it
  if (state && state.indexerExpiresAt - now > REFRESH_BUFFER_MS) {
    return state.indexerToken
  }

  // Need auth — deduplicate concurrent calls
  if (!pendingAuth) {
    pendingAuth = (async () => {
      try {
        if (state && state.refreshExpiresAt - now > REFRESH_BUFFER_MS) {
          // Refresh token still valid → just refresh the indexer token
          try {
            state = await refreshAuth(state)
            return state.indexerToken
          } catch {
            // Refresh failed → fall through to full login
          }
        }
        // Full login
        state = await fullAuth()
        return state.indexerToken
      } finally {
        pendingAuth = null
      }
    })()
  }

  return pendingAuth
}

/** Invalidate cached tokens so the next call triggers a fresh auth */
export function invalidateTokens(): void {
  state = null
}
