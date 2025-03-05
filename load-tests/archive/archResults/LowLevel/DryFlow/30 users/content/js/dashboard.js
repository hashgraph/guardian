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

    var data = {"OkPercent": 99.96454619124798, "KoPercent": 0.03545380875202593};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8914367700362464, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [0.5856214630056592, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.5333333333333333, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.9916666666666667, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 19744, 7, 0.03545380875202593, 965.5023298217208, 0, 210231, 0.0, 1281.0, 10005.0, 10014.0, 19.09191562193288, 41.670551871153265, 0.2163507736993004], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 30, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.03258266493616513, 0.06610717253064129, 0.0], "isController": false}, {"data": ["Requests for Import", 30, 0, 0.0, 573346.9666666666, 41795, 789493, 662276.0, 766790.7000000001, 785364.15, 789493.0, 0.031154492010430527, 23.410726608428536, 0.11864263383190905], "isController": true}, {"data": ["Import Policy-0", 30, 0, 0.0, 0.3333333333333333, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10355647452338133, 0.1855386835210582, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 30, 0, 0.0, 239.53333333333336, 235, 246, 239.0, 243.9, 244.9, 246.0, 0.10345933530825709, 0.13838696442550755, 0.05637725498242916], "isController": false}, {"data": ["WS read policy import result", 4771, 0, 0.0, 3590.129951792072, 0, 10082, 54.0, 10011.0, 10013.0, 10015.0, 4.961734017361389, 12.907171412193636, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 30, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10354610908237438, 0.08824676698846497, 0.0], "isController": false}, {"data": ["Import Policy", 30, 0, 0.0, 256.3, 249, 270, 255.0, 262.9, 267.25, 270.0, 0.10346468750215551, 0.22760884054022362, 0.07146877177069466], "isController": false}, {"data": ["Get SR Access Token-0", 60, 0, 0.0, 0.3333333333333333, 0, 2, 0.0, 1.0, 1.0, 2.0, 0.062204786450968115, 0.1081243517094912, 0.0], "isController": false}, {"data": ["Get policy id", 30, 0, 0.0, 698.0333333333333, 248, 1385, 697.0, 721.1, 1105.0499999999997, 1385.0, 0.03257328990228013, 0.16387164087947884, 0.0209096769815418], "isController": false}, {"data": ["Get Tenant Id", 30, 0, 0.0, 276.69999999999993, 266, 300, 273.5, 291.40000000000003, 296.7, 300.0, 0.1034500594837842, 0.18625051725029743, 0.04829016448559458], "isController": false}, {"data": ["Dry Run Policy-0", 30, 0, 0.0, 0.36666666666666664, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.03070715507420384, 0.06389127402451045, 0.0], "isController": false}, {"data": ["Policy import and dry run", 30, 7, 23.333333333333332, 634114.3333333333, 54981, 860290, 694173.5, 791097.0, 848446.85, 860290.0, 0.029079291473370152, 22.273360924532454, 0.17674756848657797], "isController": true}, {"data": ["WS open for policy import", 30, 0, 0.0, 899.2666666666667, 886, 957, 897.0, 910.6, 931.6999999999999, 957.0, 0.1032361078610855, 0.2081289670625198, 0.06374964082437473], "isController": false}, {"data": ["Dry Run Policy", 30, 7, 23.333333333333332, 60257.333333333336, 7366, 210231, 36601.0, 166986.60000000003, 210226.6, 210231.0, 0.030335234678431345, 0.27384461622894607, 0.02000624526643942], "isController": false}, {"data": ["WS PP policy import", 4771, 0, 0.0, 0.33179626912596893, 0, 72, 0.0, 1.0, 1.0, 1.0, 4.96180109947938, 10.128472467775852, 0.029073053317261992], "isController": false}, {"data": ["WS PP policy import-0", 4771, 0, 0.0, 0.1810941102494232, 0, 72, 0.0, 1.0, 1.0, 1.0, 4.96180109947938, 10.128472467775852, 0.0], "isController": false}, {"data": ["Login by SR-0", 60, 0, 0.0, 0.38333333333333336, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06224247177303906, 0.10024340534527974, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 30, 0, 0.0, 0.2666666666666667, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1035571894578781, 0.18551636742953798, 0.0], "isController": false}, {"data": ["Login by Admin", 30, 0, 0.0, 712.6666666666665, 696, 902, 703.5, 716.7, 829.3999999999999, 902.0, 0.10320982557539478, 0.1175624419444731, 0.03799814867375374], "isController": false}, {"data": ["Get SR Access Token", 60, 0, 0.0, 251.4333333333333, 235, 828, 240.0, 249.9, 252.89999999999998, 828.0, 0.062189119184410425, 0.14862531437895354, 0.044325942502013375], "isController": false}, {"data": ["Requests for DryRun", 30, 7, 23.333333333333332, 60767.36666666666, 7853, 210722, 37091.5, 167476.90000000002, 210712.1, 210722.0, 0.03032027304416552, 0.4400328324340003, 0.06882465103892416], "isController": true}, {"data": ["WS read policy import result-0", 4771, 0, 0.0, 0.338713058059107, 0, 87, 0.0, 1.0, 1.0, 1.0, 4.961734017361389, 10.129688317357541, 0.0], "isController": false}, {"data": ["Get tenant", 30, 0, 0.0, 1228.9, 1201, 1429, 1219.0, 1249.7, 1353.6499999999999, 1429.0, 0.10302197802197802, 0.44063023158482145, 0.14215825678228022], "isController": true}, {"data": ["Login by SR", 60, 0, 0.0, 248.71666666666667, 239, 268, 248.0, 253.0, 254.0, 268.0, 0.0622262692343991, 0.14204786684459925, 0.034568799178198405], "isController": false}, {"data": ["Get Tenant Id-0", 30, 0, 0.0, 0.23333333333333334, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10355075540276065, 0.11271257028507523, 0.0], "isController": false}, {"data": ["Login by Admin-0", 30, 0, 0.0, 0.2333333333333333, 0, 2, 0.0, 1.0, 1.4499999999999993, 2.0, 0.10353038616834041, 0.06110719277357905, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 2, 28.571428571428573, 0.01012965964343598], "isController": false}, {"data": ["500/Internal Server Error", 5, 71.42857142857143, 0.02532414910858995], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 19744, 7, "500/Internal Server Error", 5, "504/Gateway Time-out", 2, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Dry Run Policy", 30, 7, "500/Internal Server Error", 5, "504/Gateway Time-out", 2, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
