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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9180602006688964, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [0.0, 500, 1500, "Register and generate SR hedera creds"], "isController": true}, {"data": [0.0, 500, 1500, "Registrant user"], "isController": true}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Assign policy"], "isController": true}, {"data": [1.0, 500, 1500, "Get applications"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.0, 500, 1500, "Application creation"], "isController": true}, {"data": [1.0, 500, 1500, "Assign user to policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [1.0, 500, 1500, "Get application creation status"], "isController": false}, {"data": [0.0, 500, 1500, "Choose registrant"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema"], "isController": false}, {"data": [1.0, 500, 1500, "Generate SR keys"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [0.0, 500, 1500, "Device approve"], "isController": true}, {"data": [1.0, 500, 1500, "Approve device"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result"], "isController": false}, {"data": [0.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Publish Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR keys"], "isController": false}, {"data": [0.0, 500, 1500, "Register and generate user hedera creds"], "isController": true}, {"data": [1.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Assign user to policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Create device"], "isController": false}, {"data": [1.0, 500, 1500, "Register user on open source"], "isController": false}, {"data": [0.0, 500, 1500, "SR user"], "isController": true}, {"data": [1.0, 500, 1500, "Create issue"], "isController": false}, {"data": [1.0, 500, 1500, "Choose registrant-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices-0"], "isController": false}, {"data": [0.0, 500, 1500, "Balance verify"], "isController": false}, {"data": [0.0, 500, 1500, "Import policy"], "isController": true}, {"data": [1.0, 500, 1500, "Approve device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy publish result"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get app approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Get grant KYC result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get app approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Approve issue"], "isController": false}, {"data": [1.0, 500, 1500, "Get user access token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user access token"], "isController": false}, {"data": [0.0, 500, 1500, "Tokens workflow"], "isController": true}, {"data": [1.0, 500, 1500, "Create device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy publish result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Token associate"], "isController": true}, {"data": [1.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Mint tokens"], "isController": true}, {"data": [0.0, 500, 1500, "Application approve"], "isController": true}, {"data": [1.0, 500, 1500, "Approve application"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token"], "isController": false}, {"data": [1.0, 500, 1500, "Get grant KYC result"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result"], "isController": false}, {"data": [0.0, 500, 1500, "Get tokens"], "isController": false}, {"data": [1.0, 500, 1500, "Get application creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create application-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.0, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Register SR on open source-0"], "isController": false}, {"data": [0.0, 500, 1500, "Publish policy"], "isController": true}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [1.0, 500, 1500, "Create application"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve issue-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Generate SR keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device schema"], "isController": false}, {"data": [0.5, 500, 1500, "Grant KYC"], "isController": true}, {"data": [1.0, 500, 1500, "Grant KYC-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [0.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get device approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link"], "isController": false}, {"data": [1.0, 500, 1500, "Register user on open source-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Register SR on open source"], "isController": false}, {"data": [0.5, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create issue-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 556, 0, 0.0, 118.6169064748201, 0, 10205, 10.0, 66.0, 100.14999999999998, 3556.019999999984, 0.9736961927778361, 13.601814652945606, 0.36229541817712163], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 2, 0, 0.0, 51.5, 44, 59, 51.5, 59.0, 59.0, 59.0, 0.9394081728511039, 64.3769815641146, 0.5742866369187412], "isController": false}, {"data": ["Link SR profile", 2, 0, 0.0, 42.0, 30, 54, 42.0, 54.0, 54.0, 54.0, 0.19970044932601097, 0.354448795556665, 0.24592018222665998], "isController": false}, {"data": ["Get device issue row-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 2.229654403567447, 75.29220666109254, 0.0], "isController": false}, {"data": ["Register and generate SR hedera creds", 2, 0, 0.0, 6715.0, 6691, 6739, 6715.0, 6739.0, 6739.0, 6739.0, 0.11980352222355338, 1.143398264346472, 0.39041440787109144], "isController": true}, {"data": ["Registrant user", 2, 0, 0.0, 61392.5, 59836, 62949, 61392.5, 62949.0, 62949.0, 62949.0, 0.028688230653374454, 1.0230828193358674, 0.17254962167395824], "isController": true}, {"data": ["Import Policy-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.2953773445576724, 1.005840625461527, 0.0], "isController": false}, {"data": ["Get device approve result-0", 7, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.6887052341597797, 23.264170725108226, 0.0], "isController": false}, {"data": ["Import Policy", 2, 0, 0.0, 12.5, 12, 13, 12.5, 13.0, 13.0, 13.0, 0.29489826010026543, 1.0943490120908286, 0.1857513454733117], "isController": false}, {"data": ["Assign policy", 2, 0, 0.0, 33.5, 29, 38, 33.5, 38.0, 38.0, 38.0, 0.3606202668589975, 1.4379028804543814, 0.24581342408943382], "isController": true}, {"data": ["Get applications", 2, 0, 0.0, 47.0, 46, 48, 47.0, 48.0, 48.0, 48.0, 0.24050024050024052, 2.251049370189995, 0.14420619889369887], "isController": false}, {"data": ["Issue creation", 2, 0, 0.0, 11178.0, 9679, 12677, 11178.0, 12677.0, 12677.0, 12677.0, 0.15776603297310088, 63.1410785773448, 1.4924605091898715], "isController": true}, {"data": ["Application creation", 2, 0, 0.0, 31917.0, 31909, 31925, 31917.0, 31925.0, 31925.0, 31925.0, 0.04977600796416127, 2.3063450799527128, 0.273573606271777], "isController": true}, {"data": ["Assign user to policy", 2, 0, 0.0, 33.0, 29, 37, 33.0, 37.0, 37.0, 37.0, 0.3606853020739405, 1.4381621956717765, 0.2458577547339946], "isController": false}, {"data": ["Get Access Token-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.19944156362185878, 0.1583456945552453, 0.0], "isController": false}, {"data": ["Get issue approve result", 17, 0, 0.0, 74.52941176470587, 41, 108, 78.0, 107.2, 108.0, 108.0, 0.6304234962545427, 39.55860360036713, 0.3853956139212341], "isController": false}, {"data": ["Login by user", 2, 0, 0.0, 472.5, 465, 480, 472.5, 480.0, 480.0, 480.0, 0.19305019305019305, 0.4207890926640927, 0.061836389961389966], "isController": false}, {"data": ["Get application creation status", 14, 0, 0.0, 58.07142857142858, 31, 98, 56.5, 95.5, 98.0, 98.0, 0.5233253588516746, 2.620970803584779, 0.31123549173893544], "isController": false}, {"data": ["Choose registrant", 2, 0, 0.0, 10204.5, 10204, 10205, 10204.5, 10205.0, 10205.0, 10205.0, 0.10834236186348863, 0.510923110780065, 0.06824299160346695], "isController": false}, {"data": ["Get SR DID", 2, 0, 0.0, 47.0, 40, 54, 47.0, 54.0, 54.0, 54.0, 0.29442072721919627, 0.9811628238628, 0.1627364566465479], "isController": false}, {"data": ["Link user profile", 2, 0, 0.0, 31.5, 27, 36, 31.5, 36.0, 36.0, 36.0, 0.2954646181119811, 1.0533140511892451, 0.24727849386910916], "isController": false}, {"data": ["Get associate result-0", 3, 0, 0.0, 0.6666666666666667, 0, 2, 0.0, 2.0, 2.0, 2.0, 0.36864094372081596, 1.6237241567338412, 0.0], "isController": false}, {"data": ["Get issue schema", 2, 0, 0.0, 33.5, 29, 38, 33.5, 38.0, 38.0, 38.0, 1.990049751243781, 121.97022699004977, 1.1815920398009951], "isController": false}, {"data": ["Generate SR keys", 2, 0, 0.0, 11.0, 10, 12, 11.0, 12.0, 12.0, 12.0, 0.19924287706714486, 0.29108139071528194, 0.11149039898386133], "isController": false}, {"data": ["User creation flow", 2, 0, 0.0, 192679.0, 191060, 194298, 192679.0, 194298.0, 194298.0, 194298.0, 0.009947130998741689, 0.7401918568433775, 0.15651188930832627], "isController": true}, {"data": ["Device approve", 2, 0, 0.0, 10902.0, 9363, 12441, 10902.0, 12441.0, 12441.0, 12441.0, 0.14979029358897544, 31.36336667727681, 1.1827435730602156], "isController": true}, {"data": ["Approve device", 2, 0, 0.0, 33.5, 29, 38, 33.5, 38.0, 38.0, 38.0, 0.501002004008016, 16.948692306487978, 2.59527844752004], "isController": false}, {"data": ["Get user link result", 4, 0, 0.0, 38.0, 30, 49, 36.5, 49.0, 49.0, 49.0, 0.20128824476650564, 0.8950348637530193, 0.11401091988727859], "isController": false}, {"data": ["Link user", 2, 0, 0.0, 56271.0, 56263, 56279, 56271.0, 56279.0, 56279.0, 56279.0, 0.03173041836556615, 0.6496214412352652, 0.09801104813504466], "isController": true}, {"data": ["Publish Policy", 2, 0, 0.0, 17.0, 16, 18, 17.0, 18.0, 18.0, 18.0, 0.29398794649419374, 1.1491081600029398, 0.1871876378068499], "isController": false}, {"data": ["Get Access Token", 2, 0, 0.0, 11.5, 11, 12, 11.5, 12.0, 12.0, 12.0, 0.19922303018228907, 0.261285673373842, 0.12743269997011655], "isController": false}, {"data": ["Get SR keys", 2, 0, 0.0, 15.5, 15, 16, 15.5, 16.0, 16.0, 16.0, 0.20058168689198674, 0.3994004488015244, 0.1165489293952462], "isController": false}, {"data": ["Register and generate user hedera creds", 2, 0, 0.0, 5121.5, 3557, 6686, 5121.5, 6686.0, 6686.0, 6686.0, 0.14885382554331647, 2.2609355230351293, 0.43551373176540636], "isController": true}, {"data": ["Get user keys", 2, 0, 0.0, 21.5, 17, 26, 21.5, 26.0, 26.0, 26.0, 0.29511583296443855, 0.9398171204072598, 0.16715545226501402], "isController": false}, {"data": ["Get issue approve result-0", 17, 0, 0.0, 1.1764705882352942, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.6322758210287499, 36.587660277271546, 0.0], "isController": false}, {"data": ["Approve application-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.2420135527589545, 2.567494365621975, 0.0], "isController": false}, {"data": ["Get policy import result-0", 18, 0, 0.0, 1.0555555555555556, 0, 3, 1.0, 2.1000000000000014, 3.0, 3.0, 0.20623281393217233, 0.7375351777325848, 0.0], "isController": false}, {"data": ["Verify link-0", 4, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.05737481532481317, 0.14378722639384942, 0.0], "isController": false}, {"data": ["Assign user to policy-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.3630422944273008, 1.3840987475040842, 0.0], "isController": false}, {"data": ["Create device", 2, 0, 0.0, 8809.0, 8339, 9279, 8809.0, 9279.0, 9279.0, 9279.0, 0.1506931886678722, 6.567147354392707, 0.7705366561181435], "isController": false}, {"data": ["Register user on open source", 2, 0, 0.0, 475.5, 467, 484, 475.5, 484.0, 484.0, 484.0, 0.8051529790660226, 1.2230619716183575, 0.2712673611111111], "isController": false}, {"data": ["SR user", 2, 0, 0.0, 131286.5, 131224, 131349, 131286.5, 131349.0, 131349.0, 131349.0, 0.014161597994717725, 0.5487688371380827, 0.13764686019670458], "isController": true}, {"data": ["Create issue", 2, 0, 0.0, 176.0, 173, 179, 176.0, 179.0, 179.0, 179.0, 1.8148820326678765, 119.23721784255898, 11.302248752268602], "isController": false}, {"data": ["Choose registrant-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.24221872350732712, 1.1011017167252029, 0.0], "isController": false}, {"data": ["Get policy import result", 18, 0, 0.0, 36.44444444444445, 13, 66, 38.5, 53.40000000000002, 66.0, 66.0, 0.20615959042961368, 1.2102368795168992, 0.11978999639220715], "isController": false}, {"data": ["Login by user-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.20212228398180898, 0.3248957806973219, 0.0], "isController": false}, {"data": ["Get user key gen result", 3, 0, 0.0, 41.333333333333336, 17, 55, 52.0, 55.0, 55.0, 55.0, 0.3027856277755349, 0.9425582546931773, 0.1714996719822366], "isController": false}, {"data": ["Link SR profile-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.200300450676014, 0.2962451489734602, 0.0], "isController": false}, {"data": ["Get devices-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.5025125628140704, 20.13804373429648, 0.0], "isController": false}, {"data": ["Balance verify", 2, 0, 0.0, 3277.5, 2820, 3735, 3277.5, 3735.0, 3735.0, 3735.0, 0.22251891410769914, 13.024962102247441, 0.11821317311971519], "isController": false}, {"data": ["Import policy", 2, 0, 0.0, 90590.5, 90583, 90598, 90590.5, 90598.0, 90598.0, 90598.0, 0.02054084032577773, 1.3388154643000194, 0.13229183784033605], "isController": true}, {"data": ["Approve device-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.5056890012642224, 17.04650956068268, 0.0], "isController": false}, {"data": ["Get devices", 2, 0, 0.0, 47.0, 42, 52, 47.0, 52.0, 52.0, 52.0, 0.4961548002976929, 23.040188538824115, 0.29943717439841233], "isController": false}, {"data": ["Get policy publish result", 86, 0, 0.0, 27.37209302325581, 11, 61, 24.0, 51.0, 53.29999999999998, 61.0, 0.6387498328852181, 3.3707356137383204, 0.37114858453779764], "isController": false}, {"data": ["Get user key gen result-0", 3, 0, 0.0, 0.6666666666666666, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.3044757941743631, 0.7572249568659292, 0.0], "isController": false}, {"data": ["Get applications-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.24186721489902044, 1.1159195867093965, 0.0], "isController": false}, {"data": ["Get device schema-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.4014452027298274, 4.299658457948615, 0.0], "isController": false}, {"data": ["Get SR DID-0", 2, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.2967799376762131, 0.7960020496364446, 0.0], "isController": false}, {"data": ["Get app approve result", 7, 0, 0.0, 86.85714285714286, 37, 179, 72.0, 179.0, 179.0, 179.0, 0.484027105517909, 6.448270143306597, 0.2902271902226525], "isController": false}, {"data": ["Get grant KYC result-0", 14, 0, 0.0, 1.0714285714285714, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.5297612290460514, 2.4160748240435916, 0.0], "isController": false}, {"data": ["Get issues-0", 2, 0, 0.0, 1.5, 1, 2, 1.5, 2.0, 2.0, 2.0, 0.9652509652509653, 60.55158813947876, 0.0], "isController": false}, {"data": ["Get user keys-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.2962524070508073, 0.7391844726707154, 0.0], "isController": false}, {"data": ["Get app approve result-0", 7, 0, 0.0, 12.285714285714286, 0, 82, 1.0, 82.0, 82.0, 82.0, 0.4878388737891142, 5.215683584221897, 0.0], "isController": false}, {"data": ["Get SR key gen result", 4, 0, 0.0, 36.5, 23, 54, 34.5, 54.0, 54.0, 54.0, 0.30501753850846425, 0.5780141928473387, 0.1772318705200549], "isController": false}, {"data": ["Approve issue", 2, 0, 0.0, 34.0, 31, 37, 34.0, 37.0, 37.0, 37.0, 0.9208103130755064, 53.33416062384898, 4.295616079650092], "isController": false}, {"data": ["Get user access token-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.20212228398180898, 0.40404718292066705, 0.0], "isController": false}, {"data": ["Link user profile-0", 2, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.2966478789676654, 0.9697546629338475, 0.0], "isController": false}, {"data": ["Get user access token", 2, 0, 0.0, 12.0, 12, 12, 12.0, 12.0, 12.0, 12.0, 0.20189783969311528, 0.5051389309509388, 0.1301294669897032], "isController": false}, {"data": ["Tokens workflow", 2, 0, 0.0, 29153.0, 27824, 30482, 29153.0, 30482.0, 30482.0, 30482.0, 0.05556944791753494, 3.199937354130199, 0.37069814328582146], "isController": true}, {"data": ["Create device-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.500751126690035, 20.031512111917877, 0.0], "isController": false}, {"data": ["Get policy publish result-0", 86, 0, 0.0, 0.9069767441860463, 0, 3, 1.0, 2.0, 2.0, 3.0, 0.638991878859028, 2.450160607079436, 0.0], "isController": false}, {"data": ["Get issue schema-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 2.066115702479339, 88.35671164772728, 0.0], "isController": false}, {"data": ["Get device issue row", 2, 0, 0.0, 61.5, 53, 70, 61.5, 70.0, 70.0, 70.0, 2.070393374741201, 92.33267016045549, 1.2030117753623188], "isController": false}, {"data": ["Token associate", 2, 0, 0.0, 7812.0, 6498, 9126, 7812.0, 9126.0, 9126.0, 9126.0, 0.1366586949094636, 2.25593611206013, 0.2703813631704817], "isController": true}, {"data": ["Generate user keys", 2, 0, 0.0, 10.0, 10, 10, 10.0, 10.0, 10.0, 10.0, 0.20193861066235866, 0.5358078175484653, 0.11004076635702746], "isController": false}, {"data": ["Get policy id", 2, 0, 0.0, 15.5, 15, 16, 15.5, 16.0, 16.0, 16.0, 0.2941176470588235, 2.539349724264706, 0.1708984375], "isController": false}, {"data": ["Mint tokens", 2, 0, 0.0, 115877.0, 108666, 123088, 115877.0, 123088.0, 123088.0, 123088.0, 0.016248537631613158, 26.758342481598532, 0.7735113165986937], "isController": true}, {"data": ["Application approve", 2, 0, 0.0, 10948.0, 9303, 12593, 10948.0, 12593.0, 12593.0, 12593.0, 0.11380448389666553, 7.592615067002389, 0.7176128442585638], "isController": true}, {"data": ["Approve application", 2, 0, 0.0, 33.0, 31, 35, 33.0, 35.0, 35.0, 35.0, 0.24099289070972407, 2.585613665803109, 0.8693630256657429], "isController": false}, {"data": ["Associate token", 2, 0, 0.0, 14.0, 13, 15, 14.0, 15.0, 15.0, 15.0, 0.39619651347068147, 1.80551858409271, 0.23678932250396195], "isController": false}, {"data": ["Get grant KYC result", 14, 0, 0.0, 24.857142857142858, 12, 44, 25.0, 41.0, 44.0, 44.0, 0.5294807306834084, 2.751187195075829, 0.3076572605045195], "isController": false}, {"data": ["Balance verify-0", 2, 0, 0.0, 2.0, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.3242016534284325, 18.770452565245584, 0.0], "isController": false}, {"data": ["Get SR link result", 16, 0, 0.0, 36.0, 13, 54, 33.5, 53.3, 54.0, 54.0, 0.15779092702169625, 0.467758028229783, 0.09168515779092702], "isController": false}, {"data": ["Get tokens", 2, 0, 0.0, 3186.5, 2952, 3421, 3186.5, 3421.0, 3421.0, 3421.0, 0.23640661938534277, 1.0413203679078014, 0.12559101654846336], "isController": false}, {"data": ["Get application creation status-0", 14, 0, 0.0, 0.7142857142857144, 0, 3, 1.0, 2.0, 3.0, 3.0, 0.525249493509417, 2.4220611235649434, 0.0], "isController": false}, {"data": ["Create application-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.2424536307431204, 1.1024063522851253, 0.0], "isController": false}, {"data": ["Login by SR-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.19944156362185878, 0.08180220382927801, 0.0], "isController": false}, {"data": ["Issue approve", 2, 0, 0.0, 26432.5, 24847, 28018, 26432.5, 28018.0, 28018.0, 28018.0, 0.06643856094077003, 43.83741471987842, 0.6957882104773611], "isController": true}, {"data": ["Register SR on open source-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 1.0005002501250624, 0.37567611930965483, 0.0], "isController": false}, {"data": ["Publish policy", 2, 0, 0.0, 131525.0, 125376, 137674, 131525.0, 137674.0, 137674.0, 137674.0, 0.014527071197175938, 3.3531856732207967, 0.3722136396487354], "isController": true}, {"data": ["Generate user keys-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.20214271275520515, 0.4755486279563372, 0.0], "isController": false}, {"data": ["Get SR keys-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.20090406830738322, 0.2615284404821698, 0.0], "isController": false}, {"data": ["Token minting verify", 2, 0, 0.0, 6294.0, 5838, 6750, 6294.0, 6750.0, 6750.0, 6750.0, 0.16656950112434413, 9.750009109269593, 0.08849004747230782], "isController": true}, {"data": ["Create application", 2, 0, 0.0, 208.0, 204, 212, 208.0, 212.0, 212.0, 212.0, 0.23640661938534277, 1.5509567080378248, 0.16622340425531915], "isController": false}, {"data": ["Get policy id-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.29481132075471694, 1.0488258217865567, 0.0], "isController": false}, {"data": ["Approve issue-0", 2, 0, 0.0, 2.0, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.9354536950420954, 54.06995439663237, 0.0], "isController": false}, {"data": ["Device creation", 2, 0, 0.0, 18205.5, 17711, 18700, 18205.5, 18700.0, 18700.0, 18700.0, 0.08813290441986515, 18.138638222689814, 0.6560048803595822], "isController": true}, {"data": ["Get user link result-0", 4, 0, 0.0, 0.75, 0, 2, 0.5, 2.0, 2.0, 2.0, 0.20168406191700702, 0.6864939431755156, 0.0], "isController": false}, {"data": ["Generate SR keys-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.19948134849391583, 0.23142953321364454, 0.0], "isController": false}, {"data": ["Get device schema", 2, 0, 0.0, 40.5, 40, 41, 40.5, 41.0, 41.0, 41.0, 0.39824771007566706, 12.841738537933093, 0.23373718140183192], "isController": false}, {"data": ["Grant KYC", 4, 0, 0.0, 10680.25, 16, 21356, 10674.5, 21356.0, 21356.0, 21356.0, 0.13568060784912317, 3.1058139140463346, 0.36073286608324], "isController": true}, {"data": ["Grant KYC-0", 2, 0, 0.0, 1.5, 1, 2, 1.5, 2.0, 2.0, 2.0, 0.2463054187192118, 1.0866061807266012, 0.0], "isController": false}, {"data": ["Get issue creation status", 7, 0, 0.0, 78.14285714285714, 48, 106, 76.0, 106.0, 106.0, 106.0, 0.7517989474814735, 49.11036425330254, 0.44197555310922565], "isController": false}, {"data": ["Link SR", 2, 0, 0.0, 124571.5, 124533, 124610, 124571.5, 124610.0, 124610.0, 124610.0, 0.014871104700012641, 0.43433355841369925, 0.09608127802273791], "isController": true}, {"data": ["Get device approve result", 7, 0, 0.0, 71.0, 37, 100, 70.0, 100.0, 100.0, 100.0, 0.6850655705617538, 25.272019200185948, 0.4134477759835584], "isController": false}, {"data": ["Get SR key gen result-0", 4, 0, 0.0, 0.25, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.30602096243592686, 0.398066330043608, 0.0], "isController": false}, {"data": ["Associate token-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.3972194637537239, 1.6914799528301887, 0.0], "isController": false}, {"data": ["Get device creation status", 6, 0, 0.0, 71.0, 42, 99, 68.5, 99.0, 99.0, 99.0, 0.5828638041577618, 25.254490631678646, 0.33867574557994945], "isController": false}, {"data": ["Get SR link result-0", 16, 0, 0.0, 0.3125, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.15787500246679692, 0.2561036264381426, 0.0], "isController": false}, {"data": ["Get tokens-0", 2, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.3970617431010522, 1.513604017768513, 0.0], "isController": false}, {"data": ["Verify link", 4, 0, 0.0, 20.25, 12, 29, 20.0, 29.0, 29.0, 29.0, 0.05736494141605358, 0.24090194269959414, 0.03291201472844871], "isController": false}, {"data": ["Register user on open source-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.9915716410510659, 0.37232353123450673, 0.0], "isController": false}, {"data": ["Get associate result", 3, 0, 0.0, 20.333333333333332, 11, 36, 14.0, 36.0, 36.0, 36.0, 0.36710719530102787, 1.8467690742780223, 0.20793180983847281], "isController": false}, {"data": ["Get issue creation status-0", 7, 0, 0.0, 1.1428571428571428, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.7603736693460786, 47.698384545405176, 0.0], "isController": false}, {"data": ["Register SR on open source", 2, 0, 0.0, 470.5, 470, 471, 470.5, 471.0, 471.0, 471.0, 0.8097165991902834, 2.628811361336032, 0.28150303643724695], "isController": false}, {"data": ["Login by SR", 2, 0, 0.0, 517.5, 507, 528, 517.5, 528.0, 528.0, 528.0, 0.18984337921214997, 0.18798943996203132, 0.060067631703844326], "isController": false}, {"data": ["Get device creation status-0", 6, 0, 0.0, 1.1666666666666665, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.5880047040376323, 23.562297873382985, 0.0], "isController": false}, {"data": ["Publish Policy-0", 2, 0, 0.0, 0.5, 0, 1, 0.5, 1.0, 1.0, 1.0, 0.29468100780904666, 1.0637581497716222, 0.0], "isController": false}, {"data": ["Create issue-0", 2, 0, 0.0, 1.5, 1, 2, 1.5, 2.0, 2.0, 2.0, 2.1621621621621623, 135.46347128378378, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 556, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
