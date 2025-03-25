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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8270303781773094, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [0.9259259259259259, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.5, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1462, 0, 0.0, 528.7688098495219, 0, 13315, 103.5, 756.7, 1080.6999999999998, 10242.439999999999, 2.483969730229334, 17.398091749083378, 0.935555350198106], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 50, 0, 0.0, 0.7599999999999999, 0, 3, 1.0, 1.0, 1.4499999999999957, 3.0, 0.09994403134244823, 0.4798640886103782, 0.0], "isController": false}, {"data": ["Dry Run Policy", 50, 0, 0.0, 10058.780000000002, 8518, 13315, 9824.5, 11603.199999999999, 12660.249999999995, 13315.0, 0.09764423518199909, 2.8479962731636537, 0.07702261184170697], "isController": false}, {"data": ["Requests for Import", 50, 0, 0.0, 80254.07999999999, 74259, 105148, 74645.0, 95007.6, 95324.3, 105148.0, 0.08701690390375234, 8.326319521611518, 0.7169020192925177], "isController": true}, {"data": ["Get policy import result", 378, 0, 0.0, 343.14814814814815, 212, 1137, 269.0, 764.5000000000001, 808.1, 881.0999999999998, 0.6715964451582871, 6.128865843724127, 0.5035394426326937], "isController": false}, {"data": ["Import Policy-0", 50, 0, 0.0, 0.76, 0, 3, 1.0, 1.8999999999999986, 2.0, 3.0, 0.10203165430043017, 0.473536480270139, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 1, 0, 0.0, 233.0, 233, 233, 233.0, 233.0, 233.0, 233.0, 4.291845493562231, 20.218615879828324, 2.820714860515021], "isController": false}, {"data": ["Get policy import result-0", 378, 0, 0.0, 0.7804232804232815, 0, 9, 1.0, 1.0, 2.0, 2.0, 0.6719235500316408, 3.2376351012951416, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4115.234375, 0.0], "isController": false}, {"data": ["Import Policy", 50, 0, 0.0, 279.8399999999999, 203, 420, 279.5, 329.3, 373.4, 420.0, 0.10197630070771553, 0.508433519737513, 0.081435644668679], "isController": false}, {"data": ["Login by SR-0", 100, 0, 0.0, 0.82, 0, 7, 1.0, 1.0, 2.0, 6.949999999999974, 0.1741565597809807, 0.7484412171540727, 0.0], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 887.0, 887, 887, 887.0, 887.0, 887.0, 887.0, 1.1273957158962795, 4.552520786358512, 0.39965297350620066], "isController": false}, {"data": ["Get SR Access Token", 100, 0, 0.0, 259.9299999999999, 198, 408, 258.0, 301.8, 325.0499999999998, 407.6999999999998, 0.17408955514895974, 0.9048627646596462, 0.15397575117466927], "isController": false}, {"data": ["Requests for DryRun", 50, 0, 0.0, 10956.52, 9356, 14212, 10755.0, 12542.5, 13485.749999999996, 14212.0, 0.09749173270106695, 3.9290405966542785, 0.267136868277945], "isController": true}, {"data": ["Get SR Access Token-0", 100, 0, 0.0, 0.7899999999999999, 0, 5, 1.0, 1.0, 2.0, 4.969999999999985, 0.17416747944823743, 0.7816599058842484, 0.0], "isController": false}, {"data": ["Get tenant", 1, 0, 0.0, 1379.0, 1379, 1379, 1379.0, 1379.0, 1379.0, 1379.0, 0.7251631617113851, 10.114043237853517, 1.237168011240029], "isController": true}, {"data": ["Login by SR", 100, 0, 0.0, 855.3200000000002, 534, 1259, 954.0, 1121.5, 1152.9, 1258.2699999999995, 0.1738592227101871, 0.8720534121611049, 0.1047043398956497], "isController": false}, {"data": ["Get policy id", 50, 0, 0.0, 259.0599999999999, 212, 316, 252.5, 293.0, 305.34999999999997, 316.0, 0.09989610804763047, 1.2403467581215537, 0.07489671678953888], "isController": false}, {"data": ["Get Tenant Id", 1, 0, 0.0, 259.0, 259, 259, 259.0, 259.0, 259.0, 259.0, 3.8610038610038613, 20.070433156370655, 2.6808337355212353], "isController": false}, {"data": ["Dry Run Policy-0", 50, 0, 0.0, 0.5599999999999999, 0, 2, 1.0, 1.0, 1.4499999999999957, 2.0, 0.09957997167945605, 0.483262380528929, 0.0], "isController": false}, {"data": ["Policy import and dry run", 50, 0, 0.0, 91210.59999999999, 84126, 117033, 85730.5, 105912.7, 108079.54999999999, 117033.0, 0.08515145889994533, 11.579534017156316, 0.9348565793977749], "isController": true}, {"data": ["Get Tenant Id-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 4526.3671875, 0.0], "isController": false}, {"data": ["Login by Admin-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1462, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
