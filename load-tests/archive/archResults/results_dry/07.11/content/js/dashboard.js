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

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.7065527065527065, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for sr link"], "isController": false}, {"data": [0.6666666666666666, 500, 1500, "Agree terms"], "isController": false}, {"data": [0.5, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.5714285714285714, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [0.5, 500, 1500, "Import Policy"], "isController": false}, {"data": [0.6666666666666666, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [0.8333333333333334, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.6666666666666666, 500, 1500, "Get SR link result"], "isController": false}, {"data": [0.6666666666666666, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.5, 500, 1500, "Accept user"], "isController": false}, {"data": [0.16666666666666666, 500, 1500, "Login by user"], "isController": false}, {"data": [0.5, 500, 1500, "Get SR DID"], "isController": false}, {"data": [0.8333333333333334, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [0.6666666666666666, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [0.0, 500, 1500, "Setup ipfs"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen"], "isController": false}, {"data": [0.75, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [0.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [1.0, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [1.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.3333333333333333, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.25, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for user link"], "isController": false}, {"data": [0.6428571428571429, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user link-0"], "isController": false}, {"data": [0.0, 500, 1500, "Create new tenant"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [0.6666666666666666, 500, 1500, "Verify link"], "isController": false}, {"data": [0.0, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.6111111111111112, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.3333333333333333, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 310, 0, 0.0, 960.9483870967745, 0, 41610, 3.0, 2041.9, 2074.0, 35143.45999999957, 0.7152630206711013, 8.218041785060002, 0.24595728581910306], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.16585581601061478, 1.4510224319991154, 0.0], "isController": false}, {"data": ["WS open for sr link", 3, 0, 0.0, 923.6666666666666, 871, 984, 916.0, 984.0, 984.0, 984.0, 0.1213150551983501, 1.4415640543491448, 0.07463719216304744], "isController": false}, {"data": ["Agree terms", 6, 0, 0.0, 719.6666666666667, 404, 1042, 765.5, 1042.0, 1042.0, 1042.0, 0.03364379075805068, 0.42505403157750127, 0.02206231005276468], "isController": false}, {"data": ["Link SR profile", 3, 0, 0.0, 964.3333333333334, 901, 1005, 987.0, 1005.0, 1005.0, 1005.0, 0.12127582164369163, 1.454520303593807, 0.15609524699842342], "isController": false}, {"data": ["Invite sr-0", 3, 0, 0.0, 0.6666666666666667, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.15922721723900005, 1.3840120946340426, 0.0], "isController": false}, {"data": ["Link user profile-0", 3, 0, 0.0, 0.6666666666666667, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.09806805923310778, 1.3430088710731913, 0.0], "isController": false}, {"data": ["Import Policy-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.15075376884422112, 1.4766704616834172, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 7, 0, 0.0, 755.2857142857143, 310, 1285, 697.0, 1285.0, 1285.0, 1285.0, 0.25172612197928657, 2.298756765139528, 0.20294716223748563], "isController": false}, {"data": ["Agree terms-0", 6, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.03378739842663348, 0.4193783840191237, 0.0], "isController": false}, {"data": ["Import Policy", 3, 0, 0.0, 756.0, 581, 1020, 667.0, 1020.0, 1020.0, 1020.0, 0.1458647347692906, 1.4790646119998054, 0.11637840654932659], "isController": false}, {"data": ["Invite sr", 3, 0, 0.0, 758.6666666666666, 457, 1067, 752.0, 1067.0, 1067.0, 1067.0, 0.15070075852715126, 1.3547860834128698, 0.11847081114683278], "isController": false}, {"data": ["Generate user keys", 3, 0, 0.0, 2043.3333333333333, 2041, 2047, 2042.0, 2047.0, 2047.0, 2047.0, 0.11281164216147106, 1.4088602381265747, 0.0618040344263528], "isController": false}, {"data": ["Generate sr keys", 3, 0, 0.0, 2050.6666666666665, 2045, 2054, 2053.0, 2054.0, 2054.0, 2054.0, 0.14932059130954156, 1.475707406301329, 0.08399283261161714], "isController": false}, {"data": ["Get policy id", 3, 0, 0.0, 513.0, 361, 710, 468.0, 710.0, 710.0, 710.0, 0.1605308219178082, 2.389986221104452, 0.12024134805757707], "isController": false}, {"data": ["Get Access Token-0", 6, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.035070696679389536, 0.3747096164580934, 0.0], "isController": false}, {"data": ["WS open for policy import", 3, 0, 0.0, 894.6666666666666, 876, 904, 904.0, 904.0, 904.0, 904.0, 0.1438090216192896, 1.4409926118115142, 0.1042053652749149], "isController": false}, {"data": ["Generate sr keys-0", 3, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.16633399866932802, 1.5895942490019959, 0.0], "isController": false}, {"data": ["Dry Run Policy", 3, 0, 0.0, 40036.666666666664, 38599, 41610, 39901.0, 41610.0, 41610.0, 41610.0, 0.052941799315286066, 1.2346020706861258, 0.04172268754632408], "isController": false}, {"data": ["Invite and accept user", 3, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.1607200257152041, 0.0, 0.0], "isController": true}, {"data": ["Get SR link result", 15, 0, 0.0, 708.0666666666666, 356, 1475, 637.0, 1335.2, 1475.0, 1475.0, 0.18785692816351068, 2.4955618800721373, 0.12016239057333934], "isController": false}, {"data": ["Get User Access Token", 3, 0, 0.0, 546.0, 437, 616, 585.0, 616.0, 616.0, 616.0, 0.09645681949713844, 1.2986190096296057, 0.0632997877949971], "isController": false}, {"data": ["Accept user", 3, 0, 0.0, 1054.0, 1014, 1083, 1065.0, 1083.0, 1083.0, 1083.0, 0.15664160401002505, 1.5082363297566832, 0.1340019971804511], "isController": false}, {"data": ["Login by user", 3, 0, 0.0, 4660.666666666667, 1126, 7099, 5757.0, 7099.0, 7099.0, 7099.0, 0.09481968456651602, 1.2439219100635293, 0.03537218701602453], "isController": false}, {"data": ["Get SR DID", 3, 0, 0.0, 646.6666666666666, 505, 915, 520.0, 915.0, 915.0, 915.0, 0.09589260028767779, 1.3252344873741408, 0.05862184353524053], "isController": false}, {"data": ["Link user profile", 3, 0, 0.0, 409.3333333333333, 320, 534, 374.0, 534.0, 534.0, 534.0, 0.09705596894208993, 1.3616585955192495, 0.08663003477838888], "isController": false}, {"data": ["Get key gen result", 3, 0, 0.0, 2039.6666666666667, 2037, 2044, 2038.0, 2044.0, 2044.0, 2044.0, 0.14944704593005878, 1.5857343454219388, 0.08727473971306167], "isController": false}, {"data": ["Invite user", 3, 0, 0.0, 669.0, 403, 981, 623.0, 981.0, 981.0, 981.0, 0.16034206306787813, 1.4505424071352218, 0.12119605157669695], "isController": false}, {"data": ["Login by SR-0", 3, 0, 0.0, 1.3333333333333333, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12402844385645775, 1.2661236977013395, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 3, 0, 0.0, 3.0, 0, 8, 1.0, 8.0, 8.0, 8.0, 0.15011258443832876, 1.4704387665749312, 0.0], "isController": false}, {"data": ["User creation flow", 4, 0, 0.0, 37673.5, 6941, 52128, 45812.5, 52128.0, 52128.0, 52128.0, 0.05127547750288424, 17.71851916020382, 0.9792539618318163], "isController": true}, {"data": ["Setup ipfs", 1, 0, 0.0, 2018.0, 2018, 2018, 2018.0, 2018.0, 2018.0, 2018.0, 0.4955401387512388, 4.633106726957384, 0.35084628964321113], "isController": false}, {"data": ["WS open for sr key gen-0", 3, 0, 0.0, 0.6666666666666667, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.16624182644353322, 1.5888757376981049, 0.0], "isController": false}, {"data": ["Requests for DryRun", 3, 0, 0.0, 40683.333333333336, 39197, 42200, 40653.0, 42200.0, 42200.0, 42200.0, 0.05224933382099378, 1.7783992817893655, 0.0994472183760907], "isController": true}, {"data": ["WS open for sr key gen", 3, 0, 0.0, 1.6666666666666667, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.16623261483903143, 1.6097291101014017, 0.09236949008145398], "isController": false}, {"data": ["Get user link result", 4, 0, 0.0, 588.0, 475, 872, 502.5, 872.0, 872.0, 872.0, 0.11722642283570717, 1.7703593905691344, 0.07326651427231698], "isController": false}, {"data": ["Generate user keys-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1222145272334705, 1.4864262308021345, 0.0], "isController": false}, {"data": ["Link user", 3, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12229922543823887, 0.0, 0.0], "isController": true}, {"data": ["Login by Admin-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 7948.2421875, 0.0], "isController": false}, {"data": ["User creation(SR side)", 3, 0, 0.0, 20754.333333333332, 18426, 24936, 18901.0, 24936.0, 24936.0, 24936.0, 0.06976095246953772, 13.843756721758442, 0.744820794286578], "isController": true}, {"data": ["Get Access Token", 6, 0, 0.0, 2044.3333333333335, 2039, 2052, 2044.0, 2052.0, 2052.0, 2052.0, 0.03465503797614578, 0.388695959800156, 0.027683419008288333], "isController": false}, {"data": ["Get user keys", 3, 0, 0.0, 2044.0, 2043, 2045, 2044.0, 2045.0, 2045.0, 2045.0, 0.11288380493678507, 1.469767718053883, 0.06426880691225166], "isController": false}, {"data": ["Get policy id-0", 3, 0, 0.0, 1.3333333333333333, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.1646361540994402, 1.6390193687575456, 0.0], "isController": false}, {"data": ["WS open for user key gen-0", 3, 0, 0.0, 0.3333333333333333, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12219461529061953, 1.486104499307564, 0.0], "isController": false}, {"data": ["Requests for Import", 3, 0, 0.0, 8325.666666666666, 7543, 9589, 7845.0, 9589.0, 9589.0, 9589.0, 0.10776636252604353, 14.265466998796608, 0.880021800237086], "isController": true}, {"data": ["Setup ipfs-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["User creation(user side)", 3, 0, 0.0, 20310.333333333332, 16178, 22686, 22067.0, 22686.0, 22686.0, 22686.0, 0.06438044551268295, 12.400130672185501, 0.5827142862891111], "isController": true}, {"data": ["Get policy import result-0", 21, 0, 0.0, 1.3333333333333337, 0, 4, 1.0, 2.0, 3.799999999999997, 4.0, 0.2509890162425749, 2.502782075051692, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 7, 0, 0.0, 0.8571428571428572, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.2573624030295231, 2.196915557557263, 0.0], "isController": false}, {"data": ["Accept sr-0", 3, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1607114158675738, 1.4059109993571541, 0.0], "isController": false}, {"data": ["Get user link result-0", 4, 0, 0.0, 1.5, 1, 2, 1.5, 2.0, 2.0, 2.0, 0.11898033849906302, 1.6442583156102204, 0.0], "isController": false}, {"data": ["Login by SR OS", 3, 0, 0.0, 2479.0, 2458, 2498, 2481.0, 2498.0, 2498.0, 2498.0, 0.1459782978930466, 1.3731558835336481, 0.04704378740693884], "isController": false}, {"data": ["Create new tenant-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 9070.3125, 0.0], "isController": false}, {"data": ["Get sr keys", 3, 0, 0.0, 2066.6666666666665, 2050, 2085, 2065.0, 2085.0, 2085.0, 2085.0, 0.14939495045067477, 1.5886830212638814, 0.08724431676709328], "isController": false}, {"data": ["WS open for user key gen", 3, 0, 0.0, 1.3333333333333333, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12218963831867058, 1.5014370010589768, 0.0661065035434995], "isController": false}, {"data": ["Get SR Access Token-0", 9, 0, 0.0, 0.7777777777777778, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.02595140743132969, 0.26224268909204673, 0.0], "isController": false}, {"data": ["Verify link-0", 6, 0, 0.0, 2.1666666666666665, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.043871835743846975, 0.561936521109665, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 3, 0, 0.0, 1.3333333333333333, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.1789228842368939, 1.7905101911492813, 0.0], "isController": false}, {"data": ["Policy import and dry run", 3, 0, 0.0, 49009.0, 47042, 50242, 49743.0, 50242.0, 50242.0, 50242.0, 0.04475274110539271, 7.447339775863355, 0.45063038431416425], "isController": true}, {"data": ["Invite and accept SR", 3, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.15009756341622055, 0.0, 0.0], "isController": true}, {"data": ["Link SR", 3, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.16652789342214822, 0.0, 0.0], "isController": true}, {"data": ["Get key gen result-0", 3, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.16630633627141195, 1.6457397860191805, 0.0], "isController": false}, {"data": ["Accept sr", 3, 0, 0.0, 2812.3333333333335, 1067, 6130, 1240.0, 6130.0, 6130.0, 6130.0, 0.15070832914699087, 1.735794955038682, 0.12892626594996484], "isController": false}, {"data": ["User creation(admin side)", 4, 0, 0.0, 5139.75, 0, 10541, 5009.0, 10541.0, 10541.0, 10541.0, 0.12900312832586192, 5.554063396974876, 0.47554156117973356], "isController": true}, {"data": ["Login by user OS-0", 3, 0, 0.0, 0.3333333333333333, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12217470983506414, 1.4400071268580736, 0.0], "isController": false}, {"data": ["WS open for user link", 3, 0, 0.0, 923.0, 883, 980, 906.0, 980.0, 980.0, 980.0, 0.09468501451836889, 1.2782785179428102, 0.05686648821171569], "isController": false}, {"data": ["Get policy import result", 21, 0, 0.0, 719.9047619047619, 396, 1111, 786.0, 1067.4, 1110.0, 1111.0, 0.2484736617918501, 3.100212718597662, 0.18611259628354393], "isController": false}, {"data": ["WS open for sr link-0", 3, 0, 0.0, 1.6666666666666667, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.1263370672955445, 1.4728631927482525, 0.0], "isController": false}, {"data": ["WS open for user link-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.09747222041718111, 1.2940135303625968, 0.0], "isController": false}, {"data": ["Create new tenant", 1, 0, 0.0, 2584.0, 2584, 2584, 2584.0, 2584.0, 2584.0, 2584.0, 0.38699690402476783, 3.738072634481424, 0.287602191369969], "isController": false}, {"data": ["Get user key gen result", 3, 0, 0.0, 2037.0, 2031, 2043, 2037.0, 2043.0, 2043.0, 2043.0, 0.11291779584462511, 1.4673799895551038, 0.06428815915763324], "isController": false}, {"data": ["Login by user-0", 3, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.09831874938550782, 1.228184247288041, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 3, 0, 0.0, 1.6666666666666667, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.09782502364104738, 1.2598156202106499, 0.0], "isController": false}, {"data": ["Link SR profile-0", 3, 0, 0.0, 1.3333333333333333, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12584948401711554, 1.4672198144768855, 0.0], "isController": false}, {"data": ["Accept user-0", 3, 0, 0.0, 1.3333333333333333, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.16601184217807535, 1.462276835122572, 0.0], "isController": false}, {"data": ["Get sr keys-0", 3, 0, 0.0, 0.3333333333333333, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.16651865008880995, 1.6517435890319718, 0.0], "isController": false}, {"data": ["Login by user OS", 3, 0, 0.0, 2468.3333333333335, 2451, 2489, 2465.0, 2489.0, 2489.0, 2489.0, 0.11102886750555144, 1.3742352308475203, 0.0699351753330866], "isController": false}, {"data": ["Get SR link result-0", 15, 0, 0.0, 1.9333333333333333, 0, 6, 2.0, 5.4, 6.0, 6.0, 0.18904306400998147, 2.2301543182161896, 0.0], "isController": false}, {"data": ["Generate user hedera data", 3, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12229423994129877, 0.0, 0.0], "isController": true}, {"data": ["Verify link", 6, 0, 0.0, 672.6666666666666, 390, 1437, 530.0, 1437.0, 1437.0, 1437.0, 0.04372859121055317, 0.6368403132060345, 0.027650647274251147], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 1729.0, 1729, 1729, 1729.0, 1729.0, 1729.0, 1729.0, 0.578368999421631, 4.964145640543666, 0.2050272917871602], "isController": false}, {"data": ["Get SR Access Token", 9, 0, 0.0, 752.8888888888889, 313, 1141, 752.0, 1141.0, 1141.0, 1141.0, 0.025928081264368477, 0.27944428469465366, 0.02089776341490116], "isController": false}, {"data": ["Generate sr hedera data", 3, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.1660302174995849, 0.0, 0.0], "isController": true}, {"data": ["Login by SR", 3, 0, 0.0, 3072.3333333333335, 1003, 7185, 1029.0, 7185.0, 7185.0, 7185.0, 0.119099606971297, 1.2914088242883799, 0.04396450335463893], "isController": false}, {"data": ["Get user key gen result-0", 3, 0, 0.0, 0.3333333333333333, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12231917149147843, 1.5021128725638098, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.16616816218012628, 1.4635996524315942, 0.0], "isController": false}, {"data": ["Get SR DID-0", 3, 0, 0.0, 2.3333333333333335, 2, 3, 2.0, 3.0, 3.0, 3.0, 0.09877518767285658, 1.3113435071776636, 0.0], "isController": false}, {"data": ["Get user keys-0", 3, 0, 0.0, 0.6666666666666667, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12229423994129877, 1.5048720241734947, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 310, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
