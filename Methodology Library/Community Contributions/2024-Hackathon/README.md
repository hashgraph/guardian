**This folder is dedicated to new methodologies contributed by the hackathon participants.**

We strongly recommend reading the developed to incorporate best practices working with carbon standards and project developers: [**Methodology Digitization Handbook**](https://docs.hedera.com/guardian/methodology-digitization/methodology-digitization-handbook) 
 

This Handbook will help you understand:
- Methodology structure and components
- Digitization best practices
- How to prepare policies and schemas for Guardian

**Once you are ready with your methodology, please follow the below guide to submit it:**

## 1. Process to Raise a Pull Request (PR)

1. **Fork the Repository**
   - Click the **Fork** button on the Guardian repository to create your own copy.

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/<your-username>/guardian.git
   cd guardian/hackathon
  
3. **Create a New Branch**

- Use a clear and descriptive branch name:
```bash
git checkout -b methodology/<your-methodology-name>
```

4. **Add Your Methodology Files**

- Include:

    - Schema JSON files (if applicable)
    - Policy JSON file or relevant Guardian export file
    - Readme for your methodology describing:
        - Purpose
        - Step-by-step usage
        - Any dependencies or prerequisites

5. **Commit Your Changes**

```bash
git add .
git commit -m "Add methodology: <your-methodology-name>"
```
6. **Push Your Branch**

```bash
git push origin methodology/<your-methodology-name>
```
7. **Create a Pull Request**
- Go to your fork on GitHub and click **Compare & Pull Request**.
- In the PR description, include:
    - Short summary of the methodology
    - Any special setup steps

## 2. Acceptance Criteria

Your PR will be reviewed against the following:

**Mandatory**
- Clear Naming: Files and folders must follow methodology_<name> format.
- Documentation: Must include a README for the methodology with:
     - Purpose and scope
     - Data flow or process overview
     - Step-by-step import/use instructions in Guardian
- Functional Policy: Policy file should import and run in Guardian without errors.
- Schema Validation: Schemas must be valid JSON and follow Guardian schema structure.

**Recommended**
- Include sample VC (Verifiable Credential) and VP (Verifiable Presentation) files for quick testing.
- Include screenshots of your methodology running in Guardian.
- Ensure your methodology is reusable and parameterized where possible.

**Reasons a PR May Be Rejected**
- Missing methodology documentation
- Broken policy/schemas that cannot be imported
- Non-descriptive or unclear file naming
- Contains unrelated changes outside hackathon/ folder

## 3. Review & Merge Process

- Guardian maintainers will review your PR.
- If changes are needed, we’ll request them in the PR comments.
- Once approved, the PR will be merged into the main repository under this folder.


