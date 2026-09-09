# 06 — Methodologies

This chapter covers the Methodologies page and the individual methodology records behind it. A
methodology is the rulebook a project is verified against — how its baseline is calculated, what has
to be monitored, and what evidence must be submitted before credits can be issued. On this network,
each methodology is published as a Guardian policy that runs on-chain.

## The methodologies table

One row per published methodology on the selected network.

| Column | What it means |
|---|---|
| **Name** | The methodology's title. |
| **Registry** | The standard registry that published it. |
| **Category** | Its broad classification. |
| **Version** | Which revision this row is. |
| **Projects** | How many projects are registered under it. |
| **Issuances** | How many credits have been issued under it. |
| **Schemas** | How many data forms the policy defines. |
| **Status** | Published, draft, or another registry-reported state. |
| **Decoded** | Whether the Atlas has successfully read the policy's structure. See below. |

Above the table, three summary figures show the total number of methodologies, how many are
**Published**, and how many are **Draft / Other**.

## Filtering

Search by name, and combine the filters for **Registry**, **Category**, **Name**, **ID**,
**Description** and **Decode Status**. The registry filter can be driven by registry name or by its
identifier. **Download Data** exports the current view as CSV, with or without an account.

Arriving from a registry record shows a *Showing methodologies for registry …* banner with a **Clear
filter** link.

## Decode status

"Decoding" is the Atlas reading a published policy and working out which of its data forms describes
a project and how that form's fields map onto the columns you see elsewhere — project name, country,
developer, sector, crediting period and so on. It is what turns a raw policy into a browsable
catalogue.

| Status | What it means for you |
|---|---|
| **Decoded** | The policy was read successfully. Projects under it show full detail. |
| **Decoding** | Work is in progress. Come back shortly. |
| **Failed** | The Atlas could not read the policy. Projects under it may show fewer fields than usual. The methodology record shows the reason. |
| **Not decoded** | It has not been attempted yet. |

None of these statuses says anything about the *quality* of the methodology itself — they describe the
Atlas's ability to interpret it, nothing more.

The methodologies list **refreshes itself roughly every fifteen seconds**, so a methodology that is
currently decoding will change status in front of you without a page reload.

## The methodology record

Clicking a row opens the methodology's page. A summary strip carries its registry, version, schema
count and status, with a **View on HashScan** link for the on-chain policy. Content is split into
tabs.

### Overview

The methodology's description and key facts: when it was published, the network, its emission
reduction approach and the sectoral scopes it applies to. Where the description is missing from the
source, the tab says so rather than showing an empty block.

If enough linked data exists, a **Methodology Dashboard** also appears here with charts covering
geographic distribution of projects, issuance trend by year, and vintage distribution. It is hidden
when there is too little data to draw anything meaningful — an empty chart is worse than no chart.

### Decoded Mapping

The result of the decode described above, presented as a **Project Fields → Schema Fields** table:
for each field the Atlas shows on a project, this tells you which field of the policy's own schema it
was taken from, with that field's key, title, description and type. Below it, **Show all schema
fields** expands the complete list of fields in the schema, including the ones that are not used.

If no project schema has been confirmed, the tab explains why — usually that none of the imported
schemas had enough recognisable fields — and lists the imported schemas so you can see what the
decoder had to work with. Where a decode failed outright, the error is shown in a callout.

There is also a **Manual mapping history** table recording any hand-made corrections: who changed
which fields and when.

**Administrators only.** The mapping actions — **Re-run decoder**, **Re-parse projects** and **Edit
mapping** — are described in chapter 13. For everyone else this tab is read-only.

### Version History

Every published version of the methodology, with its version number, instance policy topic,
publication date, schema count and status. The version you are currently viewing carries a
**Current** badge. Methodologies are revised over time and projects stay attached to the version they
registered under, so this tab is the place to check whether the rules changed after a project started.

### Linked Projects

Every project registered under this policy, with country, registry, issuances, minted amount,
projected volume, expected issuance year, status and lifecycle stage. A **Stage** filter narrows it
to one point in the lifecycle. Each row links to the project record.

If the methodology has no policy topic recorded, this tab explains that it cannot list projects for
that reason.

### Hedera Policy

The on-chain facts: the instance policy topic, publication date, the registry's DID and the network,
under a *Verified on Hedera* heading.

**Requires a signed-in account.** **Download policy package (.zip)** downloads the complete published
policy. Preparing it can take a moment because the underlying files are fetched from IPFS, and the
button says so while it works. Three things can stop the download: the policy has not been published
yet ("isn't ready yet"), you are not signed in, or you have made too many download requests in a
short period and need to wait — each case gets its own message.

### Analytics

Headline figures for this methodology: schema count, project count and total minted credits, each
with a one-line explanation. Additional trend charts are noted as forthcoming.

### Actions

An about panel with the instance policy topic, and a **Compare Versions** tool. Pick another version
from the dropdown and the two are shown side by side across version, status, publication date,
description, sectoral scopes, emission reduction approach, schema count and issuances. If the
methodology has only ever had one version, the tab says there is nothing to compare against.

---

Next: [07 — Registries, developers and SDGs](07-registries-developers-sdgs.md) · Back to [index](README.md)
