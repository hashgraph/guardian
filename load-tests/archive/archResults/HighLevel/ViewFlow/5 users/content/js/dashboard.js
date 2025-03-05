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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8217247097844113, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [0.6, 500, 1500, "Viewing policy by User"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.8, 500, 1500, "Viewing policy by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get policies"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [0.9, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Issue approve-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.36666666666666664, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.3, 500, 1500, "Policy list viewing"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.5, 500, 1500, "Viewing profile by SR"], "isController": true}, {"data": [0.5, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.825, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.0, 500, 1500, "Tokens list viewing"], "isController": true}, {"data": [0.5, 500, 1500, "Viewing tokens by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.8, 500, 1500, "Get policy"], "isController": true}, {"data": [1.0, 500, 1500, "User profile view-0"], "isController": false}, {"data": [1.0, 500, 1500, "User profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Issue create-0"], "isController": false}, {"data": [0.0, 500, 1500, "Save balance"], "isController": true}, {"data": [1.0, 500, 1500, "Get Policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Get token"], "isController": true}, {"data": [0.9375, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [0.3, 500, 1500, "Profile viewing"], "isController": true}, {"data": [0.15, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [0.7, 500, 1500, "Issue create"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view-0"], "isController": false}, {"data": [0.875, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policies-0"], "isController": false}, {"data": [0.6, 500, 1500, "Viewing profile by User"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.0, 500, 1500, "Viewing tokens by User"], "isController": true}, {"data": [0.0, 500, 1500, "Issue request creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 498, 0, 0.0, 789.815261044177, 0, 12021, 119.5, 503.1, 11108.35, 11474.71, 2.638145034407133, 76.7383277064163, 1.060753114587141], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 5, 0, 0.0, 285.8, 265, 320, 286.0, 320.0, 320.0, 320.0, 0.11707682581309856, 7.989258567096729, 0.07477367586110005], "isController": false}, {"data": ["Viewing policy by User", 5, 0, 0.0, 510.2, 500, 524, 506.0, 524.0, 524.0, 524.0, 0.05302226935312831, 3.5523574198038177, 0.06576004109225875], "isController": true}, {"data": ["Get device issue row-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1253949942318303, 0.45325881997040673, 0.0], "isController": false}, {"data": ["Get hedera id-0", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.1253981390916159, 0.43350528553156276, 0.0], "isController": false}, {"data": ["Get Policy id", 5, 0, 0.0, 270.4, 263, 280, 266.0, 280.0, 280.0, 280.0, 0.12454851164528583, 0.5379425364304397, 0.07163972007722007], "isController": false}, {"data": ["Get issue schema-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12544847830995812, 1.5774166081240435, 0.0], "isController": false}, {"data": ["Get device issue row", 5, 0, 0.0, 267.4, 263, 276, 266.0, 276.0, 276.0, 276.0, 0.12456712922593986, 1.2252588271381948, 0.07578644678492238], "isController": false}, {"data": ["Issue creation", 5, 0, 0.0, 17679.8, 15636, 18235, 18189.0, 18235.0, 18235.0, 18235.0, 0.08609111884018045, 37.21266752793657, 1.0485629239987602], "isController": true}, {"data": ["Get block for waiting device", 5, 0, 0.0, 236.6, 234, 238, 237.0, 238.0, 238.0, 238.0, 0.12465719272001995, 0.4763511671029668, 0.074989092495637], "isController": false}, {"data": ["Viewing policy by SR", 5, 0, 0.0, 500.6, 496, 510, 498.0, 510.0, 510.0, 510.0, 0.05301833373980722, 3.47953525454102, 0.06720488007252907], "isController": true}, {"data": ["Get policies", 10, 0, 0.0, 270.20000000000005, 262, 284, 268.5, 283.6, 284.0, 284.0, 0.10573395222940038, 3.6672540958689748, 0.060043255099019845], "isController": false}, {"data": ["Get result for issue request approve", 5, 0, 0.0, 3738.2, 3722, 3753, 3737.0, 3753.0, 3753.0, 3753.0, 0.10846222260786569, 0.0, 0.0], "isController": true}, {"data": ["Get block for waiting device-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1253981390916159, 0.43987315978230884, 0.0], "isController": false}, {"data": ["Balance verify-0", 30, 0, 0.0, 0.8333333333333335, 0, 2, 1.0, 1.0, 1.4499999999999993, 2.0, 0.1965421681221706, 5.458600439599316, 0.0], "isController": false}, {"data": ["Get issue approve result", 5, 0, 0.0, 487.6, 478, 501, 485.0, 501.0, 501.0, 501.0, 0.11668611435239207, 5.875031906359393, 0.07327067532088681], "isController": false}, {"data": ["Issue approve-0", 5, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.11800245445105258, 4.690136617341641, 0.0], "isController": false}, {"data": ["Login by user", 45, 0, 0.0, 232.62222222222223, 226, 243, 232.0, 238.4, 240.39999999999998, 243.0, 0.24077561852581114, 5.101537920822276, 0.15584055604453814], "isController": false}, {"data": ["Get tokens", 15, 0, 0.0, 6946.2, 285, 11370, 11229.0, 11359.8, 11370.0, 11370.0, 0.08088913335382525, 1.9060449966026565, 0.04557913080581755], "isController": false}, {"data": ["Policy list viewing", 5, 0, 0.0, 1500.2, 1492, 1518, 1494.0, 1518.0, 1518.0, 1518.0, 0.05246534663854524, 10.259987926412105, 0.18111816442114984], "isController": true}, {"data": ["Login by SR-0", 25, 0, 0.0, 1.3199999999999998, 0, 13, 1.0, 1.4000000000000021, 9.699999999999992, 13.0, 0.1339218753348047, 4.034072152419165, 0.0], "isController": false}, {"data": ["Get issue schema", 5, 0, 0.0, 478.0, 470, 482, 481.0, 482.0, 482.0, 482.0, 0.12395260052555904, 6.113138898185333, 0.07698618548267143], "isController": false}, {"data": ["Viewing profile by SR", 5, 0, 0.0, 506.8, 503, 514, 506.0, 514.0, 514.0, 514.0, 0.05934436347235739, 3.9074322509910506, 0.07568724481923707], "isController": true}, {"data": ["Issue approve", 10, 0, 0.0, 2381.8, 245, 4567, 2368.0, 4564.1, 4567.0, 4567.0, 0.21315144410103376, 31.643893044601942, 1.3431455158264947], "isController": true}, {"data": ["Get block for waiting issue request-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12538241636992828, 0.44660139205827776, 0.0], "isController": false}, {"data": ["Get tenant", 20, 0, 0.0, 613.1000000000001, 484, 1075, 493.5, 958.5000000000001, 1069.35, 1075.0, 0.10652293172412691, 5.0959415844886635, 0.09682247920139758], "isController": true}, {"data": ["Tokens list viewing", 5, 0, 0.0, 10554.8, 2552, 12608, 12548.0, 12608.0, 12608.0, 12608.0, 0.05190275499823531, 10.02740952052235, 0.17897326943239147], "isController": true}, {"data": ["Viewing tokens by SR", 5, 0, 0.0, 532.0, 520, 548, 531.0, 548.0, 548.0, 548.0, 0.05303126723516185, 3.483926388623732, 0.06711769759450172], "isController": true}, {"data": ["Get Tenant Id-0", 20, 0, 0.0, 0.85, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.10713635243574497, 2.5008072891556585, 0.0], "isController": false}, {"data": ["Login by Admin-0", 20, 0, 0.0, 0.8999999999999998, 0, 2, 1.0, 1.0, 1.9499999999999993, 2.0, 0.10713176135328842, 2.4952650690865945, 0.0], "isController": false}, {"data": ["Token minting verify", 5, 0, 0.0, 54069.0, 37611, 99318, 43908.0, 99318.0, 99318.0, 99318.0, 0.03804595951909907, 8.146174954344849, 0.1321205391112464], "isController": true}, {"data": ["Get issue approve result-0", 5, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.1180637544273908, 4.697184917355372, 0.0], "isController": false}, {"data": ["Get policy", 5, 0, 0.0, 502.6, 492, 517, 498.0, 517.0, 517.0, 517.0, 0.12381141045958796, 0.7343564282884311, 0.11873320807745642], "isController": true}, {"data": ["User profile view-0", 5, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.059694364851957976, 1.842317335243553, 0.0], "isController": false}, {"data": ["User profile view", 5, 0, 0.0, 269.4, 266, 277, 267.0, 277.0, 277.0, 277.0, 0.05950680757878701, 1.9524160321753308, 0.03393747619727697], "isController": false}, {"data": ["Issue create-0", 5, 0, 0.0, 1.6, 1, 3, 1.0, 3.0, 3.0, 3.0, 0.1255808112520407, 7.171400147557454, 0.0], "isController": false}, {"data": ["Save balance", 5, 0, 0.0, 13516.2, 7561, 17504, 17440.0, 17504.0, 17504.0, 17504.0, 0.08713837574067619, 0.8478121460003485, 0.10790181683513418], "isController": true}, {"data": ["Get Policy id-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1254138657569981, 0.14983527672569477, 0.0], "isController": false}, {"data": ["Get block for waiting issue request", 5, 0, 0.0, 236.0, 233, 239, 236.0, 239.0, 239.0, 239.0, 0.12465097726366176, 0.4830712286846829, 0.07583745980005983], "isController": false}, {"data": ["SR profile view", 5, 0, 0.0, 272.8, 268, 277, 271.0, 277.0, 277.0, 277.0, 0.05950468301855356, 2.03510664726814, 0.03469169508015281], "isController": false}, {"data": ["Get Tenant Id", 20, 0, 0.0, 264.2, 254, 306, 260.0, 293.6, 305.5, 306.0, 0.10698505418792995, 2.5736487620491917, 0.04649252843127815], "isController": false}, {"data": ["Get token", 5, 0, 0.0, 11496.0, 11342, 11602, 11483.0, 11602.0, 11602.0, 11602.0, 0.09735202492211838, 0.5534614729361371, 0.09212315639602804], "isController": true}, {"data": ["Get issue creation status", 24, 0, 0.0, 353.87500000000006, 266, 526, 290.5, 507.0, 522.5, 526.0, 0.44852267842792803, 28.79559031541423, 0.2816407053019118], "isController": false}, {"data": ["Get hedera id", 5, 0, 0.0, 269.0, 264, 276, 267.0, 276.0, 276.0, 276.0, 0.12453610301626443, 0.6730543958130962, 0.07078126167525965], "isController": false}, {"data": ["Login by user-0", 45, 0, 0.0, 0.7111111111111111, 0, 2, 1.0, 1.0, 1.0, 2.0, 0.24106970664495256, 4.9260250819637, 0.0], "isController": false}, {"data": ["Profile viewing", 5, 0, 0.0, 1501.4, 1491, 1516, 1499.0, 1516.0, 1516.0, 1516.0, 0.0586462108683158, 11.330528120125033, 0.20348631563977151], "isController": true}, {"data": ["Balance verify", 30, 0, 0.0, 7669.499999999999, 892, 12021, 11125.0, 11811.400000000001, 11923.65, 12021.0, 0.1830697129466901, 5.464076716507395, 0.10226159746631516], "isController": false}, {"data": ["Get tokens-0", 15, 0, 0.0, 0.8, 0, 2, 1.0, 1.4000000000000004, 2.0, 2.0, 0.08611138220249952, 1.8176229096461969, 0.0], "isController": false}, {"data": ["Issue create", 5, 0, 0.0, 498.0, 483, 511, 503.0, 511.0, 511.0, 511.0, 0.12402331638348009, 7.510919865434702, 0.8999684128116087], "isController": false}, {"data": ["SR profile view-0", 5, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.05970077969218278, 1.8425386338670582, 0.0], "isController": false}, {"data": ["Login by Admin", 20, 0, 0.0, 347.65, 227, 809, 232.0, 685.3000000000001, 802.8999999999999, 809.0, 0.10667008010923015, 2.536909306097795, 0.05060057755181499], "isController": false}, {"data": ["Get issue creation status-0", 24, 0, 0.0, 1.2500000000000002, 1, 3, 1.0, 2.0, 2.75, 3.0, 0.4510006577092925, 25.785323980550594, 0.0], "isController": false}, {"data": ["Get policies-0", 10, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.10604228966511846, 3.272740520482068, 0.0], "isController": false}, {"data": ["Viewing profile by User", 5, 0, 0.0, 504.8, 497, 514, 502.0, 514.0, 514.0, 514.0, 0.05934013766911939, 3.8231042680394016, 0.07417517208639923], "isController": true}, {"data": ["Login by SR", 25, 0, 0.0, 232.76, 227, 245, 232.0, 239.8, 244.7, 245.0, 0.13375278205786678, 4.133211752054443, 0.08435307290329139], "isController": false}, {"data": ["Viewing tokens by User", 5, 0, 0.0, 9512.4, 1526, 11583, 11485.0, 11583.0, 11583.0, 11583.0, 0.052486825806722516, 3.3890394878073105, 0.0649934522684806], "isController": true}, {"data": ["Issue request creation", 5, 0, 0.0, 103712.2, 88038, 153178, 89993.0, 153178.0, 153178.0, 153178.0, 0.02729585430564806, 25.782816312889647, 0.810068451178635], "isController": true}, {"data": ["Get issues-0", 5, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.11795791261677832, 6.746178900868171, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 498, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
