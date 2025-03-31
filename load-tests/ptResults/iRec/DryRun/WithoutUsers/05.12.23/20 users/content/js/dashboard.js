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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9218349798755946, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [0.7168651555897042, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.625, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10852, 0, 0.0, 553.8686877994854, 0, 93136, 0.0, 87.0, 4304.150000000003, 10012.0, 20.0175605581011, 44.617131095699506, 0.2689832319266441], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 20, 0, 0.0, 0.30000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.042697180918629854, 0.08681204167244858, 0.0], "isController": false}, {"data": ["Requests for Import", 20, 0, 0.0, 273100.69999999995, 46766, 409774, 346244.0, 398434.5, 409247.89999999997, 409774.0, 0.03843448649604317, 24.468576414244975, 0.1398129513650008], "isController": true}, {"data": ["Import Policy-0", 20, 0, 0.0, 0.5000000000000001, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.10543796293855603, 0.18934042788043334, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 20, 0, 0.0, 206.6, 203, 212, 207.0, 210.8, 211.95, 212.0, 0.10529363763194609, 0.14129809780462765, 0.05758245807997052], "isController": false}, {"data": ["WS read policy import result", 2603, 0, 0.0, 2082.988859008836, 0, 10017, 12.0, 10006.0, 10011.0, 10015.0, 5.012198339023324, 13.719312274711024, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 20, 0, 0.0, 0.30000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1054101773526234, 0.09008761397475426, 0.0], "isController": false}, {"data": ["Import Policy", 20, 0, 0.0, 233.35, 222, 274, 232.0, 246.20000000000002, 272.65, 274.0, 0.10530805238022525, 0.23209421681085093, 0.07270780569611254], "isController": false}, {"data": ["Get SR Access Token-0", 40, 0, 0.0, 0.3249999999999999, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.0767071168863047, 0.13365128932677997, 0.0], "isController": false}, {"data": ["Get policy id", 20, 0, 0.0, 510.65, 219, 625, 599.5, 620.9, 624.8, 625.0, 0.042674131794788635, 0.2148709214198537, 0.027379789637867316], "isController": false}, {"data": ["Get Tenant Id", 20, 0, 0.0, 244.65000000000003, 237, 253, 244.5, 252.70000000000002, 253.0, 253.0, 0.10527811846946672, 0.19021000681675815, 0.04934911803256252], "isController": false}, {"data": ["Dry Run Policy-0", 20, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.042194181844265495, 0.08796497988392381, 0.0], "isController": false}, {"data": ["Policy import and dry run", 20, 0, 0.0, 299372.65, 60605, 436958, 367445.0, 428626.3, 436565.0, 436958.0, 0.03705508423547024, 24.220686707136995, 0.21886020992631597], "isController": true}, {"data": ["WS open for policy import", 20, 0, 0.0, 761.8, 746, 773, 761.0, 771.0, 772.9, 773.0, 0.10500727175356894, 0.21214750371463226, 0.06480917553540583], "isController": false}, {"data": ["Dry Run Policy", 20, 0, 0.0, 25838.749999999996, 8279, 93136, 20119.0, 56965.90000000002, 91391.44999999998, 93136.0, 0.0410384365997193, 0.4726313383865328, 0.027051703813291528], "isController": false}, {"data": ["WS PP policy import", 2603, 0, 0.0, 0.5059546676911258, 0, 78, 0.0, 1.0, 1.0, 1.0, 5.012198339023324, 10.292380518015417, 0.029368349642714793], "isController": false}, {"data": ["WS PP policy import-0", 2603, 0, 0.0, 0.306185170956589, 0, 63, 0.0, 1.0, 1.0, 1.0, 5.012198339023324, 10.292380518015417, 0.0], "isController": false}, {"data": ["Login by SR-0", 40, 0, 0.0, 0.44999999999999996, 0, 8, 0.0, 1.0, 1.0, 8.0, 0.07670696978704228, 0.1238547889120075, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 20, 0, 0.0, 0.30000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10543351626048404, 0.1893272946286895, 0.0], "isController": false}, {"data": ["Login by Admin", 20, 0, 0.0, 614.4499999999999, 596, 799, 605.0, 614.0, 789.7499999999999, 799.0, 0.10495382031905962, 0.11992818862825357, 0.03874271882871536], "isController": false}, {"data": ["Get SR Access Token", 40, 0, 0.0, 210.8, 203, 259, 208.5, 214.9, 227.74999999999997, 259.0, 0.07667609143623905, 0.18354152190060863, 0.05462797119854316], "isController": false}, {"data": ["Requests for DryRun", 20, 0, 0.0, 26271.949999999997, 8707, 93571, 20540.0, 57387.50000000003, 91825.74999999997, 93571.0, 0.041002007048245005, 0.6974145095339916, 0.09301929938845506], "isController": true}, {"data": ["WS read policy import result-0", 2603, 0, 0.0, 0.3630426431041103, 0, 100, 0.0, 1.0, 1.0, 1.0, 5.012275549992779, 10.292166739878688, 0.0], "isController": false}, {"data": ["Get tenant", 20, 0, 0.0, 1065.7000000000003, 1043, 1263, 1052.5, 1071.3, 1253.4499999999998, 1263.0, 0.10469669367841364, 0.44929093346263377, 0.14498038245702202], "isController": true}, {"data": ["Login by SR", 40, 0, 0.0, 219.82500000000007, 208, 245, 218.5, 231.5, 234.95, 245.0, 0.07667447468400532, 0.17532172729381273, 0.04257155525546018], "isController": false}, {"data": ["Get Tenant Id-0", 20, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1054179558404183, 0.11520823670020715, 0.0], "isController": false}, {"data": ["Login by Admin-0", 20, 0, 0.0, 0.3499999999999999, 0, 3, 0.0, 1.0, 2.8999999999999986, 3.0, 0.10539351302927305, 0.06227892063868469, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 10852, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
