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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.7552904097253489, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [0.475, 500, 1500, "WS open for sr link"], "isController": false}, {"data": [0.9375, 500, 1500, "Agree terms"], "isController": false}, {"data": [0.475, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.7317073170731707, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [0.95, 500, 1500, "Import Policy"], "isController": false}, {"data": [0.95, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [0.95, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Tenant creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [0.475, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.9484536082474226, 500, 1500, "Get SR link result"], "isController": false}, {"data": [0.975, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.5, 500, 1500, "Accept user"], "isController": false}, {"data": [0.5, 500, 1500, "Login by user"], "isController": false}, {"data": [0.525, 500, 1500, "Get SR DID"], "isController": false}, {"data": [0.925, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen"], "isController": false}, {"data": [0.9264705882352942, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [0.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [1.0, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Link SR"], "isController": true}, {"data": [0.5, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for user link"], "isController": false}, {"data": [0.8666666666666667, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [0.7625, 500, 1500, "Verify link"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.975, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.5, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1960, 0, 0.0, 514.2806122448983, 0, 24345, 3.5, 2056.0, 2073.0, 7686.599999999982, 3.561382979496609, 152.72508542322313, 1.3097962561869945], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 20, 0, 0.0, 1.6499999999999997, 0, 3, 2.0, 2.900000000000002, 3.0, 3.0, 0.1050491892828817, 4.01303804060939, 0.0], "isController": false}, {"data": ["WS open for sr link", 20, 0, 0.0, 1004.7500000000001, 891, 1590, 965.5, 1112.4, 1566.5999999999997, 1590.0, 0.1045467376190526, 4.2910258959002, 0.06437689981024768], "isController": false}, {"data": ["Agree terms", 40, 0, 0.0, 353.55000000000007, 261, 1043, 286.0, 741.1999999999996, 833.4999999999998, 1043.0, 0.1081238883512729, 4.571085205678666, 0.07096158121725873], "isController": false}, {"data": ["Link SR profile", 20, 0, 0.0, 859.95, 709, 2554, 773.0, 845.0, 2468.6499999999987, 2554.0, 0.10470272279430626, 4.313609030871598, 0.1348763297245795], "isController": false}, {"data": ["Invite sr-0", 20, 0, 0.0, 1.5, 0, 3, 1.5, 2.900000000000002, 3.0, 3.0, 0.1050789931330878, 4.008337730779739, 0.0], "isController": false}, {"data": ["Link user profile-0", 20, 0, 0.0, 2.0999999999999996, 1, 4, 2.0, 3.0, 3.9499999999999993, 4.0, 0.08347349925082534, 3.78153292951289, 0.0], "isController": false}, {"data": ["Import Policy-0", 20, 0, 0.0, 2.05, 0, 3, 2.0, 3.0, 3.0, 3.0, 0.08321475231128975, 3.802901990964958, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 41, 0, 0.0, 548.6585365853658, 233, 2003, 715.0, 855.8000000000003, 1002.0999999999998, 2003.0, 0.21219445292647204, 8.181121146859264, 0.17544555174439366], "isController": false}, {"data": ["Agree terms-0", 40, 0, 0.0, 1.9, 0, 3, 2.0, 3.0, 3.0, 3.0, 0.10820198063725557, 4.550400482580834, 0.0], "isController": false}, {"data": ["Import Policy", 20, 0, 0.0, 304.34999999999997, 245, 751, 263.5, 546.8000000000005, 742.0499999999998, 751.0, 0.08313070224660724, 3.8277182765446724, 0.06635843360974292], "isController": false}, {"data": ["Invite sr", 20, 0, 0.0, 391.4, 283, 737, 370.5, 570.4000000000002, 729.0999999999999, 737.0, 0.10492078480747036, 4.033553544027384, 0.08248167165040395], "isController": false}, {"data": ["Generate user keys", 20, 0, 0.0, 2059.8500000000004, 2035, 2082, 2060.5, 2079.8, 2081.9, 2082.0, 0.082963798746417, 3.51424605092318, 0.059350713644226345], "isController": false}, {"data": ["Generate sr keys", 20, 0, 0.0, 2065.0, 2033, 2082, 2067.0, 2077.8, 2081.8, 2082.0, 0.10395442637947525, 4.131213875836833, 0.07588977679685226], "isController": false}, {"data": ["Get policy id", 20, 0, 0.0, 347.3, 234, 2027, 249.0, 310.6, 1941.2499999999989, 2027.0, 0.07964351562406667, 4.06263595397003, 0.05968597059561403], "isController": false}, {"data": ["Tenant creation flow", 1, 0, 0.0, 1660.0, 1660, 1660, 1660.0, 1660.0, 1660.0, 1660.0, 0.6024096385542169, 91.85217432228916, 1.4836690512048194], "isController": true}, {"data": ["Get Access Token-0", 40, 0, 0.0, 0.8999999999999998, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.10820549305185478, 4.378478743199961, 0.0], "isController": false}, {"data": ["WS open for policy import", 20, 0, 0.0, 1028.0, 943, 1670, 982.0, 1245.5000000000005, 1650.0499999999997, 1670.0, 0.08286926544683108, 3.8057426911897543, 0.06008021744895253], "isController": false}, {"data": ["Generate sr keys-0", 20, 0, 0.0, 0.8999999999999999, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.10508120149845794, 4.14171809077965, 0.0], "isController": false}, {"data": ["Dry Run Policy", 20, 0, 0.0, 10693.700000000003, 7632, 24345, 9599.5, 14756.300000000003, 23873.499999999993, 24345.0, 0.07683087986723623, 4.570724565617413, 0.060579348051568886], "isController": false}, {"data": ["Invite and accept user", 20, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.10503925842283554, 0.0, 0.0], "isController": true}, {"data": ["Get SR link result", 97, 0, 0.0, 336.3195876288659, 246, 1362, 279.0, 537.6000000000005, 756.6999999999998, 1362.0, 0.34754941830259733, 14.875152192830809, 0.2225228818296148], "isController": false}, {"data": ["Get User Access Token", 20, 0, 0.0, 304.8499999999999, 248, 766, 271.5, 371.1000000000001, 746.4499999999997, 766.0, 0.08359072310155019, 3.6365025732881664, 0.05490130939643319], "isController": false}, {"data": ["Accept user", 20, 0, 0.0, 558.6, 537, 613, 554.0, 580.8, 611.4, 613.0, 0.1047400091123808, 4.093467652030123, 0.08965806151118885], "isController": false}, {"data": ["Login by user", 20, 0, 0.0, 697.2, 555, 1375, 612.5, 1102.7, 1361.3999999999999, 1375.0, 0.08346130733791814, 3.5968807770873674, 0.031179807736445884], "isController": false}, {"data": ["Get SR DID", 20, 0, 0.0, 832.1499999999999, 271, 3181, 754.0, 838.2, 3063.8999999999983, 3181.0, 0.08344424464183643, 3.7869711786186637, 0.05105663230502209], "isController": false}, {"data": ["Link user profile", 20, 0, 0.0, 394.75000000000006, 251, 941, 289.0, 940.5, 941.0, 941.0, 0.08338197281747686, 3.8053162847598596, 0.07450635266405403], "isController": false}, {"data": ["Get key gen result", 20, 0, 0.0, 2068.8999999999996, 2048, 2111, 2066.5, 2084.3, 2109.7, 2111.0, 0.10394416119660518, 4.183493642840066, 0.07811545825082765], "isController": false}, {"data": ["Invite user", 20, 0, 0.0, 306.7999999999999, 248, 368, 306.0, 353.6, 367.3, 368.0, 0.10488777008600797, 4.038112569160373, 0.07928040434235367], "isController": false}, {"data": ["Login by SR-0", 20, 0, 0.0, 2.45, 0, 15, 2.0, 3.0, 14.399999999999991, 15.0, 0.10502160819588631, 4.185639271451976, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 20, 0, 0.0, 2.45, 1, 3, 3.0, 3.0, 3.0, 3.0, 0.08321752228149158, 3.803044831619746, 0.0], "isController": false}, {"data": ["User creation flow", 20, 0, 0.0, 34830.25, 32848, 40683, 34266.5, 38086.0, 40555.25, 40683.0, 0.08670019074041962, 136.53982078799635, 2.323611679328507], "isController": true}, {"data": ["Setup ipfs", 1, 0, 0.0, 283.0, 283, 283, 283.0, 283.0, 283.0, 283.0, 3.5335689045936394, 135.1762643551237, 2.5017943904593642], "isController": false}, {"data": ["WS open for sr key gen-0", 20, 0, 0.0, 0.9499999999999998, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.1050878271515419, 4.141938187340069, 0.0], "isController": false}, {"data": ["Requests for DryRun", 20, 0, 0.0, 11036.749999999998, 7873, 25144, 9855.5, 15784.800000000005, 24688.09999999999, 25144.0, 0.0767489159215626, 8.160665760869566, 0.14617895328869107], "isController": true}, {"data": ["WS open for sr key gen", 20, 0, 0.0, 1.95, 1, 3, 2.0, 2.0, 2.9499999999999993, 3.0, 0.10508727498187244, 4.155154957754915, 0.07599841942170472], "isController": false}, {"data": ["Get user link result", 34, 0, 0.0, 455.52941176470586, 250, 3304, 271.5, 446.5, 3151.0, 3304.0, 0.14176058305293923, 6.62518589789694, 0.08868179856655034], "isController": false}, {"data": ["Generate user keys-0", 20, 0, 0.0, 1.2999999999999998, 0, 8, 1.0, 1.9000000000000021, 7.699999999999996, 8.0, 0.08367535635242386, 3.517094221589079, 0.0], "isController": false}, {"data": ["Link user", 20, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.08366870539412144, 0.0, 0.0], "isController": true}, {"data": ["Login by Admin-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 18427.734375, 0.0], "isController": false}, {"data": ["User creation(SR side)", 20, 0, 0.0, 16281.100000000002, 15478, 17573, 16203.5, 17405.0, 17565.75, 17573.0, 0.09676092793729892, 67.18175009524904, 1.1055644715039068], "isController": true}, {"data": ["Get Access Token", 40, 0, 0.0, 2064.8000000000006, 2040, 2083, 2065.5, 2076.9, 2080.9, 2083.0, 0.1076015085731502, 4.42928107313002, 0.1129947189515847], "isController": false}, {"data": ["Get user keys", 20, 0, 0.0, 2063.5000000000005, 2052, 2076, 2063.0, 2072.8, 2075.85, 2076.0, 0.08295175525914128, 3.5614534145534704, 0.06112426458084478], "isController": false}, {"data": ["Get policy id-0", 20, 0, 0.0, 2.1, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.0797216121304405, 3.673383482379531, 0.0], "isController": false}, {"data": ["WS open for user key gen-0", 20, 0, 0.0, 0.8999999999999999, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0836844593774713, 3.517464587090417, 0.0], "isController": false}, {"data": ["Requests for Import", 20, 0, 0.0, 4355.25, 3571, 7944, 4165.5, 5792.8, 7836.899999999999, 7944.0, 0.08180695195477711, 36.43227467681141, 0.5901444864159556], "isController": true}, {"data": ["Setup ipfs-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 19020.5078125, 0.0], "isController": false}, {"data": ["User creation(user side)", 20, 0, 0.0, 15576.249999999996, 14452, 21178, 14986.5, 18386.600000000006, 21052.3, 21178.0, 0.0786123350614945, 50.8163798872306, 0.822182153132898], "isController": true}, {"data": ["Get policy import result-0", 105, 0, 0.0, 2.40952380952381, 0, 10, 2.0, 3.0, 4.0, 10.0, 0.35898295001931674, 16.522260388496477, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 41, 0, 0.0, 1.9512195121951224, 0, 16, 2.0, 2.8000000000000043, 3.8999999999999986, 16.0, 0.21247046142365575, 8.065193289820074, 0.0], "isController": false}, {"data": ["Accept sr-0", 20, 0, 0.0, 1.55, 0, 4, 2.0, 2.900000000000002, 3.9499999999999993, 4.0, 0.10503705182002951, 4.012589757443188, 0.0], "isController": false}, {"data": ["Get user link result-0", 34, 0, 0.0, 2.5294117647058822, 0, 4, 3.0, 4.0, 4.0, 4.0, 0.14191205626395642, 6.467645225076695, 0.0], "isController": false}, {"data": ["Login by SR OS", 20, 0, 0.0, 2528.9999999999995, 2486, 2606, 2515.0, 2600.1, 2605.75, 2606.0, 0.1037059314607499, 4.0492912671827765, 0.0334765582464364], "isController": false}, {"data": ["Create new tenant-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 18988.76953125, 0.0], "isController": false}, {"data": ["Get sr keys", 20, 0, 0.0, 2060.1, 2037, 2089, 2060.0, 2083.9, 2088.75, 2089.0, 0.10393605853678817, 4.190922135327347, 0.07810936899119662], "isController": false}, {"data": ["WS open for user key gen", 20, 0, 0.0, 1.9999999999999998, 1, 3, 2.0, 2.900000000000002, 3.0, 3.0, 0.0836844593774713, 3.528006867617462, 0.05929419873176202], "isController": false}, {"data": ["Get SR Access Token-0", 60, 0, 0.0, 2.766666666666667, 1, 18, 2.0, 3.8999999999999986, 13.599999999999966, 18.0, 0.11959409763263484, 5.2638357134635045, 0.0], "isController": false}, {"data": ["Verify link-0", 40, 0, 0.0, 2.3249999999999993, 0, 10, 2.0, 3.0, 4.0, 10.0, 0.11747430249632893, 5.110636930983847, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 20, 0, 0.0, 2.35, 1, 4, 2.5, 3.900000000000002, 4.0, 4.0, 0.08007174428287746, 3.6972502362116453, 0.0], "isController": false}, {"data": ["Policy import and dry run", 20, 0, 0.0, 15392.0, 11529, 30946, 14037.0, 23294.600000000013, 30597.199999999997, 30946.0, 0.07867975373237081, 43.405564779254114, 0.7174417954228054], "isController": true}, {"data": ["Invite and accept SR", 20, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.10526481997084165, 0.0, 0.0], "isController": true}, {"data": ["Get key gen result-0", 20, 0, 0.0, 0.8499999999999999, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.1050696086157079, 4.153681745797216, 0.0], "isController": false}, {"data": ["Link SR", 20, 0, 0.0, 5491.45, 4717, 6797, 5425.5, 6629.000000000001, 6789.95, 6797.0, 0.10208873552892174, 46.53428881477531, 0.7487819936526329], "isController": true}, {"data": ["Accept sr", 20, 0, 0.0, 604.0000000000001, 555, 736, 590.5, 704.2000000000002, 734.6999999999999, 736.0, 0.1046895692547673, 4.289312609924048, 0.08961488469752567], "isController": false}, {"data": ["User creation(admin side)", 20, 0, 0.0, 2972.9, 2600, 4863, 2881.5, 3298.5000000000005, 4785.449999999999, 4863.0, 0.10353360183047408, 24.239941023054342, 0.5089829150144429], "isController": true}, {"data": ["Login by user OS-0", 20, 0, 0.0, 0.7999999999999999, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0836844593774713, 3.468246847187993, 0.0], "isController": false}, {"data": ["WS open for user link", 20, 0, 0.0, 1027.75, 928, 1285, 996.0, 1208.2, 1281.2, 1285.0, 0.08325389524162362, 3.630174717405059, 0.05004583517185685], "isController": false}, {"data": ["Get policy import result", 105, 0, 0.0, 457.26666666666665, 248, 2390, 296.0, 795.4000000000001, 1165.3999999999965, 2387.0, 0.3585685941720651, 17.488923058436434, 0.26870634213932265], "isController": false}, {"data": ["WS open for sr link-0", 20, 0, 0.0, 3.1500000000000004, 1, 15, 3.0, 4.800000000000004, 14.499999999999993, 15.0, 0.10509279693969775, 4.2898335773456715, 0.0], "isController": false}, {"data": ["WS open for user link-0", 20, 0, 0.0, 2.3, 1, 4, 3.0, 3.0, 3.9499999999999993, 4.0, 0.083700569582376, 3.630851421811113, 0.0], "isController": false}, {"data": ["Create new tenant", 1, 0, 0.0, 331.0, 331, 331, 331.0, 331.0, 331.0, 331.0, 3.0211480362537766, 116.51482250755286, 2.245208648036254], "isController": false}, {"data": ["Get user key gen result", 20, 0, 0.0, 2066.2999999999997, 2040, 2085, 2067.0, 2079.7, 2084.75, 2085.0, 0.08295519589869511, 3.5558210049814596, 0.06112679986851602], "isController": false}, {"data": ["Login by user-0", 20, 0, 0.0, 1.95, 0, 3, 2.0, 3.0, 3.0, 3.0, 0.08368060785593547, 3.553778127144316, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 20, 0, 0.0, 2.3, 1, 3, 2.5, 3.0, 3.0, 3.0, 0.0836848095333735, 3.591598385092388, 0.0], "isController": false}, {"data": ["Link SR profile-0", 20, 0, 0.0, 2.1999999999999993, 0, 11, 2.0, 3.900000000000002, 10.649999999999995, 11.0, 0.10511212836293116, 4.2952675235057, 0.0], "isController": false}, {"data": ["Accept user-0", 20, 0, 0.0, 1.8, 0, 4, 2.0, 3.0, 3.9499999999999993, 4.0, 0.10505857015286023, 4.0196804249619165, 0.0], "isController": false}, {"data": ["Get sr keys-0", 20, 0, 0.0, 0.75, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.10505857015286023, 4.16108372018963, 0.0], "isController": false}, {"data": ["Login by user OS", 20, 0, 0.0, 2506.1000000000004, 2468, 2577, 2501.0, 2569.7000000000003, 2576.85, 2577.0, 0.08282053618015123, 3.4952935289209313, 0.0660865821414078], "isController": false}, {"data": ["Get SR link result-0", 97, 0, 0.0, 2.2474226804123707, 1, 4, 2.0, 3.0, 3.0, 4.0, 0.3479009378978893, 14.360111375374352, 0.0], "isController": false}, {"data": ["Generate user hedera data", 20, 0, 0.0, 0.049999999999999996, 0, 1, 0.0, 0.0, 0.9499999999999993, 1.0, 0.08368340892734606, 0.0, 0.0], "isController": true}, {"data": ["Verify link", 40, 0, 0.0, 545.9249999999998, 246, 1374, 437.0, 879.6999999999999, 952.6499999999999, 1374.0, 0.11721233894292053, 5.304925724921687, 0.07417915649605433], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 793.0, 793, 793, 793.0, 793.0, 793.0, 793.0, 1.2610340479192939, 47.2764620113493, 0.4470267181588903], "isController": false}, {"data": ["Get SR Access Token", 60, 0, 0.0, 312.8333333333333, 236, 1111, 268.0, 384.3999999999999, 783.7499999999986, 1111.0, 0.11953310369695967, 5.341592769890807, 0.1105681209196877], "isController": false}, {"data": ["Generate sr hedera data", 20, 0, 0.0, 10789.65, 10740, 10880, 10776.5, 10855.2, 10878.9, 10880.0, 0.09942581591310184, 23.711527840781983, 0.4067622759812085], "isController": true}, {"data": ["Login by SR", 20, 0, 0.0, 658.65, 586, 1436, 615.0, 703.9000000000001, 1399.7499999999995, 1436.0, 0.1046709407300798, 4.238217363927777, 0.03869451622399581], "isController": false}, {"data": ["Get user key gen result-0", 20, 0, 0.0, 1.05, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.08367010550800304, 3.5266540926186236, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 20, 0, 0.0, 0.7500000000000001, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.10507678486053684, 4.022255180942223, 0.0], "isController": false}, {"data": ["Get SR DID-0", 20, 0, 0.0, 2.45, 1, 4, 3.0, 3.900000000000002, 4.0, 4.0, 0.08370512359061498, 3.633264213391564, 0.0], "isController": false}, {"data": ["Get user keys-0", 20, 0, 0.0, 0.95, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.08366870539412144, 3.532424924332114, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1960, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
