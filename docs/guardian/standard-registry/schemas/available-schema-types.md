# 📂 Available Schema Types

## **Embracing GBBC Specifications for Universal Data Comparability**

In the Guardian, the Property Glossary serves a pivotal role in harmonizing data across the entire ecosystem. Leveraging the standards set forth in the [GBBC dMRV Specification](https://gbbcouncil.org/wp-content/uploads/2023/09/Digital-Measurement-Reporting-Verification-dMRV-Framework.pdf) (and beyond), the glossary establishes a unified framework for interpreting and mapping data, ensuring that information collected through various schema formats remains consistent, comparable, and searchable.

## **The Need for Standardized Data Mapping**

The complexity of environmental reporting and digital asset management is compounded when dealing with varied methodologies and schema designs. To address this, the Guardian implements a standardized approach to data mapping, allowing for effective comparison and analysis of project data, regardless of its original schema format. This standardization is vital for:

1. **Ensuring Consistency:** Regardless of how data is formatted in individual schemas, standardizing property definitions ensures a consistent approach to interpreting and comparing data.
2. **Facilitating Comparability:** By using a common language for data properties, the Guardian enables users to effectively compare and analyze data from similar or different methodologies.
3. **Enhancing Searchability:** Standardized properties allow for more efficient data retrieval, making it easier to locate specific information across various projects and schemas.

## **Role of the Property Glossary**

The Property Glossary in MGS is more than just a list of definitions; it is a tool for aligning data across the platform. It includes a table of **Standardized Property Definitions.** Drawing from the GBBC Specification, the glossary provides clear definitions for each property, ensuring a common understanding across the platform.

**Introduction**

In the realm of digital environmental assets and carbon offset tokens, data is king. The essence of creating verifiable and trustworthy digital assets lies in the quality and structure of the underlying data. This is where the concept of "Schema Types" comes into play. Schemas serve as the backbone of data organization, ensuring that every piece of information adheres to a predefined format, thereby maintaining consistency, accuracy, and reliability.

**Purpose of Schema Types**

Schema Types are not just about data organization; they are about setting a standard for data integrity and trustworthiness. By defining clear structures and formats for data entry, storage, and retrieval, schemas facilitate:

1. **Standardization and Uniformity:** Ensuring all data across various projects and methodologies conforms to a consistent structure, enabling seamless integration and comparison.
2. **Flexibility and Customization:** Catering to diverse needs by allowing modifications to fit specific project requirements without compromising data integrity.
3. **Efficient Data Management:** Streamlining the process of data handling, from input to analysis, ensuring that data-driven decisions are based on accurate and reliable information.

**Role in Digital Environmental Assets**

The utilization of Schema Types is pivotal for the lifecycle of digital environmental assets. From the initial stages of data collection to the final phases of token creation and verification, schemas ensure that each step is backed by solid, verifiable data. This approach not only enhances the credibility of the digital assets but also boosts confidence among stakeholders in the carbon market ecosystem.

| Schema Type | Definition                                                                                                                                  | Example Input                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| String      | A string is a data type used in programming, such as an integer and floating point unit, but is used to represent text rather than numbers. | I ate 3 hamburgers.                                                                                                                                    |
| Number      | A whole number is an integer that is 0 or greater.                                                                                          | 0, 1, 2, 3, or 4.                                                                                                                                      |
| Integer     | An integer is a whole number (not a fraction) that can be positive, negative, or zero.                                                      | 10, 0, -25, 5148.                                                                                                                                      |
| Boolean     | Boolean, or boolean logic, is a subset of algebra used for creating true/false statements.                                                  | True or False.                                                                                                                                         |
| Date        | Specifies a calendar date.                                                                                                                  | 2023-01-01                                                                                                                                             |
| Time        | Specifies a time.                                                                                                                           | 12:00 AM.                                                                                                                                              |
| DateTime    | Specifies a calendar date and a time.                                                                                                       | 2022-03-25T12:10:33.916Z                                                                                                                               |
| Duration    | Specifies a calendar date range calendar.                                                                                                   | P1D (1 day), P2W (2 weeks), P3M (3 months), P4Y (4 years), P1Y1D (1 year + 1 day)                                                                      |
| URL         | Specifies a website.                                                                                                                        | https://github.com/hashgraph/guardian.                                                                                                                 |
| Email       | Specifies a email address.                                                                                                                  | email@exampleemail.com.                                                                                                                                |
| Image       | Specifies IPFS URL of an uploaded image.                                                                                                    | [ipfs://bafkreiebnkjylfsdds5oicxpk5vdink5tduwbxed5552xcmeyrbzpewfuu](https://ipfs.io/ipfs/bafkreiebnkjylfsdds5oicxpk5vdink5tduwbxed5552xcmeyrbzpewfuu) |
| Account     | Specifies Hedera Account name                                                                                                               | Custom Account                                                                                                                                         |
| Prefix      | Specifies adding Units in front of quantity                                                                                                 | Rs                                                                                                                                                     |
| Postfix     | Specifies adding Units after the quantity                                                                                                   | Litres, Kgs,$                                                                                                                                          |
| Enum        | Specifies values to be added                                                                                                                | Option 1, Option 2                                                                                                                                     |
| Help Text   | Define some help text and set some text parameters like bold, text size, text color                                                         | Text Field                                                                                                                                             |
| GeoJSON     | Define to add polygons, lines on map                                                                                                        | Alza\_....                                                                                                                                             |
| URI         | Example link to ipfs files                                                                                                                  | ${schema}://{auth}/….                                                                                                                                  |
| SentinelHub | Define Geographic rastery imagery coordinates                                                                                               | Height, Width, From and To Date.                                                                                                                       |

