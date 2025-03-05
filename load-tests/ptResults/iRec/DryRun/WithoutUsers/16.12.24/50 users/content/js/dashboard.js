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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8003182179793158, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy i-Rec"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy i-Rec-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1106, 0, 0.0, 754.2070524412295, 0, 35610, 110.0, 599.6000000000001, 1126.6499999999999, 12855.280000000006, 2.0136733151872117, 12.41440665140329, 0.759586739524256], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 50, 0, 0.0, 0.7599999999999998, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.10212022000780198, 0.4902927390991771, 0.0], "isController": false}, {"data": ["Dry Run Policy", 50, 0, 0.0, 12922.699999999999, 8486, 35610, 11461.5, 15928.899999999998, 28872.549999999956, 35610.0, 0.09926070625977718, 1.8035767261684972, 0.07830157549074493], "isController": false}, {"data": ["Requests for Import", 50, 0, 0.0, 42980.719999999994, 42776, 43211, 42986.5, 43135.7, 43169.35, 43211.0, 0.0938399690703462, 5.201476173093453, 0.522655637107702], "isController": true}, {"data": ["Get policy import result", 200, 0, 0.0, 266.85499999999996, 219, 452, 262.5, 301.0, 316.0, 381.82000000000016, 0.38404080049464456, 3.0163217040178347, 0.28794809160525214], "isController": false}, {"data": ["Get Admin Access Token", 1, 0, 0.0, 256.0, 256, 256, 256.0, 256.0, 256.0, 256.0, 3.90625, 18.402099609375, 2.567291259765625], "isController": false}, {"data": ["Import Policy i-Rec", 50, 0, 0.0, 254.83999999999992, 205, 321, 256.5, 292.8, 304.59999999999997, 321.0, 0.10203831742896093, 0.5087407298188615, 0.08148915549517155], "isController": false}, {"data": ["Get policy import result-0", 200, 0, 0.0, 0.8799999999999999, 0, 23, 1.0, 1.0, 1.9499999999999886, 2.990000000000009, 0.3842318916312373, 1.8492623167934312, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4115.234375, 0.0], "isController": false}, {"data": ["Login by SR-0", 100, 0, 0.0, 0.6799999999999998, 0, 2, 1.0, 1.0, 1.9499999999999886, 2.0, 0.1878911659210519, 0.8074732947937238, 0.0], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 884.0, 884, 884, 884.0, 884.0, 884.0, 884.0, 1.1312217194570138, 4.569075226244344, 0.40100926187782804], "isController": false}, {"data": ["Get SR Access Token", 100, 0, 0.0, 253.6400000000001, 197, 348, 249.5, 303.8, 328.69999999999993, 347.99, 0.18780506585384635, 0.9761443402830599, 0.16611027948680387], "isController": false}, {"data": ["Requests for DryRun", 50, 0, 0.0, 13752.24, 9369, 36564, 12325.0, 16804.3, 29714.899999999954, 36564.0, 0.09909427829637117, 2.903880408070238, 0.27153961231840973], "isController": true}, {"data": ["Get SR Access Token-0", 100, 0, 0.0, 0.7, 0, 2, 1.0, 1.0, 1.9499999999999886, 2.0, 0.18792718197552813, 0.8433984733970281, 0.0], "isController": false}, {"data": ["Get tenant", 1, 0, 0.0, 1459.0, 1459, 1459, 1459.0, 1459.0, 1459.0, 1459.0, 0.6854009595613434, 9.56013857950651, 1.1693315198766279], "isController": true}, {"data": ["Import Policy i-Rec-0", 50, 0, 0.0, 0.7199999999999998, 0, 2, 1.0, 1.8999999999999986, 2.0, 2.0, 0.1020985332524713, 0.4738448763382565, 0.0], "isController": false}, {"data": ["Login by SR", 100, 0, 0.0, 814.0999999999997, 511, 1241, 815.0, 1096.8, 1126.95, 1239.9999999999995, 0.18749484389179297, 0.9404587565248207, 0.11291986833643326], "isController": false}, {"data": ["Get policy id", 50, 0, 0.0, 264.76, 220, 319, 260.5, 301.4, 311.0, 319.0, 0.10206810392166069, 0.9935054065474647, 0.0765291492470436], "isController": false}, {"data": ["Get Tenant Id", 1, 0, 0.0, 319.0, 319, 319, 319.0, 319.0, 319.0, 319.0, 3.134796238244514, 16.295430054858933, 2.176601684952978], "isController": false}, {"data": ["Dry Run Policy-0", 50, 0, 0.0, 0.8599999999999999, 0, 3, 1.0, 1.0, 2.0, 3.0, 0.10150738466223418, 0.4926220784905852, 0.0], "isController": false}, {"data": ["Policy import and dry run", 50, 0, 0.0, 56732.96, 52508, 79532, 55275.5, 59594.1, 72576.84999999995, 79532.0, 0.09127802007021105, 7.734300408742973, 0.7585078673666473], "isController": true}, {"data": ["Get Tenant Id-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4526.3671875, 0.0], "isController": false}, {"data": ["Login by Admin-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3404.296875, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1106, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
