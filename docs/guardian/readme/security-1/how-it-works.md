---
description: Below you can see how is the Meeco integration flow.
---

# How it works

<figure><img src="../../../meeco/mermaid-diagram-2023-07-10-153433.png" alt=""><figcaption><p>Meeco integration flow in the Guardian</p></figcaption></figure>

If you are using [Mermaid Flow](https://www.mermaidflow.app/) here is the script to help your visualization

````
```mermaid
sequenceDiagram
  title OAuth Code flow w. SIOP // same device

  autonumber

  participant H as Holder
  participant GUI as GuardianUI
  participant W as Wallet
  participant GW as ApiGateway
  participant Au as AuthService
  participant SVX as SVX API

  H->>GUI: Open Guardian
  GUI->>GW: Establish Websocket Connection
  GW->>GW: Assign UUID as CID to the Connection and store in the memory
  H->>GUI: Hit "Meeco Login" Button to Login by Meeco
  GUI->>GW: Send WS Message MEECO_AUTH_REQUEST
  GW->>+Au: Send NATS Message MEECO_AUTH_START {cid}
  Au->>+SVX: Login to SVX
  SVX-->>-Au: 201 OK (access_token: {access_token})
  Au->>+SVX: POST /oidc/presentations/requests {presentationRequest}
  SVX-->>-Au: 200 {presentationRequest}
  Au->>+SVX: GET /me
  SVX-->>-Au: 200 {me}
  Au->>Au: exteract externaId from me.user.did
  Au->>+SVX: GET /key_encryption_key
  SVX-->>-Au: 200 {key_encryption_key}
  Au->>+SVX: GET /keypairs/external_id/${externalId}
  SVX-->>-Au: 200 {key_pairs}
  Au->>Au: decrypt keypair by kek
  Au->>Au: Sign presentationRequest.unsigned_jwt
  Au->>+SVX: PUT /oidc/presentations/requests/${requestId} {signature}
  SVX-->>-Au: {presentationRequest}
  Au->>Au: Construct redirect_uri by presentationRequest.ID
  Au-->>-GW: Send NATS Response on MEECO_AUTH_REQUEST {cid, redirect_uri}
  par Submit VP
    GW->>GW: Find Connection by cid
    GW->>GUI: Send WS Message MEECO_AUTH_PRESENT_VP {redirect_uri}
    GUI->>GUI: Show redirect_uri in QR Code
    H->>W: Scan QR Code
    H->>W: Select VC and Submit VP
    W->>SVX: Submit for VP presentation request
  and Get Submission
    loop Every 10 Seconds
        Au->>+SVX: POST /oidc/presentations/requests/${requestId}/submissions
        SVX-->>-Au: 201 OK (submissions: {submissions})

        break Submission received
            Au->>Au: Verify Submission
            alt Submission is Valid
                Au->>Au: Exteract VC
                Au->>GW: Send NATS message MEECO_VERIFY_VP {cid,credentailSubject,presentationRequestId,submissionIs}
                GW->>GUI: Send WS MEECO_VERIFY_VP {credentailSubject,presentationRequestId,submissionIs}
            else  Submission is Invalid
                Au->>GW: Send NATS message MEECO_VERIFY_VP_FAILED {cid,credentailSubject,error}
                GW->>GUI: Send WS MEECO_VERIFY_VP_FAILED {error}
            end
        end
        
        break after 120 Seconds
            Au->>GW: Send NATS message MEECO_VERIFY_VP_FAILED {cid,error}
            GW->>GW: Find Connection by cid
            GW->>GUI: Send WS Message MEECO_VERIFY_VP_FAILED {error}
        end
    end
  end
  alt MEECO_VERIFY_VP_FAILED
    GUI->>GUI: Render Error Message 
    GUI->>GUI: Return to initial State
  else MEECO_VERIFY_VP
    GUI->>GUI: Render VC Subject
    alt Approve VC Subject
        H->>GUI: hit Approve button
        GUI->>GW: Send WS message MEECO_APPROVE_SUBMISSION_RESPONSE {presentationRequestId,submissionId}
        GW->>+Au: Send NATS message MEECO_APPROVE_SUBMISSION {cid,presentationRequestId,submissionId}
        Au->>+SVX: PATCH /oidc/presentations/requests/${requestId}/submissions/${submissionId} {submisiion: {status: "verified}}
        SVX-->>-Au: 200 OK
        Au->>Au: generate JWT
        Au-->>-GW: {cid,JWT}
    else Reject VC Subject
        H->>GUI: hit Reject button
        GUI->>GW: Send WS message MEECO_REJECT_SUBMISSION_RESPONSE {presentationRequestId,submissionId}
        GW->>+Au: Send NATS message MEECO_REJECT_SUBMISSION {cid,presentationRequestId,submissionId}
        Au->>+SVX: PATCH /oidc/presentations/requests/${requestId}/submissions/${submissionId} {submisiion: {status: "rejected"}}
        SVX-->>-Au: 200 OK
        Au-->>-GW: {cid,OK}
    end
  end
```
````
