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

    var data = {"OkPercent": 99.89865720800609, "KoPercent": 0.10134279199391943};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9263892381191853, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [0.7379693283976732, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 15788, 16, 0.10134279199391943, 626.6521408664792, 0, 111964, 0.0, 227.10000000000036, 4034.3499999999876, 10011.0, 24.05984788104792, 54.43145997648191, 0.32500839115387603], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get policy id-0", 30, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06395961163723814, 0.13207076837879442, 0.0], "isController": false}, {"data": ["Requests for Import", 30, 0, 0.0, 252869.60000000003, 63013, 374548, 300740.0, 361856.0, 371465.8, 374548.0, 0.05416570372082274, 34.038900750488395, 0.19185449940959384], "isController": true}, {"data": ["Import Policy-0", 30, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10347682119205298, 0.1891281431084437, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 30, 0, 0.0, 203.2666666666667, 194, 253, 202.0, 208.60000000000002, 229.34999999999997, 253.0, 0.10340370529943989, 0.14202525850926326, 0.05503419862128393], "isController": false}, {"data": ["WS read policy import result", 3782, 0, 0.0, 1989.5650449497593, 0, 10026, 14.0, 10006.0, 10010.0, 10013.0, 6.846227786416519, 19.118146531359233, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 30, 0, 0.0, 0.16666666666666666, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10347467974586617, 0.09169904561853714, 0.0], "isController": false}, {"data": ["Import Policy", 30, 0, 0.0, 234.40000000000006, 214, 283, 229.5, 250.8, 276.95, 283.0, 0.10339729030167882, 0.23118987878391004, 0.0699143396532055], "isController": false}, {"data": ["Get SR Access Token-0", 60, 0, 0.0, 0.3666666666666668, 0, 10, 0.0, 1.0, 1.0, 10.0, 0.10821378715790916, 0.19200197535250643, 0.0], "isController": false}, {"data": ["Get policy id", 30, 0, 0.0, 598.5333333333332, 584, 629, 596.0, 611.9, 624.05, 629.0, 0.06387912366359551, 0.32510148795772054, 0.04007416898583374], "isController": false}, {"data": ["Get Tenant Id", 30, 0, 0.0, 232.89999999999998, 222, 269, 231.5, 245.5, 260.75, 269.0, 0.10339443944704653, 0.1925014636775334, 0.04695157650671547], "isController": false}, {"data": ["Dry Run Policy-0", 30, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.05900923494526893, 0.12491824762241958, 0.0], "isController": false}, {"data": ["Policy import and dry run", 30, 16, 53.333333333333336, 328680.6333333334, 133251, 475208, 366160.5, 462509.4, 472114.8, 475208.0, 0.045836656490928926, 29.459356397956906, 0.26439335471613357], "isController": true}, {"data": ["WS open for policy import", 30, 0, 0.0, 762.8666666666667, 749, 777, 762.5, 771.7, 774.25, 777.0, 0.10320343461030383, 0.2118156429745982, 0.06222441457851718], "isController": false}, {"data": ["Dry Run Policy", 30, 16, 53.333333333333336, 75399.80000000002, 12896, 111964, 100234.5, 100249.0, 105542.74999999999, 111964.0, 0.05269934846038853, 0.45855638149585337, 0.03398696262035213], "isController": false}, {"data": ["WS PP policy import", 3782, 0, 0.0, 0.35933368588048675, 0, 85, 0.0, 1.0, 1.0, 1.0, 6.846227786416519, 14.285152028525344, 0.04011461593603429], "isController": false}, {"data": ["WS PP policy import-0", 3782, 0, 0.0, 0.22342675832892608, 0, 85, 0.0, 1.0, 1.0, 1.0, 6.846227786416519, 14.285152028525344, 0.0], "isController": false}, {"data": ["Login by SR-0", 60, 0, 0.0, 0.28333333333333327, 0, 2, 0.0, 1.0, 1.0, 2.0, 0.10821320164989061, 0.1781713456852691, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 30, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10347824887208708, 0.1891374893934795, 0.0], "isController": false}, {"data": ["Login by Admin", 30, 0, 0.0, 605.3333333333334, 590, 675, 602.0, 614.7, 668.4, 675.0, 0.10323504210269134, 0.12354935946957836, 0.036596015901637656], "isController": false}, {"data": ["Get SR Access Token", 60, 0, 0.0, 202.11666666666667, 194, 213, 202.0, 206.0, 210.0, 213.0, 0.1081747671538137, 0.26243649239711675, 0.07552162210767716], "isController": false}, {"data": ["Requests for DryRun", 30, 16, 53.333333333333336, 75811.03333333333, 13307, 112385, 100642.0, 100669.3, 105954.4, 112385.0, 0.05266049602676558, 0.7520628515088109, 0.11723131517833477], "isController": true}, {"data": ["WS read policy import result-0", 3782, 0, 0.0, 0.25938656795346304, 0, 11, 0.0, 1.0, 1.0, 1.0, 6.846227786416519, 14.287879723412939, 0.0], "isController": false}, {"data": ["Get tenant", 30, 0, 0.0, 1041.4999999999998, 1016, 1097, 1037.0, 1090.0, 1094.8, 1097.0, 0.10308251067763007, 0.4568716197526707, 0.13821512418006454], "isController": true}, {"data": ["Login by SR", 60, 0, 0.0, 208.83333333333337, 200, 226, 208.0, 217.9, 221.0, 226.0, 0.10817379201425009, 0.2532576650146125, 0.05851314784833313], "isController": false}, {"data": ["Get Tenant Id-0", 30, 0, 0.0, 0.13333333333333336, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10347325216431552, 0.11635688463594661, 0.0], "isController": false}, {"data": ["Login by Admin-0", 30, 0, 0.0, 0.19999999999999998, 0, 2, 0.0, 1.0, 1.4499999999999993, 2.0, 0.10347467974586617, 0.06441905111131806, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["500/Internal Server Error", 16, 100.0, 0.10134279199391943], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 15788, 16, "500/Internal Server Error", 16, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Dry Run Policy", 30, 16, "500/Internal Server Error", 16, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
