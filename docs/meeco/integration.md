# Meeco Authentication
Meeco is data privacy and decentralized identity management service that provides three products under its APIs, Vault as a secure data storage with E2E data encryption and supporting secure data exchange, Credentials which provides an entire VC ecosystem by onboarding issuer, verifier and holder and finally a user friendy Wallet mobile Application that creates secure connections to import digital assets.

Guardian leverages Meeco APIs and Wallet Application to onboard users easily by the use of VC4OIDC. Meeco enables users by field selective exposure to present their identity data as narrow as required to third-parties that will be able to verify VPs Meeco APIs. Services like Guardian now can create schemas of required fields to onboard their customers while users will be able to present them by VPs that can be verified by Guardian. The users also benefit from SSO and passwordless authentication that removes the concern of keeping them safe.

Workflow and Sequence Diagram

Users have an option to login by Meeco using VC4OIDC as follows:

1. User click on "Meeco Login" Button to Login by Meeco

2. Guardian Client Sends **MEECO_AUTH_REQUEST** Message over Websocket connetion

3. Guardian API gateway receives the message and send a **MEECO_AUTH_START** command to Auth service over the NATS service

4. Auth service receives the command from API Gateway

5. Auth Service Creates a new Presentation Request to SVX platform
    - Auth Service logs in to SVX by OAUTH2.0 to get access token
    - Auth Service requests SVX to create new presentation request
    - Auth Service gets its user data from SVX
    - Auth Service gets serialized KEK (Key Encryption Key) from SVX
    - Auth Service decodes serialized KEK
    - Auth Service get serialized Keypair from SVX
    - Auth Service decodes serialized Keypair by KEK
    - Auth Service exteract unsigned_jwt from preserntation request and signs it
    - Auth Service updates presentation request by adding signature of unsigned_jwt
    - Auth Service construct the redirect_uri from presentation request

6. Auth Service sends back the redirect_uri to API Gateway through MEECO_AUTH_REQUEST message over NATS

7. API Gateway receives the MEECO_AUTH_REQUEST message from Auth Service and sends the redirect_uri to Guardian client within MEECO_AUTH_PRESENT_VP message over Websocket connection

8. Guardian client receives the redirect_uri from MEECO_AUTH_REQUEST message and shows the uri in QR code format

9. In parallel Auth Service starts polling SVX platform to get VP submissions by user

10. User should open the Meeco Wallet App and scan the QR code and submit VP

11. Having submitted the VP by user, Auth Service receives VP Submission by user

12. Auth Service decodes credential subjects from VP

13. Auth Service verifies credential subjects expiration and issuer to be valid

14. Auth Service requests SVX to verify VP

15. Auth Service sends MEECO_VERIFY_VP message with credential subjects to API Gateway over NATS service

16. API Gateway sends credential subjects through MEECO_VERIFY_VP over websocket connection

17. Guardian client receives the credential subjects through MEECO_VERIFY_VP

18. Guardian client shows the credential subject and asks user to approve/reject the info

19. User clicks approv/reject button to approve/reject data

20. The client sends via websocket the payload:
```json
{
    "type": "MEECO_APPROVE_SUBMISSION",
    "data": {
      "presentation_request_id": "27e2211d-****-****-****-64e11e49f49c",
        "submission_id": "a2f23940-****-****-9e39-2241e8e25fd4",
      "role": "STANDARD_REGISTRY"
    }
}
```

21. The websocket get the payload and call the Meeco URl once approved, and get the user data with all verifiable credentials.
    During the process, the user is created in the Guardian application, the username is defined but also managed to avoid colisions.
    - Auth Service submits verified submission to SVX platform
    - persists data to database
    - generates JWT token
    - sends JWT token through NATS to API Gateway

22. The client receives the payload which contains all data necessary to manage the user through the application.

```json
{
  "type": "MEECO_APPROVE_SUBMISSION_RESPONSE",
  "data": {
    "username": "meecouser474377063",
    "did": null,
    "role": "STANDARD_REGISTRY",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.**************.PVSYlGBmmfGC_1b4PBhro3QqnOU-lK4McJCfeAC1QNI"
  }
}
```

23. API Gateway receives JWT token from Auth Service and hand it over to Guardian client
