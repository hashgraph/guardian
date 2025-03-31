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

    var data = {"OkPercent": 99.98233839632638, "KoPercent": 0.017661603673613566};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9138021746755525, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.6875681570338059, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.475, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.45, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.9875, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.975, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.45, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 11324, 2, 0.017661603673613566, 668.8979159307661, 0, 180205, 0.0, 175.0, 8858.0, 10013.0, 20.285327352589228, 33.371993641018314, 0.18501009765583015], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 20, 0, 0.0, 0.45, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.05079352179423036, 0.07343731349253717, 0.0], "isController": false}, {"data": ["Dry Run Policy", 20, 2, 10.0, 37472.6, 7091, 180205, 10523.5, 117549.20000000006, 177207.09999999995, 180205.0, 0.04978765564865847, 0.5022815971133117, 0.031190215916615634], "isController": false}, {"data": ["WS PP policy import", 2751, 0, 0.0, 0.30243547800799736, 0, 5, 0.0, 1.0, 1.0, 1.0, 5.0483918917430985, 7.3942397253250896, 0.02958042124068222], "isController": false}, {"data": ["Requests for Import", 20, 0, 0.0, 339988.7, 143669, 411866, 373446.0, 405529.0, 411586.7, 411866.0, 0.03666065431935829, 18.49348676218142, 0.11149815310497412], "isController": true}, {"data": ["WS PP policy import-0", 2751, 0, 0.0, 0.16684841875681602, 0, 5, 0.0, 1.0, 1.0, 1.0, 5.0483918917430985, 7.3942397253250896, 0.0], "isController": false}, {"data": ["Import Policy-0", 20, 0, 0.0, 0.05000000000000001, 0, 1, 0.0, 0.0, 0.9499999999999993, 1.0, 0.10664164142814486, 0.1288812142083991, 0.0], "isController": false}, {"data": ["WS read policy import result", 2751, 0, 0.0, 2456.650308978557, 0, 10018, 10.0, 10008.0, 10012.0, 10015.0, 5.0483918917430985, 10.783697938458616, 0.0], "isController": false}, {"data": ["Import Policy", 20, 0, 0.0, 234.70000000000005, 221, 321, 230.0, 242.70000000000002, 317.0999999999999, 321.0, 0.10645942565139861, 0.17211806849333297, 0.07001994450802437], "isController": false}, {"data": ["Login by SR-0", 40, 0, 0.0, 0.22500000000000006, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07300988736399627, 0.08555667928672991, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 20, 0, 0.0, 0.25, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10659333045531341, 0.128848851989831, 0.0], "isController": false}, {"data": ["Login by Admin", 20, 0, 0.0, 704.6, 602, 1932, 607.0, 1046.6000000000008, 1889.4999999999995, 1932.0, 0.10493124380249841, 0.11345178376556261, 0.038631913001505765], "isController": false}, {"data": ["Requests for DryRun", 20, 2, 10.0, 37700.19999999999, 7303, 180418, 10735.0, 117770.70000000006, 177420.54999999996, 180418.0, 0.049761641736084154, 0.6153799666783607, 0.06567904969570756], "isController": true}, {"data": ["WS read policy import result-0", 2751, 0, 0.0, 0.25081788440567077, 0, 10, 0.0, 1.0, 1.0, 1.0, 5.0483918917430985, 7.395952974004727, 0.0], "isController": false}, {"data": ["Get tenant", 20, 0, 0.0, 981.8999999999999, 839, 2188, 860.0, 1500.1000000000004, 2154.5999999999995, 2188.0, 0.1047998323202683, 0.2713333158666946, 0.08412642789771536], "isController": true}, {"data": ["Login by SR", 40, 0, 0.0, 229.99999999999994, 206, 562, 213.0, 278.7, 315.7999999999999, 562.0, 0.07297978277567657, 0.1424655871816485, 0.03932641028868978], "isController": false}, {"data": ["Get policy id", 20, 0, 0.0, 621.6499999999999, 594, 715, 606.5, 693.5000000000001, 714.1, 715.0, 0.050717011753667475, 0.22785509040307345, 0.03088091487149577], "isController": false}, {"data": ["Get Tenant Id", 20, 0, 0.0, 277.3, 233, 792, 246.0, 286.50000000000006, 766.7999999999996, 792.0, 0.10587164122218222, 0.15963975354405321, 0.04600867221081162], "isController": false}, {"data": ["Dry Run Policy-0", 20, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.05660783225967145, 0.0847652535111008, 0.0], "isController": false}, {"data": ["Policy import and dry run", 20, 2, 10.0, 377688.85, 194518, 432907, 396996.0, 422940.9, 432424.85, 432907.0, 0.036119990608802444, 18.667428431624856, 0.15752760357407306], "isController": true}, {"data": ["WS open for policy import", 20, 0, 0.0, 946.0500000000001, 766, 1790, 775.5, 1742.500000000001, 1789.55, 1790.0, 0.10558658628007898, 0.15134764779482415, 0.06171247254748757], "isController": false}, {"data": ["Get Tenant Id-0", 20, 0, 0.0, 0.15, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10601474665125919, 0.08417508766094364, 0.0], "isController": false}, {"data": ["Login by Admin-0", 20, 0, 0.0, 0.049999999999999996, 0, 1, 0.0, 0.0, 0.9499999999999993, 1.0, 0.10600575611255691, 0.06254236089394653, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 1, 50.0, 0.008830801836806783], "isController": false}, {"data": ["500/Internal Server Error", 1, 50.0, 0.008830801836806783], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 11324, 2, "504/Gateway Time-out", 1, "500/Internal Server Error", 1, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": ["Dry Run Policy", 20, 2, "504/Gateway Time-out", 1, "500/Internal Server Error", 1, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
