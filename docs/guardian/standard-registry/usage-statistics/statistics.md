# 💻 Statistics

The analytics-service processes information accessible from the Hedera mirror nodes and collects various statistics

## **1. Configuration**

The service starts by navigating through Hedera structures collecting information from the root ‘topic’ which is specified in the environment variable _**INITIALIZATION\_TOPIC\_ID**_ environment variable.

Owing to the high resource load the refresh of the statistical information is performed periodically. The _**ANALYTICS\_SCHEDULER**_ environment variable allows to specify the time period. By default the refresh occurs weekly.

## **2. UI**

By default the system loads the data of the last successful refresh, and the delta with the prior refresh (if exists).

The UI allows users to select a particular prior snapshot of the data instead of the default last refresh.

![image1.png](<../../../.gitbook/assets/0 (6).png>)

The top part of the page displays numerical statistics of the selected data snapshot (‘refresh’) and&#x20;

the bottom part of the UI displays top 10 records for the selected statistic.

<figure><img src="../../../.gitbook/assets/1 (8).png" alt=""><figcaption></figcaption></figure>

The sorting criteria can be changed by clicking on the statistics displayed in the top section of the page, or by selecting an option in the drop down list.

<figure><img src="../../../.gitbook/assets/2 (7).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/3 (7).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/4 (6).png" alt=""><figcaption></figcaption></figure>

The latest statistical refers can be exported in the format of the Excel file by clicking on the ‘Export’ button in the corresponding section of the UI.

{% hint style="info" %}
**Note:** The system exports the current state of the statistical data, not the selected refresh.
{% endhint %}

1. **API**

GET

/analytics/report – returns the status of the report for the current root ‘topic’. In the case of the changes of the topic a new report will be created.

/analytics/reports – returns the list of all created reports.

/analytics/report/:uuid – returns the report with the UUID matching the specified, and the collected statistics

/analytics/report/:uuid/export/csv – exports the current statistics into a csv file

/analytics/report/:uuid/export/xlsx – exports the current statistics into xlsx file

/analytics/dashboards – returns the list of created snapshots in the current report. Snapshots are the aggregated data for the successful refresh of the report.

/analytics/dashboards/:id – returns the statistics for the specified snapshot ID.
