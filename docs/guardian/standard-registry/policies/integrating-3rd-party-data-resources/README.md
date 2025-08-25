---
icon: mortar-pestle
---

# Integrating 3rd Party Data Resources

1. [Step By Step](./#id-1.-step-by-step)
2. [Demo Video](./#id-2.-demo-video)

## 1. Step By Step <a href="#id-1.-step-by-step" id="id-1.-step-by-step"></a>

In order to integrate the data resources, we need to first configure "IntegrationButton" block. To get complete details, please check : [IntegrationButton](https://docs.hedera.com/guardian-dev-1/~/revisions/o57QY9WeuCWYIoDgpoV6/guardian/standard-registry/policies/policy-creation/introduction/integrationbutton-block) block section

Once the block configuration is completed, we need to follow the below steps:

### 1.1 Authentication Requirements <a href="#id-1.1-authentication-requirements" id="id-1.1-authentication-requirements"></a>

**Global Forest Watch:**\
You can review the documentation at [https://data-api.globalforestwatch.org/](https://data-api.globalforestwatch.org/) for instructions on how to obtain an `x-api-key`, though please note by default the key comes with certain limitations. For full access, it is recommended to reach out directly to the company's partner team.

<figure><img src="../../../../.gitbook/assets/image (122).png" alt=""><figcaption></figcaption></figure>

\
**Fire Information for Resource Management System**(**FIRMS):**

Access to FIRMS requires a `map_key`, which can be obtained via [this link](https://firms.modaps.eosdis.nasa.gov/api/map_key/). Please note that this key is subject to certain limitations. For unrestricted access, it is recommended to contact the FIRMS support team directly.

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FOnszj42ZGs868k0Cc5Fn%252Fimage.png%3Falt%3Dmedia%26token%3Dc1a6aced-c18c-4a25-bf47-bc3df008e997&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=e198e324&#x26;sv=2" alt=""><figcaption></figcaption></figure>

**Kanop:**

1. **Register at:** [https://www.kanop.io/](https://www.kanop.io/)
2. **Navigate to Application Settings:** [https://app.kanop.io/settings?tab=applications](https://app.kanop.io/settings?tab=applications)
3. **Create a new application** to generate and obtain your access token.

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252Fm13WOcAVvAShPXjfZPJl%252Fimage.png%3Falt%3Dmedia%26token%3D781b2dc7-ad69-4416-b8de-54ec0deef8c7&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=775da9f8&#x26;sv=2" alt=""><figcaption></figcaption></figure>

### 1.2 API Documentation for Integrations <a href="#id-1.2-api-documentation-for-integrations" id="id-1.2-api-documentation-for-integrations"></a>

To explore request options and parameter details, refer to the documentation for each service:

1. [Global Forest Watch](https://data-api.globalforestwatch.org/)
2. [Kanop](https://main.api.kanop.io/projects/docs)
3. World Bank: [https://datahelpdesk.worldbank.org/knowledgebase/topics/125589](https://datahelpdesk.worldbank.org/knowledgebase/topics/125589) [https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures)
4. [FIRMS](https://firms.modaps.eosdis.nasa.gov/api/)

**For Kanop:**

The `KANOP_IO_AUTH_TOKEN` must be configured either in the **policy-service settings** or within the **Docker configuration**.\
Similarly, for FIRMS, the `FIRMS_AUTH_TOKEN` must be specified in the same locations.\
These tokens can be conveniently located under **Integration Tokens**.

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FBTeJ3P0FytrW8RROd2mg%252Fimage.png%3Falt%3Dmedia%26token%3D2d646ba2-852e-4f83-9444-1da7e5e74d50&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=7a19082a&#x26;sv=2" alt=""><figcaption></figcaption></figure>

**For Global Forest Watch:**\
You must set `GLOBAL_FOREST_WATCH_API_KEY` in the policy-service config or in the Docker configuration.

**For FIRMS:**\
The `FIRMS_AUTH_TOKEN` must be configured in the **policy-service settings** or within the **Docker configuration**.\
This token can be located under **Integration Tokens**.

### 1.3 Displaying Data in a Grid <a href="#id-1.3-displaying-data-in-a-grid" id="id-1.3-displaying-data-in-a-grid"></a>

To display the retrieved data in a grid, save the responses using the **`sendToGuardian`** block with the source set to either **auto** or **database**.

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FIx3faefRPqKRIVd3C3ls%252Fimage.png%3Falt%3Dmedia%26token%3Db859d70a-90c8-4a5d-9bd4-9cc4a2464369&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=dc87a854&#x26;sv=2" alt=""><figcaption></figcaption></figure>

Use the `documents block` combined with the `source addon` block:

Set "Data type" to "Collection (VC)":

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252Fn2PO48u2HUzedfGk0lcr%252Fimage.png%3Falt%3Dmedia%26token%3D811c6f16-f9a3-4ff2-a48e-10d786bc19d2&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=74ed2cf9&#x26;sv=2" alt=""><figcaption></figcaption></figure>

Apply a filter: type = "integration"

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252Fkm18omNQvp5sX6azEZCB%252Fimage.png%3Falt%3Dmedia%26token%3D3495c318-6520-48d5-acb5-5d5e4d64fde3&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=48dfa167&#x26;sv=2" alt=""><figcaption></figcaption></figure>

### 1.4 Triggering Data Fetch <a href="#id-1.4-triggering-data-fetch" id="id-1.4-triggering-data-fetch"></a>

To retrieve data from a third-party source, select the **“Integration Data”** button. The system will execute the configured request and display the returned data.

<figure><img src="https://docs.hedera.com/guardian/~gitbook/image?url=https%3A%2F%2F1556785885-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FNYWPEEAknX9Vki1yV5HY%252Fuploads%252FbbUTPiSarKJwb4N8Ii6h%252Fimage.png%3Falt%3Dmedia%26token%3D096e44e1-5a3f-45e2-bf30-f76dd511471b&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=3081b296&#x26;sv=2" alt=""><figcaption></figcaption></figure>

## 2. Demo Video <a href="#id-2.-demo-video" id="id-2.-demo-video"></a>

Coming Soon
