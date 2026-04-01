import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPolicyBySlug } from "@/lib/policies/registry"
import { PolicySyncLayout } from "./policy-sync-layout"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const policy = getPolicyBySlug(slug)
  if (!policy) return {}
  return {
    title: policy.fullName,
    description: `${policy.fullName} (${policy.standard} ${policy.name}) — verify emission reductions with transparent, auditable trails anchored on the Hedera blockchain via Guardian.`,
    openGraph: {
      title: `${policy.fullName} · Carbon Atlas`,
      description: `${policy.fullName} (${policy.standard} ${policy.name}) — verify emission reductions with transparent, auditable trails anchored on the Hedera blockchain via Guardian.`,
    },
  }
}

export default async function PolicyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!getPolicyBySlug(slug)) notFound()

  return <PolicySyncLayout>{children}</PolicySyncLayout>
}
