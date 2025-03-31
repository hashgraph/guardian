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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9406099518459069, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.8035117056856187, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.4, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 2472, 0, 0.0, 310.44255663430346, 0, 10022, 0.0, 48.0, 929.3999999999978, 10004.0, 12.441116076820872, 20.876539844473466, 0.12721125330907518], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 5, 0, 0.0, 1.8, 0, 7, 1.0, 7.0, 7.0, 7.0, 0.11368545508287671, 0.1641555799663491, 0.0], "isController": false}, {"data": ["Dry Run Policy", 5, 0, 0.0, 8110.4, 7653, 8632, 8017.0, 8632.0, 8632.0, 8632.0, 0.09504619244953047, 1.1024801412861651, 0.059496688828270534], "isController": false}, {"data": ["Requests for Import", 5, 0, 0.0, 143972.6, 140593, 148304, 143558.0, 148304.0, 148304.0, 148304.0, 0.026649610915680633, 12.06456513664588, 0.07819474702856838], "isController": true}, {"data": ["WS PP policy import", 598, 0, 0.0, 0.25919732441471566, 0, 5, 0.0, 1.0, 1.0, 1.0, 3.213965162337488, 4.72166601500567, 0.01883182712307122], "isController": false}, {"data": ["WS PP policy import-0", 598, 0, 0.0, 0.1454849498327761, 0, 5, 0.0, 1.0, 1.0, 1.0, 3.213965162337488, 4.72166601500567, 0.0], "isController": false}, {"data": ["Import Policy-0", 5, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12714234857346285, 0.15336545796673956, 0.0], "isController": false}, {"data": ["WS read policy import result", 598, 0, 0.0, 1185.887959866221, 0, 10022, 4.0, 4777.6, 10002.0, 10014.0, 3.2139478888984434, 7.1976609442853, 0.0], "isController": false}, {"data": ["Import Policy", 5, 0, 0.0, 259.2, 256, 264, 259.0, 264.0, 264.0, 264.0, 0.12632323589601072, 0.20394294295242665, 0.08302298609181172], "isController": false}, {"data": ["Login by SR-0", 10, 0, 0.0, 0.10000000000000002, 0, 1, 0.0, 0.9000000000000004, 1.0, 1.0, 0.053142869289798694, 0.06217300528240121, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12715851580580353, 0.15345946663360546, 0.0], "isController": false}, {"data": ["Login by Admin", 5, 0, 0.0, 833.8, 695, 1367, 704.0, 1367.0, 1367.0, 1367.0, 0.12289843673188476, 0.13269190590895685, 0.045246787742109926], "isController": false}, {"data": ["Requests for DryRun", 5, 0, 0.0, 8353.8, 7897, 8874, 8260.0, 8874.0, 8874.0, 8874.0, 0.09460379928857943, 1.312572283215394, 0.12472180570271703], "isController": true}, {"data": ["WS read policy import result-0", 598, 0, 0.0, 0.2692307692307692, 0, 9, 0.0, 1.0, 1.0, 1.0, 3.2139997097726014, 4.720682791866646, 0.0], "isController": false}, {"data": ["Get tenant", 5, 0, 0.0, 1103.6, 957, 1641, 974.0, 1641.0, 1641.0, 1641.0, 0.12207925385160044, 0.3156177896940694, 0.09799721354103083], "isController": true}, {"data": ["Login by SR", 10, 0, 0.0, 244.0, 242, 246, 244.0, 246.0, 246.0, 246.0, 0.05307348554808988, 0.10345183315819083, 0.028558096227536647], "isController": false}, {"data": ["Get policy id", 5, 0, 0.0, 706.8, 701, 719, 702.0, 719.0, 719.0, 719.0, 0.1118593257119846, 0.502340132049934, 0.06805503898297502], "isController": false}, {"data": ["Get Tenant Id", 5, 0, 0.0, 269.8, 262, 274, 270.0, 274.0, 274.0, 274.0, 0.12629770895955947, 0.19016192155649297, 0.05488523485058981], "isController": false}, {"data": ["Dry Run Policy-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11173683740055422, 0.16714696047868063, 0.0], "isController": false}, {"data": ["Policy import and dry run", 5, 0, 0.0, 152326.4, 149226, 157178, 151663.0, 157178.0, 157178.0, 157178.0, 0.02544606960008957, 11.872758360306166, 0.10821040496147465], "isController": true}, {"data": ["WS open for policy import", 5, 0, 0.0, 898.8, 894, 907, 898.0, 907.0, 907.0, 907.0, 0.1243193515502623, 0.1779563530296626, 0.07260055881548522], "isController": false}, {"data": ["Get Tenant Id-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1271746871502696, 0.10082071389510631, 0.0], "isController": false}, {"data": ["Login by Admin-0", 5, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12716821811892773, 0.0748355158578768, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 2472, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
