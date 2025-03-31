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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8943997071742313, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve-0"], "isController": false}, {"data": [0.0, 500, 1500, "Import"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy publish result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.0, 500, 1500, "Token associate"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.0, 500, 1500, "Application creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [0.0, 500, 1500, "Get result for device approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application"], "isController": false}, {"data": [0.9, 500, 1500, "Associate token"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.9655172413793104, 500, 1500, "Get application creation status"], "isController": false}, {"data": [0.859375, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.0, 500, 1500, "Choose registrant"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for app approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get application creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Role approve"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.95, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.0, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device approve"], "isController": true}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Approve device"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [0.5, 500, 1500, "Create application"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.95, 500, 1500, "Get application schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve"], "isController": false}, {"data": [1.0, 500, 1500, "Get application schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [0.9871794871794872, 500, 1500, "Get block for approve result"], "isController": false}, {"data": [0.5, 500, 1500, "Get device schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [0.5, 500, 1500, "Grant KYC"], "isController": true}, {"data": [0.0, 500, 1500, "Policy import and publish"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Create device"], "isController": false}, {"data": [1.0, 500, 1500, "Grant KYC-0"], "isController": false}, {"data": [0.0, 500, 1500, "Publish"], "isController": true}, {"data": [0.9736842105263158, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation-0"], "isController": false}, {"data": [0.9705882352941176, 500, 1500, "Get device approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Choose registrant-0"], "isController": false}, {"data": [0.9239130434782609, 500, 1500, "Get policy import result"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for kyc grant"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token-0"], "isController": false}, {"data": [0.9375, 500, 1500, "Get device creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices-0"], "isController": false}, {"data": [0.16666666666666666, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation"], "isController": false}, {"data": [1.0, 500, 1500, "Approve device-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.9821428571428571, 500, 1500, "Get associate result"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.9176136363636364, 500, 1500, "Get policy publish result"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for kyc grant-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 2572, 0, 0.0, 396.4117418351476, 0, 15005, 173.0, 305.7000000000003, 677.0, 11430.169999999998, 3.236865023231932, 78.27831346448384, 1.3599813517655512], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 10, 0, 0.0, 267.79999999999995, 261, 273, 269.0, 273.0, 273.0, 273.0, 0.07935626200263463, 7.473174483589125, 0.05069036228117511], "isController": false}, {"data": ["Get block for waiting app approve-0", 10, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12225686166636102, 0.42313529632006847, 0.0], "isController": false}, {"data": ["Import", 10, 0, 0.0, 285812.0, 248780, 341676, 279540.5, 338580.4, 341676.0, 341676.0, 0.0248960589538676, 2.313014064717305, 0.4591839810976672], "isController": true}, {"data": ["Get device issue row-0", 10, 0, 0.0, 1.1, 0, 3, 1.0, 2.9000000000000004, 3.0, 3.0, 0.08625894936599672, 3.400986519343569, 0.0], "isController": false}, {"data": ["Get hedera id-0", 10, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1222583563586571, 0.409458040167983, 0.0], "isController": false}, {"data": ["Import Policy-0", 10, 0, 0.0, 1.4, 0, 11, 0.0, 10.000000000000004, 11.0, 11.0, 0.11109506404630443, 0.13410606315198914, 0.0], "isController": false}, {"data": ["Get device approve result-0", 34, 0, 0.0, 1.323529411764706, 0, 3, 1.0, 2.0, 2.25, 3.0, 0.2841265198679648, 11.206006742781932, 0.0], "isController": false}, {"data": ["Create device-0", 10, 0, 0.0, 1.8000000000000003, 1, 4, 2.0, 3.8000000000000007, 4.0, 4.0, 0.08995313441696877, 5.842666908040911, 0.0], "isController": false}, {"data": ["Get policy publish result-0", 176, 0, 0.0, 0.6477272727272728, 0, 14, 1.0, 1.0, 1.0, 5.5299999999998875, 0.6831847277159504, 1.0897923018958375, 0.0], "isController": false}, {"data": ["Get issue schema-0", 10, 0, 0.0, 1.1, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.08626415810494897, 3.793744352393399, 0.0], "isController": false}, {"data": ["Import Policy", 10, 0, 0.0, 246.7, 243, 254, 245.5, 253.9, 254.0, 254.0, 0.11079350306898003, 0.17896829436171863, 0.07282725284739303], "isController": false}, {"data": ["Get applications", 10, 0, 0.0, 268.8, 262, 275, 269.0, 274.9, 275.0, 275.0, 0.09105394946505804, 3.7590431510357387, 0.05709545014796267], "isController": false}, {"data": ["Get device issue row", 10, 0, 0.0, 269.0, 262, 282, 268.0, 281.2, 282.0, 282.0, 0.08606074167147172, 3.9285720048710377, 0.052367625132318386], "isController": false}, {"data": ["Issue creation", 10, 0, 0.0, 14082.400000000001, 8009, 18021, 15098.5, 18015.5, 18021.0, 18021.0, 0.07471049682480388, 44.97304147599925, 0.8630521572655958], "isController": true}, {"data": ["Token associate", 10, 0, 0.0, 15922.700000000003, 4710, 25041, 15106.0, 25006.5, 25041.0, 25041.0, 0.10514583727630222, 2.1319653367032574, 0.33786314743549306], "isController": true}, {"data": ["Get block for waiting device", 10, 0, 0.0, 243.2, 232, 275, 237.5, 274.5, 275.0, 275.0, 0.12190810566994599, 0.4675604435626425, 0.07334724990552122], "isController": false}, {"data": ["Application creation", 10, 0, 0.0, 49684.2, 28319, 67158, 51485.5, 66965.0, 67158.0, 67158.0, 0.07253262154654055, 36.396146999144115, 0.9074369283522764], "isController": true}, {"data": ["Get policy id", 10, 0, 0.0, 231.5, 228, 236, 231.0, 236.0, 236.0, 236.0, 0.08882099017639848, 0.383994651866129, 0.0540472255653456], "isController": false}, {"data": ["Get result for issue request approve", 10, 0, 0.0, 3521.6, 3509, 3541, 3521.5, 3539.9, 3541.0, 3541.0, 0.07736943907156672, 0.0, 0.0], "isController": true}, {"data": ["Get result for device approve", 10, 0, 0.0, 11475.099999999999, 6779, 17015, 10291.5, 16983.3, 17015.0, 17015.0, 0.081190578645254, 0.0, 0.0], "isController": true}, {"data": ["Get block for approve result-0", 39, 0, 0.0, 1.2564102564102568, 0, 3, 1.0, 2.0, 3.0, 3.0, 0.31679243597137496, 14.021777703092383, 0.0], "isController": false}, {"data": ["Approve application", 10, 0, 0.0, 248.90000000000003, 245, 258, 247.0, 257.6, 258.0, 258.0, 0.09107551070592629, 4.041653669432326, 0.4385232475933296], "isController": false}, {"data": ["Associate token", 10, 0, 0.0, 320.3, 224, 710, 228.0, 706.4, 710.0, 710.0, 0.1220300926208403, 0.4225053616971945, 0.07365898461810683], "isController": false}, {"data": ["Get block for waiting device-0", 10, 0, 0.0, 0.7, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12225686166636102, 0.4305733846812152, 0.0], "isController": false}, {"data": ["Get issue approve result", 10, 0, 0.0, 274.5, 266, 295, 272.5, 293.5, 295.0, 295.0, 0.07936507936507936, 5.668860057043651, 0.04984343998015873], "isController": false}, {"data": ["Balance verify-0", 45, 0, 0.0, 1.8444444444444443, 0, 4, 2.0, 3.0, 3.0, 4.0, 0.25298380341471916, 15.824587091782522, 0.0], "isController": false}, {"data": ["Login by user", 90, 0, 0.0, 234.95555555555552, 225, 305, 231.0, 243.70000000000002, 260.05, 305.0, 0.3578827655589532, 12.511186943044946, 0.23170346107428452], "isController": false}, {"data": ["Get application creation status", 116, 0, 0.0, 281.3103448275862, 239, 722, 248.0, 295.09999999999997, 686.15, 718.0899999999999, 0.9664572675920218, 34.85047315269192, 0.6070055264067785], "isController": false}, {"data": ["Get tokens", 64, 0, 0.0, 1187.3437500000002, 224, 11541, 230.0, 1320.5, 11219.5, 11541.0, 0.578855494152655, 2.3412044349149355, 0.34768780016822987], "isController": false}, {"data": ["Choose registrant", 10, 0, 0.0, 10074.9, 4567, 14612, 13094.5, 14594.3, 14612.0, 14612.0, 0.10528199783119084, 0.4105689472063422, 0.06920440697282672], "isController": false}, {"data": ["Get associate result-0", 28, 0, 0.0, 0.6785714285714284, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.31027681124088563, 1.0189506929977172, 0.0], "isController": false}, {"data": ["Get result for app approve", 10, 0, 0.0, 13079.9, 6787, 17049, 14957.5, 17028.7, 17049.0, 17049.0, 0.07898769371731884, 0.0, 0.0], "isController": true}, {"data": ["Get application creation status-0", 116, 0, 0.0, 1.2241379310344827, 0, 28, 1.0, 2.0, 2.0, 23.749999999999957, 0.9684502291720586, 34.69142911111297, 0.0], "isController": false}, {"data": ["Create application-0", 10, 0, 0.0, 1.1, 0, 3, 1.0, 2.8000000000000007, 3.0, 3.0, 0.12282447154771117, 4.393277816672193, 0.0], "isController": false}, {"data": ["Role approve", 10, 0, 0.0, 13832.2, 7543, 17812, 15699.5, 17789.6, 17812.0, 17812.0, 0.0785151220124996, 26.846160414245784, 0.727353662534154], "isController": true}, {"data": ["Login by SR-0", 60, 0, 0.0, 0.9666666666666666, 0, 3, 1.0, 2.0, 2.9499999999999957, 3.0, 0.08300867717372055, 2.692538572662337, 0.0], "isController": false}, {"data": ["Get issue schema", 10, 0, 0.0, 482.7, 461, 547, 476.5, 541.5, 547.0, 547.0, 0.08591212907438273, 6.908769843017063, 0.053367876273647315], "isController": false}, {"data": ["Issue approve", 10, 0, 0.0, 4279.3, 4259, 4310, 4280.0, 4308.5, 4310.0, 4310.0, 0.07691597698673969, 29.80788552210565, 0.5861913828146632], "isController": true}, {"data": ["Get block for waiting issue request-0", 10, 0, 0.0, 0.7999999999999999, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1222583563586571, 0.43718107761571756, 0.0], "isController": false}, {"data": ["Device approve", 10, 0, 0.0, 12236.3, 7517, 17794, 11052.5, 17761.2, 17794.0, 17794.0, 0.08068290006615997, 29.105339783426928, 0.7767068593576028], "isController": true}, {"data": ["Get tenant", 10, 0, 0.0, 944.0999999999999, 930, 979, 941.0, 976.6, 979.0, 979.0, 0.10996382190259404, 0.2844240026281354, 0.08827173984759015], "isController": true}, {"data": ["Approve device", 30, 0, 0.0, 326.1333333333333, 244, 486, 254.5, 484.6, 486.0, 486.0, 0.21112784494771067, 13.889545608892705, 1.247482410411418], "isController": false}, {"data": ["Get Tenant Id-0", 10, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11110370419749795, 0.08806921552452059, 0.0], "isController": false}, {"data": ["Login by Admin-0", 10, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.11111851901237861, 0.06542319835211237, 0.0], "isController": false}, {"data": ["Publish Policy", 10, 0, 0.0, 261.09999999999997, 248, 282, 257.5, 281.2, 282.0, 282.0, 0.08880048307462793, 0.1616359574246084, 0.05897774271392037], "isController": false}, {"data": ["Token minting verify", 10, 0, 0.0, 48761.7, 28685, 66582, 51893.5, 65663.40000000001, 66582.0, 66582.0, 0.05199964640240446, 18.432051615174018, 0.16611449542143114], "isController": true}, {"data": ["Create application", 10, 0, 0.0, 538.5, 512, 582, 537.5, 579.8, 582.0, 582.0, 0.12202264740335805, 4.768606928445919, 0.3994454261335904], "isController": false}, {"data": ["Get policy id-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.08900122821694939, 0.12168136670286049, 0.0], "isController": false}, {"data": ["Get issue approve result-0", 10, 0, 0.0, 1.2999999999999998, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.07953488002163349, 5.250039953849886, 0.0], "isController": false}, {"data": ["Get application schema", 10, 0, 0.0, 519.0, 465, 926, 475.0, 881.6000000000001, 926.0, 926.0, 0.12211503236048357, 4.412276090639883, 0.07502203794724631], "isController": false}, {"data": ["Get block for waiting app approve", 10, 0, 0.0, 244.70000000000002, 234, 274, 239.0, 273.7, 274.0, 274.0, 0.12190364735712893, 0.4601267455078506, 0.07334456751633509], "isController": false}, {"data": ["Get application schema-0", 10, 0, 0.0, 0.7, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12282296298115895, 0.4456290569959959, 0.0], "isController": false}, {"data": ["Approve application-0", 10, 0, 0.0, 1.2, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.09127918651988974, 4.034112172992314, 0.0], "isController": false}, {"data": ["Device creation", 10, 0, 0.0, 28099.3, 20242, 32756, 29094.0, 32705.2, 32756.0, 32756.0, 0.0720154977351126, 33.86512605637733, 0.7858480207440641], "isController": true}, {"data": ["Get policy import result-0", 276, 0, 0.0, 0.423913043478261, 0, 3, 0.0, 1.0, 1.0, 1.2300000000000182, 0.7064406397895011, 0.9815291608329857, 0.0], "isController": false}, {"data": ["Get block for approve result", 39, 0, 0.0, 271.5384615384615, 240, 695, 252.0, 280.0, 465.0, 695.0, 0.3161606744761056, 14.162226462749787, 0.19856625694134813], "isController": false}, {"data": ["Get device schema", 10, 0, 0.0, 697.8000000000001, 678, 734, 696.0, 731.2, 734.0, 734.0, 0.08772776320522155, 7.512092381172744, 0.05389603108633289], "isController": false}, {"data": ["Get block for waiting issue request", 10, 0, 0.0, 238.6, 232, 266, 236.0, 263.3, 266.0, 266.0, 0.12190661952944046, 0.47413817734365477, 0.07417970178593197], "isController": false}, {"data": ["Grant KYC", 20, 0, 0.0, 9648.099999999999, 227, 27438, 2408.0, 27051.600000000006, 27431.6, 27438.0, 0.2079866888519135, 3.8726958974625627, 0.6050706504783694], "isController": true}, {"data": ["Policy import and publish", 10, 0, 0.0, 468496.5, 424727, 497717, 466440.5, 497706.4, 497717.0, 497717.0, 0.017930433504090827, 2.8979415273994955, 0.54706382987784], "isController": true}, {"data": ["Get Tenant Id", 10, 0, 0.0, 267.1, 257, 285, 264.5, 284.5, 285.0, 285.0, 0.11078736580880316, 0.16690592698558657, 0.04814490018058341], "isController": false}, {"data": ["Create device", 10, 0, 0.0, 13793.7, 12577, 15005, 13810.0, 14998.8, 15005.0, 15005.0, 0.07941487122878631, 5.4737708191048355, 0.5643419286695627], "isController": false}, {"data": ["Grant KYC-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.12425292926280737, 0.39934454638361855, 0.0], "isController": false}, {"data": ["Publish", 10, 0, 0.0, 182668.8, 156030, 217587, 176596.5, 216566.9, 217587.0, 217587.0, 0.0372596288195777, 2.5602786566133977, 0.4495861794256056], "isController": true}, {"data": ["Get issue creation status", 38, 0, 0.0, 299.23684210526324, 258, 708, 273.5, 305.20000000000016, 707.05, 708.0, 0.29384245404845305, 26.60493014958901, 0.18450484888378532], "isController": false}, {"data": ["Get hedera id", 10, 0, 0.0, 269.9, 261, 274, 271.5, 273.9, 274.0, 274.0, 0.12185908215739319, 0.6453771233945066, 0.06928355237503352], "isController": false}, {"data": ["Get block for waiting app creation-0", 10, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1222583563586571, 0.4156545330342079, 0.0], "isController": false}, {"data": ["Get device approve result", 34, 0, 0.0, 290.0588235294117, 252, 711, 261.5, 314.5, 693.0, 711.0, 0.28352471251428046, 11.988161996326687, 0.1780824452338662], "isController": false}, {"data": ["Choose registrant-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.12282748879199167, 0.445645477645397, 0.0], "isController": false}, {"data": ["Get policy import result", 276, 0, 0.0, 310.057971014493, 229, 685, 246.0, 667.0, 672.0, 678.46, 0.7059906891083031, 2.183049588811582, 0.42958857976927406], "isController": false}, {"data": ["WS open for kyc grant", 10, 0, 0.0, 860.2, 858, 865, 859.0, 864.7, 865.0, 865.0, 0.12293620840146048, 0.42276129322744427, 0.07180483031729835], "isController": false}, {"data": ["Login by user-0", 90, 0, 0.0, 1.0888888888888886, 0, 5, 1.0, 2.0, 2.0, 5.0, 0.35821038093683955, 12.252547988996971, 0.0], "isController": false}, {"data": ["Associate token-0", 10, 0, 0.0, 0.3, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12237505506877477, 0.37458239512457786, 0.0], "isController": false}, {"data": ["Get device creation status", 40, 0, 0.0, 319.625, 248, 725, 263.0, 700.7, 706.0, 725.0, 0.33319727777824054, 22.544244954143725, 0.20922446251114127], "isController": false}, {"data": ["Get devices-0", 10, 0, 0.0, 1.2999999999999998, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.0938112704860362, 6.10004121832697, 0.0], "isController": false}, {"data": ["Balance verify", 45, 0, 0.0, 7766.11111111111, 903, 12144, 11189.0, 11719.4, 11928.9, 12144.0, 0.23802093526359494, 15.216216605993367, 0.13300866065619726], "isController": false}, {"data": ["Get tokens-0", 64, 0, 0.0, 0.5781249999999999, 0, 2, 1.0, 1.0, 1.0, 2.0, 0.5848808305307793, 1.8678417783118877, 0.0], "isController": false}, {"data": ["Get block for waiting app creation", 10, 0, 0.0, 240.29999999999998, 231, 261, 238.0, 259.7, 261.0, 261.0, 0.12190513342516852, 0.45266804622642653, 0.07382165355170606], "isController": false}, {"data": ["Approve device-0", 30, 0, 0.0, 2.1, 0, 15, 2.0, 2.900000000000002, 8.949999999999992, 15.0, 0.21150741333483739, 13.645347068242867, 0.0], "isController": false}, {"data": ["Login by Admin", 10, 0, 0.0, 674.0999999999999, 668, 691, 672.0, 689.6, 691.0, 691.0, 0.11029249569859267, 0.11911374120417347, 0.04060573327965765], "isController": false}, {"data": ["Get associate result", 28, 0, 0.0, 246.74999999999997, 225, 665, 229.0, 253.10000000000002, 484.0999999999989, 665.0, 0.30949486017464356, 1.2368244480214436, 0.18383813349729192], "isController": false}, {"data": ["Get issue creation status-0", 38, 0, 0.0, 5.105263157894737, 0, 122, 2.0, 3.0, 8.949999999999662, 122.0, 0.2944549483928959, 25.995002256842206, 0.0], "isController": false}, {"data": ["Get devices", 10, 0, 0.0, 268.09999999999997, 259, 286, 265.5, 284.8, 286.0, 286.0, 0.09357600711177654, 6.6905474342628555, 0.059042439643475414], "isController": false}, {"data": ["Login by SR", 60, 0, 0.0, 236.3333333333333, 226, 330, 233.0, 241.0, 244.95, 330.0, 0.08298192791913134, 2.756354676083502, 0.05320216671000168], "isController": false}, {"data": ["Get policy publish result", 176, 0, 0.0, 327.4772727272724, 241, 887, 247.0, 670.3, 677.15, 884.6899999999999, 0.6825329729352408, 2.508925221435413, 0.4153201627414557], "isController": false}, {"data": ["Get applications-0", 10, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.09128085292828976, 3.2711438546306773, 0.0], "isController": false}, {"data": ["Get device schema-0", 10, 0, 0.0, 1.4, 0, 2, 1.5, 2.0, 2.0, 2.0, 0.08829554284099737, 3.9112080016732005, 0.0], "isController": false}, {"data": ["Get device creation status-0", 40, 0, 0.0, 1.8749999999999998, 0, 16, 1.5, 2.0, 3.9499999999999957, 16.0, 0.3339037522434158, 21.712507238929003, 0.0], "isController": false}, {"data": ["Publish Policy-0", 10, 0, 0.0, 0.39999999999999997, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.08901073469460417, 0.1262926723025297, 0.0], "isController": false}, {"data": ["WS open for kyc grant-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.12424675405355035, 0.3993610998943903, 0.0], "isController": false}, {"data": ["Get issues-0", 10, 0, 0.0, 1.7000000000000004, 1, 5, 1.0, 4.700000000000001, 5.0, 5.0, 0.07952096570260749, 7.020303442065001, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 2572, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
