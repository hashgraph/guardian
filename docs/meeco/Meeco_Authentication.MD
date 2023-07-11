# Meeco Authentication
Meeco is data privacy and decentralized identity management service that provides three products under its APIs, Vault as a secure data storage with E2E data encryption and supporting secure data exchange, Credentials which provides an entire VC ecosystem by onboarding issuer, verifier and holder and finally a user friendy Wallet mobile Application that creates secure connections to import digital assets.

Guardian leverages Meeco APIs and Wallet Application to onboard users easily by the use of VC4OIDC. Meeco enables users by field selective exposure to present their identity data as narrow as required to third-parties that will be able to verify VPs Meeco APIs. Services like Guardian now can create schemas of required fields to onboard their customers while users will be able to present them by VPs that can be verified by Guardian. The users also benefit from SSO and passwordless authentication that removes the concern of keeping them safe.

Workflow and Sequence Diagram

Users have an option to login by Meeco using VC4OIDC as follows:

1. User click on "Meeco Login" Button to Login by Meeco

2. Guardian Client Sends **MEECO_AUTH_REQUEST** Message over Websocket connetion

3. Guardian API gateway recieves the message and send a **MEECO_AUTH_START** command to Auth service over the NATS service

4. Auth service recieves the command from API Gateway

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

7. API Gateway recieves the MEECO_AUTH_REQUEST message from Auth Service and sends the redirect_uri to Guardian client within MEECO_AUTH_PRESENT_VP message over Websocket connection

8. Guardian client recieves the redirect_uri from MEECO_AUTH_REQUEST message and shows the uri in QR code format

9. In parallel Auth Service starts polling SVX platform to get VP submissions by user

10. User should open the Meeco Wallet App and scan the QR code and submit VP

11. Having submitted the VP by user, Auth Service receives VP Submission by user

12. Auth Service decodes credential subjects from VP

13. Auth Service verifies credential subjects expiration and issuer to be valid

14. Auth Service requests SVX to verify VP

15. Auth Service sends MEECO_VERIFY_VP message with credential subjects to API Gateway over NATS service

16. API Gateway sends credential subjects through MEECO_VERIFY_VP over websocket connection

17. Guardian client recieves the credential subjects through MEECO_VERIFY_VP

18. Guardian client shows the credential subject and asks user to approve/reject the info

19. User clicks approv/reject button to approve/reject data

20. Guardian client sends MEECO_APPROVE_SUBMISSION_RESPONSE/MEECO_REJECT_SUBMISSION_RESPONSE message over websocket

21. API Gateway recieves MEECO_APPROVE_SUBMISSION_RESPONSE/MEECO_REJECT_SUBMISSION_RESPONSE message from Guardian client and hand it over to Auth service over NATS service

22. Auth Service recieves MEECO_APPROVE_SUBMISSION_RESPONSE/MEECO_REJECT_SUBMISSION_RESPONSE message
    - if MEECO_APPROVE_SUBMISSION_RESPONSE message recieved
        - Auth Service submits verified submission to SVX platform
        - persists data to database
        - generates JWT token
        - sends JWT token through NATS to API Gateway
    - if MEECO_REJECT_SUBMISSION_RESPONSE message recieved
        - Auth Service submits verified submission to SVX platform

23. API Gateway recieves JWT token from Auth Service and hand it over to Guardian client