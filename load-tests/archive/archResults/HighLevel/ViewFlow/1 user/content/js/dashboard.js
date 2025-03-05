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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8063063063063063, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [0.5, 500, 1500, "Viewing policy by User"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.5, 500, 1500, "Viewing policy by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get policies"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Issue approve-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.3333333333333333, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.0, 500, 1500, "Policy list viewing"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.5, 500, 1500, "Viewing profile by SR"], "isController": true}, {"data": [0.5, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.75, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.0, 500, 1500, "Tokens list viewing"], "isController": true}, {"data": [0.5, 500, 1500, "Viewing tokens by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get policy"], "isController": true}, {"data": [1.0, 500, 1500, "User profile view-0"], "isController": false}, {"data": [1.0, 500, 1500, "User profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Issue create-0"], "isController": false}, {"data": [0.0, 500, 1500, "Save balance"], "isController": true}, {"data": [1.0, 500, 1500, "Get Policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Get token"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [0.0, 500, 1500, "Profile viewing"], "isController": true}, {"data": [0.125, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [0.5, 500, 1500, "Issue create"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view-0"], "isController": false}, {"data": [0.875, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policies-0"], "isController": false}, {"data": [0.5, 500, 1500, "Viewing profile by User"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.0, 500, 1500, "Viewing tokens by User"], "isController": true}, {"data": [0.0, 500, 1500, "Issue request creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 90, 0, 0.0, 771.2888888888889, 0, 11830, 115.5, 487.9000000000001, 11244.1, 11830.0, 0.9610250934329951, 26.108536605712757, 0.3969233849439402], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 1, 0, 0.0, 276.0, 276, 276, 276.0, 276.0, 276.0, 276.0, 3.6231884057971016, 244.1335484601449, 2.3140285326086953], "isController": false}, {"data": ["Viewing policy by User", 1, 0, 0.0, 510.0, 510, 510, 510.0, 510.0, 510.0, 510.0, 1.9607843137254901, 134.2275582107843, 2.431832107843137], "isController": true}, {"data": ["Get device issue row-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get hedera id-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get Policy id", 1, 0, 0.0, 273.0, 273, 273, 273.0, 273.0, 273.0, 273.0, 3.663003663003663, 19.39174107142857, 2.1069425366300365], "isController": false}, {"data": ["Get issue schema-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get device issue row", 1, 0, 0.0, 298.0, 298, 298, 298.0, 298.0, 298.0, 298.0, 3.3557046979865772, 34.12397755872483, 2.041605494966443], "isController": false}, {"data": ["Issue creation", 1, 0, 0.0, 8385.0, 8385, 8385, 8385.0, 8385.0, 8385.0, 8385.0, 0.11926058437686345, 30.317810822898032, 1.2429189028026237], "isController": true}, {"data": ["Get block for waiting device", 1, 0, 0.0, 234.0, 234, 234, 234.0, 234.0, 234.0, 234.0, 4.273504273504274, 17.749232104700855, 2.5707799145299144], "isController": false}, {"data": ["Viewing policy by SR", 1, 0, 0.0, 502.0, 502, 502, 502.0, 502.0, 502.0, 502.0, 1.9920318725099602, 133.99721426792829, 2.5250560258964145], "isController": true}, {"data": ["Get policies", 2, 0, 0.0, 272.5, 267, 278, 272.5, 278.0, 278.0, 278.0, 2.5706940874035986, 92.28766669344472, 1.4598228631105399], "isController": false}, {"data": ["Get result for issue request approve", 1, 0, 0.0, 3739.0, 3739, 3739, 3739.0, 3739.0, 3739.0, 3739.0, 0.26745119015779617, 0.0, 0.0], "isController": true}, {"data": ["Get block for waiting device-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3839.84375, 0.0], "isController": false}, {"data": ["Balance verify-0", 4, 0, 0.0, 0.75, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06934692533069815, 1.82284555897956, 0.0], "isController": false}, {"data": ["Get issue approve result", 1, 0, 0.0, 489.0, 489, 489, 489.0, 489.0, 489.0, 489.0, 2.044989775051125, 99.44361899284253, 1.2841097903885481], "isController": false}, {"data": ["Issue approve-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 38882.8125, 0.0], "isController": false}, {"data": ["Login by user", 9, 0, 0.0, 231.88888888888889, 230, 237, 231.0, 237.0, 237.0, 237.0, 0.09788886351029465, 2.076983728015793, 0.06335797209623563], "isController": false}, {"data": ["Get tokens", 3, 0, 0.0, 7697.333333333333, 328, 11537, 11227.0, 11537.0, 11537.0, 11537.0, 0.03315943054204616, 0.8076350625055266, 0.018684561936289684], "isController": false}, {"data": ["Policy list viewing", 1, 0, 0.0, 1517.0, 1517, 1517, 1517.0, 1517.0, 1517.0, 1517.0, 0.6591957811470006, 131.3891778592617, 2.2756416858932105], "isController": true}, {"data": ["Login by SR-0", 5, 0, 0.0, 1.2, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.05452265416280465, 1.6532291041927922, 0.0], "isController": false}, {"data": ["Get issue schema", 1, 0, 0.0, 470.0, 470, 470, 470.0, 470.0, 470.0, 470.0, 2.127659574468085, 104.9326795212766, 1.3214760638297873], "isController": false}, {"data": ["Viewing profile by SR", 1, 0, 0.0, 514.0, 514, 514, 514.0, 514.0, 514.0, 514.0, 1.9455252918287937, 129.3926313229572, 2.4813047178988326], "isController": true}, {"data": ["Issue approve", 2, 0, 0.0, 2390.5, 264, 4517, 2390.5, 4517.0, 4517.0, 4517.0, 0.44277175116227585, 64.58868060936462, 2.789807947752933], "isController": true}, {"data": ["Get block for waiting issue request-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3893.5546875, 0.0], "isController": false}, {"data": ["Get tenant", 4, 0, 0.0, 605.0, 488, 936, 498.0, 936.0, 936.0, 936.0, 0.04318115574363347, 2.0872332720250886, 0.03924888741053405], "isController": true}, {"data": ["Tokens list viewing", 1, 0, 0.0, 12827.0, 12827, 12827, 12827.0, 12827.0, 12827.0, 12827.0, 0.07796055196070789, 15.32442552818274, 0.26882686423169877], "isController": true}, {"data": ["Viewing tokens by SR", 1, 0, 0.0, 566.0, 566, 566, 566.0, 566.0, 566.0, 566.0, 1.7667844522968197, 119.08886373674913, 2.236086572438163], "isController": true}, {"data": ["Get Tenant Id-0", 4, 0, 0.0, 0.75, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.04362145303060045, 1.0290978095214727, 0.0], "isController": false}, {"data": ["Login by Admin-0", 4, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.04361907462133191, 1.0267947204562555, 0.0], "isController": false}, {"data": ["Token minting verify", 1, 0, 0.0, 43767.0, 43767, 43767, 43767.0, 43767.0, 43767.0, 43767.0, 0.022848264674297986, 3.389241073468595, 0.05381837343203783], "isController": true}, {"data": ["Get issue approve result-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 38921.875, 0.0], "isController": false}, {"data": ["Get policy", 1, 0, 0.0, 504.0, 504, 504, 504.0, 504.0, 504.0, 504.0, 1.984126984126984, 13.700939360119047, 1.9027467757936507], "isController": true}, {"data": ["User profile view-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["User profile view", 1, 0, 0.0, 269.0, 269, 269, 269.0, 269.0, 269.0, 269.0, 3.717472118959108, 123.20297978624535, 2.120120817843866], "isController": false}, {"data": ["Issue create-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 57107.421875, 0.0], "isController": false}, {"data": ["Save balance", 1, 0, 0.0, 7187.0, 7187, 7187, 7187.0, 7187.0, 7187.0, 7187.0, 0.13914011409489355, 1.492902767149019, 0.17229459440656741], "isController": true}, {"data": ["Get Policy id-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get block for waiting issue request", 1, 0, 0.0, 238.0, 238, 238, 238.0, 238.0, 238.0, 238.0, 4.201680672268908, 17.676601890756302, 2.5562959558823533], "isController": false}, {"data": ["SR profile view", 1, 0, 0.0, 278.0, 278, 278, 278.0, 278.0, 278.0, 278.0, 3.5971223021582737, 124.22015512589927, 2.097150404676259], "isController": false}, {"data": ["Get Tenant Id", 4, 0, 0.0, 264.75, 259, 276, 262.0, 276.0, 276.0, 276.0, 0.04349669968791118, 1.0572055511303704, 0.018902374376094214], "isController": false}, {"data": ["Get token", 1, 0, 0.0, 11459.0, 11459, 11459, 11459.0, 11459.0, 11459.0, 11459.0, 0.08726764988218867, 0.5253103455798935, 0.08258042259359456], "isController": true}, {"data": ["Get issue creation status", 2, 0, 0.0, 378.5, 279, 478, 378.5, 478.0, 478.0, 478.0, 0.5299417064122947, 34.30415134803921, 0.3327661301006889], "isController": false}, {"data": ["Get hedera id", 1, 0, 0.0, 264.0, 264, 264, 264.0, 264.0, 264.0, 264.0, 3.787878787878788, 21.728515625, 2.1528764204545454], "isController": false}, {"data": ["Login by user-0", 9, 0, 0.0, 0.8888888888888888, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0981343568383291, 2.008208444870299, 0.0], "isController": false}, {"data": ["Profile viewing", 1, 0, 0.0, 1503.0, 1503, 1503, 1503.0, 1503.0, 1503.0, 1503.0, 0.6653359946773121, 129.86786842980706, 2.3085339737192285], "isController": true}, {"data": ["Balance verify", 4, 0, 0.0, 8857.75, 949, 11830, 11326.0, 11830.0, 11830.0, 11830.0, 0.06822562213239182, 1.9586383498354059, 0.03811040611301574], "isController": false}, {"data": ["Get tokens-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.03785775579223664, 0.8074842417091515, 0.0], "isController": false}, {"data": ["Issue create", 1, 0, 0.0, 528.0, 528, 528, 528.0, 528.0, 528.0, 528.0, 1.893939393939394, 114.70170454545455, 13.744007457386363], "isController": false}, {"data": ["SR profile view-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 31195.3125, 0.0], "isController": false}, {"data": ["Login by Admin", 4, 0, 0.0, 339.25, 228, 670, 229.5, 670.0, 670.0, 670.0, 0.04330316546139523, 1.0406291949941542, 0.020541516233274153], "isController": false}, {"data": ["Get issue creation status-0", 2, 0, 0.0, 2.0, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.5715918833952558, 32.676188732495, 0.0], "isController": false}, {"data": ["Get policies-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 3.90625, 121.85287475585938, 0.0], "isController": false}, {"data": ["Viewing profile by User", 1, 0, 0.0, 501.0, 501, 501, 501.0, 501.0, 501.0, 501.0, 1.996007984031936, 129.9178985778443, 2.4950099800399204], "isController": true}, {"data": ["Login by SR", 5, 0, 0.0, 233.4, 230, 237, 234.0, 237.0, 237.0, 237.0, 0.05438684273500555, 1.6914945436400026, 0.03429982718580721], "isController": false}, {"data": ["Viewing tokens by User", 1, 0, 0.0, 11770.0, 11770, 11770, 11770.0, 11770.0, 11770.0, 11770.0, 0.08496176720475786, 5.570720714740867, 0.10520656329651658], "isController": true}, {"data": ["Issue request creation", 1, 0, 0.0, 77722.0, 77722, 77722, 77722.0, 77722.0, 77722.0, 77722.0, 0.01286636988240138, 9.007627445414427, 0.3448413295141659], "isController": true}, {"data": ["Get issues-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 28596.19140625, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 90, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
