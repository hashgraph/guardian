Haid – Humanitarian Aid with Hedera
Deployed App: https://haid.vercel.app

Track: DLT for Operations

Pitch Deck: View Deck

Certificates: View Folder

Overview
Haid is a humanitarian aid distribution system powered by the Hedera Guardian network. It brings transparency, dignity, and efficiency to how food, medical supplies, and essentials reach displaced people and refugees.

The platform connects NGOs, volunteers, donors, and recipients in one trusted ecosystem, using Hedera’s DIDs and immutable event logs to guarantee fairness and accountability.

Problem Statement
Millions of displaced people struggle to access aid because of broken systems: no formal identity, fraudulent claims, and chaotic manual processes. For NGOs and donors, it’s almost impossible to see where aid actually goes or verify how it’s used.

This lack of transparency creates waste, slows down distribution, and erodes trust. Haid fixes this by putting identity, distribution, and accountability all on Hedera’s distributed ledger.

Solution
Each refugee receives a waterproof Haid Band embedded with an NFC chip that contains a unique Decentralized Identifier (DID) on Hedera Guardian. For the hackathon, this is represented by a QR code, used purely for demo purposes due to financial constraints.

When a volunteer scans a band, the system instantly verifies the recipient’s identity and logs the distribution on Hedera. NGOs can then track events in real time, while donors and auditors can see exactly how aid moves; all recorded immutably on-chain.

Why Hedera Guardian
Haid uses Hedera Guardian, the open-source sustainability platform that enables verifiable, tamper-proof data management.

We leverage:

Hedera Consensus Service (HCS) for timestamped, immutable event records.
Hedera Decentralized Identity (DID) for privacy-preserving user identity.
Guardian Indexer for transparent data visualization and verification.
Together, these components make Haid scalable, auditable, and affordable; ideal for high-impact humanitarian operations.

User Roles and Flow
Refugees
Receive Haid Bands (or QR codes for the MVP). Simply tap or scan to collect aid. No paperwork, no waiting, no double-claiming.

NGOs
Create and manage aid events such as food or shelter distributions. Assign volunteers and monitor real-time collection data. Export on-chain verified reports for donors and partners.

Volunteers
Use mobile scanning devices to log each collection event. Every scan is instantly recorded on Hedera. Receive instant feedback when aid is successfully logged.

Donors
Get an automatic Hedera wallet at registration. Send donations directly to verified NGOs. See live dashboards showing every transaction and its on-chain proof.

Auditors
Verify all recorded events on the Hedera Guardian indexer. Ensure full compliance and integrity of all distributed aid.

Revenue and Sustainability
Platform-as-a-Service model: NGOs and partner organizations subscribe to Haid for transparent, verifiable distribution tracking.
Transaction fees: Minimal service fees on donor-to-NGO transfers via Hedera tokens.
Partnership and grants: Collaborations with UNHCR, UNICEF, and government bodies to adopt Haid as a compliance and traceability layer for social programs.
Roadmap
Hackathon MVP (Now)
QR code simulation of the NFC band.
Full dashboards for NGOs, volunteers, donors, and refugees.
Immutable Hedera Guardian logging on Testnet.
Real-time analytics and automatic wallet creation.
Post-Hackathon
Manufacture waterproof NFC Haid Bands.
Move wallets and event logging to Hedera Mainnet.
Pilot with partner NGOs in West African refugee camps.
Integrate AI for predictive logistics and aid optimization.
Add trackable Haid Bands for location safety and migration support.
Architecture Overview
Layer	Tools	Purpose
Frontend	Javascript + Chakra UI	Accessible, multilingual dashboards in English, French, Swahili, Hausa, and Arabic, with voice and high-contrast modes.
Backend	Node.js	Event creation, user management, and real-time logging.
Blockchain Layer	Hedera Guardian (HCS, DID)	Immutable event storage, decentralized identity, and data transparency.
Database	MongoDB	Off-chain caching and queryable records synced with Hedera.
Impact
100% tamper-proof logs for every aid event.
Up to 10× faster registration and distribution.
Unified dashboard for all stakeholders.
Refugees receive fair, transparent, and dignified aid.
Why Haid Wins
Because it’s built with empathy, not ego. Haid combines real-world practicality with verifiable technology - solving one of the hardest humanitarian challenges through simplicity and trust.

It’s not just a concept. It’s a working end-to-end system built on Hedera Guardian, designed to scale across Africa and beyond.

Team Haid
Lydia Solomon - Product Lead & Product Manager

Timothy - Frontend Engineer

Tobiloba - Product Designer

Olumuyiwa - Hedera Developer

Chinomso - Backend Engineer
