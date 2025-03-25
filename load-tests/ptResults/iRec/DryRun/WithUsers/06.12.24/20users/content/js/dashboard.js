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

    var data = {"OkPercent": 99.78947368421052, "KoPercent": 0.21052631578947367};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.7712220149253731, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [0.42105263157894735, 500, 1500, "WS open for sr link"], "isController": false}, {"data": [0.8552631578947368, 500, 1500, "Agree terms"], "isController": false}, {"data": [0.5, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.9615384615384616, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [0.9722222222222222, 500, 1500, "Import Policy"], "isController": false}, {"data": [0.8947368421052632, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [0.4722222222222222, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.8414634146341463, 500, 1500, "Get SR link result"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.5, 500, 1500, "Accept user"], "isController": false}, {"data": [0.4473684210526316, 500, 1500, "Login by user"], "isController": false}, {"data": [0.7368421052631579, 500, 1500, "Get SR DID"], "isController": false}, {"data": [0.9473684210526315, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [0.9736842105263158, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen"], "isController": false}, {"data": [0.8888888888888888, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [0.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [1.0, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [1.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.4473684210526316, 500, 1500, "WS open for user link"], "isController": false}, {"data": [0.9, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user link-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [0.8026315789473685, 500, 1500, "Verify link"], "isController": false}, {"data": [0.717948717948718, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.9375, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.47368421052631576, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1900, 4, 0.21052631578947367, 709.5721052631583, 0, 100235, 4.0, 2044.0, 2059.0, 11516.000000000007, 3.579880318948495, 110.62051352087823, 1.3049193679061843], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 19, 0, 0.0, 1.631578947368421, 0, 11, 1.0, 2.0, 11.0, 11.0, 0.09981193330461552, 1.7255726709673351, 0.0], "isController": false}, {"data": ["WS open for sr link", 19, 0, 0.0, 1580.2631578947369, 907, 7921, 945.0, 4329.0, 7921.0, 7921.0, 0.09840684497296401, 2.430122035817502, 0.06059385293873915], "isController": false}, {"data": ["Agree terms", 38, 0, 0.0, 629.2105263157895, 255, 8028, 291.0, 855.6, 2418.249999999983, 8028.0, 0.10442773600668337, 3.143169653162512, 0.06853338544414765], "isController": false}, {"data": ["Link SR profile", 19, 0, 0.0, 1326.578947368421, 264, 7734, 790.0, 3860.0, 7734.0, 7734.0, 0.09845324766173537, 2.53087999067285, 0.12682130411690026], "isController": false}, {"data": ["Invite sr-0", 19, 0, 0.0, 2.3684210526315796, 1, 10, 2.0, 7.0, 10.0, 10.0, 0.09988591976532067, 1.718539919210691, 0.0], "isController": false}, {"data": ["Link user profile-0", 19, 0, 0.0, 2.4736842105263155, 0, 10, 2.0, 4.0, 10.0, 10.0, 0.08603396983377332, 3.467037209408947, 0.0], "isController": false}, {"data": ["Import Policy-0", 18, 0, 0.0, 7.166666666666667, 1, 85, 3.0, 18.400000000000105, 85.0, 85.0, 0.08271602668970461, 3.452958814024502, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 39, 1, 2.5641025641025643, 264.8205128205129, 227, 711, 247.0, 266.0, 427.0, 711.0, 0.202785967211069, 3.5943426777367007, 0.1676223849059645], "isController": false}, {"data": ["Agree terms-0", 38, 0, 0.0, 1.8157894736842108, 0, 5, 2.0, 3.0, 3.0999999999999943, 5.0, 0.1045049901132779, 3.122328290394616, 0.0], "isController": false}, {"data": ["Import Policy", 18, 0, 0.0, 295.7777777777778, 244, 535, 275.0, 378.40000000000026, 535.0, 535.0, 0.08251354597379737, 3.472950920770952, 0.06587385139997984], "isController": false}, {"data": ["Invite sr", 19, 0, 0.0, 414.1578947368422, 285, 807, 386.0, 563.0, 807.0, 807.0, 0.09960263789723105, 1.743332848425754, 0.07830090186256933], "isController": false}, {"data": ["Generate user keys", 19, 0, 0.0, 2046.2105263157894, 2035, 2060, 2045.0, 2058.0, 2060.0, 2060.0, 0.08097476570590817, 2.654674621283152, 0.05792592460396947], "isController": false}, {"data": ["Generate sr keys", 19, 0, 0.0, 2053.8421052631575, 2037, 2076, 2053.0, 2066.0, 2076.0, 2076.0, 0.09860960457548565, 1.9225730522008107, 0.07198561954079064], "isController": false}, {"data": ["Get policy id", 18, 0, 0.0, 280.44444444444446, 239, 440, 266.0, 342.8000000000002, 440.0, 440.0, 0.08261200811433503, 4.0246506845896475, 0.061918668191164185], "isController": false}, {"data": ["Get Access Token-0", 38, 0, 0.0, 1.026315789473684, 0, 10, 1.0, 1.0, 2.3999999999999773, 10.0, 0.10463649831204808, 2.6637614979678492, 0.0], "isController": false}, {"data": ["WS open for policy import", 18, 0, 0.0, 1125.9444444444443, 905, 3064, 964.5, 1483.6000000000024, 3064.0, 3064.0, 0.08146418291424537, 3.417349989930122, 0.05906948809944062], "isController": false}, {"data": ["Generate sr keys-0", 19, 0, 0.0, 0.6315789473684211, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.09966637990725781, 1.9106684335592439, 0.0], "isController": false}, {"data": ["Dry Run Policy", 18, 0, 0.0, 12838.111111111111, 7324, 24933, 12288.0, 22019.700000000004, 24933.0, 24933.0, 0.07944389275074479, 4.569928900474457, 0.06264740566037737], "isController": false}, {"data": ["Invite and accept user", 19, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0998528484338869, 0.0, 0.0], "isController": true}, {"data": ["Get SR link result", 82, 0, 0.0, 778.5243902439018, 237, 13439, 289.5, 871.8000000000004, 3219.1999999999944, 13439.0, 0.3001925625462187, 9.271008703067455, 0.19218930756192384], "isController": false}, {"data": ["Get User Access Token", 19, 0, 0.0, 302.47368421052636, 250, 436, 267.0, 429.0, 436.0, 436.0, 0.08555282887182834, 3.0707159913434046, 0.0561880164126348], "isController": false}, {"data": ["Accept user", 19, 0, 0.0, 611.5789473684209, 533, 1102, 565.0, 808.0, 1102.0, 1102.0, 0.09939161867097714, 1.805815341488677, 0.08507750911525766], "isController": false}, {"data": ["Login by user", 19, 0, 0.0, 1406.0526315789473, 589, 11907, 633.0, 2020.0, 11907.0, 11907.0, 0.08129350807158962, 2.8010368465499464, 0.030368072402565453], "isController": false}, {"data": ["Get SR DID", 19, 0, 0.0, 601.0, 259, 1072, 711.0, 1007.0, 1072.0, 1072.0, 0.0857520682044871, 3.4001030012095557, 0.052466725940903285], "isController": false}, {"data": ["Link user profile", 19, 0, 0.0, 361.63157894736844, 253, 989, 278.0, 950.0, 989.0, 989.0, 0.08592425098925947, 3.4913969756924814, 0.07678243357829283], "isController": false}, {"data": ["Get key gen result", 23, 0, 0.0, 2046.1304347826087, 2035, 2069, 2045.0, 2053.6, 2066.0, 2069.0, 0.1193763364959412, 2.472248853922291, 0.08971979162341437], "isController": false}, {"data": ["Invite user", 19, 0, 0.0, 343.42105263157885, 265, 728, 295.0, 471.0, 728.0, 728.0, 0.09962666219220606, 1.752043616487164, 0.075303746617937], "isController": false}, {"data": ["Login by SR-0", 19, 0, 0.0, 1.5263157894736843, 0, 3, 2.0, 2.0, 3.0, 3.0, 0.09970560607889337, 2.065796024632532, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 18, 0, 0.0, 2.611111111111111, 0, 15, 2.0, 5.100000000000016, 15.0, 15.0, 0.08260897500619567, 3.446818249355191, 0.0], "isController": false}, {"data": ["User creation flow", 19, 0, 0.0, 41999.68421052633, 35341, 51206, 42085.0, 49737.0, 51206.0, 51206.0, 0.08346768702253189, 90.05783758149082, 2.304898228453256], "isController": true}, {"data": ["WS open for sr key gen-0", 19, 0, 0.0, 0.368421052631579, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.09967003971064213, 1.9042428290029325, 0.0], "isController": false}, {"data": ["Requests for DryRun", 18, 0, 0.0, 13106.555555555557, 7580, 25181, 12542.0, 22268.600000000006, 25181.0, 25181.0, 0.07935143427717456, 8.09937833799523, 0.15114743413830956], "isController": true}, {"data": ["WS open for sr key gen", 19, 0, 0.0, 1.5789473684210527, 1, 3, 2.0, 2.0, 3.0, 3.0, 0.09966951686513141, 1.9167888629150711, 0.07207802746157478], "isController": false}, {"data": ["Get user link result", 27, 0, 0.0, 402.2592592592592, 257, 1123, 305.0, 748.4, 976.9999999999992, 1123.0, 0.12184005559516611, 5.145701986274943, 0.07620732354626764], "isController": false}, {"data": ["Generate user keys-0", 19, 0, 0.0, 1.210526315789474, 0, 9, 1.0, 2.0, 9.0, 9.0, 0.08169021351242121, 2.651484793527985, 0.0], "isController": false}, {"data": ["Link user", 19, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.08168740380233369, 0.0, 0.0], "isController": true}, {"data": ["Login by Admin-0", 39, 0, 0.0, 1.307692307692308, 0, 14, 1.0, 2.0, 4.0, 14.0, 0.2032329675139918, 3.438848779690252, 0.0], "isController": false}, {"data": ["User creation(SR side)", 19, 0, 0.0, 21779.157894736847, 15513, 32872, 19144.0, 29892.0, 32872.0, 32872.0, 0.09083650862707789, 36.90488080397481, 1.0211403672065862], "isController": true}, {"data": ["Get Access Token", 38, 0, 0.0, 2052.5000000000005, 2033, 2132, 2049.5, 2060.3, 2069.2999999999997, 2132.0, 0.10405029462662374, 2.7215949327164246, 0.10926190092358326], "isController": false}, {"data": ["Get user keys", 19, 0, 0.0, 2047.578947368421, 2034, 2076, 2048.0, 2057.0, 2076.0, 2076.0, 0.08097787173105117, 2.7266185052550376, 0.05966790548603771], "isController": false}, {"data": ["Get policy id-0", 18, 0, 0.0, 2.2777777777777777, 1, 4, 2.0, 4.0, 4.0, 4.0, 0.08272248902778097, 3.6219946675589973, 0.0], "isController": false}, {"data": ["WS open for user key gen-0", 19, 0, 0.0, 1.2105263157894741, 0, 9, 1.0, 1.0, 9.0, 9.0, 0.081685999019768, 2.640704805071411, 0.0], "isController": false}, {"data": ["Requests for Import", 19, 1, 5.2631578947368425, 9118.578947368422, 2906, 100235, 3978.0, 6801.0, 100235.0, 100235.0, 0.07048601965447011, 27.99693035123369, 0.4856746149701176], "isController": true}, {"data": ["User creation(user side)", 19, 0, 0.0, 16281.421052631582, 14497, 26746, 15275.0, 21511.0, 26746.0, 26746.0, 0.07677822407926746, 40.634200285342224, 0.7984958981738906], "isController": true}, {"data": ["Get policy import result-0", 95, 0, 0.0, 2.5578947368421043, 0, 12, 3.0, 3.0, 5.0, 12.0, 0.3663159031229395, 15.732206144756477, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 39, 0, 0.0, 1.2820512820512817, 0, 9, 1.0, 2.0, 3.0, 9.0, 0.20303722869801077, 3.4796054147165547, 0.0], "isController": false}, {"data": ["Accept sr-0", 19, 0, 0.0, 1.2631578947368427, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.09985179890898771, 1.7235058935553547, 0.0], "isController": false}, {"data": ["Get user link result-0", 27, 0, 0.0, 2.2592592592592595, 0, 4, 2.0, 3.1999999999999993, 4.0, 4.0, 0.121980419883712, 5.005229698730951, 0.0], "isController": false}, {"data": ["Login by SR OS", 19, 0, 0.0, 2513.1578947368425, 2461, 2587, 2493.0, 2585.0, 2587.0, 2587.0, 0.09834215824806032, 1.7878853055464976, 0.03174284302003592], "isController": false}, {"data": ["Get sr keys", 19, 0, 0.0, 2047.2631578947369, 2036, 2057, 2049.0, 2056.0, 2057.0, 2057.0, 0.09862035316467523, 2.026862164755681, 0.0741122627272161], "isController": false}, {"data": ["WS open for user key gen", 19, 0, 0.0, 2.31578947368421, 1, 10, 2.0, 3.0, 10.0, 10.0, 0.08168564783167598, 2.6509839291548976, 0.05787606164471903], "isController": false}, {"data": ["Get SR Access Token-0", 56, 0, 0.0, 1.7500000000000007, 0, 4, 2.0, 3.0, 3.0, 4.0, 0.11583147347976362, 4.14800255023156, 0.0], "isController": false}, {"data": ["Verify link-0", 38, 0, 0.0, 1.9473684210526316, 0, 4, 2.0, 3.0, 3.049999999999997, 4.0, 0.11393243806422791, 4.131230844171906, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 18, 0, 0.0, 2.555555555555555, 1, 4, 3.0, 3.1000000000000014, 4.0, 4.0, 0.08342796227202151, 3.6881296928228777, 0.0], "isController": false}, {"data": ["Policy import and dry run", 18, 0, 0.0, 17163.111111111106, 11550, 29512, 16057.5, 26519.500000000004, 29512.0, 29512.0, 0.07705149608321563, 39.976056849556954, 0.7042612085848208], "isController": true}, {"data": ["Invite and accept SR", 19, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0], "isController": true}, {"data": ["Link SR", 19, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.09968102073365231, 0.0, 0.0], "isController": true}, {"data": ["Get key gen result-0", 23, 0, 0.0, 0.6521739130434783, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12065763657919862, 2.4165288093058512, 0.0], "isController": false}, {"data": ["Accept sr", 19, 0, 0.0, 653.9473684210526, 545, 1095, 593.0, 1090.0, 1095.0, 1095.0, 0.0995561889890855, 1.9941786237797816, 0.08521837846547234], "isController": false}, {"data": ["User creation(admin side)", 20, 1, 5.0, 4720.95, 3237, 19576, 3472.5, 10007.000000000013, 19127.699999999993, 19576.0, 0.10299085441212821, 14.256046367770042, 0.5895874395572422], "isController": true}, {"data": ["Login by user OS-0", 19, 0, 0.0, 1.1052631578947374, 0, 8, 1.0, 1.0, 8.0, 8.0, 0.08168880863321726, 2.5451253412657464, 0.0], "isController": false}, {"data": ["WS open for user link", 19, 0, 0.0, 1219.7894736842102, 889, 2596, 1014.0, 2496.0, 2596.0, 2596.0, 0.0852874636406076, 3.1992004440559123, 0.05126628738059755], "isController": false}, {"data": ["Get policy import result", 95, 0, 0.0, 382.178947368421, 253, 920, 287.0, 751.6000000000001, 812.5999999999999, 920.0, 0.36591519241361514, 16.757501502178158, 0.27424455965958333], "isController": false}, {"data": ["WS open for sr link-0", 19, 0, 0.0, 1.9473684210526314, 0, 9, 2.0, 3.0, 9.0, 9.0, 0.09889961168889305, 2.420076954633707, 0.0], "isController": false}, {"data": ["WS open for user link-0", 19, 0, 0.0, 2.263157894736842, 1, 7, 2.0, 3.0, 7.0, 7.0, 0.08585320006506768, 3.2011382326892837, 0.0], "isController": false}, {"data": ["Get user key gen result", 22, 0, 0.0, 2043.9545454545457, 2038, 2060, 2044.0, 2049.1, 2058.5, 2060.0, 0.0937670485542826, 3.0417850742038324, 0.06908493749573787], "isController": false}, {"data": ["Login by user-0", 19, 0, 0.0, 1.5789473684210524, 0, 3, 1.0, 3.0, 3.0, 3.0, 0.08565696639091135, 2.897592553197484, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 19, 0, 0.0, 1.9473684210526314, 0, 3, 2.0, 3.0, 3.0, 3.0, 0.08565271879761616, 3.0241537849485636, 0.0], "isController": false}, {"data": ["Link SR profile-0", 19, 0, 0.0, 1.2105263157894737, 0, 3, 1.0, 2.0, 3.0, 3.0, 0.09883427572682206, 2.5075692343854845, 0.0], "isController": false}, {"data": ["Accept user-0", 19, 0, 0.0, 1.2105263157894737, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.09967422267221346, 1.729134644136795, 0.0], "isController": false}, {"data": ["Get sr keys-0", 19, 0, 0.0, 0.368421052631579, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.09968102073365231, 1.9774048292175563, 0.0], "isController": false}, {"data": ["Login by user OS", 19, 0, 0.0, 2498.210526315789, 2467, 2566, 2492.0, 2537.0, 2566.0, 2566.0, 0.08083180178340481, 2.579762575194847, 0.06449593394765503], "isController": false}, {"data": ["Get SR link result-0", 82, 0, 0.0, 1.7439024390243898, 0, 11, 2.0, 3.0, 3.0, 11.0, 0.30047966815318605, 8.815954943623419, 0.0], "isController": false}, {"data": ["Generate user hedera data", 19, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.08169442843998038, 0.0, 0.0], "isController": true}, {"data": ["Verify link", 38, 0, 0.0, 944.8421052631581, 251, 18047, 301.5, 991.3000000000004, 2209.549999999953, 18047.0, 0.11367953738411418, 4.321551920137133, 0.07194075370281176], "isController": false}, {"data": ["Login by Admin", 39, 0, 0.0, 1170.5128205128203, 238, 19347, 686.0, 792.0, 7964.0, 19347.0, 0.2024060368897977, 3.553336910038302, 0.10603307035685743], "isController": false}, {"data": ["Get SR Access Token", 56, 1, 1.7857142857142858, 2222.0714285714284, 233, 100234, 270.5, 479.2000000000007, 2004.79999999999, 100234.0, 0.11576370973076669, 4.22268036205617, 0.10600906677912283], "isController": false}, {"data": ["Generate sr hedera data", 19, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.09967579137332255, 0.0, 0.0], "isController": true}, {"data": ["Login by SR", 19, 0, 0.0, 1324.473684210526, 564, 13847, 601.0, 1038.0, 13847.0, 13847.0, 0.09936251104754236, 2.1218615010799136, 0.03672980979923543], "isController": false}, {"data": ["Get user key gen result-0", 22, 0, 0.0, 0.7727272727272727, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.09459151514109185, 3.003368781414057, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 19, 0, 0.0, 0.4210526315789473, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.09967056256163838, 1.7356233000267538, 0.0], "isController": false}, {"data": ["Get SR DID-0", 19, 0, 0.0, 1.5789473684210527, 0, 3, 2.0, 3.0, 3.0, 3.0, 0.08602734764103957, 3.245100473716381, 0.0], "isController": false}, {"data": ["Get user keys-0", 19, 0, 0.0, 0.7894736842105262, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.08168705260216255, 2.692103965583955, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 1, 25.0, 0.05263157894736842], "isController": false}, {"data": ["401", 1, 25.0, 0.05263157894736842], "isController": false}, {"data": ["504", 1, 25.0, 0.05263157894736842], "isController": false}, {"data": ["401/Unauthorized", 1, 25.0, 0.05263157894736842], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1900, 4, "504/Gateway Time-out", 1, "401", 1, "504", 1, "401/Unauthorized", 1, "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get Admin Access Token", 39, 1, "401/Unauthorized", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Requests for Import", 1, 1, "504", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["User creation(admin side)", 1, 1, "401", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get SR Access Token", 56, 1, "504/Gateway Time-out", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
