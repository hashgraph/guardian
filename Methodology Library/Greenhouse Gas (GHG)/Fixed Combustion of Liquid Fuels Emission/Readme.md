# Fixed Combustion of Liquid Fuels Emission Methodology in Korea

Policy by WinCL

## Policy Description

This methodology provides a standardized framework for reporting organizations in Korea to quantify, report, and verify direct greenhouse gas (GHG) emissions from the fixed combustion of liquid fuels. It is applicable to Scope 1 emissions, where fuels are combusted onsite in facilities owned or operated by the organization. The methodology defines key parameters—including fuel consumption, net calorific values, emission factors, and oxidation factors—based on national default coefficients.

## Workflow Description

The emission calculation workflow for direct greenhouse gas (GHG) emissions from fixed combustion of liquid fuels begins with selecting the greenhouse gas type (CO₂, CH₄, or N₂O) and the corresponding business type.

The user then inputs the total amount of gaseous fuel consumed during the reporting year, measured in kilograms (kg) or normal cubic meters (Nm³), depending on the fuel type. Upon data entry, the system automatically applies the selected parameters and calculates emissions using the following formula:

\*Emissions (kg) = (kg) = Fuel Consumption × Calorific Value (TJ/unit) × Emission Factor (kg/TJ) × Oxidation Factor

This digital workflow ensures standardization and transparency, in alignment with national guidelines from the Greenhouse Gas Inventory and Research Center of Korea, and is designed to support reporting consistency for verification and compliance purposes.

The diagram below outlines the policy workflow as follows: User-provided input (Blue), Automated calculation (Purple)

![Workflow](./images/method6.png)

## Policy Guide

To begin, navigate to the policy interface where the user will input data related to fixed combustion of liquid fuels.

![guide1](./images/liquid1.png)

Start by selecting the greenhouse gas type from the dropdown menu. The user can choose between CO2, CH4, or N2O depending on the reporting scope.

![guide2](./images/solid2.png)

When CH₄ or N₂O is selected, a secondary dropdown for business type will appear - this selection is necessary for retrieving the appropriate parameters including calorific value, emission factor, and oxidation factor. If CO₂ is selected, no additional business classification is required.

![guide2](./images/liquid3.png)

Next, select the type of gaseous fuel used at thr facility during the reporting year. Based on the selection, the system automatically applies the appropriate fuel unit (either kilograms or normal cubic meters), calorific value, emission factor, and oxidation coefficient according to national guidelines.

![guide2](./images/liquid4.png)

After selecting the fuel, enter the total amount of fuel consumed during the reporting year in the appropriate unit.

![guide2](./images/liquid5.png)

Once all fields are completed, the system will calculate the GHG emissions using the predefined coefficients. The result will appear on screen in kilograms (kg) of the selected greenhouse gas.

![guide2](./images/liquid6.png)

The result will be displayed on-screen and stored in the database. The “View document” button opens a Verifiable Credential (VC) issued for the calculated data. The VC includes a unique identifier (UUID), issuer DID on Hedera Testnet, issuance timestamp, input values (GHG type, business type, fuel type, total consumption), and the final emission result. The user can view the VC either in Form View for readability or Code View for raw JSON. All VC data is cryptographically signed and stored in accordance with Guardian protocol standards.

![guide2](./images/liquid7.png)
