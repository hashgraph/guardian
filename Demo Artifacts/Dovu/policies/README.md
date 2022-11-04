## Policies

Here we have all the policies we are currently building out, the two main focus differentiators for our templates are MRVs that end with:

- Agrecalc
<<<<<<< HEAD
- Cool Farm Tool 
=======
- Cool Farm Tool
- Carbon Space (beta)
- Geotree (beta)
- Grain Data Solution (beta)
- Soil Carbon Coalition (beta)
>>>>>>> main

Inside of each policy folder we have these items:

- The README of the specific policy, with recommendations.
<<<<<<< HEAD
- A directory of example block submissions, assuming that context and schema UUID's will be injected as part of the guardian process 
=======
- A directory of example block submissions, assuming that context and schema UUID's will be injected as part of the guardian process
>>>>>>> main

# Common blocks between policies

Both of the sub-MRV Policies both use the same *create-application* flow and ecological project document structure, through *create-farm* (see below for caveats).

Below are the current internal recommendations for handling both of these blocks.

## DOVU Typeform (create-application)

There are no hard requirements or specification to abide by for injecting into this block, Simply use the parameters that are supplied by the project owner or registrant.

## Ecological Project (create-farm)

First point of note is that the tags will change from **create-farm** to **create-project** to be more inclusive for a diverse range of projects.

You may refer to the basic specification of an ecological project through this [Github Link for Ecological Project or Program (EP)](https://github.com/InterWorkAlliance/Sustainability/blob/main/vem/supply/ep.md)

We have also added references to the proto-files of ecological projects and sustainability common definitions within the specifications directory on the root of this project. Occasionally the above documents does differ from the updated documentation through Github.

## EP Data Point Recommendations

Every Ecological Project or Program will have the following:

### Unique identifier ("Id"): An identifier that is issued and independent of the "name" of the project.

Generate a UUID

### Name: A name is recommended, but not required, to be unique.

Use any string, Preferably supplied through the initial DOVU application

### Description: A brief description of the project.

Use any string, this is optional.

### Owner(s): One or more references to the Id(s) of the project or program owner(s).

Refer to an account ID for now to reduce the risk of personal data

### Ecological Project Info: Metadata, defined below, about the project.

These are methods items that really describe links to a given project on the marketplace as well as country and scale.

#### Link to Project Data: A verified link to more project data like marketing materials or a website.

This would be a string/URL to the project on our marketplace.

#### Country: The host country for the project.

Use any string, Prefer the usage of [ALPHA-2](https://www.iban.com/country-codes).

#### Project Scale: One from the list of - Micro, Small, Medium or Large

There are no strict definitions for scale in terms of the IWA, All they supply within the Proto file is a reference to one of these four categories.

Internally let's use these definitions for now, For onboarded projects pre-addition.

- MICRO: < 10 tonnes of CO2e
- SMALL: < 100 tonnes of CO2e
- MEDIUM: <= 1000 tonnes of CO2e
<<<<<<< HEAD
- LARGE: > 1000 tonnes of CO2e 
=======
- LARGE: > 1000 tonnes of CO2e
>>>>>>> main

### Modular Benefit Projects ("MBP")

#### Unique identifier ("Id"): An identifier that is issued and independent of the project. The Id is used to establish a compound identifier linking the MBP with its host EP.

Any string for now.

#### Geographic Location:

[GeoJSON](https://geojson.org/) for all Projects, default to stringified JSON, we might add a schema to conform to RFC 7946 if we require increased discoverability on the backend.

#### Targeted Benefit Type:

Default to: **Carbon: Removal + Natural** for soil-based carbon projects
<<<<<<< HEAD
    
=======

>>>>>>> main
#### Developer(s)

These can be any kind of strings, for now point to account IDs, But by default they will be empty.

#### Sponsor(s)

These can be any kind of strings, for now point to account IDs, But by default they will be empty.

#### Claims

<<<<<<< HEAD
This needs further exploration as there is a [proto file that focuses on a given claim](https://github.com/InterWorkAlliance/TokenTaxonomyFramework/blob/main/artifacts/token-templates/definitions/Ecological-Claim/latest/Ecological-Claim.proto).  
=======
This needs further exploration as there is a [proto file that focuses on a given claim](https://github.com/InterWorkAlliance/TokenTaxonomyFramework/blob/main/artifacts/token-templates/definitions/Ecological-Claim/latest/Ecological-Claim.proto).
>>>>>>> main
