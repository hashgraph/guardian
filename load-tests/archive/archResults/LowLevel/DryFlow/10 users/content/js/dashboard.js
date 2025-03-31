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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9110627177700349, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.6747292418772564, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 5700, 0, 0.0, 643.909999999999, 0, 100710, 0.0, 210.0, 8761.349999999999, 10013.0, 12.861126905477487, 21.14985525591386, 0.11656718331167248], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 10, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.058816955752004185, 0.08493995524029667, 0.0], "isController": false}, {"data": ["Dry Run Policy", 10, 0, 0.0, 17154.1, 7122, 100710, 8054.5, 91513.90000000004, 100710.0, 100710.0, 0.05627620360730465, 0.6485997337432117, 0.035227584484650666], "isController": false}, {"data": ["WS PP policy import", 1385, 0, 0.0, 0.40216606498194946, 0, 10, 0.0, 1.0, 1.0, 1.0, 3.2036899105742584, 4.685493627750894, 0.018771620569771046], "isController": false}, {"data": ["Requests for Import", 10, 0, 0.0, 348723.30000000005, 252268, 381659, 361158.5, 380562.8, 381659.0, 381659.0, 0.02318910483098621, 11.749566146341802, 0.07061127712255673], "isController": true}, {"data": ["WS PP policy import-0", 1385, 0, 0.0, 0.22671480144404355, 0, 10, 0.0, 1.0, 1.0, 1.0, 3.2036899105742584, 4.685493627750894, 0.0], "isController": false}, {"data": ["Import Policy-0", 10, 0, 0.0, 0.10000000000000002, 0, 1, 0.0, 0.9000000000000004, 1.0, 1.0, 0.11122604469062476, 0.13424244983705386, 0.0], "isController": false}, {"data": ["WS read policy import result", 1385, 0, 0.0, 2504.2223826714803, 0, 10018, 10.0, 10008.0, 10012.7, 10015.0, 3.202808296314111, 6.820998859938997, 0.0], "isController": false}, {"data": ["Import Policy", 10, 0, 0.0, 230.3, 222, 239, 229.0, 238.6, 239.0, 239.0, 0.11094592495617636, 0.17919283719240242, 0.07291660888233076], "isController": false}, {"data": ["Login by SR-0", 20, 0, 0.0, 0.25, 0, 2, 0.0, 1.0, 1.9499999999999993, 2.0, 0.0460448615085678, 0.053886876984245755, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 10, 0, 0.0, 0.39999999999999997, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11123346792582953, 0.13424054654564466, 0.0], "isController": false}, {"data": ["Login by Admin", 10, 0, 0.0, 627.0, 603, 776, 612.0, 760.1, 776.0, 776.0, 0.11035944069835453, 0.11918604049639676, 0.040630380022734044], "isController": false}, {"data": ["Requests for DryRun", 10, 0, 0.0, 17366.9, 7332, 100921, 8265.0, 91724.80000000003, 100921.0, 100921.0, 0.05620914297919699, 0.7757026406352757, 0.07410933978145885], "isController": true}, {"data": ["WS read policy import result-0", 1385, 0, 0.0, 0.27292418772563243, 0, 6, 0.0, 1.0, 1.0, 1.0, 3.202808296314111, 4.686153151181801, 0.0], "isController": false}, {"data": ["Get tenant", 10, 0, 0.0, 867.3000000000001, 835, 1018, 851.5, 1002.7, 1018.0, 1018.0, 0.11006912340950117, 0.28471786531942056, 0.08835626898692378], "isController": true}, {"data": ["Login by SR", 20, 0, 0.0, 214.35, 206, 231, 212.5, 223.60000000000002, 230.65, 231.0, 0.04602176369204997, 0.08972446194805524, 0.02476815817450072], "isController": false}, {"data": ["Get policy id", 10, 0, 0.0, 609.7000000000002, 600, 635, 604.5, 633.9, 635.0, 635.0, 0.05859809907766592, 0.26316497855309573, 0.03565099191932214], "isController": false}, {"data": ["Get Tenant Id", 10, 0, 0.0, 240.3, 231, 248, 241.0, 248.0, 248.0, 248.0, 0.11101736311559128, 0.16727411088969316, 0.04824485018206848], "isController": false}, {"data": ["Dry Run Policy-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.129897121479788, 0.1943255863231321, 0.0], "isController": false}, {"data": ["Policy import and dry run", 10, 0, 0.0, 366090.2, 335546, 388991, 368650.5, 388010.4, 388991.0, 388991.0, 0.022775152308831065, 11.854126483943517, 0.09937884330695211], "isController": true}, {"data": ["WS open for policy import", 10, 0, 0.0, 776.9, 761, 792, 776.0, 791.6, 792.0, 792.0, 0.11028276500948432, 0.15786374702236533, 0.06440341159733556], "isController": false}, {"data": ["Get Tenant Id-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11131642807845582, 0.08825957808290848, 0.0], "isController": false}, {"data": ["Login by Admin-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11131271079844607, 0.06553753255896791, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 5700, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
