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

    var data = {"OkPercent": 99.98213488164359, "KoPercent": 0.01786511835640911};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8720763320104703, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.7524752475247525, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [0.96, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Get OS user Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [0.9897959183673469, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Tenant creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get OS SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.49, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.9744585206375154, 500, 1500, "Get SR link result"], "isController": false}, {"data": [0.99, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.49, 500, 1500, "Accept user"], "isController": false}, {"data": [0.45, 500, 1500, "Login by user"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [0.9757281553398058, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get OS SR Access Token-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.01, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [0.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.9132762312633833, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [1.0, 500, 1500, "Verify link"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.47315436241610737, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get OS user Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11195, 2, 0.01786511835640911, 317.12657436355556, 0, 198755, 195.0, 571.0, 2023.1999999999935, 2500.039999999999, 12.613714978490771, 117.59878526622037, 4.3491837668699285], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 50, 0, 0.0, 0.52, 0, 2, 0.5, 1.0, 1.0, 2.0, 0.10202020408121625, 0.42928786773182565, 0.0], "isController": false}, {"data": ["Agree terms", 100, 0, 0.0, 258.7800000000001, 200, 412, 252.5, 300.0, 322.0, 411.98, 0.1504659931808812, 1.1804894719884984, 0.0987903286478223], "isController": false}, {"data": ["Link SR profile", 50, 0, 0.0, 259.78, 202, 380, 257.0, 297.0, 306.04999999999995, 380.0, 0.1019546750296688, 0.6929930948647469, 0.13139010483999233], "isController": false}, {"data": ["Invite sr-0", 50, 0, 0.0, 0.5600000000000002, 0, 2, 1.0, 1.0, 1.0, 2.0, 0.10205997860822849, 0.42377814750422527, 0.0], "isController": false}, {"data": ["Link user profile-0", 50, 0, 0.0, 1.0400000000000003, 0, 3, 1.0, 2.0, 2.4499999999999957, 3.0, 0.08207256199350971, 0.9844106887406294, 0.0], "isController": false}, {"data": ["Import Policy-0", 50, 0, 0.0, 1.26, 0, 3, 1.0, 2.0, 2.4499999999999957, 3.0, 0.07869157937147463, 0.9631357492697421, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 101, 0, 0.0, 502.4158415841584, 202, 879, 315.0, 795.6, 827.2999999999998, 878.4600000000002, 0.20491387530686359, 0.9369028364594535, 0.16994196537259834], "isController": false}, {"data": ["Agree terms-0", 100, 0, 0.0, 1.0400000000000003, 0, 11, 1.0, 2.0, 2.0, 10.909999999999954, 0.15055910122238933, 1.147844061892588, 0.0], "isController": false}, {"data": ["Import Policy", 50, 0, 0.0, 323.9, 210, 1183, 269.5, 449.2, 889.599999999999, 1183.0, 0.07866409487519155, 0.9899169592315461, 0.06281911810863197], "isController": false}, {"data": ["Invite sr", 50, 0, 0.0, 341.59999999999997, 243, 445, 344.0, 403.7, 430.94999999999993, 445.0, 0.10196943772012652, 0.4537739558074654, 0.08016152086396665], "isController": false}, {"data": ["Generate user keys", 50, 0, 0.0, 2059.7400000000007, 2042, 2078, 2059.0, 2069.0, 2071.9, 2078.0, 0.08179985864984425, 0.6541496352544303, 0.05853962149978404], "isController": false}, {"data": ["Get OS user Access Token", 50, 0, 0.0, 2062.64, 2046, 2081, 2064.5, 2071.0, 2074.0, 2081.0, 0.0818015984032328, 0.641377255167816, 0.06684884138261062], "isController": false}, {"data": ["Generate sr keys", 50, 0, 0.0, 2061.58, 2040, 2081, 2062.5, 2075.7, 2076.45, 2081.0, 0.10157357786833628, 0.5767633427051888, 0.07417846972802658], "isController": false}, {"data": ["Get policy id", 49, 0, 0.0, 254.79591836734696, 204, 547, 249.0, 303.0, 335.5, 547.0, 0.07233006125913352, 1.445569091814894, 0.05422880609270057], "isController": false}, {"data": ["Tenant creation flow", 1, 0, 0.0, 1619.0, 1619, 1619, 1619.0, 1619.0, 1619.0, 1619.0, 0.6176652254478073, 11.529951937924645, 1.521241893143916], "isController": true}, {"data": ["Generate sr keys-0", 50, 0, 0.0, 0.48, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10200105673094773, 0.5459208119896123, 0.0], "isController": false}, {"data": ["Get OS SR Access Token", 50, 0, 0.0, 2060.82, 2031, 2081, 2062.5, 2070.9, 2074.9, 2081.0, 0.10157357786833628, 0.5612892429518094, 0.08251067728753854], "isController": false}, {"data": ["Dry Run Policy", 49, 0, 0.0, 12568.857142857147, 8538, 20081, 11279.0, 18204.0, 19148.5, 20081.0, 0.07031158074782823, 2.582982294844439, 0.05546201479628295], "isController": false}, {"data": ["Invite and accept user", 50, 0, 0.0, 1155.5799999999997, 1027, 2027, 1132.0, 1231.7, 1301.3499999999995, 2027.0, 0.10178966590595856, 1.465556476469283, 0.2663847485235409], "isController": true}, {"data": ["Get SR link result", 2447, 0, 0.0, 281.7266040049043, 195, 1755, 252.0, 314.0, 660.3999999999996, 814.04, 3.7918643048739478, 29.85946957385303, 2.4288967332941804], "isController": false}, {"data": ["Get User Access Token", 50, 0, 0.0, 274.91999999999996, 209, 722, 259.5, 310.5, 363.89999999999964, 722.0, 0.0820386270671683, 0.7361316392835402, 0.053903544007160326], "isController": false}, {"data": ["Accept user", 50, 0, 0.0, 593.34, 510, 1517, 565.0, 639.7, 731.9999999999992, 1517.0, 0.1018983665691839, 0.5185094402467978, 0.08725246657733576], "isController": false}, {"data": ["Login by user", 50, 0, 0.0, 1005.16, 537, 2852, 991.0, 1706.3999999999994, 2388.7999999999965, 2852.0, 0.08193457360428551, 0.7069657471490864, 0.030631048307805248], "isController": false}, {"data": ["Get SR DID", 50, 0, 0.0, 266.0999999999999, 205, 434, 259.0, 302.9, 331.3499999999999, 434.0, 0.08204078083133565, 0.9943727202918027, 0.05021953343818145], "isController": false}, {"data": ["Link user profile", 50, 0, 0.0, 261.12000000000006, 204, 352, 255.5, 324.4, 336.45, 352.0, 0.0820430693296753, 1.0115381655128677, 0.07335643888365637], "isController": false}, {"data": ["Get key gen result", 51, 0, 0.0, 2063.8823529411757, 2028, 2118, 2063.0, 2077.8, 2082.2, 2118.0, 0.10360462848599103, 0.640504112062626, 0.07788796949656276], "isController": false}, {"data": ["Invite user", 50, 0, 0.0, 300.98, 229, 437, 288.0, 369.4, 387.2499999999999, 437.0, 0.10196361530351508, 0.45941977158620717, 0.07707015453605535], "isController": false}, {"data": ["Login by SR-0", 149, 0, 0.0, 0.9932885906040266, 0, 3, 1.0, 2.0, 2.0, 3.0, 0.1754902538130852, 1.7652829357075557, 0.0], "isController": false}, {"data": ["User creation flow", 50, 0, 0.0, 45120.419999999984, 31962, 52455, 46859.5, 50440.5, 51673.299999999996, 52455.0, 0.09349953811228172, 67.25661551599123, 5.3161426835676435], "isController": true}, {"data": ["Setup ipfs", 1, 0, 0.0, 232.0, 232, 232, 232.0, 232.0, 232.0, 232.0, 4.310344827586206, 20.709859913793103, 3.0517578125], "isController": false}, {"data": ["Requests for DryRun", 49, 0, 0.0, 13597.040816326533, 9357, 21297, 12512.0, 19301.0, 20133.5, 21297.0, 0.07022975161600092, 4.425090205816169, 0.19243478218027546], "isController": true}, {"data": ["Get user link result", 515, 0, 0.0, 280.0679611650487, 195, 1302, 252.0, 311.40000000000003, 496.7999999999983, 846.68, 0.8042037211989663, 10.546394637112831, 0.5033166083684034], "isController": false}, {"data": ["Generate user keys-0", 50, 0, 0.0, 0.5400000000000001, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.08207498699111455, 0.6295792713054356, 0.0], "isController": false}, {"data": ["Link user", 50, 0, 0.0, 36307.76000000001, 11842, 61465, 39077.0, 51630.0, 57934.34999999998, 61465.0, 0.07742167249393789, 0.0, 0.0], "isController": true}, {"data": ["Login by Admin-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["User creation(SR side)", 50, 0, 0.0, 26252.84, 15457, 32689, 26922.5, 31591.9, 31951.199999999997, 32689.0, 0.09685924221203263, 43.52272432842645, 3.7143760030985273], "isController": true}, {"data": ["Get OS SR Access Token-0", 50, 0, 0.0, 0.30000000000000016, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10200230525209869, 0.49155747638646635, 0.0], "isController": false}, {"data": ["Get user keys", 50, 0, 0.0, 2059.38, 2042, 2078, 2059.0, 2069.0, 2073.8, 2078.0, 0.08179985864984425, 0.6975962242412245, 0.06029704033796429], "isController": false}, {"data": ["Get policy id-0", 49, 0, 0.0, 1.3061224489795924, 0, 4, 1.0, 2.0, 2.5, 4.0, 0.07236231961107469, 0.8951534482675869, 0.0], "isController": false}, {"data": ["Requests for Import", 50, 1, 2.0, 195532.1, 104867, 280939, 198764.0, 260581.7, 265921.14999999997, 280939.0, 0.06393739250525886, 22.676359059209222, 1.1043698510418598], "isController": true}, {"data": ["Setup ipfs-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4590.8203125, 0.0], "isController": false}, {"data": ["User creation(user side)", 50, 0, 0.0, 16018.96, 13503, 19050, 16232.5, 17810.9, 18311.249999999996, 19050.0, 0.0800079367873293, 19.187625287428514, 1.0875156940568504], "isController": true}, {"data": ["Get policy import result-0", 934, 0, 0.0, 1.2548179871520346, 0, 14, 1.0, 2.0, 2.0, 3.0, 1.2124359057571235, 15.074533643392613, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 101, 0, 0.0, 0.6336633663366341, 0, 2, 1.0, 1.0, 1.0, 2.0, 0.20500829167199486, 0.8152104449441099, 0.0], "isController": false}, {"data": ["Accept sr-0", 50, 0, 0.0, 0.5399999999999999, 0, 3, 0.0, 1.0, 1.4499999999999957, 3.0, 0.10202311843863819, 0.42931208680637034, 0.0], "isController": false}, {"data": ["Get user link result-0", 515, 0, 0.0, 1.2252427184466024, 0, 14, 1.0, 2.0, 2.0, 3.0, 0.8044976888265425, 9.865435130246615, 0.0], "isController": false}, {"data": ["Login by SR OS", 50, 0, 0.0, 2503.4799999999987, 2472, 2633, 2495.5, 2531.9, 2585.6, 2633.0, 0.1014863693657305, 0.5109581017329812, 0.03278683663434664], "isController": false}, {"data": ["Create new tenant-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4523.4375, 0.0], "isController": false}, {"data": ["Get sr keys", 50, 0, 0.0, 2058.200000000001, 2022, 2077, 2058.5, 2070.9, 2073.45, 2077.0, 0.10157399055768185, 0.6306276752049763, 0.07636102481554163], "isController": false}, {"data": ["Get SR Access Token-0", 149, 0, 0.0, 1.0469798657718126, 0, 3, 1.0, 2.0, 2.0, 3.0, 0.1754896337448899, 1.7876994280686835, 0.0], "isController": false}, {"data": ["Verify link-0", 100, 0, 0.0, 0.8999999999999996, 0, 3, 1.0, 2.0, 2.0, 3.0, 0.15161806802193004, 1.4191569618468294, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 49, 0, 0.0, 3.4081632653061233, 0, 108, 1.0, 2.0, 2.5, 108.0, 0.07134983698746426, 0.8863200861986118, 0.0], "isController": false}, {"data": ["Policy import and dry run", 49, 0, 0.0, 209063.3673469388, 115823, 291566, 213706.0, 274819.0, 279738.0, 291566.0, 0.06105317981158241, 25.493507444049122, 1.2224531595955042], "isController": true}, {"data": ["Invite and accept SR", 50, 0, 0.0, 1693.04, 1444, 2218, 1673.0, 1824.3, 1887.3499999999995, 2218.0, 0.10166279670287218, 1.6028470253211529, 0.23378670598814205], "isController": true}, {"data": ["Link SR", 50, 0, 0.0, 163035.85999999993, 40992, 238860, 171436.5, 225347.6, 232099.55, 238860.0, 0.07690402838681495, 0.0, 0.0], "isController": true}, {"data": ["Get key gen result-0", 51, 0, 0.0, 0.25490196078431376, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10403810650646157, 0.5692014374088392, 0.0], "isController": false}, {"data": ["Accept sr", 50, 0, 0.0, 602.4000000000001, 506, 1171, 578.5, 688.3, 827.8499999999993, 1171.0, 0.10190252004932081, 0.711108425555114, 0.08725602307582567], "isController": false}, {"data": ["User creation(admin side)", 50, 0, 0.0, 2848.6199999999994, 2525, 4245, 2824.5, 2988.7999999999997, 3162.8499999999985, 4245.0, 0.10143057685597669, 3.059572127156414, 0.4986976947872798], "isController": true}, {"data": ["Login by user OS-0", 50, 0, 0.0, 0.32000000000000006, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.08207889423313688, 0.5409063254099841, 0.0], "isController": false}, {"data": ["Get policy import result", 934, 1, 0.10706638115631692, 352.9668094218415, 212, 1044, 270.5, 748.0, 794.25, 875.3, 1.2119356194885476, 19.25645541838379, 0.9087350296268951], "isController": false}, {"data": ["Create new tenant", 1, 0, 0.0, 356.0, 356, 356, 356.0, 356.0, 356.0, 356.0, 2.8089887640449436, 14.360406425561798, 2.0875395014044944], "isController": false}, {"data": ["Get user key gen result", 50, 0, 0.0, 2061.4999999999995, 2046, 2076, 2061.5, 2070.9, 2072.0, 2076.0, 0.08179718225066583, 0.6955045061045236, 0.06029506748676521], "isController": false}, {"data": ["Login by user-0", 50, 0, 0.0, 0.9400000000000004, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.08207067598332982, 0.6565541872664064, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 50, 0, 0.0, 1.2799999999999996, 0, 8, 1.0, 2.0, 2.4499999999999957, 8.0, 0.08207619954365633, 0.6883916809616047, 0.0], "isController": false}, {"data": ["Link SR profile-0", 50, 0, 0.0, 0.94, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.10199835170663643, 0.6591245047980024, 0.0], "isController": false}, {"data": ["Accept user-0", 50, 0, 0.0, 0.7200000000000001, 0, 3, 1.0, 1.0, 1.0, 3.0, 0.10200521858698292, 0.43529531658339643, 0.0], "isController": false}, {"data": ["Get sr keys-0", 50, 0, 0.0, 0.3799999999999999, 0, 2, 0.0, 1.0, 1.0, 2.0, 0.10199627101633164, 0.5603380296666354, 0.0], "isController": false}, {"data": ["Login by user OS", 50, 0, 0.0, 2534.08, 2472, 2744, 2511.5, 2603.6, 2701.7499999999995, 2744.0, 0.08174329010203198, 0.60077167198543, 0.026727820695275725], "isController": false}, {"data": ["Get SR link result-0", 2447, 0, 0.0, 0.9464650592562336, 0, 103, 1.0, 1.0, 2.0, 2.0, 3.7933044378716567, 25.070787171709423, 0.0], "isController": false}, {"data": ["Generate user hedera data", 50, 0, 0.0, 13794.579999999998, 13726, 14022, 13770.5, 13874.5, 13981.0, 14022.0, 0.08026493850903062, 0.0, 0.0], "isController": true}, {"data": ["Verify link", 100, 0, 0.0, 280.07, 206, 497, 271.0, 330.8, 390.24999999999983, 496.65999999999985, 0.15155740388229447, 1.6845427835184354, 0.09595478133297768], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 802.0, 802, 802, 802.0, 802.0, 802.0, 802.0, 1.2468827930174564, 5.035019872194513, 0.4420102088528678], "isController": false}, {"data": ["Get SR Access Token", 149, 0, 0.0, 258.1610738255035, 200, 491, 249.0, 303.0, 326.5, 479.0, 0.17542826867604638, 1.9051425354682991, 0.1621265066668629], "isController": false}, {"data": ["Generate sr hedera data", 50, 0, 0.0, 13864.819999999998, 13688, 18811, 13760.0, 13827.7, 13882.8, 18811.0, 0.0992159952058831, 0.0, 0.0], "isController": true}, {"data": ["Login by SR", 149, 0, 0.0, 805.3691275167782, 507, 3792, 634.0, 1190.0, 1552.0, 3596.5, 0.17537520288792346, 1.885279982759676, 0.1125819239071712], "isController": false}, {"data": ["Get OS user Access Token-0", 50, 0, 0.0, 0.4799999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.08207714266484784, 0.5867233245182483, 0.0], "isController": false}, {"data": ["Get user key gen result-0", 50, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.08207458281489555, 0.639192683112498, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 50, 0, 0.0, 0.20000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10200064056402273, 0.43528972580697806, 0.0], "isController": false}, {"data": ["Get SR DID-0", 50, 0, 0.0, 0.9800000000000004, 0, 3, 1.0, 2.0, 2.4499999999999957, 3.0, 0.08207444809037381, 0.7210833380868118, 0.0], "isController": false}, {"data": ["Get user keys-0", 50, 0, 0.0, 0.44, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.08207485226526591, 0.6412706982518056, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Assertion failed", 1, 50.0, 0.008932559178204555], "isController": false}, {"data": ["Failed that JSONPath not exists: $..error.code", 1, 50.0, 0.008932559178204555], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11195, 2, "Assertion failed", 1, "Failed that JSONPath not exists: $..error.code", 1, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Requests for Import", 1, 1, "Assertion failed", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get policy import result", 934, 1, "Failed that JSONPath not exists: $..error.code", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
