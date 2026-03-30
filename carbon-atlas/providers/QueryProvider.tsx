"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ApiError } from "@/lib/api/client"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Emission reduction data rarely changes — keep fresh for 10 min, cache for 1 hr
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        // Don't retry on 4xx (auth/client errors) — proxy already retries 401 server-side.
        // Only retry transient failures (5xx, network errors), up to 2 times.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
