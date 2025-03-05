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

    var data = {"OkPercent": 99.90065128601391, "KoPercent": 0.09934871398609119};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9178641410842586, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.325, 500, 1500, "Agree terms"], "isController": false}, {"data": [0.45, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP user link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [0.35714285714285715, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP user link"], "isController": false}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP user key gen-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [0.4, 500, 1500, "Login by user"], "isController": false}, {"data": [0.4, 500, 1500, "Get tenant id"], "isController": false}, {"data": [0.1, 500, 1500, "Get SR DID"], "isController": false}, {"data": [0.4, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.45, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [0.5, 500, 1500, "Setup ipfs"], "isController": false}, {"data": [1.0, 500, 1500, "WS read policy import result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [0.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "WS read sr link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen-0"], "isController": false}, {"data": [1.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP sr key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [1.0, 500, 1500, "WS PP user key gen"], "isController": false}, {"data": [0.6, 500, 1500, "Accept sr"], "isController": false}, {"data": [1.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [0.9, 500, 1500, "WS read user key gen result"], "isController": false}, {"data": [0.0, 500, 1500, "Create new tenant"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [1.0, 500, 1500, "WS read sr key gen result-0"], "isController": false}, {"data": [0.5161290322580645, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "WS read user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for sr link"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [0.6551724137931034, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [0.35, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.7482078853046595, 500, 1500, "WS read sr link result"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [0.3333333333333333, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP sr link"], "isController": false}, {"data": [0.8231046931407943, 500, 1500, "WS read user link result"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.45, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP policy import-0"], "isController": false}, {"data": [0.55, 500, 1500, "Accept user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen"], "isController": false}, {"data": [1.0, 500, 1500, "WS PP sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS read user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": false}, {"data": [1.0, 500, 1500, "Setup ipfs-0"], "isController": false}, {"data": [0.8152492668621701, 500, 1500, "WS read policy import result"], "isController": false}, {"data": [0.9, 500, 1500, "WS read sr key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [0.35714285714285715, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": false}, {"data": [1.0, 500, 1500, "Get tenant id-0"], "isController": false}, {"data": [0.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "WS PP sr key gen-0"], "isController": false}, {"data": [0.35, 500, 1500, "WS open for user link"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [0.225, 500, 1500, "Verify link"], "isController": false}, {"data": [0.6304347826086957, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.45652173913043476, 500, 1500, "Login by SR"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 9059, 9, 0.09934871398609119, 468.1367700629184, 0, 84938, 0.0, 391.0, 1710.0, 12131.399999999974, 12.7124947025425, 39.082756032523584, 0.3561408210673219], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Agree terms", 20, 0, 0.0, 1459.3500000000001, 524, 5032, 1146.5, 3125.400000000003, 4943.199999999999, 5032.0, 0.0701377856799683, 0.26393451497967757, 0.03840112259909592], "isController": false}, {"data": ["Link SR profile", 10, 0, 0.0, 1041.3, 461, 2664, 765.5, 2557.2000000000003, 2664.0, 2664.0, 0.10786206599001198, 0.35896790496812675, 0.12715926373353756], "isController": false}, {"data": ["WS PP user link-0", 277, 0, 0.0, 0.3140794223826712, 0, 2, 0.0, 1.0, 1.0, 1.0, 1.6744444713107818, 8.663524029336026, 0.0], "isController": false}, {"data": ["Import Policy-0", 7, 0, 0.0, 0.28571428571428575, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07486150621350501, 0.13656376328791736, 0.0], "isController": false}, {"data": ["Agree terms-0", 20, 0, 0.0, 1.1, 0, 9, 1.0, 1.0, 8.599999999999994, 9.0, 0.07032447713751248, 0.2490475428627688, 0.0], "isController": false}, {"data": ["Import Policy", 7, 0, 0.0, 1425.7142857142858, 792, 3059, 1227.0, 3059.0, 3059.0, 3059.0, 0.07420284938941656, 0.16094192235731852, 0.05009313451386534], "isController": false}, {"data": ["WS PP user link", 277, 0, 0.0, 0.49458483754512644, 0, 2, 0.0, 1.0, 1.0, 2.0, 1.6744444713107818, 8.663524029336026, 0.009811198074086612], "isController": false}, {"data": ["Get Access Token-0", 20, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07132718492999238, 0.17215345464304307, 0.0], "isController": false}, {"data": ["WS PP user key gen-0", 100, 0, 0.0, 0.31000000000000005, 0, 5, 0.0, 1.0, 1.0, 4.9599999999999795, 0.6949028873214969, 2.3266353019353043, 0.0], "isController": false}, {"data": ["WS open for policy import", 7, 0, 0.0, 942.2857142857143, 913, 1036, 927.0, 1036.0, 1036.0, 1036.0, 0.07591943862997949, 0.1555776554179365, 0.04569147017992907], "isController": false}, {"data": ["Login by user", 10, 0, 0.0, 1175.3, 513, 2593, 982.0, 2526.0, 2593.0, 2593.0, 0.07076139258420605, 0.28927865394140956, 0.026404226666430795], "isController": false}, {"data": ["Get tenant id", 20, 0, 0.0, 1326.3999999999999, 604, 3326, 1180.0, 2613.8, 3290.8999999999996, 3326.0, 0.2079866888519135, 0.383739503171797, 0.10866492044509152], "isController": false}, {"data": ["Get SR DID", 10, 0, 0.0, 2660.2, 828, 8444, 2042.5, 7978.500000000002, 8444.0, 8444.0, 0.0661892217471307, 0.33819201865543214, 0.03330145219152513], "isController": false}, {"data": ["Link user profile", 10, 0, 0.0, 1399.4, 644, 6020, 829.0, 5570.100000000002, 6020.0, 6020.0, 0.06652386210933861, 0.35382379159404476, 0.05218615081292159], "isController": false}, {"data": ["Invite user", 10, 0, 0.0, 1129.9, 749, 1897, 1048.5, 1849.8000000000002, 1897.0, 1897.0, 0.10912503546563652, 0.16654355998603199, 0.06372731563325258], "isController": false}, {"data": ["WS open for policy import-0", 7, 0, 0.0, 0.14285714285714288, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07669047723388404, 0.139932303535431, 0.0], "isController": false}, {"data": ["User creation flow", 11, 0, 0.0, 224341.63636363638, 5710, 265177, 253252.0, 265052.0, 265177.0, 265177.0, 0.03226790575424763, 26.794488022923414, 0.5837843964874918], "isController": true}, {"data": ["Setup ipfs", 1, 0, 0.0, 1349.0, 1349, 1349, 1349.0, 1349.0, 1349.0, 1349.0, 0.7412898443291327, 1.0279605263157896, 0.3974298091178651], "isController": false}, {"data": ["WS read policy import result-0", 1023, 0, 0.0, 0.3098729227761489, 0, 10, 0.0, 1.0, 1.0, 1.0, 3.684534678926839, 7.69212457725097, 0.0], "isController": false}, {"data": ["Get tenant", 10, 3, 30.0, 9434.600000000002, 2629, 21055, 5236.5, 21051.5, 21055.0, 21055.0, 0.10694615261215978, 0.41396725108282983, 0.1149775580182878], "isController": true}, {"data": ["Link user", 10, 0, 0.0, 40341.9, 28424, 47647, 41613.5, 47535.6, 47647.0, 47647.0, 0.05717389439981704, 19.111211711357594, 0.22319594029616077], "isController": true}, {"data": ["User creation(SR side)", 10, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.11052288376308315, 0.0, 0.0], "isController": true}, {"data": ["Get Access Token", 20, 0, 0.0, 2071.65, 2054, 2097, 2071.0, 2084.7, 2096.4, 2097.0, 0.07080798997358863, 0.20907718601967046, 0.05647006348821401], "isController": false}, {"data": ["WS read sr link result-0", 558, 0, 0.0, 0.5483870967741937, 0, 11, 0.0, 1.0, 1.0, 3.6399999999998727, 2.1127480491157127, 6.698148458413319, 0.0], "isController": false}, {"data": ["Get user keys", 10, 0, 0.0, 2069.0, 2058, 2085, 2069.5, 2084.3, 2085.0, 2085.0, 0.06999223086237427, 0.2846441857453823, 0.04088120437381451], "isController": false}, {"data": ["WS open for user key gen-0", 10, 0, 0.0, 0.5000000000000001, 0, 2, 0.0, 1.9000000000000004, 2.0, 2.0, 0.07101465742529259, 0.2240845322974662, 0.0], "isController": false}, {"data": ["User creation(user side)", 10, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.07090891041368258, 0.0, 0.0], "isController": true}, {"data": ["Get Admin Access Token-0", 29, 0, 0.0, 0.10344827586206896, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06709126957503464, 0.06724715917635056, 0.0], "isController": false}, {"data": ["WS PP sr key gen", 100, 0, 0.0, 0.27, 0, 1, 0.0, 1.0, 1.0, 1.0, 1.065098841172461, 2.3988647044883264, 0.006240813522494887], "isController": false}, {"data": ["Accept sr-0", 10, 0, 0.0, 0.20000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11094592495617636, 0.1362771332127721, 0.0], "isController": false}, {"data": ["Login by SR OS", 20, 0, 0.0, 2859.6000000000004, 2644, 3023, 2867.0, 2984.9, 3021.1, 3023.0, 0.07060077731455823, 0.19912659668070445, 0.03355260574231422], "isController": false}, {"data": ["Create new tenant-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get sr keys", 10, 0, 0.0, 2069.2000000000003, 2056, 2082, 2067.0, 2081.5, 2082.0, 2082.0, 0.10697017671473193, 0.3181840441947285, 0.062479358098712086], "isController": false}, {"data": ["WS open for user key gen", 10, 0, 0.0, 2.6999999999999997, 1, 5, 3.0, 4.9, 5.0, 5.0, 0.07101415312071696, 0.2330290598791339, 0.03946694779394533], "isController": false}, {"data": ["Verify link-0", 20, 0, 0.0, 1.1500000000000004, 0, 9, 1.0, 1.9000000000000021, 8.649999999999995, 9.0, 0.10665187760630526, 0.44329790435726246, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 6, 0, 0.0, 0.33333333333333337, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07013770369158115, 0.14817503156196665, 0.0], "isController": false}, {"data": ["Invite and accept SR", 10, 0, 0.0, 5046.200000000001, 4549, 6391, 4847.5, 6307.3, 6391.0, 6391.0, 0.10545742156604271, 0.7621564394938044, 0.28548683430002636], "isController": true}, {"data": ["WS PP user key gen", 100, 0, 0.0, 0.48, 0, 5, 0.0, 1.0, 1.0, 4.9599999999999795, 0.6949028873214969, 2.3266353019353043, 0.004071696605399395], "isController": false}, {"data": ["Accept sr", 10, 0, 0.0, 768.4, 459, 1218, 776.5, 1211.7, 1218.0, 1218.0, 0.11030709495234733, 0.168789245196126, 0.07541601286732262], "isController": false}, {"data": ["User creation(admin side)", 11, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.11491971290966266, 0.0, 0.0], "isController": true}, {"data": ["WS read user key gen result", 100, 0, 0.0, 273.34999999999997, 0, 3058, 1.0, 1694.2000000000103, 2867.149999999999, 3057.6, 0.6949028873214969, 2.5627258434383795, 0.0], "isController": false}, {"data": ["Create new tenant", 1, 0, 0.0, 2549.0, 2549, 2549, 2549.0, 2549.0, 2549.0, 2549.0, 0.3923107100823852, 0.6716022214593959, 0.22412281777167517], "isController": false}, {"data": ["Login by user-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.07121847692165255, 0.25197709168666715, 0.0], "isController": false}, {"data": ["Link SR profile-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.10874647933273161, 0.3254854340887589, 0.0], "isController": false}, {"data": ["Get sr keys-0", 10, 0, 0.0, 0.10000000000000002, 0, 1, 0.0, 0.9000000000000004, 1.0, 1.0, 0.10938764794679386, 0.24717976424227175, 0.0], "isController": false}, {"data": ["Generate user hedera data", 10, 0, 0.0, 11799.099999999999, 10926, 12198, 11963.0, 12197.8, 12198.0, 12198.0, 0.0653705858511904, 5.794381061079007, 0.2183083910501131], "isController": true}, {"data": ["WS read sr key gen result-0", 100, 0, 0.0, 0.27999999999999997, 0, 8, 0.0, 1.0, 1.0, 7.929999999999964, 1.0651215303666148, 2.4023483266940757, 0.0], "isController": false}, {"data": ["Login by Admin", 31, 2, 6.451612903225806, 3150.903225806452, 365, 21053, 1046.0, 14844.800000000007, 21032.6, 21053.0, 0.07156196689220229, 0.10538392345985952, 0.027789326042092288], "isController": false}, {"data": ["WS read user link result-0", 277, 0, 0.0, 0.6534296028880869, 0, 10, 1.0, 1.0, 1.0, 3.439999999999941, 1.673028604561268, 8.656835390141815, 0.0], "isController": false}, {"data": ["Generate sr hedera data", 10, 0, 0.0, 12058.4, 10865, 13070, 11941.5, 13068.6, 13070.0, 13070.0, 0.09704403858470974, 5.829750032752362, 0.26473879080701823], "isController": true}, {"data": ["Login by SR OS-0", 20, 0, 0.0, 0.1, 0, 1, 0.0, 0.9000000000000021, 1.0, 1.0, 0.07133736151634695, 0.15848528377110693, 0.0], "isController": false}, {"data": ["Get SR DID-0", 10, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06705963613441433, 0.27423068975865234, 0.0], "isController": false}, {"data": ["Get user keys-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.07101869211976593, 0.23805132698426226, 0.0], "isController": false}, {"data": ["Invite user-0", 10, 0, 0.0, 0.39999999999999997, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11071867491889857, 0.1359979973759674, 0.0], "isController": false}, {"data": ["WS open for sr link", 10, 0, 0.0, 1007.6, 909, 1280, 963.5, 1264.6000000000001, 1280.0, 1280.0, 0.10812914945611038, 0.34796678340109427, 0.05481429832291689], "isController": false}, {"data": ["Invite sr-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11138834432364997, 0.1306419936842809, 0.0], "isController": false}, {"data": ["Link user profile-0", 10, 0, 0.0, 1.2, 0, 5, 1.0, 4.700000000000001, 5.0, 5.0, 0.06689321167687902, 0.333381656710727, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 29, 1, 3.4482758620689653, 596.1724137931035, 303, 1087, 534.0, 914.0, 1073.5, 1087.0, 0.06702381887852973, 0.09520244154482968, 0.03973445350742578], "isController": false}, {"data": ["Invite sr", 10, 0, 0.0, 1370.5, 1006, 1858, 1356.5, 1834.9, 1858.0, 1858.0, 0.10959024208484476, 0.16117471150368773, 0.06731666237438219], "isController": false}, {"data": ["WS read sr link result", 558, 0, 0.0, 2964.784946236559, 0, 23993, 135.0, 13367.700000000008, 17435.649999999994, 22334.879999999983, 2.111868473739786, 8.177842838003036, 0.0], "isController": false}, {"data": ["Generate user keys", 10, 0, 0.0, 2073.9, 2057, 2108, 2070.0, 2105.5, 2108.0, 2108.0, 0.06996676578625154, 0.24359230146930205, 0.0393631384467378], "isController": false}, {"data": ["Generate sr keys", 10, 0, 0.0, 2066.5, 2055, 2076, 2069.0, 2075.6, 2076.0, 2076.0, 0.10795871658677722, 0.2551473535270113, 0.06073732092347886], "isController": false}, {"data": ["Get policy id", 6, 0, 0.0, 1319.8333333333333, 968, 1780, 1213.0, 1780.0, 1780.0, 1780.0, 0.1781366902202957, 1.2459130618728103, 0.11156738020307581], "isController": false}, {"data": ["Generate sr keys-0", 10, 0, 0.0, 0.30000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1104228089354137, 0.2249541227736001, 0.0], "isController": false}, {"data": ["WS PP sr link", 558, 0, 0.0, 0.5896057347670245, 0, 68, 0.0, 1.0, 1.0, 1.4099999999999682, 2.1159928101749674, 6.708435483075849, 0.01239839537211895], "isController": false}, {"data": ["WS read user link result", 277, 0, 0.0, 1034.7509025270754, 0, 19186, 104.0, 1956.000000000001, 7345.599999999989, 16142.379999999972, 1.671211718995101, 9.474013732443227, 0.0], "isController": false}, {"data": ["Dry Run Policy", 6, 0, 0.0, 47030.0, 31315, 84938, 38815.5, 84938.0, 84938.0, 84938.0, 0.051343487934280334, 0.7922306873609447, 0.034162138456272466], "isController": false}, {"data": ["Invite and accept user", 10, 0, 0.0, 4481.4, 2954, 6152, 4592.0, 6138.3, 6152.0, 6152.0, 0.10566356720202874, 0.8883272301616653, 0.319993445556847], "isController": true}, {"data": ["Get User Access Token", 10, 0, 0.0, 1004.9000000000001, 467, 1718, 893.0, 1714.4, 1718.0, 1718.0, 0.0706030203972126, 0.3019520190698758, 0.037514749412229854], "isController": false}, {"data": ["WS PP policy import", 1023, 0, 0.0, 0.31182795698924726, 0, 7, 0.0, 1.0, 1.0, 1.0, 3.68304897411065, 7.688931490518758, 0.02158036508267959], "isController": false}, {"data": ["WS PP policy import-0", 1023, 0, 0.0, 0.18866080156402742, 0, 7, 0.0, 1.0, 1.0, 1.0, 3.68304897411065, 7.688931490518758, 0.0], "isController": false}, {"data": ["Accept user", 10, 0, 0.0, 790.5, 479, 1368, 694.0, 1340.7, 1368.0, 1368.0, 0.1097020492342797, 0.17462337915222256, 0.07500234830949142], "isController": false}, {"data": ["Login by SR-0", 23, 0, 0.0, 0.21739130434782608, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.03829707876543539, 0.07540875627322802, 0.0], "isController": false}, {"data": ["WS open for sr key gen-0", 10, 0, 0.0, 0.10000000000000002, 0, 1, 0.0, 0.9000000000000004, 1.0, 1.0, 0.1104264670156143, 0.22496157504030564, 0.0], "isController": false}, {"data": ["Requests for DryRun", 6, 0, 0.0, 48612.666666666664, 32728, 86575, 40518.0, 86575.0, 86575.0, 86575.0, 0.05072923272035511, 1.058840625660537, 0.11381050517860916], "isController": true}, {"data": ["WS open for sr key gen", 10, 0, 0.0, 1.7, 1, 3, 2.0, 2.9000000000000004, 3.0, 3.0, 0.1104228089354137, 0.2388648086648778, 0.06136877008314837], "isController": false}, {"data": ["WS PP sr link-0", 558, 0, 0.0, 0.4336917562724016, 0, 68, 0.0, 1.0, 1.0, 1.0, 2.1159928101749674, 6.708435483075849, 0.0], "isController": false}, {"data": ["Generate user keys-0", 10, 0, 0.0, 0.19999999999999998, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.0709985232307168, 0.22402668790114164, 0.0], "isController": false}, {"data": ["Get Tenant Id-0", 7, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.07702888583218707, 0.08649630330123796, 0.0], "isController": false}, {"data": ["Login by Admin-0", 31, 0, 0.0, 0.16129032258064518, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.07179016891532002, 0.058435804391474104, 0.0], "isController": false}, {"data": ["WS read user key gen result-0", 100, 0, 0.0, 0.26999999999999996, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.6949125452561795, 2.3266676380964957, 0.0], "isController": false}, {"data": ["Get policy id-0", 6, 0, 0.0, 0.16666666666666669, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.18459266551809006, 0.38054210635614083, 0.0], "isController": false}, {"data": ["Requests for Import", 7, 1, 14.285714285714286, 180300.28571428574, 37242, 211514, 203133.0, 211514.0, 211514.0, 211514.0, 0.024857071836937607, 19.47142379975853, 0.08863654522211568], "isController": false}, {"data": ["Setup ipfs-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 1172.8515625, 0.0], "isController": false}, {"data": ["WS read policy import result", 1023, 1, 0.09775171065493646, 1197.9081133919838, 0, 10026, 57.0, 5509.4000000000015, 10005.0, 10014.0, 3.68304897411065, 11.69880802692262, 0.0], "isController": false}, {"data": ["WS read sr key gen result", 100, 0, 0.0, 297.09999999999997, 0, 3990, 1.0, 1686.6000000000104, 2871.099999999999, 3989.41, 1.0651101856487053, 2.7641897640248385, 0.0], "isController": false}, {"data": ["Get SR Access Token-0", 23, 0, 0.0, 0.39130434782608686, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.03828694232155372, 0.08260011151071951, 0.0], "isController": false}, {"data": ["Get Tenant Id", 7, 0, 0.0, 1334.4285714285713, 967, 2110, 1178.0, 2110.0, 2110.0, 2110.0, 0.0761971110409614, 0.1366828200006531, 0.03981001406925229], "isController": false}, {"data": ["Policy import and dry run", 7, 1, 14.285714285714286, 221968.2857142857, 37242, 296441, 243788.0, 296441.0, 296441.0, 296441.0, 0.01906048163114156, 15.271753540484463, 0.1046199203816453], "isController": false}, {"data": ["Get tenant id-0", 20, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.21057951482479786, 0.24734867229615903, 0.0], "isController": false}, {"data": ["Link SR", 10, 0, 0.0, 172477.8, 127439, 193051, 180700.5, 192373.7, 193051.0, 193051.0, 0.03723202251792722, 15.423310788955865, 0.14872811338826297], "isController": true}, {"data": ["WS PP sr key gen-0", 100, 0, 0.0, 0.17000000000000004, 0, 1, 0.0, 1.0, 1.0, 1.0, 1.0651101856487053, 2.398890255040634, 0.0], "isController": false}, {"data": ["WS open for user link", 10, 0, 0.0, 1800.6, 934, 7086, 1019.0, 6617.4000000000015, 7086.0, 7086.0, 0.06644385826196156, 0.2866559345993103, 0.03271581380437599], "isController": false}, {"data": ["WS open for sr link-0", 10, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.10923112213131765, 0.3269786705753203, 0.0], "isController": false}, {"data": ["WS open for user link-0", 10, 0, 0.0, 0.7, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06686369167814493, 0.2734489921970072, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 10, 0, 0.0, 0.6000000000000001, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.07091092170016025, 0.269461502460609, 0.0], "isController": false}, {"data": ["Accept user-0", 10, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11052166224580016, 0.14235060579686118, 0.0], "isController": false}, {"data": ["Verify link", 20, 0, 0.0, 1933.2999999999997, 666, 6914, 1592.0, 3112.0, 6723.899999999998, 6914.0, 0.10600631797655141, 0.6266329527927365, 0.05555497123253546], "isController": false}, {"data": ["Get SR Access Token", 23, 0, 0.0, 678.608695652174, 328, 1334, 606.0, 1131.8000000000002, 1299.7999999999995, 1334.0, 0.03825853789175495, 0.10338837052728582, 0.023547714218702435], "isController": false}, {"data": ["Login by SR", 23, 0, 0.0, 1025.217391304348, 390, 4345, 718.0, 1653.6000000000001, 3810.7999999999925, 4345.0, 0.0382586015316748, 0.09821797827826312, 0.017532484983498898], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to dev.guardianservice.app:443 [dev.guardianservice.app/52.226.204.166] failed: Connection timed out: connect", 2, 22.22222222222222, 0.02207749199690915], "isController": false}, {"data": ["Websocket I/O error", 2, 22.22222222222222, 0.02207749199690915], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.conn.HttpHostConnectException", 2, 22.22222222222222, 0.02207749199690915], "isController": false}, {"data": ["401", 1, 11.11111111111111, 0.011038745998454575], "isController": false}, {"data": ["401/Unauthorized", 1, 11.11111111111111, 0.011038745998454575], "isController": false}, {"data": ["Websocket I/O error/WebSocket I/O error: Connection reset", 1, 11.11111111111111, 0.011038745998454575], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 9059, 9, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to dev.guardianservice.app:443 [dev.guardianservice.app/52.226.204.166] failed: Connection timed out: connect", 2, "Websocket I/O error", 2, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException", 2, "401", 1, "401/Unauthorized", 1], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get tenant", 3, 3, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException", 2, "401", 1, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Login by Admin", 31, 2, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to dev.guardianservice.app:443 [dev.guardianservice.app/52.226.204.166] failed: Connection timed out: connect", 2, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get Admin Access Token", 29, 1, "401/Unauthorized", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Requests for Import", 1, 1, "Websocket I/O error", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["WS read policy import result", 1023, 1, "Websocket I/O error/WebSocket I/O error: Connection reset", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Policy import and dry run", 1, 1, "Websocket I/O error", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
