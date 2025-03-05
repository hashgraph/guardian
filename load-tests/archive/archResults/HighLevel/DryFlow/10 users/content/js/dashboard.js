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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.911836592178771, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.6780028943560058, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 5688, 0, 0.0, 642.1942686357237, 0, 70965, 1.0, 259.10000000000036, 9224.350000000002, 10010.0, 11.907727671440504, 19.58764522552562, 0.1081271373146483], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 10, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.05679365728435448, 0.08202357398225767, 0.0], "isController": false}, {"data": ["Dry Run Policy", 10, 0, 0.0, 14998.699999999999, 7269, 70965, 8574.0, 65099.80000000002, 70965.0, 70965.0, 0.054010261949770454, 0.6260496134890629, 0.033814432554685386], "isController": false}, {"data": ["Requests for Import", 10, 0, 0.0, 348734.8, 289488, 385428, 347883.5, 385076.9, 385428.0, 385428.0, 0.021486708322231866, 10.867821794344268, 0.06539597183307407], "isController": true}, {"data": ["WS PP policy import", 1382, 0, 0.0, 0.6960926193921851, 0, 16, 1.0, 1.0, 1.0, 2.0, 2.9761840668629254, 4.353615154446079, 0.017438578516774952], "isController": false}, {"data": ["WS PP policy import-0", 1382, 0, 0.0, 0.4138929088277862, 0, 13, 0.0, 1.0, 1.0, 1.0, 2.976190476190476, 4.353624530124776, 0.0], "isController": false}, {"data": ["Import Policy-0", 10, 0, 0.0, 0.7, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1109680855785876, 0.13395278377313685, 0.0], "isController": false}, {"data": ["WS read policy import result", 1382, 0, 0.0, 2503.9507959479038, 0, 10026, 2.0, 10002.0, 10009.0, 10015.0, 2.976190476190476, 6.341506887555131, 0.0], "isController": false}, {"data": ["Import Policy", 10, 0, 0.0, 293.7, 260, 308, 305.5, 308.0, 308.0, 308.0, 0.11061946902654868, 0.17868717159845132, 0.07271285605641592], "isController": false}, {"data": ["Login by SR-0", 20, 0, 0.0, 0.5, 0, 2, 0.0, 1.0, 1.9499999999999993, 2.0, 0.04281985899420433, 0.050112616229154756, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 10, 0, 0.0, 0.7, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.11099395082967979, 0.13397316721238692, 0.0], "isController": false}, {"data": ["Login by Admin", 10, 0, 0.0, 830.3, 796, 887, 812.5, 886.5, 887.0, 887.0, 0.11002915772679761, 0.11879710623315178, 0.04050878170215107], "isController": false}, {"data": ["Requests for DryRun", 10, 0, 0.0, 15284.699999999999, 7571, 71294, 8843.5, 65421.00000000002, 71294.0, 71294.0, 0.05391416864351952, 0.7476168252641795, 0.07109404484310977], "isController": true}, {"data": ["WS read policy import result-0", 1382, 0, 0.0, 0.4124457308248912, 0, 11, 0.0, 1.0, 1.0, 1.0, 2.9761968855456327, 4.3537117194213, 0.0], "isController": false}, {"data": ["Get tenant", 10, 0, 0.0, 1142.9, 1067, 1185, 1152.5, 1184.3, 1185.0, 1185.0, 0.10969001601474233, 0.283705085366255, 0.08805194644933419], "isController": true}, {"data": ["Login by SR", 20, 0, 0.0, 290.85, 245, 329, 302.0, 328.9, 329.0, 329.0, 0.04279200730887484, 0.08343605643837844, 0.02303204573074841], "isController": false}, {"data": ["Get policy id", 10, 0, 0.0, 827.9, 700, 945, 816.0, 938.8000000000001, 945.0, 945.0, 0.05651026508965354, 0.2537940020711012, 0.03438627556383117], "isController": false}, {"data": ["Get Tenant Id", 10, 0, 0.0, 312.59999999999997, 271, 354, 308.5, 353.1, 354.0, 354.0, 0.11075423634954036, 0.16687764771846272, 0.04813050310111861], "isController": false}, {"data": ["Dry Run Policy-0", 10, 0, 0.0, 0.30000000000000004, 0, 2, 0.0, 1.9000000000000004, 2.0, 2.0, 0.08758024539984761, 0.13102825776617827, 0.0], "isController": false}, {"data": ["Policy import and dry run", 10, 0, 0.0, 364019.5, 338952, 394844, 359282.5, 394461.2, 394844.0, 394844.0, 0.021060612442609834, 10.944348812444716, 0.09187075167958385], "isController": true}, {"data": ["WS open for policy import", 10, 0, 0.0, 1175.3, 1124, 1391, 1127.0, 1374.8000000000002, 1391.0, 1391.0, 0.10959985094420271, 0.1569075991056652, 0.06401530356418715], "isController": false}, {"data": ["Get Tenant Id-0", 10, 0, 0.0, 0.20000000000000004, 0, 2, 0.0, 1.8000000000000007, 2.0, 2.0, 0.111123458162018, 0.08810657781420159, 0.0], "isController": false}, {"data": ["Login by Admin-0", 10, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11109876680368848, 0.0653790203866237, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 5688, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
