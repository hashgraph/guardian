---
tags:
  - new
---

# Including Data Manually into Verifiable Credential Documents

## Additional data for verifiable credential documents

The Additional Data feature extends the `requestVcDocumentBlock` and `requestVcDocumentBlockAddon` blocks with an optional evidence attachments step. When enabled, the request wizard inserts an extra step between form submission and optional relayer account configuration. This lets users attach text comments, files, or both as evidence entries. Guardian uploads the evidence to IPFS, embeds it into the Verifiable Credential as W3C-compliant evidence entries, and preserves it during reassignment operations.

\
<br>

<img src="../../../../.gitbook/assets/unknown.png" alt="" height="289" width="665">

<br>

### 1. Configuration

#### 1.1. Block properties

**Enable additional data** — When selected, the request wizard shows an additional step for attaching evidence, including text comments and files, before final submission. This setting is optional. The default value is `false`.

<br>

This property is available on the configuration screens for both `requestVcDocumentBlock` and `requestVcDocumentBlockAddon`.

<br>

#### 1.2. How it works

When **Enable additional data** is turned on, the standard request wizard flow changes as follows:

<br>

Without Additional Data (default):

Fill Form → Submit

With Additional Data enabled:

Fill Form → 2. Add Evidence Attachments → Submit

With Additional Data + Relayer Account:

Fill Form → 2. Add Evidence Attachments → 3. Configure Relayer Account → Submit

\
<br>

<img src="../../../../.gitbook/assets/unknown (1).png" alt="" height="351" width="379">

### 2. Evidence attachments step

The evidence attachments step provides the following UI elements:

\
<br>

<img src="../../../../.gitbook/assets/unknown (2).png" alt="" height="316" width="665">

<br>

#### 2.1. Text comment

A text area lets users enter an optional comment of up to 600 characters. Guardian stores this comment as an evidence entry with `dataType: "message"`.

<br>

#### 2.2. File attachments

Users can attach files by:

<br>

Clicking the Attach button to open a file picker (multiple file selection supported).

Dragging and dropping files onto the attachment area.

Each file is uploaded to IPFS in the background. While the upload is in progress, Guardian shows a loading indicator. After the upload completes, the IPFS CID is stored as an evidence entry with `dataType: "file"` and `data: "ipfs://<CID>"`.

<br>

Files can be removed by clicking the close icon next to each file name.

<br>

Note: The **Submit** or **Next** button is disabled while any file upload is in progress.

<br>

#### 2.3. Dialog mode

The same evidence attachments step is also available when the request form opens in dialog mode. The behavior and UI are identical to inline page mode.

<br>

### 3. Evidence in verifiable credentials

When additional data is provided, the evidence entries are embedded directly into the Verifiable Credential before signing:

<br>

Each evidence entry is added as a JSON-LD evidence object with type: \["Evidence"].

The EvidenceAttachments system schema context is included in the VC's @context array.

Evidence is preserved when a VC is re-signed through the Reassigning block.

#### Evidence entry structure

"type": \["Evidence"],

&#x20; "dataType": "message",

&#x20; "data": "User-entered text comment"

&#x20; "type": \["Evidence"],

&#x20; "dataType": "file",

&#x20; "data": "ipfs://QmExampleCID..."

```json
{
  "type": ["Evidence"],
  "dataType": "message",
  "data": "User-entered text comment"
}
```

```json
{
  "type": ["Evidence"],
  "dataType": "file",
  "data": "ipfs://QmExampleCID..."
}
```

### 4. Viewing evidence

When you view a document that contains structured evidence entries, the document viewer shows them in a user-friendly format:

<br>

Text comments are shown with a text icon and the message content.

File attachments are shown with a file icon and a clickable IPFS link.

If the evidence data does not match the structured format, such as legacy evidence, Guardian displays the raw JSON instead.

\
<br>

<img src="../../../../.gitbook/assets/unknown (3).png" alt="" height="258" width="665">

<br>

### 5. System schema

A new system schema, `EvidenceAttachments`, supports this feature. It defines the structure for evidence entries:

<br>

| Field      | Type   | Required | Description                                                 |
| ---------- | ------ | -------- | ----------------------------------------------------------- |
| `dataType` | string | Yes      | Type of evidence: `"message"` or `"file"`                   |
| `data`     | string | Yes      | Content as a text message or IPFS URI, such as `ipfs://...` |

This schema is automatically registered during system initialization and included in policy imports/exports.

<br>

### 6. Sample policy

A sample policy, **iRec Policy 4 (Additional Data)**, is included in the Methodology Library to demonstrate the feature in action.

## Related Issues

* [https://github.com/hashgraph/guardian/issues/2076](https://github.com/hashgraph/guardian/issues/1987)<br>
