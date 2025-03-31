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

    var data = {"OkPercent": 99.81187290969899, "KoPercent": 0.18812709030100336};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9418532338308457, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.95, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [0.8076248904469764, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.45, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 4784, 9, 0.18812709030100336, 455.1032608695662, 0, 100251, 0.0, 44.0, 779.0, 10005.0, 15.712807711888065, 35.684125869352805, 0.23088014016389408], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07280086778634401, 0.15008780467163169, 0.0], "isController": false}, {"data": ["Requests for Import", 10, 0, 0.0, 118350.7, 65646, 156382, 125439.5, 155008.7, 156382.0, 156382.0, 0.04920799728371855, 28.483136188668382, 0.17061335308214293], "isController": true}, {"data": ["Import Policy-0", 10, 0, 0.0, 0.20000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11144668947608911, 0.20330314056770943, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 10, 0, 0.0, 265.0, 196, 819, 203.5, 758.3000000000002, 819.0, 819.0, 0.11115063133558599, 0.15248477236350702, 0.05915731843544371], "isController": false}, {"data": ["WS read policy import result", 1141, 0, 0.0, 1019.064855390008, 0, 10020, 2.0, 3663.9999999999995, 9290.799999999992, 10013.0, 5.660480322265383, 16.237143499191358, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 10, 0, 0.0, 0.20000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11141192330403199, 0.0985516798132736, 0.0], "isController": false}, {"data": ["Import Policy", 10, 0, 0.0, 226.2, 219, 235, 226.0, 234.3, 235.0, 235.0, 0.1111753457553253, 0.2481902738248766, 0.07504335838484458], "isController": false}, {"data": ["Get SR Access Token-0", 20, 0, 0.0, 0.15000000000000002, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.09818215735654359, 0.17391856955960394, 0.0], "isController": false}, {"data": ["Get policy id", 10, 0, 0.0, 610.2, 597, 646, 604.5, 643.4, 646.0, 646.0, 0.07247374638537189, 0.36860402202114784, 0.0453810216624028], "isController": false}, {"data": ["Get Tenant Id", 10, 0, 0.0, 240.0, 225, 293, 232.0, 289.3, 293.0, 293.0, 0.11112098853231399, 0.20668069800648944, 0.05046021451906836], "isController": false}, {"data": ["Dry Run Policy-0", 10, 0, 0.0, 0.7, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.07343114361663068, 0.15517348796096403, 0.0], "isController": false}, {"data": ["Policy import and dry run", 10, 9, 90.0, 216539.5, 166320, 257044, 224654.0, 255668.80000000002, 257044.0, 257044.0, 0.033040157006826096, 19.435707803795985, 0.18795461191031582], "isController": true}, {"data": ["WS open for policy import", 10, 0, 0.0, 774.0, 760, 790, 771.5, 789.7, 790.0, 790.0, 0.11048502927853276, 0.22638641448458732, 0.06648522953264832], "isController": false}, {"data": ["Dry Run Policy", 10, 9, 90.0, 97771.20000000001, 75512, 100251, 100244.0, 100250.7, 100251.0, 100251.0, 0.042296711430686265, 0.16254907079412076, 0.02722850798350428], "isController": false}, {"data": ["WS PP policy import", 1141, 0, 0.0, 0.3829973707274329, 0, 67, 0.0, 1.0, 1.0, 1.0, 5.660480322265383, 11.817974482259528, 0.03316687688827372], "isController": false}, {"data": ["WS PP policy import-0", 1141, 0, 0.0, 0.2392638036809816, 0, 67, 0.0, 1.0, 1.0, 1.0, 5.660508403944993, 11.818033111307622, 0.0], "isController": false}, {"data": ["Login by SR-0", 20, 0, 0.0, 0.15000000000000002, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.09818408534160698, 0.1614140610042268, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 10, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11145290000445812, 0.20333623807453968, 0.0], "isController": false}, {"data": ["Login by Admin", 10, 0, 0.0, 619.5, 588, 783, 602.0, 766.0, 783.0, 783.0, 0.11041427435738893, 0.13197956231781646, 0.039140997648175954], "isController": false}, {"data": ["Get SR Access Token", 20, 0, 0.0, 204.55, 197, 224, 203.0, 213.0, 223.45, 224.0, 0.09808489247443664, 0.2375589275643069, 0.06836248804590372], "isController": false}, {"data": ["Requests for DryRun", 10, 9, 90.0, 98188.8, 75931, 100686, 100660.0, 100684.8, 100686.0, 100686.0, 0.04222028008933811, 0.3974437401573972, 0.09379169252658821], "isController": true}, {"data": ["WS read policy import result-0", 1141, 0, 0.0, 0.24189307624890433, 0, 8, 0.0, 1.0, 1.0, 1.0, 5.660480322265383, 11.821205903072336, 0.0], "isController": false}, {"data": ["Get tenant", 10, 0, 0.0, 1124.5, 1019, 1722, 1040.5, 1673.1000000000001, 1722.0, 1722.0, 0.1098526875460008, 0.4863341540244532, 0.14729271484439366], "isController": true}, {"data": ["Login by SR", 20, 0, 0.0, 214.9, 200, 280, 211.0, 224.3, 277.24999999999994, 280.0, 0.09808104436696043, 0.22926923032126445, 0.05293886056798733], "isController": false}, {"data": ["Get Tenant Id-0", 10, 0, 0.0, 0.09999999999999999, 0, 1, 0.0, 0.9000000000000004, 1.0, 1.0, 0.11141564721349466, 0.12508147269202485, 0.0], "isController": false}, {"data": ["Login by Admin-0", 10, 0, 0.0, 0.20000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11137593834228053, 0.0691748992047758, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["500/Internal Server Error", 9, 100.0, 0.18812709030100336], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 4784, 9, "500/Internal Server Error", 9, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Dry Run Policy", 10, 9, "500/Internal Server Error", 9, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
