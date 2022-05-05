# API Workflow of iREC Demo

### Setting up the User Role

BLOCK : choose\_role

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/88ea01cb-35ae-4e4d-87ce-ec93d577cd30" summary="User Role" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="role" type="String" required="true" %}
Registrant
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### Submitting Registrant Application Form

BLOCK : create\_application

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/8ae8f020-42ed-4692-9d93-4d700d467bd0 " summary="Registrant Application form to be submitted" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="field0" type="Date" %}
2022-04-01
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field1" type="Array" %}
"field0":"Applicant Legal Name",

&#x20;        "field1":"Registered address line 1",

&#x20;        "field2":"Registered address line 2",

&#x20;        "field3":"Registered address line 3",

&#x20;        "field4":"Postal (ZIP) code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Legal Status",

&#x20;        "field7":"Country of company registration/private residence",

&#x20;        "field8":"Corporate registration number/passport number",

&#x20;        "field9":"VAT number",

&#x20;        "field10":"Website URL",

&#x20;        "field11":"Main business (e.g. food retailer)",

&#x20;        "field12":2022,

&#x20;        "field13":1,

&#x20;        "field14":"Name of the Chief Executive Officer/General Manager",

&#x20;        "field15":"Chief Executive Officer/General Manager passport number",

&#x20;        "field16":"Please state in which countries the organization is active",

&#x20;        "field17":"Please list the main (>10%) shareholders",

&#x20;        "field18":1,

&#x20;        "field19":"test@mail.ru",

&#x20;        "type":"4510d95d-ed9d-4785-a5ed-5c1e334611dd",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" type="array" %}
&#x20;        "field0":"Organization Name",

&#x20;        "field1":"Address line 1",

&#x20;        "field2":"Address line 2",

&#x20;        "field3":"Address line 3",

&#x20;        "field4":"Postal code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Contact person",

&#x20;        "field7":"test@mail.ru",

&#x20;        "field8":"Telephone",

&#x20;        "field9":"Fax",

&#x20;        "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;        "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" type="array" %}
&#x20;        "field0":"Family Name (surname)",

&#x20;        "field1":"Other (Given) Names",

&#x20;        "field2":"Title",

&#x20;        "field3":"test@mail.ru",

&#x20;        "field4":"Telephone",

&#x20;        "field5":"Fax",

&#x20;        "type":"fb8c1458-e86f-444a-a408-665149bda777",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}


[https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty](https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="ref" %}
null
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Get Registrant Application to Approve)

#### Make GET request and get data\[i] and change option.status = “Approved”

BLOCK : registrants\_grid

{% swagger method="get" path="" baseUrl="/policies/626c0490d24497fe1b1e415d/blocks/2f237418-9ed5-4a1e-a2ea-c7f978554784" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   "data":[
      {
         "id":"626c056cd24497fe1b1e4163",
         "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
         "hash":"GkX1mNd5wxWKCdkBYC6PBGHm9jmkNzsjb9ycqcP4jgPb",
         "document":{
            "id":"9d537f1d-c906-4013-9ac6-c6a0fd211e4a",
            "type":[
               "VerifiableCredential"
            ],
            "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
            "issuanceDate":"2022-04-29T15:33:48.168Z",
            "@context":[
               "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject":[
               {
                  "field0":"2022-04-08",
                  "field1":{
                     "field0":"Applicant Legal Name",
                     "field1":"Registered address line 1",
                     "field2":"Registered address line 2",
                     "field3":"Registered address line 3",
                     "field4":"Postal (ZIP) code",
                     "field5":"Country",
                     "field6":"Legal Status",
                     "field7":"Country of company registration/private residence",
                     "field8":"Corporate registration number/passport number",
                     "field9":"VAT number",
                     "field10":"Website URL",
                     "field11":"Main business (e.g. food retailer)",
                     "field12":1,
                     "field13":1,
                     "field14":"Name of the Chief Executive Officer/General Manager",
                     "field15":"Chief Executive Officer/General Manager passport number",
                     "field16":"Please state in which countries the organization is active",
                     "field17":"Please list the main (>10%) shareholders",
                     "field18":1,
                     "field19":"test@mail.ru",
                     "type":"f7bd122d-4220-4d9d-abb2-fa9366e79975",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field2":{
                     "field0":"Organization Name",
                     "field1":"Address line 1",
                     "field2":"Address line 2",
                     "field3":"Address line 3",
                     "field4":"Postal code",
                     "field5":"Country",
                     "field6":"Contact person",
                     "field7":"test@mail.ru",
                     "field8":"Telephone",
                     "field9":"Fax",
                     "field10":"Existing I-REC Registry organization(s) to become subsidiary",
                     "type":"a68073e6-bf56-43e3-99c4-5b433c983654",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field3":{
                     "field0":"Family Name (surname)",
                     "field1":"Other (Given) Names",
                     "field2":"Title",
                     "field3":"test@mail.ru",
                     "field4":"Telephone",
                     "field5":"Fax",
                     "type":"9dca2898-d548-48a4-beec-fefd308f93cf",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "policyId":"626c0490d24497fe1b1e415d",
                  "@context":[
                     "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                  ],
                  "id":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
                  "type":"7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0"
               }
            ],
            "proof":{
               "type":"Ed25519Signature2018",
               "created":"2022-04-29T15:33:48Z",
               "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",
               "proofPurpose":"assertionMethod",
               "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GaOyMZ9dR5J0-iu6SICVNlWifON3DT0ytz2z_eCHeOSRY5oQ7Jb3219G7aUrztIEppMcfzG6teO-YvuNPiAfBw"
            }
         },
         "createDate":"2022-04-29T15:34:04.021Z",
         "updateDate":"2022-04-29T15:34:04.021Z",
         "hederaStatus":"ISSUE",
         "signature":0,
         "type":"registrant",
         "policyId":"626c0490d24497fe1b1e415d",
         "tag":"create_application(db)",
         "option":{
            "status":"Waiting for approval"
         },
         "schema":"#7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0",
         "messageId":"1651246443.516813000",
         "topicId":"0.0.34352381",
         "relationships":[
            
         ],
         "__sourceTag__":"registrants_source(need_approve)"
      }
   ],
   "blocks":[
      
   ],
   "commonAddons":[
      {
         "id":"c0dbe6b1-6963-4010-9dc4-c676679376dd",
         "blockType":"documentsSourceAddon"
      },
      {
         "id":"540a115b-a94e-4d16-af46-e4b817f07b98",
         "blockType":"documentsSourceAddon"
      }
   ],
   "fields":[
      {
         "title":"Legal Name",
         "name":"document.credentialSubject.0.field1.field0",
         "type":"text"
      },
      {
         "title":"Organization Name",
         "name":"document.credentialSubject.0.field2.field0",
         "type":"text"
      },
      {
         "title":"Operation",
         "name":"option.status",
         "type":"text",
         "width":"250px",
         "bindGroup":"registrants_source(approved)",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":""
      },
      {
         "title":"Operation",
         "name":"option.status",
         "tooltip":"",
         "type":"block",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":"approve_registrant_btn",
         "width":"250px",
         "bindGroup":"registrants_source(need_approve)"
      },
      {
         "name":"document",
         "title":"Document",
         "tooltip":"",
         "type":"button",
         "action":"dialog",
         "content":"View Document",
         "uiClass":"link",
         "dialogContent":"VC",
         "dialogClass":"",
         "dialogType":"json"
      }
   ]
}

```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Approve Registrant Application)

BLOCK : approve\_registrant\_btn

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/7f091726-126e-4bc7-8e2e-9cd7bb220ed0 " summary="Approving Registrant Application" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="id" %}
626bf6ddd24497fe1b1e413f
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
25J2gLm7phAEFu5yyQtVa8WqjUd8pDaxX1n6CtKR91rQ
{% endswagger-parameter %}

{% swagger-parameter in="body" name="document" %}
&#x20;

&#x20;     "id":"ebdc5776-e756-4cda-8e10-04c04adc535b",

&#x20;     "type":\[

&#x20;        "VerifiableCredential"

&#x20;     ],

&#x20;     "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "issuanceDate":"2022-04-29T14:31:39.500Z",

&#x20;     "@context":\[

&#x20;        "https://www.w3.org/2018/credentials/v1"

&#x20;     ],

&#x20;     "credentialSubject":\[

&#x20;        {

&#x20;           "field0":"2022-04-01",

&#x20;           "field1":{

&#x20;              "field0":"Applicant Legal Name",

&#x20;              "field1":"Registered address line 1",

&#x20;              "field2":"Registered address line 2",

&#x20;              "field3":"Registered address line 3",

&#x20;              "field4":"Postal (ZIP) code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Legal Status",

&#x20;              "field7":"Country of company registration/private residence",

&#x20;              "field8":"Corporate registration number/passport number",

&#x20;              "field9":"VAT number",

&#x20;              "field10":"Website URL",

&#x20;              "field11":"Main business (e.g. food retailer)",

&#x20;              "field12":2022,

&#x20;              "field13":1,

&#x20;              "field14":"Name of the Chief Executive Officer/General Manager",

&#x20;              "field15":"Chief Executive Officer/General Manager passport number",

&#x20;              "field16":"Please state in which countries the organization is active",

&#x20;              "field17":"Please list the main (>10%) shareholders",

&#x20;              "field18":1,

&#x20;              "field19":"test@mail.ru",

&#x20;              "type":"4510d95d-ed9d-4785-a5ed-5c1e334611dd",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ]

&#x20;           },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" %}
"field0":"Organization Name",

&#x20;              "field1":"Address line 1",

&#x20;              "field2":"Address line 2",

&#x20;              "field3":"Address line 3",

&#x20;              "field4":"Postal code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Contact person",

&#x20;              "field7":"test@mail.ru",

&#x20;              "field8":"Telephone",

&#x20;              "field9":"Fax",

&#x20;              "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;              "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" %}
"field0":"Family Name (surname)",

&#x20;              "field1":"Other (Given) Names",

&#x20;              "field2":"Title",

&#x20;              "field3":"test@mail.ru",

&#x20;              "field4":"Telephone",

&#x20;              "field5":"Fax",

&#x20;              "type":"fb8c1458-e86f-444a-a408-665149bda777",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyID" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}


[https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty](https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="id" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="proof" %}
{

&#x20;        "type":"Ed25519Signature2018",

&#x20;        "created":"2022-04-29T14:31:39Z",

&#x20;        "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",

&#x20;        "proofPurpose":"assertionMethod",

&#x20;        "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..I1EzRS7Ct-CaDMaNYuMKi\_GseppZm9jtIJMZbilchmWlV7W3mNsapSSche8UzAWYfKnhwjQuwvlMr0c8HlVEBQ"

&#x20;     }
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:31:57.918Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:31:57.918Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
registrant
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyID" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
create_application(db)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;     "status":"Approved"

&#x20;  },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
\#762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651242715.948867898
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topidId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
null
{% endswagger-parameter %}

{% swagger-parameter in="body" name="__sourceTag__" %}
registrants_source(need_approve)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### User (CREATE DEVICE)

BLOCK : create\_device\_form

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/3db29027-8753-4e7f-af40-ca31b72ce95c" summary="Creating Device" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="field0" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field1" %}
2022-04-08
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" %}
Is the Registrant also the owner of the Device? (provide evidence)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" %}
&#x20;        "field0":"Organization Name",

&#x20;        "field1":"Address line 1",

&#x20;        "field2":"Address line 2",

&#x20;        "field3":"Address line 3",

&#x20;        "field4":"Postal code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Contact person",

&#x20;        "field7":"test@mail.ru",

&#x20;        "field8":"Telephone",

&#x20;        "field9":"Fax",

&#x20;        "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;        "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;        ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field4" %}
&#x20;        "field0":"Device Name",

&#x20;        "field1":"Address",

&#x20;        "field2":"Postal code",

&#x20;        "field3":"Country",

&#x20;        "field4":"Longitude",

&#x20;        "field5":"Latitude",

&#x20;        "field6":"TSO’s ID for measurement point",

&#x20;        "field7":1,

&#x20;        "field8":1,

&#x20;        "field9":"2022-04-29",

&#x20;        "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;        "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;        "field12":"Expected form of volume evidence",

&#x20;        "field13":"If other please specify",

&#x20;        "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;        ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field5" %}
&#x20;        "field0":"Energy Source (Input) – see Appendix 2",

&#x20;        "field1":"Technology – see Appendix 2",

&#x20;        "field2":true,

&#x20;        "field3":"If yes give details",

&#x20;        "field4":true,

&#x20;        "field5":"If yes give details",

&#x20;        "field6":"Please give details of how the site can import electricity by means other than through the meter(s) specified above",

&#x20;        "field7":"Please give details (including registration id) of any carbon offset or energy tracking scheme for which the Production Device is registered. State ‘None’ if that is the case",

&#x20;        "field8":"Please identify any labeling schemes for which the Device is accredited",

&#x20;        "field9":true,

&#x20;        "field10":"If public (government) funding has been received when did/will it finish?",

&#x20;        "field11":"2022-04-29",

&#x20;        "field12":"Preferred I-REC Device Verifier",

&#x20;        "type":"d7a15512-bb46-4826-864d-1e37bf7b321f",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;        ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}


[https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i](https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="ref" %}
&#x20;     "id":"626bf76ad24497fe1b1e4140",

&#x20;     "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "hash":"BQTRbH4qtRfAXWW8T7EAa5vEncnNEEnaj8CT2ax7YJBs",

&#x20;     "document":{

&#x20;        "id":"849228e1-4c7d-4bf4-8eb4-df1f3c24429b",

&#x20;        "type":\[

&#x20;           "VerifiableCredential"

&#x20;        ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name="issuer" %}
did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531
{% endswagger-parameter %}

{% swagger-parameter in="body" name="issuanceDate" %}
2022-04-29T14:34:10.327Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}


[https://www.w3.org/2018/credentials/v1](https://www.w3.org/2018/credentials/v1)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="credentialSubject" %}
"field0":"2022-04-01",

&#x20;              "field1":{

&#x20;                 "field0":"Applicant Legal Name",

&#x20;                 "field1":"Registered address line 1",

&#x20;                 "field2":"Registered address line 2",

&#x20;                 "field3":"Registered address line 3",

&#x20;                 "field4":"Postal (ZIP) code",

&#x20;                 "field5":"Country",

&#x20;                 "field6":"Legal Status",

&#x20;                 "field7":"Country of company registration/private residence",

&#x20;                 "field8":"Corporate registration number/passport number",

&#x20;                 "field9":"VAT number",

&#x20;                 "field10":"Website URL",

&#x20;                 "field11":"Main business (e.g. food retailer)",

&#x20;                 "field12":2022,

&#x20;                 "field13":1,

&#x20;                 "field14":"Name of the Chief Executive Officer/General Manager",

&#x20;                 "field15":"Chief Executive Officer/General Manager passport number",

&#x20;                 "field16":"Please state in which countries the organization is active",

&#x20;                 "field17":"Please list the main (>10%) shareholders",

&#x20;                 "field18":1,

&#x20;                 "field19":"test@mail.ru",

&#x20;                 "type":"4510d95d-ed9d-4785-a5ed-5c1e334611dd",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;                 ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" %}
"field0":"Organization Name",

&#x20;                 "field1":"Address line 1",

&#x20;                 "field2":"Address line 2",

&#x20;                 "field3":"Address line 3",

&#x20;                 "field4":"Postal code",

&#x20;                 "field5":"Country",

&#x20;                 "field6":"Contact person",

&#x20;                 "field7":"test@mail.ru",

&#x20;                 "field8":"Telephone",

&#x20;                 "field9":"Fax",

&#x20;                 "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;                 "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;                 ]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" %}
"field0":"Family Name (surname)",

&#x20;                 "field1":"Other (Given) Names",

&#x20;                 "field2":"Title",

&#x20;                 "field3":"test@mail.ru",

&#x20;                 "field4":"Telephone",

&#x20;                 "field5":"Fax",

&#x20;                 "type":"fb8c1458-e86f-444a-a408-665149bda777",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;                 ]

&#x20;              },

&#x20;              "policyId":"626bf178d24497fe1b1e4139",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreighh26v7eg7xsfzie674yhgz4ph3wf5yjadbec4wynyfevoshtdty"

&#x20;              ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name="id" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="proof" %}
&#x20;

&#x20;           "type":"Ed25519Signature2018",

&#x20;           "created":"2022-04-29T14:34:10Z",

&#x20;           "verificationMethod":"did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531#did-root-key",

&#x20;           "proofPurpose":"assertionMethod",

&#x20;           "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rjry6W0iAoXzRx7Upb6hxeu0LbxjuNwDULq2p4IIQsOFwY5h4zxBCOVZIGmwIJ\_xY2a0V0-pyX1xTwTUV8aPDQ"

&#x20;        }
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:34:18.048Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:34:18.048Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
registrant(Approved)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
save_copy_application
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;        "status":"Approved"

&#x20;     },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
\#762694d6-8fbb-4377-ae3e-ef400bbc3ea5&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651242856.179215415
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topicId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
&#x20;\[

&#x20;        "1651242715.948867898"

&#x20;     ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name=""__sourceTag__" %}
current_registrant
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Get Device to Approve)

#### Make GET request and get data\[i] and change option.status = “Approved”:

BLOCK : approve\_devices\_grid

{% swagger method="get" path="" baseUrl="/policies/626c0490d24497fe1b1e415d/blocks/2d99bfd9-38d3-4777-abda-f1ea5cecb613" summary="Submitting Device for Approval" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   "data":[
      {
         "id":"626c056cd24497fe1b1e4163",
         "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
         "hash":"GkX1mNd5wxWKCdkBYC6PBGHm9jmkNzsjb9ycqcP4jgPb",
         "document":{
            "id":"9d537f1d-c906-4013-9ac6-c6a0fd211e4a",
            "type":[
               "VerifiableCredential"
            ],
            "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
            "issuanceDate":"2022-04-29T15:33:48.168Z",
            "@context":[
               "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject":[
               {
                  "field0":"2022-04-08",
                  "field1":{
                     "field0":"Applicant Legal Name",
                     "field1":"Registered address line 1",
                     "field2":"Registered address line 2",
                     "field3":"Registered address line 3",
                     "field4":"Postal (ZIP) code",
                     "field5":"Country",
                     "field6":"Legal Status",
                     "field7":"Country of company registration/private residence",
                     "field8":"Corporate registration number/passport number",
                     "field9":"VAT number",
                     "field10":"Website URL",
                     "field11":"Main business (e.g. food retailer)",
                     "field12":1,
                     "field13":1,
                     "field14":"Name of the Chief Executive Officer/General Manager",
                     "field15":"Chief Executive Officer/General Manager passport number",
                     "field16":"Please state in which countries the organization is active",
                     "field17":"Please list the main (>10%) shareholders",
                     "field18":1,
                     "field19":"test@mail.ru",
                     "type":"f7bd122d-4220-4d9d-abb2-fa9366e79975",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field2":{
                     "field0":"Organization Name",
                     "field1":"Address line 1",
                     "field2":"Address line 2",
                     "field3":"Address line 3",
                     "field4":"Postal code",
                     "field5":"Country",
                     "field6":"Contact person",
                     "field7":"test@mail.ru",
                     "field8":"Telephone",
                     "field9":"Fax",
                     "field10":"Existing I-REC Registry organization(s) to become subsidiary",
                     "type":"a68073e6-bf56-43e3-99c4-5b433c983654",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "field3":{
                     "field0":"Family Name (surname)",
                     "field1":"Other (Given) Names",
                     "field2":"Title",
                     "field3":"test@mail.ru",
                     "field4":"Telephone",
                     "field5":"Fax",
                     "type":"9dca2898-d548-48a4-beec-fefd308f93cf",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                     ]
                  },
                  "policyId":"626c0490d24497fe1b1e415d",
                  "@context":[
                     "https://ipfs.io/ipfs/bafkreiess6ak6lwlhar55ezckdwo6y7ki3wlyzyl3a7tadda2zuqaxwmbm"
                  ],
                  "id":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
                  "type":"7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0"
               }
            ],
            "proof":{
               "type":"Ed25519Signature2018",
               "created":"2022-04-29T15:33:48Z",
               "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",
               "proofPurpose":"assertionMethod",
               "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GaOyMZ9dR5J0-iu6SICVNlWifON3DT0ytz2z_eCHeOSRY5oQ7Jb3219G7aUrztIEppMcfzG6teO-YvuNPiAfBw"
            }
         },
         "createDate":"2022-04-29T15:34:04.021Z",
         "updateDate":"2022-04-29T15:34:04.021Z",
         "hederaStatus":"ISSUE",
         "signature":0,
         "type":"registrant",
         "policyId":"626c0490d24497fe1b1e415d",
         "tag":"create_application(db)",
         "option":{
            "status":"Waiting for approval"
         },
         "schema":"#7b652d73-5978-45b4-992e-cc3ce732e27a&1.0.0",
         "messageId":"1651246443.516813000",
         "topicId":"0.0.34352381",
         "relationships":[
            
         ],
         "__sourceTag__":"registrants_source(need_approve)"
      }
   ],
   "blocks":[
      
   ],
   "commonAddons":[
      {
         "id":"c0dbe6b1-6963-4010-9dc4-c676679376dd",
         "blockType":"documentsSourceAddon"
      },
      {
         "id":"540a115b-a94e-4d16-af46-e4b817f07b98",
         "blockType":"documentsSourceAddon"
      }
   ],
   "fields":[
      {
         "title":"Legal Name",
         "name":"document.credentialSubject.0.field1.field0",
         "type":"text"
      },
      {
         "title":"Organization Name",
         "name":"document.credentialSubject.0.field2.field0",
         "type":"text"
      },
      {
         "title":"Operation",
         "name":"option.status",
         "type":"text",
         "width":"250px",
         "bindGroup":"registrants_source(approved)",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":""
      },
      {
         "title":"Operation",
         "name":"option.status",
         "tooltip":"",
         "type":"block",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":"approve_registrant_btn",
         "width":"250px",
         "bindGroup":"registrants_source(need_approve)"
      },
      {
         "name":"document",
         "title":"Document",
         "tooltip":"",
         "type":"button",
         "action":"dialog",
         "content":"View Document",
         "uiClass":"link",
         "dialogContent":"VC",
         "dialogClass":"",
         "dialogType":"json"
      }
   ]
}

```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Approve Device)

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/918a113d-a88b-4595-806e-823e4fbb8bf6" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="id" %}
626bf826d24497fe1b1e4144
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
2qUPLPToSW3S33DAyY2wyJe5YPpWNuZKLLhTZRBowCAn
{% endswagger-parameter %}

{% swagger-parameter in="body" name="id" %}
c48ffb77-58d9-4809-aaa9-ff80950142ea
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
&#x20;\[

&#x20;        "VerifiableCredential"

&#x20;     ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name="issuer" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="issuanceDate" %}
2022-04-29T14:37:18.619Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}
&#x20;

\[         "https://www.w3.org/2018/credentials/v1"

&#x20;     ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name="credentialSubject" %}
":\[

&#x20;        {

&#x20;           "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "field1":"2022-04-08",

&#x20;           "field2":"Is the Registrant also the owner of the Device? (provide evidence)",

&#x20;           "field3":{

&#x20;              "field0":"Organization Name",

&#x20;              "field1":"Address line 1",

&#x20;              "field2":"Address line 2",

&#x20;              "field3":"Address line 3",

&#x20;              "field4":"Postal code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Contact person",

&#x20;              "field7":"test@mail.ru",

&#x20;              "field8":"Telephone",

&#x20;              "field9":"Fax",

&#x20;              "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;              "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ]

&#x20;           },

&#x20;           "field4":{

&#x20;              "field0":"Device Name",

&#x20;              "field1":"Address",

&#x20;              "field2":"Postal code",

&#x20;              "field3":"Country",

&#x20;              "field4":"Longitude",

&#x20;              "field5":"Latitude",

&#x20;              "field6":"TSO’s ID for measurement point",

&#x20;              "field7":1,

&#x20;              "field8":1,

&#x20;              "field9":"2022-04-29",

&#x20;              "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;              "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;              "field12":"Expected form of volume evidence",

&#x20;              "field13":"If other please specify",

&#x20;              "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ]

&#x20;           },

&#x20;           "field5":{

&#x20;              "field0":"Energy Source (Input) – see Appendix 2",

&#x20;              "field1":"Technology – see Appendix 2",

&#x20;              "field2":true,

&#x20;              "field3":"If yes give details",

&#x20;              "field4":true,

&#x20;              "field5":"If yes give details",

&#x20;              "field6":"Please give details of how the site can import electricity by means other than through the meter(s) specified above",

&#x20;              "field7":"Please give details (including registration id) of any carbon offset or energy tracking scheme for which the Production Device is registered. State ‘None’ if that is the case",

&#x20;              "field8":"Please identify any labeling schemes for which the Device is accredited",

&#x20;              "field9":true,

&#x20;              "field10":"If public (government) funding has been received when did/will it finish?",

&#x20;              "field11":"2022-04-29",

&#x20;              "field12":"Preferred I-REC Device Verifier",

&#x20;              "type":"d7a15512-bb46-4826-864d-1e37bf7b321f",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;              ]

&#x20;           },

&#x20;           "ref":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "policyId":"626bf178d24497fe1b1e4139",

&#x20;           "@context":\[

&#x20;              "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;           ],

&#x20;           "id":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;           "type":"4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0"

&#x20;        }

&#x20;     ],

&#x20;     "proof":{

&#x20;        "type":"Ed25519Signature2018",

&#x20;        "created":"2022-04-29T14:37:18Z",

&#x20;        "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",

&#x20;        "proofPurpose":"assertionMethod",

&#x20;        "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..fH8UEbWTElaBYZ-mznxFndkZU29h45Px1BL8lwzL73PUpmDeDEc2iJINx6Kmh\_uxcMpm7lhkf9JKQxADEl5-Dg"

&#x20;     }

&#x20;  },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:37:26.605Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:37:26.605Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
device
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
create_device
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;     "status":"Approved"

&#x20;  },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
\#4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651243044.613728925
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topicId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
\[

&#x20;     "1651242856.179215415

]
{% endswagger-parameter %}

{% swagger-parameter in="body" name="__sourceTag__" %}
approve_devices_source(need_approve)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### User (CREATE ISSUE)

BLOCK : create\_issue\_request\_form

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/8bd8c3da-043a-4ef0-8bb4-10f60bd80832" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="field0" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field1" %}
did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field2" %}
{

&#x20;        "field0":"Organization Name",

&#x20;        "field1":"Address line 1",

&#x20;        "field2":"Address line 2",

&#x20;        "field3":"Address line 3",

&#x20;        "field4":"Postal code",

&#x20;        "field5":"Country",

&#x20;        "field6":"Contact person",

&#x20;        "field7":"test@mail.ru",

&#x20;        "field8":"Telephone",

&#x20;        "field9":"Fax",

&#x20;        "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;        "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;        ]

&#x20;     },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field3" %}
":{

&#x20;        "field0":"Device Name",

&#x20;        "field1":"Address",

&#x20;        "field2":"Postal code",

&#x20;        "field3":"Country",

&#x20;        "field4":"Longitude",

&#x20;        "field5":"Latitude",

&#x20;        "field6":"TSO’s ID for measurement point",

&#x20;        "field7":1,

&#x20;        "field8":1,

&#x20;        "field9":"2022-04-29",

&#x20;        "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;        "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;        "field12":"Expected form of volume evidence",

&#x20;        "field13":"If other please specify",

&#x20;        "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;        "@context":\[

&#x20;           "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;        ]

&#x20;     },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field4" %}
labeling scheme(s)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field5" %}
2022-04-29
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field6" %}
2022-04-29
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field7" %}
1
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field8" %}
2022-04-29
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field9" %}
1
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field10" %}
Type a: Settlement Metering data
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field11" %}
Type b: Non-settlement Metering data
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field12" %}
Type c: Measured Volume Transfer documentation
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field13" %}
Type d: Other
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field14" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field15" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field16" %}
true
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field17" %}
Installer
{% endswagger-parameter %}

{% swagger-parameter in="body" name="field18" %}
0.0.34235315
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
88f6b2ad-5945-4086-b15c-8181654948c8&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}


[https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq](https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="id" %}
626bf95ed24497fe1b1e414
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
Gq2osAVHzB6LpFEDXKQkeVbpcteV7pBDdFhL93SmyPt7
{% endswagger-parameter %}

{% swagger-parameter in="body" name="credentialSubject" %}
&#x20;

&#x20;           {

&#x20;              "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;              "field1":"2022-04-08",

&#x20;              "field2":"Is the Registrant also the owner of the Device? (provide evidence)",

&#x20;              "field3":{

&#x20;                 "field0":"Organization Name",

&#x20;                 "field1":"Address line 1",

&#x20;                 "field2":"Address line 2",

&#x20;                 "field3":"Address line 3",

&#x20;                 "field4":"Postal code",

&#x20;                 "field5":"Country",

&#x20;                 "field6":"Contact person",

&#x20;                 "field7":"test@mail.ru",

&#x20;                 "field8":"Telephone",

&#x20;                 "field9":"Fax",

&#x20;                 "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;                 "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;                 ]

&#x20;              },

&#x20;              "field4":{

&#x20;                 "field0":"Device Name",

&#x20;                 "field1":"Address",

&#x20;                 "field2":"Postal code",

&#x20;                 "field3":"Country",

&#x20;                 "field4":"Longitude",

&#x20;                 "field5":"Latitude",

&#x20;                 "field6":"TSO’s ID for measurement point",

&#x20;                 "field7":1,

&#x20;                 "field8":1,

&#x20;                 "field9":"2022-04-29",

&#x20;                 "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;                 "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;                 "field12":"Expected form of volume evidence",

&#x20;                 "field13":"If other please specify",

&#x20;                 "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;                 ]

&#x20;              },

&#x20;              "field5":{

&#x20;                 "field0":"Energy Source (Input) – see Appendix 2",

&#x20;                 "field1":"Technology – see Appendix 2",

&#x20;                 "field2":true,

&#x20;                 "field3":"If yes give details",

&#x20;                 "field4":true,

&#x20;                 "field5":"If yes give details",

&#x20;                 "field6":"Please give details of how the site can import electricity by means other than through the meter(s) specified above",

&#x20;                 "field7":"Please give details (including registration id) of any carbon offset or energy tracking scheme for which the Production Device is registered. State ‘None’ if that is the case",

&#x20;                 "field8":"Please identify any labeling schemes for which the Device is accredited",

&#x20;                 "field9":true,

&#x20;                 "field10":"If public (government) funding has been received when did/will it finish?",

&#x20;                 "field11":"2022-04-29",

&#x20;                 "field12":"Preferred I-REC Device Verifier",

&#x20;                 "type":"d7a15512-bb46-4826-864d-1e37bf7b321f",

&#x20;                 "@context":\[

&#x20;                    "https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i"

&#x20;                 ]

&#x20;              },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="ref" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="@context" %}


[https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i](https://ipfs.io/ipfs/bafkreicra2ajpwjpukzhch3ienkqcyzi7fnnjwp65nom6vq25lwra6gx4i)


{% endswagger-parameter %}

{% swagger-parameter in="body" name="id" %}
did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="proof" %}
{

&#x20;           "type":"Ed25519Signature2018",

&#x20;           "created":"2022-04-29T14:42:27Z",

&#x20;           "verificationMethod":"did:hedera:testnet:A7cP5xLNaF5LPtXkDUTsP6fATh4uarAjCujnZ3qR2vcw;hedera:testnet:tid=0.0.34349531#did-root-key",

&#x20;           "proofPurpose":"assertionMethod",

&#x20;           "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..\_o526p84cDF4qa1z5obliK-9WGVxsadhtCIIlq8fnjTiiOlYk54lrBZ4EeOw5xJ7DTMJ2ukLEp3PvTKVqIL3CQ"

&#x20;        }

&#x20;     },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="createDate" %}
2022-04-29T14:42:38.469Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="updateDate" %}
2022-04-29T14:42:38.469Z
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hederaStatus" %}
ISSUE
{% endswagger-parameter %}

{% swagger-parameter in="body" name="signature" %}
0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="type" %}
device(Approved)
{% endswagger-parameter %}

{% swagger-parameter in="body" name="policyId" %}
626bf178d24497fe1b1e4139
{% endswagger-parameter %}

{% swagger-parameter in="body" name="tag" %}
save_copy_device
{% endswagger-parameter %}

{% swagger-parameter in="body" name="option" %}
{

&#x20;        "status":"Approved"

&#x20;     },
{% endswagger-parameter %}

{% swagger-parameter in="body" name="schema" %}
4713cc2e-4036-49b6-ba19-6475ed590c33&1.0.0
{% endswagger-parameter %}

{% swagger-parameter in="body" name="messageId" %}
1651243356.729744000
{% endswagger-parameter %}

{% swagger-parameter in="body" name="topicId" %}
0.0.34350746
{% endswagger-parameter %}

{% swagger-parameter in="body" name="relationships" %}
\[

&#x20;        "1651243044.613728925"

&#x20;     ],
{% endswagger-parameter %}

{% swagger-parameter in="body" name="__sourceTag__" %}
devices_source(approved)
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (GET ISSUE TO APPROVE)

#### Make GET request and get data\[i] and change option.status = “Approved”:

BLOCK issue\_requests\_grid(evident)

{% swagger method="get" path="" baseUrl="/policies/626c0490d24497fe1b1e415d/blocks/4838bdc7-f141-4c64-a5e0-a40c2b268766" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
   "data":[
      {
         "id":"626c0a7cd24497fe1b1e416c",
         "owner":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
         "hash":"44XX8ok6Y9gy6FRaTzQzaewDGPLqArqvAaWKQBrXKNqi",
         "document":{
            "id":"2d20d104-35ad-49f5-8530-7444e3228c13",
            "type":[
               "VerifiableCredential"
            ],
            "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
            "issuanceDate":"2022-04-29T15:55:31.487Z",
            "@context":[
               "https://www.w3.org/2018/credentials/v1"
            ],
            "credentialSubject":[
               {
                  "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",
                  "field1":"did:hedera:testnet:HyjFdpTRX2mBpiHuHHWb45hMsGejYCS6Njecy2YBXEfu;hedera:testnet:tid=0.0.34352260",
                  "field2":{
                     "field0":"Organization Name",
                     "field1":"Address line 1",
                     "field2":"Address line 2",
                     "field3":"Address line 3",
                     "field4":"Postal code",
                     "field5":"Country",
                     "field6":"Contact person",
                     "field7":"test@mail.ru",
                     "field8":"Telephone",
                     "field9":"Fax",
                     "field10":"Existing I-REC Registry organization(s) to become subsidiary",
                     "type":"a68073e6-bf56-43e3-99c4-5b433c983654",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreidnvwylajvvgaza7fxg57fjf5dvdbgvylfkw3tsxjlbiffincxsdq"
                     ]
                  },
                  "field3":{
                     "field0":"Device Name",
                     "field1":"Address",
                     "field2":"Postal code",
                     "field3":"Country",
                     "field4":"Longitude",
                     "field5":"Latitude",
                     "field6":"TSO’s ID for measurement point",
                     "field7":1,
                     "field8":1,
                     "field9":"2022-04-29",
                     "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",
                     "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",
                     "field12":"Expected form of volume evidence",
                     "field13":"If other please specify",
                     "type":"a35f095b-ebc6-4006-a551-1f1d22c329b8",
                     "@context":[
                        "https://ipfs.io/ipfs/bafkreidnvwylajvvgaza7fxg57fjf5dvdbgvylfkw3tsxjlbiffincxsdq"
                     ]
                  },
                  "field4":"labeling scheme(s)",
                  "field5":"2022-04-29",
                  "field6":"2022-04-29",
                  "field7":1,
                  "field8":"2022-04-29",
                  "field9":1,
                  "field10":"Type a: Settlement Metering data",
                  "field11":"Type b: Non-settlement Metering data",
                  "field12":"Type c: Measured Volume Transfer documentation",
                  "field13":"Type d: Other",
                  "field14":true,
                  "field15":true,
                  "field16":true,
                  "field17":"Installer",
                  "field18":"0.0.34235315",
                  "ref":"did:hedera:testnet:HyjFdpTRX2mBpiHuHHWb45hMsGejYCS6Njecy2YBXEfu;hedera:testnet:tid=0.0.34352260",
                  "policyId":"626c0490d24497fe1b1e415d",
                  "@context":[
                     "https://ipfs.io/ipfs/bafkreidnvwylajvvgaza7fxg57fjf5dvdbgvylfkw3tsxjlbiffincxsdq"
                  ],
                  "id":"3d31e722-7a17-4f13-a66d-c21c0042b6d3",
                  "type":"c8a8aae3-2125-4872-9396-ac6b4dba8c2f&1.0.0"
               }
            ],
            "proof":{
               "type":"Ed25519Signature2018",
               "created":"2022-04-29T15:55:31Z",
               "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",
               "proofPurpose":"assertionMethod",
               "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..2MmXAW9khzXExyU2NVfBWTAQxro_eLWO6zxyABGb2nWvdsg5RcjmV-e_8HggxclU9wVECDW337gVFv_hkT0ZBA"
            }
         },
         "createDate":"2022-04-29T15:55:40.477Z",
         "updateDate":"2022-04-29T15:55:40.477Z",
         "hederaStatus":"ISSUE",
         "signature":0,
         "type":"issue_request",
         "policyId":"626c0490d24497fe1b1e415d",
         "tag":"create_issue_request",
         "option":{
            "status":"Waiting for approval"
         },
         "schema":"#c8a8aae3-2125-4872-9396-ac6b4dba8c2f&1.0.0",
         "messageId":"1651247740.133346000",
         "topicId":"0.0.34352381",
         "relationships":[
            "1651247655.671887000"
         ],
         "__sourceTag__":"issue_requests_source(need_approve)"
      }
   ],
   "blocks":[
      
   ],
   "commonAddons":[
      {
         "id":"03aa71e0-8c5c-4685-aac4-250f4bd72206",
         "blockType":"documentsSourceAddon"
      },
      {
         "id":"cdcf0d38-f2a0-4678-95bb-5489d65b3dec",
         "blockType":"documentsSourceAddon"
      }
   ],
   "fields":[
      {
         "title":"Organization Name",
         "name":"document.credentialSubject.0.field2.field0",
         "type":"text"
      },
      {
         "title":"Production Period Start Date",
         "name":"document.credentialSubject.0.field6",
         "type":"text"
      },
      {
         "title":"Production Period End Date",
         "name":"document.credentialSubject.0.field8",
         "type":"text"
      },
      {
         "title":"Total kWh Produced in this period",
         "name":"document.credentialSubject.0.field7",
         "type":"text"
      },
      {
         "title":"Date",
         "name":"document.issuanceDate",
         "type":"text"
      },
      {
         "name":"option.status",
         "title":"Operation",
         "type":"text",
         "width":"250px",
         "bindGroup":"issue_requests_source(approved)",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":""
      },
      {
         "title":"Operation",
         "name":"option.status",
         "tooltip":"",
         "type":"block",
         "action":"",
         "url":"",
         "dialogContent":"",
         "dialogClass":"",
         "dialogType":"",
         "bindBlock":"approve_issue_requests_btn",
         "width":"250px",
         "bindGroup":"issue_requests_source(need_approve)"
      },
      {
         "name":"document",
         "title":"Document",
         "tooltip":"",
         "type":"button",
         "action":"dialog",
         "content":"View Document",
         "uiClass":"link",
         "dialogContent":"VC",
         "dialogClass":"",
         "dialogType":"json"
      }
   ]
}

```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Approve Issue)

BLOCK approve\_issue\_requests\_btn

{% swagger method="post" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/4185c3b7-f200-4219-a503-17c84fea752f" summary="Approving Issue" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="id" %}
626bf9e1d24497fe1b1e4148
{% endswagger-parameter %}

{% swagger-parameter in="body" name="owner" %}
did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316
{% endswagger-parameter %}

{% swagger-parameter in="body" name="hash" %}
9Ny3w8HaH6ukaUnRgKrdWadbRM1by5rgn2nS8MQLJipm
{% endswagger-parameter %}

{% swagger-parameter in="body" name="document" %}
&#x20;

&#x20;     "id":"e676b23e-61b9-4243-98fc-349fd9708d67",

&#x20;     "type":\[

&#x20;        "VerifiableCredential"

&#x20;     ],

&#x20;     "issuer":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;     "issuanceDate":"2022-04-29T14:44:38.373Z",

&#x20;     "@context":\[

&#x20;        "https://www.w3.org/2018/credentials/v1"

&#x20;     ],

&#x20;     "credentialSubject":\[

&#x20;        {

&#x20;           "field0":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316",

&#x20;           "field1":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;           "field2":{

&#x20;              "field0":"Organization Name",

&#x20;              "field1":"Address line 1",

&#x20;              "field2":"Address line 2",

&#x20;              "field3":"Address line 3",

&#x20;              "field4":"Postal code",

&#x20;              "field5":"Country",

&#x20;              "field6":"Contact person",

&#x20;              "field7":"test@mail.ru",

&#x20;              "field8":"Telephone",

&#x20;              "field9":"Fax",

&#x20;              "field10":"Existing I-REC Registry organization(s) to become subsidiary",

&#x20;              "type":"56ce048d-8e24-4aec-b76d-802688f651e8",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;              ]

&#x20;           },

&#x20;           "field3":{

&#x20;              "field0":"Device Name",

&#x20;              "field1":"Address",

&#x20;              "field2":"Postal code",

&#x20;              "field3":"Country",

&#x20;              "field4":"Longitude",

&#x20;              "field5":"Latitude",

&#x20;              "field6":"TSO’s ID for measurement point",

&#x20;              "field7":1,

&#x20;              "field8":1,

&#x20;              "field9":"2022-04-29",

&#x20;              "field10":"Owner of the network to which the Production Device is connected and the voltage of that connection",

&#x20;              "field11":"If the Production Device is not connected directly to the grid, specify the circumstances, and additional relevant meter registration numbers",

&#x20;              "field12":"Expected form of volume evidence",

&#x20;              "field13":"If other please specify",

&#x20;              "type":"fd49e6e4-58d7-425a-9518-9a2c4a178b15",

&#x20;              "@context":\[

&#x20;                 "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;              ]

&#x20;           },

&#x20;           "field4":" labeling scheme(s)",

&#x20;           "field5":"2022-04-29",

&#x20;           "field6":"2022-04-29",

&#x20;           "field7":1,

&#x20;           "field8":"2022-04-29",

&#x20;           "field9":1,

&#x20;           "field10":"Type a: Settlement Metering data",

&#x20;           "field11":"Type b: Non-settlement Metering data",

&#x20;           "field12":"Type c: Measured Volume Transfer documentation",

&#x20;           "field13":"Type d: Other",

&#x20;           "field14":true,

&#x20;           "field15":true,

&#x20;           "field16":true,

&#x20;           "field17":"Installer",

&#x20;           "field18":"0.0.34235315",

&#x20;           "ref":"did:hedera:testnet:2PNs5TABEKMm7WNMSLrFQDSaBqkhppjPqcj9ovkbzkrq;hedera:testnet:tid=0.0.34350724",

&#x20;           "policyId":"626bf178d24497fe1b1e4139",

&#x20;           "@context":\[

&#x20;              "https://ipfs.io/ipfs/bafkreigth2xnezvhywqijetrzvi6czxvfduyfn5f7cbln7n5u6kds2vypq"

&#x20;           ],

&#x20;           "id":"a69c8c0e-6fcd-4c63-b4a6-57b44cff63db",

&#x20;           "type":"88f6b2ad-5945-4086-b15c-8181654948c8&1.0.0"

&#x20;        }

&#x20;     ],

&#x20;     "proof":{

&#x20;        "type":"Ed25519Signature2018",

&#x20;        "created":"2022-04-29T14:44:38Z",

&#x20;        "verificationMethod":"did:hedera:testnet:CV94CdDeDK5J361y1ocNMVxVbYjRZvSJChDkKCz88my;hedera:testnet:tid=0.0.34235316#did-root-key",

&#x20;        "proofPurpose":"assertionMethod",

&#x20;        "jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..rEWtgLl9X\_t2EdAYZhKE2ITptj9wEnihu1DhDPLoBBVZN7aV-bgedyDYYOLigPxV580gfm6NJztq\_wXFC4noAA"

&#x20;     }

&#x20;  },

&#x20;  "createDate":"2022-04-29T14:44:49.331Z",

&#x20;  "updateDate":"2022-04-29T14:44:49.331Z",

&#x20;  "hederaStatus":"ISSUE",

&#x20;  "signature":0,

&#x20;  "type":"issue\_request",

&#x20;  "policyId":"626bf178d24497fe1b1e4139",

&#x20;  "tag":"create\_issue\_request",

&#x20;  "option":{

&#x20;     "status":"Approved"

&#x20;  },

&#x20;  "schema":"#88f6b2ad-5945-4086-b15c-8181654948c8&1.0.0",

&#x20;  "messageId":"1651243487.331059459",

&#x20;  "topicId":"0.0.34350746",

&#x20;  "relationships":\[

&#x20;     "1651243356.729744000"

&#x20;  ],

&#x20;  "\_\_sourceTag\_\_":"issue\_requests\_source(need\_approve)"

}
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}

### Root Authority (Get TrustChain)

BLOCK trustChainBlock

{% swagger method="get" path="" baseUrl="/policies/626bf178d24497fe1b1e4139/blocks/61235b3d-b793-4363-b51d-62df371493cd" summary="Displaying TrustChain" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```javascript
{
    // Response
}
```
{% endswagger-response %}
{% endswagger %}
