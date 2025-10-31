# 🌍 EUDR Pre-Check Policy

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Blockchain](https://img.shields.io/badge/blockchain-Hedera-7952B3)
![Token](https://img.shields.io/badge/token-EUDRT-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## 📘 Introduction

# **EUDR Pre-check policy V 1.0**

## **Introduction**

The **EUDR Pre-Check Policy** is a multi-party workflow that lets suppliers prove—before any shipment leaves the farm—that their farmer polygons are accurate, geospatially valid, and already benchmarked against public deforestation-risk datasets. Instead of each organisation scrambling to persuade auditors that its shapefiles are trustworthy, the policy brings supplier, independent analysts, and a standards regulator into one Guardian-powered flow and seals every review in an on-chain token.

1. **Why it exists**  
   Under the EU Deforestation Regulation (EUDR), importers must show that the farms in their supply chain do not sit on recently deforested land. Many suppliers hold polygons but struggle to demonstrate their authenticity. Today they email files to third-party GIS firms, wait for PDF comments, and then repeat the process with buyers—an opaque and error-prone loop.  
2. **What the policy does**  
   *A supplier initiates a pre-check request with farmer details; a data collector captures or uploads each polygon. An automated integrity test validates geometry, CRS, and self-intersections; a geospatial engine cross-checks against public layers (tree-loss, protected areas, jurisdiction boundaries). Independent analysts score residual risk, and a standards regulator signs off on the methodology. When all validators agree, Guardian mints an **EUDR Pre-Check Token** whose metadata locks in the polygon hash, validation results, analyst comments, and regulator signature.*  
3. **Why multiple parties matter**  
   Because each stage—data collection, algorithmic screening, expert review, regulatory endorsement—is performed by a different role, no single actor can manipulate the outcome. The resulting token is therefore a credible, shareable proof that polygons have passed an agreed set of checks, long before the formal EUDR due-diligence window opens.

With the EUDR Pre-Check Policy in place, suppliers gain a fast, reusable certificate of polygon integrity; buyers and auditors gain a tamper-evident trail of who verified what and when; and regulators see a consistent, transparent approach that reduces last-minute compliance friction.

## **Policy Description**

 

The EUDR Pre-Check Policy digitises the geospatial due-diligence step required by the EU Deforestation Regulation (EUDR). It lets a supplier demonstrate—before formal compliance checks—that every farmer polygon in its supply chain is authentic and has already been screened against public deforestation-risk layers.

 

* **Goal** – verify polygon accuracy and deforestation risk in advance, then publish an immutable proof that multiple independent parties have reviewed and endorsed the findings.  
* **Key inputs** – supplier metadata, farmer polygons (GeoJSON/WKT), public datasets such as Global Forest Watch tree-loss, protected-area boundaries, jurisdiction shapefiles.  
* **Outputs**  
     
  * Verifiable Credentials (VCs) for each stage: data capture, integrity checks, geospatial validation, analyst scoring.  
  * **EUDR Pre-Check Token (EUDRT)** – a HIP-412 NFT whose metadata stores the polygon hash, validation results, analyst comments, and regulator signature.  

* **Roles** – Supplier/Data Collector, Independent Analyst, Standards Regulator, plus an optional Facilitator; each holds a Guardian DID and issues or signs the relevant VCs.  
* **Trust model** – no single actor controls all steps: data collectors upload polygons; automated rules test geometry; analysts run risk algorithms and score results; regulators verify the process before the EPT is minted.  
* **Compliance hooks** – provides verifiable evidence for EUDR due-diligence dossiers and can be embedded in buyer traceability systems.  
* **Schemas & files** – EUDR_pre_check.policy is included under Apache-2.0 for audit, fork, or extension.

 

## **Detailed Workflow**

 

 

Below is the step-by-step sequence that transforms raw farmer polygons into an on-chain **EUDR Pre-Check Token (EUDRT)**, ensuring every geometry has been examined by multiple independent parties before it reaches buyers or regulators.


![][image1]
 

1. **Pre-Scan Request (*Supplier)***  
   A supplier submits an *EUDR pre-scan request*, listing basic supplier data and the farmers to be assessed. The request is logged as a credential and sent to the **Standards Registry** for triage.  
2. **Process Initiation (*Standards Registry)***  
   The Standards Registry reviews the request, validates the supplier’s identity, and launches a new *Pre-Check Project*. Roles are assigned:  
   * **Data Collector** – captures or uploads polygons.  
   * **Analyst** – performs risk analysis.  
   * **Standards Regulator** – provides final endorsement.
    
3. **Polygon Capture (*Data Collector)***  
   For each farmer, the Data Collector:  
   * Records the boundary polygon (GeoJSON/WKT) with the correct coordinate system.  
   * Logs a point-in-polygon GPS confirmation.  
   * Uploads photos or land-title documents as evidence.  
     Guardian runs automated geometry checks (self-intersections, CRS conformity). Failed entries are returned immediately to the Data Collector for correction.  
    
4. **Geometry Validation Gate**  
   If the polygon passes all geometry tests it advances; if not, it loops back for re-capture. A **Geometry Validation Credential** is created for every pass-or-fail event, guaranteeing traceability.  
5. **Data-Integrity & Geospatial Validation**  
   Each validated polygon is overlaid on authoritative public layers these can be any layers such as,  
   * Global Forest Watch tree-cover-loss (2001-present)  
   * World Database on Protected Areas (WDPA)  
   * National forest-reserve boundaries  
   * Administrative districts  
     Intersection flags and distance-to-loss metrics are stored.  
     Decision: **Valid?** – if thresholds are breached the record returns to the Data Collector; if it passes, a **Geo-Validation Credential** is issued and sent to the Analyst.  
    
6. **Advanced Remote-Sensing Analysis** ***(Analyst)***  
   The Analyst runs deeper checks: NDVI trends, canopy density, time-series Sentinel-2 imagery. Results are scored (0–100 residual-risk index) with explanatory comments. An **Analyst Score Credential** is produced.  
7. **WISP (What is in that plot) Check (*Analyst)***  
    This step can be done with any other standards as well. **WISP** is an open-source solution which helps to produce relevant forest monitoring information and support compliance with deforestation-related regulations. Whisp is **robust**, **transparent**, and **replicable**, built on **interoperable open standards**. All code is open, publicly available, and can be inspected, reproduced, and adapted on [GitHub](https://github.com/forestdatapartnership/whisp).  
    A second review (human or ML model) applies WISP to detect subtle land-use change such as shadow clearing or new access roads. A **WISP Credential** is created, including a confidence score.  
8. **Regulatory Review (*Standards Registry)***  
    The regulator examines the Geo-Validation, Analyst Score, and WISP credentials:  
       
    * If any concerns remain, they mark *Rejected* with comments; the package returns to the Analysts for re-work.  
    * If everything is sound, they click **Verify**; their digital signature is stored in a **Regulator Approval Credential**.  
   
9. **Final Verification Gate**  
    Guardian confirms the presence of:  
       
    * Geo-Validation Credential  
    * Analyst Score Credential  
    * WISP Credential  
    * Regulator Approval Credential  
      If any are missing or unsigned, the case routes back to the last incomplete stage. If complete, the case proceeds to tokenisation.  
    
10. **Token Minting**  
    *Guardian system*  
    Guardian mints a **HIP-412 NFT**—the *EUDR Pre-Check Token (EUDRT)*—whose metadata includes:  
       
    * SHA-256 hash of the polygon geometry  
    * Supplier ID and anonymised Farmer ID hashes  
    * Validation results and residual-risk score  
    * WISP outcome  
    * Regulator DID and timestamp  
    * Policy version  
      All credentials and the token metadata are pinned to IPFS; the Hedera transaction ID is recorded.


## 🏁 Prerequisites

In order to use this policy in your Guardian instance, **you must first create a Standard Registry**. The Standard Registry acts as the trusted authority for verifying schema integrity, assigning roles, and approving credentials.

Once the Standard Registry is set up, you can onboard other users (Data Collectors, Facilitators, Analysts, etc.) with the correct roles as defined in the policy.

👉 [Learn how to create a Standard Registry](./standard_registry.md)
👉 [Learn how to create a User](./user.md)
👉 [Learn how to import a policy](./import_policy.md)

[image1]: <assets/images/workflow.png>
