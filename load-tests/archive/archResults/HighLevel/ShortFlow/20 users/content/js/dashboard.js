/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 99.80327868852459, "KoPercent": 0.19672131147540983};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9189082278481012, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve-0"], "isController": false}, {"data": [0.0, 500, 1500, "Import"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy publish result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.0, 500, 1500, "Token associate"], "isController": true}, {"data": [0.9230769230769231, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.0, 500, 1500, "Application creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [0.0, 500, 1500, "Get result for device approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application"], "isController": false}, {"data": [0.925, 500, 1500, "Associate token"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [0.95, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.9645669291338582, 500, 1500, "Get application creation status"], "isController": false}, {"data": [0.8472222222222222, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.0, 500, 1500, "Choose registrant"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for app approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get application creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Role approve"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.9, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.0, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device approve"], "isController": true}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.8833333333333333, 500, 1500, "Approve device"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [0.5, 500, 1500, "Create application"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.85, 500, 1500, "Get application schema"], "isController": false}, {"data": [0.9615384615384616, 500, 1500, "Get block for waiting app approve"], "isController": false}, {"data": [1.0, 500, 1500, "Get application schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [0.9878048780487805, 500, 1500, "Get block for approve result"], "isController": false}, {"data": [0.5, 500, 1500, "Get device schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [0.5, 500, 1500, "Grant KYC"], "isController": true}, {"data": [0.0, 500, 1500, "Policy import and publish"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Create device"], "isController": false}, {"data": [1.0, 500, 1500, "Grant KYC-0"], "isController": false}, {"data": [0.0, 500, 1500, "Publish"], "isController": true}, {"data": [0.9880952380952381, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation-0"], "isController": false}, {"data": [0.9558823529411765, 500, 1500, "Get device approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Choose registrant-0"], "isController": false}, {"data": [0.91882876204596, 500, 1500, "Get policy import result"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for kyc grant"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token-0"], "isController": false}, {"data": [0.9431818181818182, 500, 1500, "Get device creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices-0"], "isController": false}, {"data": [0.1276595744680851, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [0.6, 500, 1500, "Get block for waiting app creation"], "isController": false}, {"data": [1.0, 500, 1500, "Approve device-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.9848484848484849, 500, 1500, "Get associate result"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.9147424511545293, 500, 1500, "Get policy publish result"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for kyc grant-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 6100, 12, 0.19672131147540983, 570.6147540983616, 0, 180225, 223.0, 281.0, 660.0, 11193.939999999999, 4.420395560183685, 52.95489091632263, 1.558999718154492], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 10, 0, 0.0, 273.4, 260, 319, 270.5, 314.5, 319.0, 319.0, 0.06754429216959021, 6.361254156084728, 0.04316502421462875], "isController": false}, {"data": ["Get block for waiting app approve-0", 13, 0, 0.0, 0.8461538461538461, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.07097464567273046, 0.2580508451442423, 0.0], "isController": false}, {"data": ["Import", 20, 0, 0.0, 697430.55, 248727, 816761, 739119.5, 765189.3, 814183.25, 816761.0, 0.022811727965581664, 4.786928614332951, 0.9745286027702563], "isController": true}, {"data": ["Get device issue row-0", 10, 0, 0.0, 0.8, 0, 2, 0.5, 2.0, 2.0, 2.0, 0.06908128795153257, 2.7240492363927133, 0.0], "isController": false}, {"data": ["Get hedera id-0", 20, 0, 0.0, 0.55, 0, 2, 0.5, 1.0, 1.9499999999999993, 2.0, 0.10919951297017215, 0.3754586379544747, 0.0], "isController": false}, {"data": ["Import Policy-0", 20, 0, 0.0, 0.20000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10525872594838112, 0.12722017790040419, 0.0], "isController": false}, {"data": ["Get device approve result-0", 34, 0, 0.0, 1.2352941176470593, 0, 3, 1.0, 2.0, 2.25, 3.0, 0.22951572182694516, 9.053062273437606, 0.0], "isController": false}, {"data": ["Create device-0", 10, 0, 0.0, 1.2, 0, 3, 1.0, 2.9000000000000004, 3.0, 3.0, 0.0674759279626993, 4.382937119604456, 0.0], "isController": false}, {"data": ["Get policy publish result-0", 563, 0, 0.0, 0.35168738898756646, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.6220382746890085, 0.9940137361491521, 0.0], "isController": false}, {"data": ["Get issue schema-0", 10, 0, 0.0, 1.6, 1, 5, 1.0, 4.700000000000001, 5.0, 5.0, 0.0691013371108731, 3.03929139817918, 0.0], "isController": false}, {"data": ["Import Policy", 20, 0, 0.0, 242.29999999999995, 237, 252, 242.0, 248.70000000000002, 251.85, 252.0, 0.10512759862282846, 0.16997510611316985, 0.06914398210202634], "isController": false}, {"data": ["Get applications", 10, 0, 0.0, 267.3, 257, 280, 267.5, 279.7, 280.0, 280.0, 0.06846548312668169, 2.826654971193148, 0.04295139293025421], "isController": false}, {"data": ["Get device issue row", 10, 0, 0.0, 274.1, 257, 309, 271.0, 308.0, 309.0, 309.0, 0.06893509071857938, 3.1471696328861745, 0.041993857021728344], "isController": false}, {"data": ["Issue creation", 10, 0, 0.0, 15465.099999999999, 14670, 17968, 14836.0, 17963.9, 17968.0, 17968.0, 0.061435250317927424, 39.18263471214514, 0.7255719045849127], "isController": true}, {"data": ["Token associate", 20, 0, 0.0, 19907.45, 4985, 36636, 20377.0, 33517.4, 36481.1, 36636.0, 0.09205602529699576, 2.078951382623965, 0.3235445654725466], "isController": true}, {"data": ["Get block for waiting device", 13, 1, 7.6923076923076925, 14087.153846153846, 231, 180225, 237.0, 108251.39999999994, 180225.0, 180225.0, 0.036380732763928225, 0.14600119339297907, 0.021918079684998825], "isController": false}, {"data": ["Application creation", 12, 2, 16.666666666666668, 57664.833333333336, 36147, 77457, 59426.0, 75028.20000000001, 77457.0, 77457.0, 0.049250570485774796, 22.319225877224486, 0.5532793376926929], "isController": true}, {"data": ["Get policy id", 20, 0, 0.0, 232.15, 225, 262, 231.5, 237.70000000000002, 260.79999999999995, 262.0, 0.03183496752833312, 0.13767846235117154, 0.01938388891983955], "isController": false}, {"data": ["Get result for issue request approve", 10, 0, 0.0, 3583.2000000000003, 3516, 4008, 3539.5, 3962.5, 4008.0, 4008.0, 0.06611657674812228, 0.0, 0.0], "isController": true}, {"data": ["Get result for device approve", 10, 0, 0.0, 11519.300000000001, 6789, 17039, 10288.0, 17001.5, 17039.0, 17039.0, 0.06594261673491728, 0.0, 0.0], "isController": true}, {"data": ["Get block for approve result-0", 41, 0, 0.0, 0.8780487804878049, 0, 3, 1.0, 2.0, 2.0, 3.0, 0.26348090406081914, 11.66302137890482, 0.0], "isController": false}, {"data": ["Approve application", 10, 0, 0.0, 253.2, 243, 288, 249.5, 285.0, 288.0, 288.0, 0.0684720462871033, 3.0387479565373687, 0.32973569790133184], "isController": false}, {"data": ["Associate token", 20, 0, 0.0, 295.05, 224, 662, 228.5, 653.7, 661.6, 662.0, 0.11079227556254778, 0.39346946184037046, 0.0669784747919875], "isController": false}, {"data": ["Get block for waiting device-0", 13, 0, 0.0, 0.7692307692307692, 0, 4, 1.0, 2.799999999999999, 4.0, 4.0, 0.03640447046897359, 0.1345669154422163, 0.0], "isController": false}, {"data": ["Get issue approve result", 10, 0, 0.0, 322.4, 265, 731, 276.5, 687.3000000000002, 731.0, 731.0, 0.06758446368348844, 4.827979323800545, 0.04249109152288072], "isController": false}, {"data": ["Balance verify-0", 47, 0, 0.0, 2.382978723404256, 0, 23, 1.0, 3.0, 14.399999999999892, 23.0, 0.24594195769798327, 15.424012152214523, 0.0], "isController": false}, {"data": ["Login by user", 112, 0, 0.0, 234.03571428571436, 224, 294, 230.5, 242.0, 258.35, 293.22, 0.32767892146823563, 9.431674670602227, 0.20601360763521143], "isController": false}, {"data": ["Get application creation status", 127, 0, 0.0, 284.59055118110246, 238, 845, 247.0, 290.0, 674.0, 821.4799999999999, 0.6483759968142786, 23.380458986070128, 0.40762313240909975], "isController": false}, {"data": ["Get tokens", 144, 0, 0.0, 1414.0625, 223, 23530, 229.0, 2025.5, 11225.25, 21903.70000000004, 0.6224254710334424, 2.582527937556461, 0.3746895301768293], "isController": false}, {"data": ["Choose registrant", 12, 2, 16.666666666666668, 21564.0, 4942, 60224, 14781.0, 60221.0, 60224.0, 60224.0, 0.049297307956174694, 0.2015540976333184, 0.032447642150841546], "isController": false}, {"data": ["Get associate result-0", 66, 0, 0.0, 0.4393939393939394, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.348082907019672, 1.1576187635145825, 0.0], "isController": false}, {"data": ["Get result for app approve", 10, 0, 0.0, 13685.1, 6780, 16587, 15159.5, 16586.1, 16587.0, 16587.0, 0.06285039092943158, 0.0, 0.0], "isController": true}, {"data": ["Get application creation status-0", 127, 0, 0.0, 1.2204724409448822, 0, 24, 1.0, 2.0, 3.0, 18.399999999999977, 0.6491747302346741, 23.255418787985665, 0.0], "isController": false}, {"data": ["Create application-0", 10, 0, 0.0, 1.2000000000000002, 0, 3, 1.0, 3.0, 3.0, 3.0, 0.0683933713144522, 2.4464589438866584, 0.0], "isController": false}, {"data": ["Role approve", 10, 0, 0.0, 14436.2, 7522, 17337, 15905.0, 17336.0, 17337.0, 17337.0, 0.06255669200212692, 21.94769771824466, 0.5877335612742799], "isController": true}, {"data": ["Login by SR-0", 90, 0, 0.0, 0.8111111111111112, 0, 10, 1.0, 2.0, 2.450000000000003, 10.0, 0.06872804997903795, 1.5295287322385718, 0.0], "isController": false}, {"data": ["Get issue schema", 10, 0, 0.0, 502.7, 467, 712, 477.5, 691.3000000000001, 712.0, 712.0, 0.06886340942740075, 5.538104330217264, 0.04282443273766484], "isController": false}, {"data": ["Issue approve", 10, 0, 0.0, 4353.700000000001, 4261, 4762, 4309.5, 4722.900000000001, 4762.0, 4762.0, 0.06576178451178451, 25.48773280699245, 0.5014207628038194], "isController": true}, {"data": ["Get block for waiting issue request-0", 12, 0, 0.0, 0.7499999999999999, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.06550325605768653, 0.24565853289082246, 0.0], "isController": false}, {"data": ["Device approve", 10, 0, 0.0, 12292.2, 7550, 17784, 11040.0, 17758.7, 17784.0, 17784.0, 0.06559226536006874, 23.663652394609628, 0.6317803442118106], "isController": true}, {"data": ["Get tenant", 20, 0, 0.0, 939.6, 912, 1061, 929.5, 973.2, 1056.6499999999999, 1061.0, 0.104747140403067, 0.27119177859335064, 0.08408413028449323], "isController": true}, {"data": ["Approve device", 30, 0, 0.0, 340.7, 245, 575, 251.5, 546.1, 563.4499999999999, 575.0, 0.17580872011251758, 11.567103533022738, 1.0389940536363105], "isController": false}, {"data": ["Get Tenant Id-0", 20, 0, 0.0, 0.35000000000000003, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10526703615396356, 0.08359682988320623, 0.0], "isController": false}, {"data": ["Login by Admin-0", 20, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10526980651409563, 0.062087597308777394, 0.0], "isController": false}, {"data": ["Publish Policy", 20, 0, 0.0, 254.54999999999998, 248, 263, 254.5, 261.8, 262.95, 263.0, 0.03183380208606905, 0.057995653790689564, 0.021155178046455066], "isController": false}, {"data": ["Token minting verify", 10, 0, 0.0, 52588.200000000004, 37185, 65289, 52227.0, 64974.3, 65289.0, 65289.0, 0.04865375071764282, 17.96420961677873, 0.16105151702394738], "isController": true}, {"data": ["Create application", 10, 0, 0.0, 566.6999999999999, 538, 655, 557.0, 647.4000000000001, 655.0, 655.0, 0.06812406755182537, 2.6624202841965787, 0.22305309930445327], "isController": false}, {"data": ["Get policy id-0", 20, 0, 0.0, 0.39999999999999997, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.03184642380583872, 0.04358823758307936, 0.0], "isController": false}, {"data": ["Get issue approve result-0", 10, 0, 0.0, 1.5, 0, 2, 2.0, 2.0, 2.0, 2.0, 0.06770755751757011, 4.469855907738297, 0.0], "isController": false}, {"data": ["Get application schema", 10, 0, 0.0, 526.5, 461, 896, 473.5, 862.9000000000001, 896.0, 896.0, 0.0681598211486293, 2.480458366277247, 0.04192095249942064], "isController": false}, {"data": ["Get block for waiting app approve", 13, 0, 0.0, 273.30769230769226, 230, 665, 236.0, 516.9999999999999, 665.0, 665.0, 0.07088602073143467, 0.2799497271569798, 0.04270627150436494], "isController": false}, {"data": ["Get application schema-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.06838074398249452, 0.26585685346006566, 0.0], "isController": false}, {"data": ["Approve application-0", 10, 0, 0.0, 0.6000000000000001, 0, 2, 0.0, 2.0, 2.0, 2.0, 0.06858757604647493, 3.0314168071283065, 0.0], "isController": false}, {"data": ["Device creation", 10, 0, 0.0, 28835.0, 19114, 36216, 30545.5, 35829.6, 36216.0, 36216.0, 0.0566745633224896, 28.159437545693866, 0.6330227714853269], "isController": true}, {"data": ["Get policy import result-0", 1349, 0, 0.0, 0.28465530022238716, 0, 2, 0.0, 1.0, 1.0, 1.0, 1.5581595467592244, 2.1696897036147225, 0.0], "isController": false}, {"data": ["Get block for approve result", 41, 0, 0.0, 261.31707317073165, 239, 677, 252.0, 264.6, 270.7, 677.0, 0.26305996483979005, 11.780523727928626, 0.16542125885421344], "isController": false}, {"data": ["Get device schema", 10, 0, 0.0, 691.1999999999999, 684, 717, 688.0, 714.7, 717.0, 717.0, 0.06657302061766449, 5.7007829819387394, 0.040945008188481534], "isController": false}, {"data": ["Get block for waiting issue request", 12, 0, 0.0, 248.5, 232, 307, 237.5, 300.1, 307.0, 307.0, 0.06542040789624323, 0.2658555899012697, 0.03986556106177322], "isController": false}, {"data": ["Grant KYC", 40, 0, 0.0, 10950.349999999995, 225, 34232, 2461.0, 27674.0, 30891.249999999985, 34232.0, 0.19615727890622703, 4.070014509508724, 0.618920273712963], "isController": true}, {"data": ["Policy import and publish", 20, 0, 0.0, 989040.05, 889787, 1065250, 993260.0, 1043550.5, 1064216.55, 1065250.0, 0.01717373551932088, 5.318592684557549, 1.051333657290809], "isController": true}, {"data": ["Get Tenant Id", 20, 0, 0.0, 262.8, 249, 304, 258.5, 288.6, 303.25, 304.0, 0.10512428318379405, 0.1585282403246238, 0.04568389259451987], "isController": false}, {"data": ["Create device", 10, 0, 0.0, 13223.0, 5056, 18275, 13432.0, 17918.2, 18275.0, 18275.0, 0.06160025132902543, 4.246110136629357, 0.4378009268527816], "isController": false}, {"data": ["Grant KYC-0", 20, 0, 0.0, 0.6, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.10547744364867573, 0.3484566837100636, 0.0], "isController": false}, {"data": ["Publish", 20, 0, 0.0, 291595.55, 238420, 723539, 264189.0, 367163.90000000014, 706033.6499999997, 723539.0, 0.021838209441531472, 2.180508957897024, 0.40394182922028854], "isController": true}, {"data": ["Get issue creation status", 42, 0, 0.0, 285.0238095238095, 258, 706, 271.5, 300.7, 319.5, 706.0, 0.2659507104683265, 24.053240700431854, 0.16720859400724397], "isController": false}, {"data": ["Get hedera id", 20, 0, 0.0, 272.6499999999999, 259, 308, 269.5, 292.7, 307.25, 308.0, 0.10904174117852314, 0.587302651486239, 0.06214527358572862], "isController": false}, {"data": ["Get block for waiting app creation-0", 20, 0, 0.0, 1.4000000000000001, 0, 21, 0.0, 1.9000000000000021, 20.049999999999986, 21.0, 0.05956387331955423, 0.20782789353851103, 0.0], "isController": false}, {"data": ["Get device approve result", 34, 0, 0.0, 301.17647058823525, 253, 696, 262.0, 490.5, 690.75, 696.0, 0.22911823174635262, 9.688655594022709, 0.14408072627110077], "isController": false}, {"data": ["Choose registrant-0", 12, 0, 0.0, 0.5833333333333333, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0537480292389279, 0.20440697447864412, 0.0], "isController": false}, {"data": ["Get policy import result", 1349, 0, 0.0, 313.3535952557449, 236, 820, 246.0, 657.0, 661.0, 667.0, 1.5577151355870358, 4.671468584225739, 0.9484760044462432], "isController": false}, {"data": ["WS open for kyc grant", 20, 0, 0.0, 870.3000000000002, 842, 1021, 852.0, 986.2000000000003, 1019.85, 1021.0, 0.10500175877945955, 0.3704747113107894, 0.06137065686475248], "isController": false}, {"data": ["Login by user-0", 112, 0, 0.0, 0.9375000000000002, 0, 21, 1.0, 2.0, 2.0, 18.920000000000073, 0.3278938092477765, 9.190224084861553, 0.0], "isController": false}, {"data": ["Associate token-0", 20, 0, 0.0, 0.35000000000000003, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11119265238953009, 0.3502622843557498, 0.0], "isController": false}, {"data": ["Get device creation status", 44, 0, 0.0, 316.1590909090909, 248, 819, 264.5, 690.0, 704.5, 819.0, 0.2779304289603507, 18.775824040034617, 0.17474283539570346], "isController": false}, {"data": ["Get devices-0", 10, 0, 0.0, 1.4, 0, 4, 1.0, 3.8000000000000007, 4.0, 4.0, 0.06921229487206107, 4.500698449385049, 0.0], "isController": false}, {"data": ["Balance verify", 47, 0, 0.0, 8119.872340425532, 1029, 11965, 11194.0, 11545.800000000001, 11681.8, 11965.0, 0.2323408588702302, 14.95028558306433, 0.12997725407708774], "isController": false}, {"data": ["Get tokens-0", 144, 0, 0.0, 0.5069444444444441, 0, 2, 0.0, 1.0, 1.0, 2.0, 0.6928973212782031, 2.2895506708232487, 0.0], "isController": false}, {"data": ["Get block for waiting app creation", 20, 7, 35.0, 66236.95, 231, 180221, 255.0, 180218.9, 180220.9, 180221.0, 0.059523100915465296, 0.22721955597998833, 0.03610041193706027], "isController": false}, {"data": ["Approve device-0", 30, 0, 0.0, 2.3666666666666663, 1, 23, 2.0, 3.0, 11.999999999999986, 23.0, 0.17606150415211713, 11.359634965814724, 0.0], "isController": false}, {"data": ["Login by Admin", 20, 0, 0.0, 674.8500000000001, 655, 809, 667.5, 682.5, 802.6999999999999, 809.0, 0.10489272096962832, 0.11338964597395514, 0.0386177302788573], "isController": false}, {"data": ["Get associate result", 66, 0, 0.0, 246.66666666666663, 223, 662, 229.0, 250.20000000000002, 299.79999999999995, 662.0, 0.34767400820721367, 1.4028469266407844, 0.2067349575021203], "isController": false}, {"data": ["Get issue creation status-0", 42, 0, 0.0, 1.8571428571428574, 0, 4, 2.0, 3.0, 3.0, 4.0, 0.26640787044965847, 23.52119845483435, 0.0], "isController": false}, {"data": ["Get devices", 10, 0, 0.0, 276.9, 252, 298, 277.0, 297.2, 298.0, 298.0, 0.06907651605683615, 4.9391058131342085, 0.043604550760877825], "isController": false}, {"data": ["Login by SR", 90, 0, 0.0, 234.56666666666663, 226, 301, 230.0, 245.50000000000003, 270.8, 301.0, 0.06871613821411339, 1.5828765420092292, 0.04292298099578846], "isController": false}, {"data": ["Get policy publish result", 563, 0, 0.0, 322.5648312611011, 233, 925, 245.0, 659.0, 662.0, 869.36, 0.6218706266092145, 2.116917890985969, 0.3786244950752928], "isController": false}, {"data": ["Get applications-0", 10, 0, 0.0, 0.8, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.0685908691834943, 2.458145369344683, 0.0], "isController": false}, {"data": ["Get device schema-0", 10, 0, 0.0, 2.3, 0, 15, 1.0, 13.600000000000005, 15.0, 15.0, 0.06687800115030162, 2.962636671465163, 0.0], "isController": false}, {"data": ["Get device creation status-0", 44, 0, 0.0, 1.5, 0, 4, 2.0, 2.0, 3.0, 4.0, 0.27912937011920097, 18.15196458109977, 0.0], "isController": false}, {"data": ["Publish Policy-0", 20, 0, 0.0, 0.25, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.031846474515654935, 0.04523661084643152, 0.0], "isController": false}, {"data": ["WS open for kyc grant-0", 20, 0, 0.0, 0.45, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10547855620952261, 0.348465509500981, 0.0], "isController": false}, {"data": ["Get issues-0", 10, 0, 0.0, 3.8000000000000003, 1, 18, 2.5, 16.500000000000007, 18.0, 18.0, 0.06766678170019555, 5.974177245945069, 0.0], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 10, 83.33333333333333, 0.16393442622950818], "isController": false}, {"data": ["504", 2, 16.666666666666668, 0.03278688524590164], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 6100, 12, "504/Gateway Time-out", 10, "504", 2, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get block for waiting device", 13, 1, "504/Gateway Time-out", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["Application creation", 2, 2, "504", 2, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Choose registrant", 12, 2, "504/Gateway Time-out", 2, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get block for waiting app creation", 20, 7, "504/Gateway Time-out", 7, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
