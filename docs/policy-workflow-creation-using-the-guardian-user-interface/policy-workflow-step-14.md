# Policy Workflow Step 14



Next, we need to add another step. To do this we click back to the “create\_new\_sensor\_steps” step and click on the “Send” button in the top navigation bar since we need to send the information we collect to Hedera via the Guardian for storage.

Again we add a tag, data type – Hedera to be compliant with the Hedera transaction format, and entity type (Inverter) which indicates the sensor.

![](https://i.imgur.com/opJi5j6.png)

**Programmatically this workflow step looks like this:**

```
                // Save the created sensor VC in the corresponding Heder Topic.
                {
                  "tag": "send_sensor_vc_to_hedera",
                  "blockType": "sendToGuardian",
                  "dataType": "hedera",
                  "entityType": "Inverter",
                  "uiMetaData": {}
                },
```
