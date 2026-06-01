"use client"

/**
 * Policy-specific VC view component registry.
 *
 * Maps policy slug → entity type → React component.
 * Consulted by VCRenderer before falling back to generic entity-type views.
 *
 * This file is client-only ("use client") because it imports React components
 * that use browser APIs (maps, charts, etc.). Policy config files (lib/policies/*.ts)
 * remain pure data so they can be safely imported in server components.
 *
 * To add custom renderers for a new policy:
 *   1. Create components in components/vc-views/<slug>/
 *   2. Import them here and add an entry to POLICY_RENDERERS
 */

import type { ComponentType } from "react"
import type { EntityType } from "@/lib/types/indexer"
import type { RendererProps } from "./types"

import { PDDView } from "@/components/vc-views/vm0033/PDDView"

export const POLICY_RENDERERS: Record<
  string,
  Partial<Record<EntityType | string, ComponentType<RendererProps>>>
> = {
  vm0033: {
    project_form: PDDView,
    project: PDDView,
    approved_project: PDDView,
  },
}
