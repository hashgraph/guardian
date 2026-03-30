import { notFound } from "next/navigation"
import { getPolicyBySlug } from "@/lib/policies/registry"
import { PolicySyncLayout } from "./policy-sync-layout"

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
