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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8266153290819396, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [0.7475247524752475, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Get OS user Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Tenant creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get OS SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.47, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.9751362397820164, 500, 1500, "Get SR link result"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.5, 500, 1500, "Accept user"], "isController": false}, {"data": [0.43, 500, 1500, "Login by user"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy i-Rec-0"], "isController": false}, {"data": [0.9770491803278688, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get OS SR Access Token-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs-0"], "isController": false}, {"data": [0.97, 500, 1500, "Import Policy i-Rec"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.01, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [0.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.49, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.9116809116809117, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [1.0, 500, 1500, "Verify link"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.9966666666666667, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.4633333333333333, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get OS user Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 7660, 0, 0.0, 347.3518276762402, 0, 24069, 153.5, 741.9000000000005, 2063.0, 2530.7800000000007, 10.227529143784906, 89.83560197178684, 3.540603159268398], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 50, 0, 0.0, 0.37999999999999995, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10206789556412925, 0.42948456031702287, 0.0], "isController": false}, {"data": ["Agree terms", 100, 0, 0.0, 269.72000000000014, 203, 392, 265.0, 324.6, 346.9, 391.91999999999996, 0.16448369390900433, 1.2904645307362455, 0.10799382528213067], "isController": false}, {"data": ["Link SR profile", 50, 0, 0.0, 256.64, 201, 392, 254.0, 298.9, 345.29999999999995, 392.0, 0.10205706214458629, 0.69369102058593, 0.13152205223484553], "isController": false}, {"data": ["Invite sr-0", 50, 0, 0.0, 0.7800000000000001, 0, 13, 0.0, 1.0, 2.4499999999999957, 13.0, 0.10206060358640962, 0.4237827359386004, 0.0], "isController": false}, {"data": ["Link user profile-0", 50, 0, 0.0, 1.2399999999999998, 0, 13, 1.0, 2.0, 2.0, 13.0, 0.09190500698478053, 1.0945545278150504, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 101, 0, 0.0, 510.0495049504952, 211, 1534, 358.0, 800.8, 823.9999999999999, 1521.0400000000027, 0.20494547638662863, 0.9370354326125069, 0.16996817321037958], "isController": false}, {"data": ["Agree terms-0", 100, 0, 0.0, 1.0699999999999996, 0, 11, 1.0, 2.0, 2.0, 10.919999999999959, 0.1645556914054208, 1.2545507362221633, 0.0], "isController": false}, {"data": ["Invite sr", 50, 0, 0.0, 358.98, 263, 482, 351.0, 441.9, 470.59999999999997, 482.0, 0.10196777410467196, 0.4537685441143181, 0.08016021304127044], "isController": false}, {"data": ["Generate user keys", 50, 0, 0.0, 2061.8999999999996, 2048, 2076, 2061.5, 2072.9, 2073.9, 2076.0, 0.09074377225491015, 0.7256701484295883, 0.06494028435922193], "isController": false}, {"data": ["Get OS user Access Token", 50, 0, 0.0, 2065.2400000000002, 2048, 2083, 2064.0, 2075.8, 2080.25, 2083.0, 0.09074064327856833, 0.711468673040592, 0.0741538917073941], "isController": false}, {"data": ["Generate sr keys", 50, 0, 0.0, 2065.2, 2042, 2091, 2066.0, 2075.9, 2079.0, 2091.0, 0.10164378326292807, 0.5771619886809483, 0.07422974023406531], "isController": false}, {"data": ["Get policy id", 50, 0, 0.0, 273.04, 209, 337, 271.0, 312.9, 320.84999999999997, 337.0, 0.08448057960436055, 1.4565012927640695, 0.06334063456742564], "isController": false}, {"data": ["Tenant creation flow", 1, 0, 0.0, 1703.0, 1703, 1703, 1703.0, 1703.0, 1703.0, 1703.0, 0.5871990604815032, 10.962387147680563, 1.4462070610687023], "isController": true}, {"data": ["Generate sr keys-0", 50, 0, 0.0, 0.9399999999999998, 0, 20, 1.0, 1.0, 1.0, 20.0, 0.1020733131364271, 0.5463075361747822, 0.0], "isController": false}, {"data": ["Get OS SR Access Token", 50, 0, 0.0, 2064.7999999999997, 2047, 2083, 2064.0, 2074.8, 2077.9, 2083.0, 0.10164626287349919, 0.561698836861814, 0.08256972107757236], "isController": false}, {"data": ["Dry Run Policy", 50, 0, 0.0, 9224.599999999997, 6466, 24069, 8242.5, 11541.2, 13566.999999999989, 24069.0, 0.0813521376087678, 2.088863901636317, 0.0641728541746663], "isController": false}, {"data": ["Invite and accept user", 50, 0, 0.0, 1190.2, 966, 1876, 1146.5, 1405.8, 1723.25, 1876.0, 0.10184004595022873, 1.4662917881533548, 0.2665165936897871], "isController": true}, {"data": ["Get SR link result", 1468, 0, 0.0, 279.13896457765685, 197, 1089, 250.0, 311.10000000000014, 498.1499999999994, 797.8599999999997, 2.4933335597941473, 19.655680154708122, 1.5970728701360464], "isController": false}, {"data": ["Get User Access Token", 50, 0, 0.0, 260.25999999999993, 209, 332, 258.0, 313.9, 321.79999999999995, 332.0, 0.09185503071632227, 0.8242392308013801, 0.060353419693902295], "isController": false}, {"data": ["Accept user", 50, 0, 0.0, 628.0999999999998, 503, 1314, 578.0, 810.8, 1154.6999999999998, 1314.0, 0.10195218034932896, 0.518797210231513, 0.08729854567763537], "isController": false}, {"data": ["Login by user", 50, 0, 0.0, 923.34, 534, 1889, 721.0, 1740.8, 1810.1499999999999, 1889.0, 0.09176938720074003, 0.7918138752789788, 0.0343077703204954], "isController": false}, {"data": ["Get SR DID", 50, 0, 0.0, 263.9800000000001, 204, 352, 259.0, 298.9, 323.04999999999995, 352.0, 0.09185604320908272, 1.1055359197315966, 0.056227739262028543], "isController": false}, {"data": ["Link user profile", 50, 0, 0.0, 253.77999999999992, 211, 317, 251.0, 306.09999999999997, 308.45, 317.0, 0.09186178108970118, 1.124809831759741, 0.08213555618174669], "isController": false}, {"data": ["Get key gen result", 51, 0, 0.0, 2063.078431372549, 2042, 2077, 2064.0, 2074.8, 2076.0, 2077.0, 0.10369267929684164, 0.6410504449635855, 0.07795217886783859], "isController": false}, {"data": ["Invite user", 50, 0, 0.0, 303.18000000000006, 217, 467, 296.5, 374.29999999999995, 417.6999999999997, 467.0, 0.10201937143824868, 0.45966700813400446, 0.07711229833320751], "isController": false}, {"data": ["Login by SR-0", 150, 0, 0.0, 1.0666666666666667, 0, 4, 1.0, 2.0, 2.0, 3.490000000000009, 0.21227846972696743, 2.1282865240143556, 0.0], "isController": false}, {"data": ["User creation flow", 50, 0, 0.0, 38457.600000000006, 32830, 44744, 39018.5, 42788.4, 43647.1, 44744.0, 0.09454583960487403, 48.32713730620466, 3.9426630744368847], "isController": true}, {"data": ["Setup ipfs", 1, 0, 0.0, 301.0, 301, 301, 301.0, 301.0, 301.0, 301.0, 3.3222591362126246, 15.962416943521594, 2.3521854235880397], "isController": false}, {"data": ["Requests for DryRun", 50, 0, 0.0, 10303.579999999996, 7312, 24939, 9579.5, 12857.4, 14803.249999999993, 24939.0, 0.0812438762428282, 4.210430563600956, 0.2226209152610122], "isController": true}, {"data": ["Import Policy i-Rec-0", 50, 0, 0.0, 1.3000000000000003, 0, 10, 1.0, 2.0, 3.4499999999999957, 10.0, 0.08609156354332215, 1.0464261401105759, 0.0], "isController": false}, {"data": ["Get user link result", 305, 0, 0.0, 278.7573770491802, 195, 923, 248.0, 319.80000000000007, 453.2999999999998, 850.22, 0.5220198230609532, 6.924610001450531, 0.3267203601851202], "isController": false}, {"data": ["Generate user keys-0", 50, 0, 0.0, 0.6599999999999998, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0910854654922714, 0.6986931228196417, 0.0], "isController": false}, {"data": ["Link user", 50, 0, 0.0, 22359.739999999994, 8484, 48070, 18716.0, 37584.399999999994, 39750.499999999985, 48070.0, 0.0848455641042175, 0.0, 0.0], "isController": true}, {"data": ["Login by Admin-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3404.296875, 0.0], "isController": false}, {"data": ["User creation(SR side)", 50, 0, 0.0, 20739.480000000003, 15714, 26410, 20769.5, 24863.1, 25219.1, 26410.0, 0.09784716663959563, 28.905054429932623, 2.525003467458968], "isController": true}, {"data": ["Get OS SR Access Token-0", 50, 0, 0.0, 0.46000000000000013, 0, 7, 0.0, 1.0, 1.4499999999999957, 7.0, 0.1020726880025804, 0.49190463106337284, 0.0], "isController": false}, {"data": ["Get user keys", 50, 0, 0.0, 2061.7000000000003, 2042, 2083, 2062.5, 2070.9, 2074.35, 2083.0, 0.09159471901488048, 0.7811347910174891, 0.06751711504571492], "isController": false}, {"data": ["Get policy id-0", 50, 0, 0.0, 1.3599999999999999, 0, 13, 1.0, 2.0, 2.0, 13.0, 0.08451927969289075, 1.0402672563013349, 0.0], "isController": false}, {"data": ["Requests for Import", 50, 0, 0.0, 74667.56000000003, 42693, 115591, 74092.5, 105611.8, 106703.84999999999, 115591.0, 0.07879289288106213, 12.749713452409091, 0.6732729582791632], "isController": true}, {"data": ["Setup ipfs-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4590.8203125, 0.0], "isController": false}, {"data": ["Import Policy i-Rec", 50, 0, 0.0, 300.58, 212, 760, 274.5, 353.09999999999997, 627.6999999999995, 760.0, 0.08605348396135166, 1.0756282119462888, 0.06872177445726067], "isController": false}, {"data": ["User creation(user side)", 50, 0, 0.0, 14763.660000000002, 13199, 16609, 14735.5, 16043.6, 16255.599999999999, 16609.0, 0.08865892733336998, 16.45296702087386, 0.9733728565596081], "isController": true}, {"data": ["Get policy import result-0", 351, 0, 0.0, 1.15954415954416, 0, 7, 1.0, 2.0, 2.0, 3.0, 0.5634282118618493, 7.1233105932128575, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 101, 0, 0.0, 0.5544554455445543, 0, 3, 1.0, 1.0, 1.0, 3.0, 0.2050574059223015, 0.8153938504349856, 0.0], "isController": false}, {"data": ["Accept sr-0", 50, 0, 0.0, 0.5200000000000001, 0, 2, 0.5, 1.0, 1.0, 2.0, 0.10205852035557188, 0.4294510910055826, 0.0], "isController": false}, {"data": ["Get user link result-0", 305, 0, 0.0, 1.104918032786885, 0, 4, 1.0, 2.0, 2.0, 3.0, 0.5222245051708787, 6.432945784963359, 0.0], "isController": false}, {"data": ["Login by SR OS", 50, 0, 0.0, 2524.6800000000003, 2474, 2642, 2516.0, 2577.9, 2600.75, 2642.0, 0.10153748053018812, 0.5112332818538308, 0.03280334893456722], "isController": false}, {"data": ["Create new tenant-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4525.390625, 0.0], "isController": false}, {"data": ["Get sr keys", 50, 0, 0.0, 2061.18, 2035, 2079, 2062.0, 2074.6, 2078.45, 2079.0, 0.10166713772440479, 0.6312039987972777, 0.07643105074511845], "isController": false}, {"data": ["Get SR Access Token-0", 150, 0, 0.0, 1.0199999999999998, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.21226615345427788, 2.155099838058614, 0.0], "isController": false}, {"data": ["Verify link-0", 100, 0, 0.0, 0.8699999999999999, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.16442716862992707, 1.5320902870610615, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 50, 0, 0.0, 1.3399999999999996, 0, 5, 1.0, 2.0, 2.4499999999999957, 5.0, 0.08248524751348221, 1.0195031599067257, 0.0], "isController": false}, {"data": ["Policy import and dry run", 50, 0, 0.0, 84971.14000000001, 51049, 125823, 84592.5, 115962.59999999999, 118915.09999999999, 125823.0, 0.07593867799874245, 16.22335525366556, 0.8569679812158085], "isController": true}, {"data": ["Invite and accept SR", 50, 0, 0.0, 1764.2599999999998, 1495, 2935, 1734.0, 1949.3999999999999, 2256.549999999999, 2935.0, 0.10169815580564262, 1.6033866312180796, 0.23386801880297203], "isController": true}, {"data": ["Link SR", 50, 0, 0.0, 98460.29999999999, 41176, 166384, 102113.5, 146615.0, 154531.05, 166384.0, 0.08424358527219945, 0.0, 0.0], "isController": true}, {"data": ["Get key gen result-0", 51, 0, 0.0, 0.411764705882353, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1041283841724856, 0.5696973481716281, 0.0], "isController": false}, {"data": ["Accept sr", 50, 0, 0.0, 639.32, 516, 1838, 591.0, 716.4, 996.2499999999999, 1838.0, 0.10194157931972345, 0.7113710384228007, 0.0872894683389843], "isController": false}, {"data": ["User creation(admin side)", 50, 0, 0.0, 2954.46, 2507, 4158, 2870.0, 3317.8, 3930.699999999999, 4158.0, 0.10148101391710625, 3.061085592512122, 0.498945675691035], "isController": true}, {"data": ["Login by user OS-0", 50, 0, 0.0, 0.2999999999999999, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.0910838062100939, 0.6002422829245188, 0.0], "isController": false}, {"data": ["Get policy import result", 351, 0, 0.0, 361.43304843304855, 212, 1000, 271.0, 779.4000000000001, 810.0, 886.4000000000001, 0.5631904498303208, 8.548442363735187, 0.4222956880229769], "isController": false}, {"data": ["Create new tenant", 1, 0, 0.0, 360.0, 360, 360, 360.0, 360.0, 360.0, 360.0, 2.7777777777777777, 14.20627170138889, 2.064344618055556], "isController": false}, {"data": ["Get user key gen result", 51, 0, 0.0, 2066.196078431372, 2048, 2084, 2066.0, 2076.0, 2081.0, 2084.0, 0.0925616714822935, 0.7867653456134842, 0.0682284302947091], "isController": false}, {"data": ["Login by user-0", 50, 0, 0.0, 0.9799999999999999, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.0918982502573151, 0.7351626685184164, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 50, 0, 0.0, 1.1400000000000003, 0, 10, 1.0, 2.0, 2.0, 10.0, 0.09189183228637907, 0.7707427433020043, 0.0], "isController": false}, {"data": ["Link SR profile-0", 50, 0, 0.0, 0.84, 0, 2, 1.0, 1.0, 1.4499999999999957, 2.0, 0.10211855146877112, 0.6599032433107243, 0.0], "isController": false}, {"data": ["Accept user-0", 50, 0, 0.0, 0.39999999999999997, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10205664552052972, 0.4355287280527184, 0.0], "isController": false}, {"data": ["Get sr keys-0", 50, 0, 0.0, 0.27999999999999997, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10209728237453776, 0.5608909627824776, 0.0], "isController": false}, {"data": ["Login by user OS", 50, 0, 0.0, 2518.120000000001, 2473, 2638, 2509.0, 2593.2, 2615.7, 2638.0, 0.09067301135951487, 0.6663935047748407, 0.029647595374406997], "isController": false}, {"data": ["Get SR link result-0", 1468, 0, 0.0, 0.8930517711171664, 0, 112, 1.0, 1.0, 2.0, 2.0, 2.4944096677065706, 16.484061247379003, 0.0], "isController": false}, {"data": ["Generate user hedera data", 50, 0, 0.0, 13890.66, 13725, 18863, 13785.0, 13861.9, 13910.25, 18863.0, 0.08885697936030083, 0.0, 0.0], "isController": true}, {"data": ["Verify link", 100, 0, 0.0, 269.28999999999996, 198, 496, 262.5, 314.70000000000005, 353.84999999999997, 494.8899999999994, 0.16435690430483604, 1.819853058250552, 0.10405846503799931], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 771.0, 771, 771, 771.0, 771.0, 771.0, 771.0, 1.297016861219196, 5.238732166018158, 0.45978234435797666], "isController": false}, {"data": ["Get SR Access Token", 150, 0, 0.0, 261.1133333333334, 209, 779, 255.5, 294.0, 309.45, 575.0000000000036, 0.2121862825812037, 2.2971513505303243, 0.19637177370757333], "isController": false}, {"data": ["Generate sr hedera data", 50, 0, 0.0, 13897.48, 13715, 18856, 13788.5, 13875.6, 13948.8, 18856.0, 0.09926445042237024, 0.0, 0.0], "isController": true}, {"data": ["Login by SR", 150, 0, 0.0, 823.9266666666668, 517, 2715, 643.5, 1351.3000000000002, 2087.1499999999996, 2582.4000000000024, 0.21209507515235496, 2.2730088359692036, 0.1364285000989777], "isController": false}, {"data": ["Get OS user Access Token-0", 50, 0, 0.0, 0.37999999999999995, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.0910843039883995, 0.6511140122726992, 0.0], "isController": false}, {"data": ["Get user key gen result-0", 51, 0, 0.0, 0.4509803921568628, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.09291005213893513, 0.7236572960351091, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 50, 0, 0.0, 0.4199999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10207477181184761, 0.4356240251859292, 0.0], "isController": false}, {"data": ["Get SR DID-0", 50, 0, 0.0, 0.86, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.0918996015233278, 0.8073918468052023, 0.0], "isController": false}, {"data": ["Get user keys-0", 50, 0, 0.0, 0.6599999999999999, 0, 3, 1.0, 1.0, 1.0, 3.0, 0.09193897458622864, 0.7183486576450014, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 7660, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
