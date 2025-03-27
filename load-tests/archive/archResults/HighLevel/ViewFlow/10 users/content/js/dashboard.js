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

    var data = {"OkPercent": 99.25705794947994, "KoPercent": 0.7429420505200595};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8257668711656442, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [0.5833333333333334, 500, 1500, "Viewing policy by User"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.7, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.75, 500, 1500, "Viewing policy by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get policies"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Issue approve-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.4772727272727273, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.16666666666666666, 500, 1500, "Policy list viewing"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.8571428571428571, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.5833333333333334, 500, 1500, "Viewing profile by SR"], "isController": true}, {"data": [0.5, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.7321428571428571, 500, 1500, "Get tenant"], "isController": true}, {"data": [0.0, 500, 1500, "Tokens list viewing"], "isController": true}, {"data": [0.5, 500, 1500, "Viewing tokens by SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.9, 500, 1500, "Get policy"], "isController": true}, {"data": [1.0, 500, 1500, "User profile view-0"], "isController": false}, {"data": [1.0, 500, 1500, "User profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Issue create-0"], "isController": false}, {"data": [0.0, 500, 1500, "Save balance"], "isController": true}, {"data": [1.0, 500, 1500, "Get Policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.2, 500, 1500, "Get token"], "isController": true}, {"data": [0.8695652173913043, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [0.3333333333333333, 500, 1500, "Profile viewing"], "isController": true}, {"data": [0.17142857142857143, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [0.6666666666666666, 500, 1500, "Issue create"], "isController": false}, {"data": [1.0, 500, 1500, "SR profile view-0"], "isController": false}, {"data": [0.8214285714285714, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policies-0"], "isController": false}, {"data": [0.75, 500, 1500, "Viewing profile by User"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.3333333333333333, 500, 1500, "Viewing tokens by User"], "isController": true}, {"data": [0.0, 500, 1500, "Issue request creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 673, 5, 0.7429420505200595, 1943.01485884101, 0, 180735, 225.0, 514.6, 1591.4999999999911, 11636.42, 2.3135813758418102, 58.081228503546, 0.8988446542261533], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 6, 0, 0.0, 278.6666666666667, 269, 290, 278.0, 290.0, 290.0, 290.0, 0.10565984573662522, 7.5734411595727815, 0.06748197178882119], "isController": false}, {"data": ["Viewing policy by User", 6, 0, 0.0, 509.0, 499, 534, 505.5, 534.0, 534.0, 534.0, 0.08647776080251361, 5.761876391751462, 0.10725269162030497], "isController": true}, {"data": ["Get device issue row-0", 7, 0, 0.0, 0.4285714285714286, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.13928685132123525, 0.48285978912965616, 0.0], "isController": false}, {"data": ["Get hedera id-0", 10, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.11154987394864245, 0.3565347484829217, 0.0], "isController": false}, {"data": ["Get Policy id", 10, 0, 0.0, 267.20000000000005, 252, 322, 264.0, 316.8, 322.0, 322.0, 0.1109914869529507, 0.42996194379391106, 0.0638526220351399], "isController": false}, {"data": ["Get issue schema-0", 7, 0, 0.0, 0.7142857142857143, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.03049776712776386, 0.3365518802418037, 0.0], "isController": false}, {"data": ["Get device issue row", 7, 0, 0.0, 266.4285714285714, 244, 279, 272.0, 279.0, 279.0, 279.0, 0.1385397906070022, 1.2234524672452352, 0.08426806459912523], "isController": false}, {"data": ["Issue creation", 7, 1, 14.285714285714286, 38553.142857142855, 8565, 180735, 19033.0, 180735.0, 180735.0, 180735.0, 0.03036705088216283, 10.013170691566202, 0.3094956615787396], "isController": true}, {"data": ["Get block for waiting device", 10, 3, 30.0, 54232.0, 229, 180224, 238.5, 180223.8, 180224.0, 180224.0, 0.03705501558163405, 0.13240654493476464, 0.022294526464692127], "isController": false}, {"data": ["Viewing policy by SR", 6, 0, 0.0, 501.66666666666663, 493, 515, 500.5, 515.0, 515.0, 515.0, 0.08648274669203493, 5.648418469291418, 0.1096236378967396], "isController": true}, {"data": ["Get policies", 12, 0, 0.0, 271.4166666666667, 261, 301, 268.5, 296.20000000000005, 301.0, 301.0, 0.17228260089299816, 5.930893029553644, 0.09783430900320157], "isController": false}, {"data": ["Get result for issue request approve", 6, 0, 0.0, 3739.5, 3729, 3746, 3741.0, 3746.0, 3746.0, 3746.0, 0.09960820771631583, 0.0, 0.0], "isController": true}, {"data": ["Get block for waiting device-0", 10, 0, 0.0, 0.5, 0, 2, 0.0, 1.9000000000000004, 2.0, 2.0, 0.0370874484948059, 0.12042917479499914, 0.0], "isController": false}, {"data": ["Balance verify-0", 35, 0, 0.0, 0.7714285714285716, 0, 3, 1.0, 1.0, 2.1999999999999957, 3.0, 0.267549324629062, 6.688979464156034, 0.0], "isController": false}, {"data": ["Get issue approve result", 6, 0, 0.0, 494.16666666666663, 488, 499, 496.0, 499.0, 499.0, 499.0, 0.10527423939362039, 6.024637050610591, 0.06610482024423624], "isController": false}, {"data": ["Issue approve-0", 6, 0, 0.0, 4.333333333333333, 1, 21, 1.0, 21.0, 21.0, 21.0, 0.10618905190874821, 4.586765581031096, 0.0], "isController": false}, {"data": ["Login by user", 67, 0, 0.0, 232.0895522388059, 227, 239, 231.0, 236.0, 237.0, 239.0, 0.4063388866314506, 7.421933041643671, 0.2584985285377258], "isController": false}, {"data": ["Get tokens", 22, 0, 0.0, 3627.136363636363, 272, 11326, 1096.5, 11213.7, 11312.8, 11326.0, 0.1346776612611951, 2.655794697679259, 0.0757741191621825], "isController": false}, {"data": ["Policy list viewing", 6, 0, 0.0, 1506.1666666666665, 1480, 1556, 1502.5, 1556.0, 1556.0, 1556.0, 0.08525391457557759, 16.599203586348008, 0.2943091679928387], "isController": true}, {"data": ["Login by SR-0", 34, 0, 0.0, 0.7941176470588235, 0, 2, 1.0, 1.0, 1.25, 2.0, 0.20646979164768967, 5.498728920345169, 0.0], "isController": false}, {"data": ["Get issue schema", 7, 1, 14.285714285714286, 26152.57142857143, 466, 180220, 476.0, 180220.0, 180220.0, 180220.0, 0.030435444248788017, 1.2959733159959999, 0.01889901818517794], "isController": false}, {"data": ["Viewing profile by SR", 6, 0, 0.0, 514.1666666666666, 498, 540, 507.5, 540.0, 540.0, 540.0, 0.08669392709040732, 5.693578508575474, 0.11056862185553902], "isController": true}, {"data": ["Issue approve", 12, 0, 0.0, 2379.4166666666665, 244, 4520, 2375.5, 4518.2, 4520.0, 4520.0, 0.1967051880993361, 31.23448833599705, 1.2395244242275223], "isController": true}, {"data": ["Get block for waiting issue request-0", 7, 0, 0.0, 0.4285714285714286, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.13929239463525292, 0.47553350852668447, 0.0], "isController": false}, {"data": ["Get tenant", 28, 0, 0.0, 654.3928571428572, 483, 1065, 502.0, 931.4, 1010.5499999999996, 1065.0, 0.16894236048679534, 6.970964115963847, 0.15099459158184353], "isController": true}, {"data": ["Tokens list viewing", 6, 0, 0.0, 5640.333333333333, 2147, 12604, 2268.5, 12604.0, 12604.0, 12604.0, 0.07384251852216507, 14.211199410182882, 0.2546268875993797], "isController": true}, {"data": ["Viewing tokens by SR", 6, 0, 0.0, 517.5, 505, 544, 511.0, 544.0, 544.0, 544.0, 0.08649895480429612, 5.654714305665682, 0.10947523967418728], "isController": true}, {"data": ["Get Tenant Id-0", 28, 0, 0.0, 0.5357142857142857, 0, 2, 0.5, 1.0, 1.5499999999999972, 2.0, 0.17003394606280325, 3.411744886077256, 0.0], "isController": false}, {"data": ["Login by Admin-0", 28, 0, 0.0, 1.9642857142857142, 0, 18, 1.0, 3.1000000000000156, 15.749999999999986, 18.0, 0.17005150131182586, 3.399707429808206, 0.0], "isController": false}, {"data": ["Token minting verify", 6, 0, 0.0, 43152.833333333336, 28858, 60213, 44740.0, 60213.0, 60213.0, 60213.0, 0.05140903599489337, 9.905384949254998, 0.15459527165391437], "isController": true}, {"data": ["Get issue approve result-0", 6, 0, 0.0, 1.1666666666666665, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.10620032922102059, 4.591383862196222, 0.0], "isController": false}, {"data": ["Get policy", 10, 0, 0.0, 498.9, 482, 556, 495.0, 550.8000000000001, 556.0, 556.0, 0.11070396652312052, 0.607336663216393, 0.1061849960146572], "isController": true}, {"data": ["User profile view-0", 6, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.08739094338523384, 2.689817566854072, 0.0], "isController": false}, {"data": ["User profile view", 6, 0, 0.0, 270.5, 265, 288, 267.5, 288.0, 288.0, 288.0, 0.0870258902023352, 2.848072399195011, 0.049631953006019296], "isController": false}, {"data": ["Issue create-0", 6, 0, 0.0, 1.1666666666666665, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.11952905552124629, 6.825860017779947, 0.0], "isController": false}, {"data": ["Save balance", 10, 0, 0.0, 12469.9, 7379, 17462, 12439.5, 17461.9, 17462.0, 17462.0, 0.10281507680286237, 0.9197330727827928, 0.1273441034268265], "isController": true}, {"data": ["Get Policy id-0", 10, 0, 0.0, 0.8999999999999999, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.11138710360114507, 0.1330988866858995, 0.0], "isController": false}, {"data": ["Get block for waiting issue request", 7, 0, 0.0, 235.14285714285714, 230, 239, 235.0, 239.0, 239.0, 239.0, 0.1386495533503674, 0.5168022832610375, 0.08433482876780161], "isController": false}, {"data": ["SR profile view", 6, 0, 0.0, 280.3333333333333, 266, 306, 273.0, 306.0, 306.0, 306.0, 0.08698803914461761, 2.967716450706778, 0.05071470641536789], "isController": false}, {"data": ["Get Tenant Id", 28, 0, 0.0, 261.8928571428571, 252, 290, 259.5, 272.0, 281.9, 290.0, 0.1697545833737511, 3.5273216781149968, 0.07377030234503833], "isController": false}, {"data": ["Get token", 10, 0, 0.0, 5404.5, 1033, 11469, 1732.5, 11457.4, 11469.0, 11469.0, 0.10976827916268757, 0.5954393166650201, 0.10389396109812186], "isController": true}, {"data": ["Get issue creation status", 23, 0, 0.0, 466.78260869565213, 268, 515, 493.0, 511.6, 514.8, 515.0, 0.379970593580149, 25.695479124332987, 0.2385948160859725], "isController": false}, {"data": ["Get hedera id", 10, 0, 0.0, 267.0, 261, 273, 267.0, 272.9, 273.0, 273.0, 0.11121367483345752, 0.5719901756619994, 0.06323105614066306], "isController": false}, {"data": ["Login by user-0", 67, 0, 0.0, 0.7164179104477614, 0, 2, 1.0, 1.0, 1.5999999999999943, 2.0, 0.40690894956758333, 7.125568325023078, 0.0], "isController": false}, {"data": ["Profile viewing", 6, 0, 0.0, 1513.6666666666667, 1487, 1566, 1497.5, 1566.0, 1566.0, 1566.0, 0.08547252058463203, 16.470265356562866, 0.2965662750363259], "isController": true}, {"data": ["Balance verify", 35, 0, 0.0, 6981.914285714285, 684, 11649, 10987.0, 11412.6, 11635.4, 11649.0, 0.2647944438560123, 7.127314823571245, 0.1479199096105252], "isController": false}, {"data": ["Get tokens-0", 22, 0, 0.0, 0.5909090909090909, 0, 3, 0.0, 1.6999999999999993, 2.849999999999998, 3.0, 0.1444299285071854, 2.52970994408264, 0.0], "isController": false}, {"data": ["Issue create", 6, 0, 0.0, 506.0, 492, 514, 511.0, 514.0, 514.0, 514.0, 0.11832919181161992, 7.166138345314163, 0.858657012976768], "isController": false}, {"data": ["SR profile view-0", 6, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.08736040535228083, 2.6888207573783145, 0.0], "isController": false}, {"data": ["Login by Admin", 28, 0, 0.0, 391.10714285714283, 225, 791, 233.0, 671.3000000000001, 742.3999999999996, 791.0, 0.16924053310767928, 3.4666271740608665, 0.07771417616126206], "isController": false}, {"data": ["Get issue creation status-0", 23, 0, 0.0, 1.0434782608695652, 0, 2, 1.0, 1.6000000000000014, 2.0, 2.0, 0.3831800613088098, 21.90702495043649, 0.0], "isController": false}, {"data": ["Get policies-0", 12, 0, 0.0, 0.41666666666666663, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.17295053614666206, 5.323239597745878, 0.0], "isController": false}, {"data": ["Viewing profile by User", 6, 0, 0.0, 502.33333333333337, 494, 519, 500.5, 519.0, 519.0, 519.0, 0.08673528391349601, 5.5735607815571875, 0.10841910489187001], "isController": true}, {"data": ["Login by SR", 34, 0, 0.0, 231.8235294117647, 226, 238, 231.0, 234.5, 237.25, 238.0, 0.20617931536339104, 5.651679660258937, 0.12404751030896577], "isController": false}, {"data": ["Viewing tokens by User", 6, 0, 0.0, 4630.5, 1140, 11560, 1267.5, 11560.0, 11560.0, 11560.0, 0.07480457305289931, 4.811222185945467, 0.09262910022566045], "isController": true}, {"data": ["Issue request creation", 6, 0, 0.0, 82287.0, 74002, 91288, 83943.0, 91288.0, 91288.0, 91288.0, 0.03966024391050005, 35.31451012369039, 1.134480502445715], "isController": true}, {"data": ["Get issues-0", 6, 0, 0.0, 2.8333333333333335, 0, 14, 1.0, 14.0, 14.0, 14.0, 0.10618529333687285, 6.072886249004513, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 4, 80.0, 0.5943536404160475], "isController": false}, {"data": ["504", 1, 20.0, 0.1485884101040119], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 673, 5, "504/Gateway Time-out", 4, "504", 1, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Issue creation", 1, 1, "504", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["Get block for waiting device", 10, 3, "504/Gateway Time-out", 3, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Get issue schema", 7, 1, "504/Gateway Time-out", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
