# 2076 Including Data Manually into VC Documents

Github Issues\
[https://github.com/hashgraph/guardian/issues/2076\
<br>](https://github.com/hashgraph/guardian/issues/2076)1. Additional Data (Evidence Attachments)

The Additional Data feature extends the requestVcDocument block (and its addon variant) with an optional evidence attachments step. When enabled, the request wizard inserts an extra step between form submission and (optional) relayer account configuration, allowing users to attach text comments and/or files as evidence entries. The attached evidence is uploaded to IPFS, embedded into the Verifiable Credential as W3C-compliant evidence entries, and preserved through reassignment operations.

\
<br>

<img src="../../../.gitbook/assets/unknown.png" alt="" height="289" width="665">

<br>

1.1. Configuration

1.1.1. Block Properties

Enable additional data – When checked, the request wizard shows an additional step for attaching evidence (text comments and/or files) before final submission. Optional. Defaults to false.

<br>

This property is available on both requestVcDocumentBlock and requestVcDocumentBlockAddon block configuration screens.

<br>

1.1.2. How It Works

When the Enable additional data option is turned on, the standard request wizard flow changes as follows:

<br>

Without Additional Data (default):

Fill Form → Submit

With Additional Data enabled:

Fill Form → 2. Add Evidence Attachments → Submit

With Additional Data + Relayer Account:

Fill Form → 2. Add Evidence Attachments → 3. Configure Relayer Account → Submit

\
<br>

<img src="../../../.gitbook/assets/unknown (1).png" alt="" height="351" width="379">

1.2. Evidence Attachments Step

The evidence attachments step provides the following UI elements:

\
<br>

<img src="../../../.gitbook/assets/unknown (2).png" alt="" height="316" width="665">

<br>

1.2.1. Text Comment

A text area where users can optionally enter a comment (up to 600 characters). This comment is stored as an evidence entry with dataType: "message".

<br>

1.2.2. File Attachments

Users can attach files by:

<br>

Clicking the Attach button to open a file picker (multiple file selection supported).

Dragging and dropping files onto the attachment area.

Each file is uploaded to IPFS in the background. While uploading, a loading indicator is displayed. Once uploaded, the IPFS CID is stored as an evidence entry with dataType: "file" and data: "ipfs://\<CID>".

<br>

Files can be removed by clicking the close icon next to each file name.

<br>

Note: The submit/next button is disabled while any file upload is in progress.

<br>

1.2.3. Dialog Mode

The same evidence attachments step is also available when the request form is opened in dialog mode (popup). The behavior and UI are identical to the inline (page) mode.

<br>

1.3. Evidence in Verifiable Credentials

When additional data is provided, the evidence entries are embedded directly into the Verifiable Credential before signing:

<br>

Each evidence entry is added as a JSON-LD evidence object with type: \["Evidence"].

The EvidenceAttachments system schema context is included in the VC's @context array.

Evidence is preserved when a VC is re-signed through the Reassigning block.

Evidence Entry Structure

{

&#x20; "type": \["Evidence"],

&#x20; "dataType": "message",

&#x20; "data": "User-entered text comment"

}

{

&#x20; "type": \["Evidence"],

&#x20; "dataType": "file",

&#x20; "data": "ipfs://QmExampleCID..."

}

1.4. Viewing Evidence

When viewing a document that contains structured evidence entries, the document viewer displays them in a user-friendly format:

<br>

Text comments are shown with a text icon and the message content.

File attachments are shown with a file icon and a clickable IPFS link.

If the evidence data does not match the structured format (e.g., legacy evidence), it falls back to displaying the raw JSON.

\
<br>

<img src="../../../.gitbook/assets/unknown (3).png" alt="" height="258" width="665">

<br>

1.5. System Schema

A new system schema EvidenceAttachments has been added to support this feature. It defines the structure for evidence entries:

<br>

Field Type Required Description

dataType string Yes Type of evidence: "message" or "file"

data string Yes Content: text message or IPFS URI (ipfs://...)

This schema is automatically registered during system initialization and included in policy imports/exports.

<br>

1.6. Sample Policy

A sample policy "iRec Policy 4 (Additional Data)" is included in the Methodology Library demonstrating the feature in action.

<br>
