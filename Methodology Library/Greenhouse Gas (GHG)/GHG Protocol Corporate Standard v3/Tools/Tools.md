# GHG Protocol Corporate Standard v3 – Tools

## Architecture

The GHGP Framework is a layered architecture where tools and modules feed into the main policy framework:

```
  ┌─────────────────────────────────┐
  │     Organizational Profile      │
  ├─────────────────────────────────┤
  │           Entities              │      ┌──────────────────────┐
  ├─────────────────────────────────┤      │  Universal GHGP      │
  │       Facilities/Assets         │  ──► │  Reporting Metrics   │
  ├─────────────────────────────────┤      ├──────────────────────┤
  │            Source               │◄──┐  │  Supplemental        │
  ├─────────────────────────────────┤   │  │  Reporting           │
  │         Activity Data           │   │  │  (CDP, SBTi, PACT,  │
  └─────────────────────────────────┘   │  │   ESRS, SEC, etc.)   │
                                        │  └──────────────────────┘
                              ┌─────────┴─────────┐
                              │  Emission Factors  │
                              │ & Secondary Data   │
                              └────────────────────┘
```

**Activity Data** tools and **Emission Factors / Secondary Data** tools sit at the bottom two tiers of the framework, feeding into the **Source** calculation layer in the main policy. Source calculation tools orchestrate the activity data and secondary data sub-tools to produce scope-level emission outputs.

The tools fall into four categories:

- **Source calculation tools** – Main orchestrators that chain sub-tools to calculate emissions (Scope 1: Stationary Combustion, Scope 2: Purchased Electricity, Scope 3 Category 1: Purchased Goods and Services)
- **Activity data collection tools** – Capture and normalize primary activity data from meters, invoices, spend records, and ERP systems
- **Secondary data tools** – Provide emission factors, global warming potentials, and other reference data from authoritative sources (EPA, Defra, IPCC, Green-e, PACT)
- **Supplemental reporting tools** – Support additional reporting frameworks beyond core GHGP requirements (e.g., PACT v3 PCF)

## Published Tools

| Tool Name | Description | IPFS Timestamp |
|-----------|-------------|----------------|
| Scope 1: Stationary Combustion (Basic) | This tool calculates scope 1 emissions from stationary combustion based on quantities of fuel consumed or fuel spend. | 1772210533.900636000 |
| Activity data tool (meter data) | Captures fuel consumption from meter readings, calculating usage as the difference between start and end readings. | 1772209946.573268000 |
| Activity data tool (fuel invoice data) | Captures fuel consumption data from utility invoices, including relevant account, billing, and activity information. | 1772209962.643965000 |
| Activity data tool (fuel spend data) | Captures fuel spend data and calculates fuel quantity from total spend and unit price. | 1772210035.254120311 |
| Secondary data tool (emission factors) | Provides EPA emission factors (CO2, CH4, N2O) for 63 fuel types used in stationary combustion calculations. | 1772206222.392600000 |
| Secondary data tool (global warming potentials) | Applies IPCC AR5 100-year Global Warming Potentials (CH4 = 28, N2O = 265) to convert greenhouse gas emissions into CO2e. | 1772206268.684341314 |
| Scope 2 - Electricity (Basic) | This tool calculates scope 2 emissions from electricity based on electricity consumption. | 1773068363.452347908 |
| Activity data tool (electricity meter data) | Enables detailed, interval-level recording and calculation of electricity consumption by capturing meter readings, associated metadata, and relevant activity and source information. | 1772640466.195961484 |
| Activity data tool (electricity invoice data) | Captures electricity consumption from utility invoices, including relevant account, meter, billing, and activity information. | 1772640546.753614000 |
| Secondary Data – tool – EPA GHG Emission Factors Hub (Electricity) | Standardizes the application of EPA electricity emission factors for calculating location-based Scope 2 emissions from electricity consumption. | 1772207115.765736339 |
| Secondary Data – tool – Defra annual grid average emission factor (UK) | Standardizes the application of UK government annual grid average electricity emission factors for location-based Scope 2 reporting. | 1772207182.278682892 |
| Secondary Data – tool – Green-e® Residual Mix Emission Rates | Applies Green-e residual mix emission factors to calculate market-based Scope 2 emissions for electricity consumption not covered by contractual instruments. | 1773067768.184586954 |
| Secondary Data – tool – IPCC Fifth Assessment Report (AR5) | Applies IPCC AR5 Global Warming Potentials (GWPs) to convert greenhouse gas emissions into CO2e in accordance with internationally recognized climate science. | 1772207303.117956000 |
| Scope 3 category 1: Purchased goods and services | Calculates scope 3 category 1 emissions from purchased goods and services. | 1772210426.122313000 |
| Activity data tool (ERP product purchase) | Captures product purchase data from ERP systems, calculating unit quantities from total spend and unit price. | 1772213527.878249000 |
| Secondary Data PACT v3 PCF | Applies supplier-specific Product Carbon Footprints (PCFs) per the PACT v3 standard. | 1772060075.935144000 |
