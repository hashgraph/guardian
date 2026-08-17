<p align='center'>
  <a href="https://imgbb.com/"><img src="https://i.ibb.co/h2fwv6V/logo.png" alt="logo" border="0"></a>
</p>

# Greentrace

Greentrace is an app that utilizes Hedera to provide users with a transparent and immutable platform for tracing product origins and verifying sustainability practices, fostering eco-conscious consumption habits.

Built, deployed, and open sourced for the <a href="https://dlt-climate-hackathon.devpost.com/" target="_blank">DLT climate hackathon</a> 2024.

Live Demo URL: usegreentrace.vercel.app (scan items!)

Demo video: https://youtu.be/SVaPdyQLuFk

## Inspiration
The inspiration behind Greentrace stems from the urgent need to address climate change and promote sustainable practices in supply chains. By leveraging emerging technologies like Distributed Ledger Technology (DLT) and the Hedera Guardian, Greentrace aims to empower consumers and businesses to make informed choices about the products they purchase and the companies they support. The goal is to create a transparent and auditable system that traces the origins of products back to their sustainable creation practices, thus promoting accountability and incentivizing eco-friendly production methods.

## What it does

Greentrace is a two-sided web application designed to facilitate the verification and registration of sustainable practices associated with products. On the verification side, users can upload a product's barcode, which is then scanned to extract the barcode text. This text is matched against the Hedera Guardian to verify the authenticity and sustainability of the product's origins.

On the registration side, businesses can assign a barcode a history record detailing the sustainable practices involved in the creation of the product. This record is stored on the Hedera network and is tamper-sealed using the Hedera Guardian, ensuring its integrity and immutability. Additionally, any green sustainability practices associated with the product are also recorded and stored securely on the DLT.

Anyone that uses the Greentrace policy has free access to the Greentrace web app for either uploading barcodes and their origin material or on the consumer side when viewing products out in the market in real time.

Summary:
1. Certifiers can upload information on products adhering to the policy schema to the Greentrace index regarding their sustainable production.
2. Consumers can scan products for uploaded products in the wild (ex: at stores, businesses, etc.) and be able to view the data directly from their mobile or camera-equipped devices.

## How we built it

Greentrace leverages Hedera's innovative policies and methodologies to establish a robust framework for ensuring data integrity and accountability in sustainable supply chains. By implementing Hedera policies, Greentrace can securely freeze and tamper-seal sustainability records, guaranteeing their immutability and reliability. This approach not only instills trust in the information stored on the platform but also empowers users to make informed decisions about their purchases, thereby driving forward climate accountability and supporting the mission of Auditable, Discoverable, and Liquid sustainability/ESG assets.

<p align='center'>
<img src='./img/diagram.png' width=600 />
</p>

## Repo structure
<pre>
`/` (root): Main web project
`/policy`: Methodology and policy schema for the Greentrace application.
`/server`: Server code
</pre>

## How to run

`yarn; yarn dev`

The web project should now be running on port 3000

## How the policy is structured

The policy is structured as metadata that get either directly filled or autofilled from the consumer application. The policy schema is available <a href="https://github.com/cbonoz/greentrace/blob/main/policy/schema.json" target="_blank">here</a>


## Challenges we ran into
- Integrating the barcode reader functionality seamlessly into the web application.
- Ensuring the secure and tamper-proof storage of sustainability records using the Hedera Guardian.
- Designing an intuitive user interface for both the verification and registration sides of the application.


## Accomplishments that we're proud of
- Successfully implementing the barcode scanning feature for product verification.
- Establishing a secure and auditable system for recording sustainable practices using the Hedera Guardian.
- Creating a user-friendly web application that promotes transparency and accountability in supply chains.

## What we learned
- How to integrate third-party libraries and SDKs into web applications effectively.
- The importance of data security and integrity in sustainable supply chain management.
- Strategies for designing and developing user-friendly interfaces for complex applications.

## Potential future work
- Expanding the database of sustainable practices and certifications to provide more comprehensive information to consumers.
- Integrating additional features such as user reviews and ratings to further enhance transparency and trust in the system.
- Collaborating with manufacturers and retailers to encourage widespread adoption of Greentrace and promote sustainable consumption habits globally.
- Integration of additional credential validation for product uploaders.

# Image Gallery

<!-- https://i.ibb.co/F4XTtnv/Screenshot-2024-04-07-at-5-51-55-PM.png -->

<div align="center">
  <div style="max-width: 600px;">
    <h2>Home Image</h2>
    <img src="img/home.png" alt="Home Image" style="max-width: 100%;">
  </div>
  <div style="max-width: 600px;">
    <h2>No Match Image</h2>
    <img src="img/no_match.png" alt="No Match Image" style="max-width: 100%;">
  </div>
  <div style="max-width: 600px;">
    <h2>Result Image</h2>
    <img src="img/result.png" alt="Result Image" style="max-width: 100%;">
  </div>
  <div style="max-width: 600px;">
    <h2>Form Image</h2>
    <img src="img/form.png" alt="Form Image" style="max-width: 100%;">
  </div>
  <div style="max-width: 600px;">
    <h2>Match Image</h2>
    <img src="img/match.png" alt="Match Image" style="max-width: 100%;">
  </div>
  <div style="max-width: 600px;">
    <h2>Scan Image</h2>
    <img src="img/scan.png" alt="Scan Image" style="max-width: 100%;">
  </div>
    <div style="max-width: 600px;">
    <h2>Screenshot of Schema</h2>
    <img src="img/policy.png" alt="Policy Image" style="max-width: 100%;">
  </div>
</div>