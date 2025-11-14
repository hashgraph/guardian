# messagesReportBlock

## 1. messagesReportBlock:

This Block allows to create report based on the inter-referenced messages.

![image1.png](<../../../../../.gitbook/assets/0 (7).png>)

## **1.1 Properties**

Does not contain additional settings.

## **1.2 Data format**

### **GET**

**status** – current report status

1. FAILED – error encountered during the building
2. STARTED – reporting building is in progress
3. FINISHED – reporting building has been successfully completed

**target** – the document which is the subject of the report

**report** – the current report

```
{
"roles" – documents showing users and their roles
"users" – list of identified users
"schemas" – list of identified schemas
"tokens" – list of identified tokens
"topics" – hierarchical structure of Hedera topics and messages relevant to the target document
{
"topicId" – unique topic identifier
"message" – document describing the topic
"messages" – list of documents referenced in the topic
"children" – child topics
}
}
```

### **POST**

* Target document identification based on message ID - the system creates the report on the document which is referenced in the Header message with the specified ID (the presence of the document in the local Guardian database is not required)

```
{
"filterValue": "hedera message id"
}
```

* Target document identification by its hash – they system build the report on the document in the local DB which has the specified hash

```
{
"filterValue": "hash"
}
```

* Resets the report

```
{
"filterValue": "",
}
```

## 2. Example

Block can work independently (stand-alone):

![image2.png](<../../../../../.gitbook/assets/1 (2) (1).png>)

Or used in conjunctions with other blocks (e.g. with grid)

![image3.png](<../../../../../.gitbook/assets/2 (3) (1).png>)

### **2.1 Display** **Modes**

#### **2.1.1 Simplified** – folds all messages for a policy into a single ‘swim lane’.

* Only policy topics are displayed
* Auxiliary events (such as publishing policy) are hidden

![image4.png](<../../../../../.gitbook/assets/3 (6).png>)

#### **2.1.2 Advanced** – complete information is displayed with

* Full hierarchical topic structure
* All auxiliary and system events

![image5.png](<../../../../../.gitbook/assets/4 (5) (1).png>)

#### **2.1.3 Display layout**

* Left-side panel shows hierarchical catalog of Header topics.

![image6.png](<../../../../../.gitbook/assets/5 (6) (1).png>)

* Central area shows the timeline of the events as they have been recorded (in messages) in the specific topics

![image5.png](<../../../../../.gitbook/assets/4 (5) (1) (1).png>)

* Right-side panel shows detailed information about the selected message

![image1.png](<../../../../../.gitbook/assets/0 (7) (2).png>)
