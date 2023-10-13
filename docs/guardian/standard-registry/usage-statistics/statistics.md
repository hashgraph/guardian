# 💻 Statistics

The analytics-service processes information accessible from the Hedera mirror nodes and collects various statistics

## **1. Configuration**

The service starts by navigating through Hedera structures collecting information from the root ‘topic’ which is specified in the environment variable _**INITIALIZATION\_TOPIC\_ID**_ environment variable.

Owing to the high resource load the refresh of the statistical information is performed periodically. The _**ANALYTICS\_SCHEDULER**_ environment variable allows to specify the time period. By default the refresh occurs weekly.

## 2. Launching UI Statistics

The docker command used to launch Statistics in [localhost:3000](http://localhost:3000/) is

```
docker-compose -f docker-compose-analytics.yml up -d --build
```

## **3. UI**

By default the system loads the data of the last successful refresh, and the delta with the prior refresh (if exists).

The UI allows users to select a particular prior snapshot of the data instead of the default last refresh.

![image1.png](<../../../.gitbook/assets/0 (6) (1).png>)

The top part of the page displays numerical statistics of the selected data snapshot (‘refresh’) and

the bottom part of the UI displays top 10 records for the selected statistic.

<figure><img src="../../../.gitbook/assets/1 (8) (1).png" alt=""><figcaption></figcaption></figure>

The sorting criteria can be changed by clicking on the statistics displayed in the top section of the page, or by selecting an option in the drop down list.

<figure><img src="../../../.gitbook/assets/2 (7) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/3 (7) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/4 (6).png" alt=""><figcaption></figcaption></figure>

The latest statistical refers can be exported in the format of the Excel file by clicking on the ‘Export’ button in the corresponding section of the UI.

{% hint style="info" %}
**Note:** The system exports the current state of the statistical data, not the selected refresh.
{% endhint %}
