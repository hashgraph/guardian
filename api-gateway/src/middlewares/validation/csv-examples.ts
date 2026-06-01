export const CsvObjectExamples = {
    COMPARE_POLICIES_EXPORT_CSV_RESPONSE: `data:text/csv;charset=utf-8;"Policy 1"
"Policy ID","Policy Name","Policy Description","Policy Topic","Policy Version"
"69b98f573ac44dc8f6b50b66","Test_Policy_2","","",""

"Policy 2"
"Policy ID","Policy Name","Policy Description","Policy Topic","Policy Version"
"69b98d6a3ac44dc8f6b50b03","Test_Policy_1","","",""

"Policy Roles"
"Name","Name","Total Rate"

"Policy Groups"
"Name","Name","Total Rate"

"Policy Topics"
"Name","Name","Total Rate"

"Policy Tokens"
"Name","Name","Total Rate"

"Policy Tools"
"Name","Name","Total Rate"

"Policy Blocks"
"Offset","Index","Type","Tag","Index","Type","Tag","Index Rate","Permission Rate","Prop Rate","Event Rate","Artifact Rate","Total Rate"
"1","1","interfaceContainerBlock","","1","interfaceContainerBlock","","100%","100%","80%","100%","100%","95%"
"2","1","interfaceContainerBlock","Block_1","1","interfaceContainerBlock","Block_1","100%","100%","83%","0%","100%","70%"
"2","","","","2","interfaceContainerBlock","Block_2","-","-","-","-","-","-"

"Total","66%"`,

    COMPARE_MODULES_EXPORT_CSV_RESPONSE: `data:text/csv;charset=utf-8;"Module 1"
"Module ID","Module Name","Module Description"
"69baa4cf63637d350db5b59c","Module_1","Some specific module for test purposes"

"Module 2"
"Module ID","Module Name","Module Description"
"69baa4b563637d350db5b594","test",""

"Module Input Events"
"Name","Name","Total Rate"

"Module Output Events"
"Name","Name","Total Rate"
"","VC","-"

"Module Variables"
"Name","Name","Total Rate"
"","schema","-"

"Module Blocks"
"Offset","Index","Type","Tag","Index","Type","Tag","Index Rate","Permission Rate","Prop Rate","Event Rate","Artifact Rate","Total Rate"
"1","1","module","Module","1","module","Module","100%","100%","20%","100%","100%","80%"
"2","1","interfaceContainerBlock","Block_1","","","","-","-","-","-","-","-"
"2","","","","1","requestVcDocumentBlock","Block_1","-","-","-","-","-","-"
"2","","","","2","sendToGuardianBlock","Block_2","-","-","-","-","-","-"

"Total","22%"`,

    COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE: `data:text/csv;charset=utf-8;"Schema 1"
"Schema ID","Schema Name","Schema Description","Schema Topic","Schema Version"
"#99b759f6-462d-4d85-97bf-afeb2eedae3d","Date Range","","0.0.8275392","1.0.0"

"Schema 2"
"Schema ID","Schema Name","Schema Description","Schema Topic","Schema Version"
"#32281127-d22c-4997-8821-50b33b3dbf81&1.0.0","Date Range","","0.0.8264592","1.0.0"

"Schema Fields"
"Offset","Index","Field Name","Index","Field Name","Index Rate","Prop Rate","Total Rate"
"1","-1","id","-1","id","100%","100%","100%"
"1","0","field0","0","field0","100%","88%","88%"
"1","1","field1","1","field1","100%","88%","88%"

"Total","92%"`,

    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE: `data:text/csv;charset=utf-8;"Tool 1"
"Tool ID","Tool Name","Tool Description","Tool Hash","Tool Message"
"69b9727a3ac44dc8f6b50a44","Tool 30","","4r7i6SXuDxDrk8dkwomzgkfFp8FqMuWSCsuWqZhhYLZ4","1707417996.173398196"

"Tool 2"
"Tool ID","Tool Name","Tool Description","Tool Hash","Tool Message"
"69b7da936d2f71c7a55b1e99","Tool 21","","71ZWDSX2cUPsye4AuMUqXUhgk1XBDnpi4Ky1mtjYqYom","1706873385.455822873"

"Tool Input Events"
"Name","Name","Total Rate"
"input_tool_30","","-"
"","input_tool_21","-"

"Tool Output Events"
"Name","Name","Total Rate"
"output_tool_30","","-"
"","output_tool_21","-"

"Tool Variables"
"Name","Name","Total Rate"
"Role","Role","100%"

"Tool Blocks"
"Offset","Index","Type","Tag","Index","Type","Tag","Index Rate","Permission Rate","Prop Rate","Event Rate","Artifact Rate","Total Rate"
"1","1","tool","Tool","1","tool","Tool","100%","100%","81%","0%","100%","70%"
"2","1","extractDataBlock","get_tool_30","1","extractDataBlock","get_tool_21","100%","100%","60%","100%","100%","90%"
"2","2","customLogicBlock","calc_tool_30","","","","-","-","-","-","-","-"
"2","3","extractDataBlock","set_tool_30","2","extractDataBlock","set_tool_21","0%","100%","60%","0%","100%","65%"

"Total","35%"`,

    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI: `data:text/csv;charset=utf-8;"Tool 1"
"Tool ID","Tool Name","Tool Description","Tool Hash","Tool Message"
"69b9727a3ac44dc8f6b50a44","Tool 30","","4r7i6SXuDxDrk8dkwomzgkfFp8FqMuWSCsuWqZhhYLZ4","1707417996.173398196"

"Tool 2"
"Tool ID","Tool Name","Tool Description","Tool Hash","Tool Message"
"69b7da936d2f71c7a55b1e99","Tool 21","","71ZWDSX2cUPsye4AuMUqXUhgk1XBDnpi4Ky1mtjYqYom","1706873385.455822873"

"Tool Input Events"
"Name","Name","Total Rate"
"input_tool_30","","-"
"","input_tool_21","-"

"Tool Output Events"
"Name","Name","Total Rate"
"output_tool_30","","-"
"","output_tool_21","-"

"Tool Variables"
"Name","Name","Total Rate"
"Role","Role","100%"

"Tool Blocks"
"Offset","Index","Type","Tag","Index","Type","Tag","Index Rate","Permission Rate","Prop Rate","Event Rate","Artifact Rate","Total Rate"
"1","1","tool","Tool","1","tool","Tool","100%","100%","81%","0%","100%","70%"
"2","1","extractDataBlock","get_tool_30","1","extractDataBlock","get_tool_21","100%","100%","60%","100%","100%","90%"
"2","2","customLogicBlock","calc_tool_30","","","","-","-","-","-","-","-"
"2","3","extractDataBlock","set_tool_30","2","extractDataBlock","set_tool_21","0%","100%","60%","0%","100%","65%"

"Total","35%"

"Tool 3"
"Tool ID","Tool Name","Tool Description","Tool Hash","Tool Message"
"69b7da8d6d2f71c7a55b1e67","Tool 33","","Ceo5z8VkMbYWAcgjhesqGXHzJ9Z6aEdEEGWA4Jq4XE2i","1726593517.484578000"

"Tool Input Events"
"Name","Name","Total Rate"
"input_tool_30","","-"
"","input_tool_33","-"

"Tool Output Events"
"Name","Name","Total Rate"
"output_tool_30","","-"
"","output_tool_33","-"

"Tool Variables"
"Name","Name","Total Rate"
"Role","Role","100%"

"Tool Blocks"
"Offset","Index","Type","Tag","Index","Type","Tag","Index Rate","Permission Rate","Prop Rate","Event Rate","Artifact Rate","Total Rate"
"1","1","tool","Tool","1","tool","Tool","100%","100%","81%","0%","100%","70%"
"2","1","extractDataBlock","get_tool_30","1","extractDataBlock","get_tool_33","100%","100%","60%","100%","100%","90%"
"2","2","customLogicBlock","calc_tool_30","2","customLogicBlock","calc_tool_33","100%","100%","66%","100%","100%","91%"
"2","3","extractDataBlock","set_tool_30","3","extractDataBlock","set_tool_33","100%","100%","60%","0%","100%","65%"

"Total","41%"`,

    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE: `data:text/csv;charset=utf-8;"Document 1"
"Document ID","Document Type","Document Owner","Policy"
"69bade1834a0e18a5386cb9c","VC","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69b9727c3ac44dc8f6b50a8b"

"Document 2"
"Document ID","Document Type","Document Owner","Policy"
"69badb212b76af3f7f759084","VC","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69b7da996d2f71c7a55b1fa3"

"Data"
"Offset","ID","Message","Type","Schema","Owner","ID","Message","Type","Schema","Owner","Document Rate","Options Rate","Total Rate"
"1","69bade1834a0e18a5386cb9c","1773854231.595894000","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69badb212b76af3f7f759084","1773853471.698871273","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","95%","100%","97%"
"2","69baddfe34a0e18a5386cb8b","1773854204.523907802","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69badb092b76af3f7f759073","1773853447.748138817","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","95%","100%","97%"

"Total","97%"`,

    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI: `data:text/csv;charset=utf-8;"Document 1"
"Document ID","Document Type","Document Owner","Policy"
"69bade1834a0e18a5386cb9c","VC","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69b9727c3ac44dc8f6b50a8b"

"Document 2"
"Document ID","Document Type","Document Owner","Policy"
"69badb212b76af3f7f759084","VC","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69b7da996d2f71c7a55b1fa3"

"Data"
"Offset","ID","Message","Type","Schema","Owner","ID","Message","Type","Schema","Owner","Document Rate","Options Rate","Total Rate"
"1","69bade1834a0e18a5386cb9c","1773854231.595894000","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69badb212b76af3f7f759084","1773853471.698871273","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","95%","100%","97%"
"2","69baddfe34a0e18a5386cb8b","1773854204.523907802","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69badb092b76af3f7f759073","1773853447.748138817","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","95%","100%","97%"

"Total","97%"

"Document 3"
"Document ID","Document Type","Document Owner","Policy"
"69b007bd9b241eae6a867179","VC","did:hedera:testnet:4Rh3aC5jNAzPJwwNtsy95Ava954Thyjk41gREjynY2D9_0.0.8145348","69afeab013b23cf457db9720"

"Data"
"Offset","ID","Message","Type","Schema","Owner","ID","Message","Type","Schema","Owner","Document Rate","Options Rate","Total Rate"
"1","69bade1834a0e18a5386cb9c","1773854231.595894000","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","69b007bd9b241eae6a867179","1773143996.887383182","VC","I-REC Registrant & Participant App","did:hedera:testnet:4Rh3aC5jNAzPJwwNtsy95Ava954Thyjk41gREjynY2D9_0.0.8145348","84%","0%","42%"
"2","69baddfe34a0e18a5386cb8b","1773854204.523907802","VC","PP","did:hedera:testnet:4FmP2iynDzSgmCLGec9xSWYEvda3MW6oSPxZPz11zSLZ_0.0.8145348","","","","","","-","-","-"
"2","","","","","","69b007a59b241eae6a867166","1773143971.227034000","VC","I-REC Registrant & Participant App","did:hedera:testnet:4Rh3aC5jNAzPJwwNtsy95Ava954Thyjk41gREjynY2D9_0.0.8145348","-","-","-"

"Total","14%"`
};

export const {
    COMPARE_POLICIES_EXPORT_CSV_RESPONSE,
    COMPARE_MODULES_EXPORT_CSV_RESPONSE,
    COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI
} = CsvObjectExamples;
