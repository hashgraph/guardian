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

    var data = {"OkPercent": 98.93529893529893, "KoPercent": 1.0647010647010646};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8201903467029232, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [0.75, 500, 1500, "Viewing policy by User"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.65, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.85, 500, 1500, "Viewing policy by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get policies"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [0.8, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Issue approve-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.4, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.35, 500, 1500, "Policy list viewing"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.6, 500, 1500, "Viewing profile by SR"], "isController": true}, {"data": [0.5, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.73, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.0, 500, 1500, "Tokens list viewing"], "isController": true}, {"data": [0.65, 500, 1500, "Viewing tokens by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.85, 500, 1500, "Get policy"], "isController": true}, {"data": [1.0, 500, 1500, "User profile view-0"], "isController": false}, {"data": [1.0, 500, 1500, "User profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Issue create-0"], "isController": false}, {"data": [0.0, 500, 1500, "Save balance"], "isController": true}, {"data": [1.0, 500, 1500, "Get Policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.125, 500, 1500, "Get token"], "isController": true}, {"data": [0.9285714285714286, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [0.2, 500, 1500, "Profile viewing"], "isController": true}, {"data": [0.15217391304347827, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [0.5384615384615384, 500, 1500, "Issue create"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view-0"], "isController": false}, {"data": [0.79, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policies-0"], "isController": false}, {"data": [0.7, 500, 1500, "Viewing profile by User"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.2, 500, 1500, "Viewing tokens by User"], "isController": true}, {"data": [0.0, 500, 1500, "Issue request creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1221, 13, 1.0647010647010646, 1730.834561834563, 0, 180219, 214.0, 661.8, 10911.3, 11484.8, 3.122586452936152, 72.35655258847328, 1.1954175732119932], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 10, 0, 0.0, 281.09999999999997, 268, 296, 279.0, 295.7, 296.0, 296.0, 0.05660815270615274, 4.1064073618195, 0.036176147588775735], "isController": false}, {"data": ["Viewing policy by User", 10, 0, 0.0, 508.30000000000007, 482, 577, 501.5, 572.6, 577.0, 577.0, 0.05235355402101472, 3.410685777568073, 0.06503293038547922], "isController": true}, {"data": ["Get device issue row-0", 13, 0, 0.0, 0.3076923076923077, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.0764157486979932, 0.23446523854939394, 0.0], "isController": false}, {"data": ["Get hedera id-0", 20, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11107470329169883, 0.3170672963445315, 0.0], "isController": false}, {"data": ["Get Policy id", 20, 0, 0.0, 259.7, 249, 283, 258.5, 270.8, 282.4, 283.0, 0.10519450463907766, 0.35021859911163244, 0.06055875047337527], "isController": false}, {"data": ["Get issue schema-0", 13, 0, 0.0, 0.3846153846153846, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07641440117560616, 0.7711471344599559, 0.0], "isController": false}, {"data": ["Get device issue row", 13, 0, 0.0, 261.53846153846155, 241, 298, 261.0, 286.8, 298.0, 298.0, 0.07630048304075032, 0.6031761818504628, 0.04650133855991642], "isController": false}, {"data": ["Issue creation", 13, 3, 23.076923076923077, 10612.615384615383, 944, 19067, 8610.0, 18730.6, 19067.0, 19067.0, 0.07029154771173977, 19.79331729300491, 0.6565384741462281], "isController": true}, {"data": ["Get block for waiting device", 20, 7, 35.0, 63228.85, 230, 180219, 239.0, 180216.9, 180218.9, 180219.0, 0.05551345785001929, 0.1795052597266517, 0.03345173746714297], "isController": false}, {"data": ["Viewing policy by SR", 10, 0, 0.0, 499.2, 485, 529, 495.0, 528.0, 529.0, 529.0, 0.052362052173548786, 3.35538996147462, 0.06643435369519002], "isController": true}, {"data": ["Get policies", 20, 0, 0.0, 271.4, 252, 344, 265.0, 296.9, 341.65, 344.0, 0.10455985528916029, 3.4929475602918267, 0.05943778492560567], "isController": false}, {"data": ["Get result for issue request approve", 10, 0, 0.0, 3724.6, 3541, 3770, 3742.0, 3769.1, 3770.0, 3770.0, 0.05552501679631758, 0.0, 0.0], "isController": true}, {"data": ["Get block for waiting device-0", 20, 0, 0.0, 0.45000000000000007, 0, 2, 0.0, 1.0, 1.9499999999999993, 2.0, 0.0555500005555, 0.16139336587174616, 0.0], "isController": false}, {"data": ["Balance verify-0", 69, 0, 0.0, 0.9565217391304348, 0, 16, 1.0, 1.0, 2.0, 16.0, 0.2732413552771222, 6.676705264895614, 0.0], "isController": false}, {"data": ["Get issue approve result", 10, 0, 0.0, 476.6, 285, 519, 498.0, 518.3, 519.0, 519.0, 0.0565434960843629, 3.333454445378983, 0.03554951443272738], "isController": false}, {"data": ["Issue approve-0", 10, 0, 0.0, 1.0, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.05669769920736616, 2.498198076247066, 0.0], "isController": false}, {"data": ["Login by user", 123, 0, 0.0, 233.0487804878049, 225, 284, 231.0, 239.60000000000002, 245.8, 280.1600000000001, 0.4151338215937089, 6.975429477876404, 0.2629655489554153], "isController": false}, {"data": ["Get tokens", 40, 0, 0.0, 5212.350000000001, 260, 11573, 1272.0, 11296.4, 11390.8, 11573.0, 0.1357031629014693, 2.414273900083457, 0.07640922963858854], "isController": false}, {"data": ["Policy list viewing", 10, 0, 0.0, 1545.3999999999999, 1463, 2075, 1486.5, 2020.4, 2075.0, 2075.0, 0.05208034956330627, 9.963652391659853, 0.17995184846180687], "isController": true}, {"data": ["Login by SR-0", 60, 0, 0.0, 0.7666666666666666, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.20266367625153264, 5.072737128112154, 0.0], "isController": false}, {"data": ["Get issue schema", 13, 0, 0.0, 419.6923076923077, 243, 483, 467.0, 482.2, 483.0, 483.0, 0.07620610821267366, 2.926888162040565, 0.04741128216777068], "isController": false}, {"data": ["Viewing profile by SR", 10, 0, 0.0, 513.7, 498, 557, 507.0, 554.9, 557.0, 557.0, 0.04987630675923709, 3.2418966198203454, 0.06368970577966643], "isController": true}, {"data": ["Issue approve", 20, 0, 0.0, 2372.8500000000004, 245, 4568, 2275.0, 4544.0, 4566.85, 4568.0, 0.1105809369522788, 17.846229777511155, 0.6970918595843263], "isController": true}, {"data": ["Get block for waiting issue request-0", 13, 0, 0.0, 0.3846153846153846, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.0764179946742536, 0.23044227465509035, 0.0], "isController": false}, {"data": ["Get tenant", 50, 0, 0.0, 681.14, 483, 1065, 503.0, 943.9, 972.15, 1065.0, 0.16831163235353522, 6.442532070729597, 0.14940944707945655], "isController": true}, {"data": ["Tokens list viewing", 10, 0, 0.0, 7421.6, 2155, 12819, 7584.0, 12780.2, 12819.0, 12819.0, 0.04929921170560483, 9.34239319325784, 0.17014968165034042], "isController": true}, {"data": ["Viewing tokens by SR", 10, 0, 0.0, 510.8, 489, 535, 510.5, 534.3, 535.0, 535.0, 0.052345880640922965, 3.35654668663662, 0.0663115980150442], "isController": true}, {"data": ["Get Tenant Id-0", 50, 0, 0.0, 0.72, 0, 2, 1.0, 1.0, 1.4499999999999957, 2.0, 0.16891663626167214, 3.1379696304779663, 0.0], "isController": false}, {"data": ["Login by Admin-0", 50, 0, 0.0, 0.7, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1689200602706775, 3.124226003005088, 0.0], "isController": false}, {"data": ["Token minting verify", 10, 0, 0.0, 50321.8, 33476, 64794, 49721.5, 64520.700000000004, 64794.0, 64794.0, 0.04194402150889423, 9.059220501818272, 0.14351900640904647], "isController": true}, {"data": ["Get issue approve result-0", 10, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.05670477227363455, 2.5007136827197876, 0.0], "isController": false}, {"data": ["Get policy", 20, 0, 0.0, 493.7, 480, 513, 493.5, 507.6, 512.75, 513.0, 0.10506353717410603, 0.5193719515158042, 0.10086202169824703], "isController": true}, {"data": ["User profile view-0", 10, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.05000250012500625, 1.5220927061978098, 0.0], "isController": false}, {"data": ["User profile view", 10, 0, 0.0, 275.1, 259, 325, 268.5, 320.6, 325.0, 325.0, 0.0499340870051532, 1.617284130260556, 0.028536550503335596], "isController": false}, {"data": ["Issue create-0", 13, 0, 0.0, 1.0769230769230769, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.07645214977564235, 3.3907493266329887, 0.0], "isController": false}, {"data": ["Save balance", 20, 0, 0.0, 13429.900000000001, 7148, 17744, 17196.5, 17626.4, 17738.55, 17744.0, 0.10135511792667971, 0.8024573706708695, 0.1257684380796246], "isController": true}, {"data": ["Get Policy id-0", 20, 0, 0.0, 0.45, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10534410652396052, 0.12609915876146932, 0.0], "isController": false}, {"data": ["Get block for waiting issue request", 13, 0, 0.0, 240.6153846153846, 232, 285, 235.0, 269.8, 285.0, 285.0, 0.07631392024608305, 0.2540510584153708, 0.046509527866321496], "isController": false}, {"data": ["SR profile view", 10, 0, 0.0, 281.1, 265, 320, 273.0, 319.0, 320.0, 320.0, 0.04993383766509375, 1.6867006684892518, 0.02915082827753227], "isController": false}, {"data": ["Get Tenant Id", 50, 0, 0.0, 262.32, 250, 312, 260.0, 272.6, 289.74999999999994, 312.0, 0.16877067440761492, 3.25573793922568, 0.07334272471815298], "isController": false}, {"data": ["Get token", 20, 0, 0.0, 7424.85, 1194, 11625, 11340.0, 11576.8, 11622.85, 11625.0, 0.1045669620683345, 0.5315912722531566, 0.0991139583823491], "isController": true}, {"data": ["Get issue creation status", 35, 0, 0.0, 415.2857142857142, 267, 541, 487.0, 511.4, 521.8, 541.0, 0.19403373969542245, 13.286622742278842, 0.12201278994184532], "isController": false}, {"data": ["Get hedera id", 20, 0, 0.0, 268.90000000000003, 261, 278, 269.0, 275.9, 277.9, 278.0, 0.11090655014085131, 0.5326059625440853, 0.0632080690060555], "isController": false}, {"data": ["Login by user-0", 123, 0, 0.0, 0.7723577235772359, 0, 19, 1.0, 1.0, 1.0, 14.920000000000087, 0.4154563264203202, 6.667059411521313, 0.0], "isController": false}, {"data": ["Profile viewing", 10, 0, 0.0, 1522.8, 1495, 1577, 1517.5, 1574.3, 1577.0, 1577.0, 0.049646270323941914, 9.465909884262132, 0.17245291361548962], "isController": true}, {"data": ["Balance verify", 69, 0, 0.0, 7194.449275362318, 630, 11615, 10999.0, 11399.0, 11523.5, 11615.0, 0.2618367277239558, 6.820777088242771, 0.14647900159568614], "isController": false}, {"data": ["Get tokens-0", 40, 0, 0.0, 0.7249999999999998, 0, 2, 1.0, 1.0, 1.9499999999999957, 2.0, 0.14103129131776113, 2.2594066769501984, 0.0], "isController": false}, {"data": ["Issue create", 13, 3, 23.076923076923077, 441.6153846153846, 212, 551, 497.0, 543.4, 551.0, 551.0, 0.07623426202302275, 3.5902030910061167, 0.4371558462882711], "isController": false}, {"data": ["SR profile view-0", 10, 0, 0.0, 0.9, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.050001250031250784, 1.52204976999425, 0.0], "isController": false}, {"data": ["Login by Admin", 50, 0, 0.0, 417.26, 225, 805, 239.5, 678.2, 685.5999999999999, 805.0, 0.16846247666794698, 3.1985134713125247, 0.07633455974016347], "isController": false}, {"data": ["Get issue creation status-0", 35, 0, 0.0, 1.2571428571428573, 0, 3, 1.0, 2.0, 2.1999999999999957, 3.0, 0.1945633442659403, 11.124077778434044, 0.0], "isController": false}, {"data": ["Get policies-0", 20, 0, 0.0, 1.6499999999999997, 0, 17, 1.0, 1.0, 16.19999999999999, 17.0, 0.10470601169566152, 3.1872755364874275, 0.0], "isController": false}, {"data": ["Viewing profile by User", 10, 0, 0.0, 509.8, 495, 565, 504.0, 560.6, 565.0, 565.0, 0.04987655552507544, 3.1713160318835882, 0.062462592583356194], "isController": true}, {"data": ["Login by SR", 60, 0, 0.0, 232.95, 225, 269, 231.0, 238.0, 241.0, 269.0, 0.20250430321644336, 5.226730330714839, 0.1195217048752911], "isController": false}, {"data": ["Viewing tokens by User", 10, 0, 0.0, 6420.3, 1169, 11800, 6568.5, 11764.9, 11800.0, 11800.0, 0.049547630136850554, 3.136181119503929, 0.061450674095508015], "isController": true}, {"data": ["Issue request creation", 10, 0, 0.0, 92595.90000000001, 71103, 116452, 90857.5, 115076.5, 116452.0, 116452.0, 0.03537306199836577, 31.642924249029893, 1.0197770513280815], "isController": true}, {"data": ["Get issues-0", 10, 0, 0.0, 0.8, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.05669802067209834, 3.2427945674791494, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 3, 23.076923076923077, 0.2457002457002457], "isController": false}, {"data": ["400", 3, 23.076923076923077, 0.2457002457002457], "isController": false}, {"data": ["504/Gateway Time-out", 7, 53.84615384615385, 0.5733005733005733], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1221, 13, "504/Gateway Time-out", 7, "400/Bad Request", 3, "400", 3, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Issue creation", 3, 3, "400", 3, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["Get block for waiting device", 20, 7, "504/Gateway Time-out", 7, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Issue create", 13, 3, "400/Bad Request", 3, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
