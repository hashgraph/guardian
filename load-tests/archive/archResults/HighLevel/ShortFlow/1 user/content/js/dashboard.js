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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.8834745762711864, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve-0"], "isController": false}, {"data": [0.0, 500, 1500, "Import"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy publish result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.0, 500, 1500, "Token associate"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.0, 500, 1500, "Application creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [0.0, 500, 1500, "Get result for device approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [0.5, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.9615384615384616, 500, 1500, "Get application creation status"], "isController": false}, {"data": [0.875, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.0, 500, 1500, "Choose registrant"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for app approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get application creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Role approve"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.0, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device approve"], "isController": true}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Approve device"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [0.5, 500, 1500, "Create application"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get application schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve"], "isController": false}, {"data": [1.0, 500, 1500, "Get application schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for approve result"], "isController": false}, {"data": [0.5, 500, 1500, "Get device schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [0.5, 500, 1500, "Grant KYC"], "isController": true}, {"data": [0.0, 500, 1500, "Policy import and publish"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Create device"], "isController": false}, {"data": [1.0, 500, 1500, "Grant KYC-0"], "isController": false}, {"data": [0.0, 500, 1500, "Publish"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Choose registrant-0"], "isController": false}, {"data": [0.9545454545454546, 500, 1500, "Get policy import result"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for kyc grant"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices-0"], "isController": false}, {"data": [0.125, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation"], "isController": false}, {"data": [1.0, 500, 1500, "Approve device-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.875, 500, 1500, "Get associate result"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.9117647058823529, 500, 1500, "Get policy publish result"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for kyc grant-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 220, 0, 0.0, 390.0772727272729, 0, 11271, 115.5, 435.00000000000097, 713.9999999999998, 11244.18, 0.45394238645766055, 11.312097980498017, 0.19946826517147676], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 1, 0, 0.0, 263.0, 263, 263, 263.0, 263.0, 263.0, 263.0, 3.802281368821293, 358.08653160646384, 2.4284101711026613], "isController": false}, {"data": ["Get block for waiting app approve-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Import", 1, 0, 0.0, 114230.0, 114230, 114230, 114230.0, 114230.0, 114230.0, 114230.0, 0.008754267705506434, 0.37084240676704894, 0.073026322988707], "isController": true}, {"data": ["Get device issue row-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 39430.6640625, 0.0], "isController": false}, {"data": ["Get hedera id-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3078.125, 0.0], "isController": false}, {"data": ["Import Policy-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get device approve result-0", 4, 0, 0.0, 0.75, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.406421459053038, 16.031223011074985, 0.0], "isController": false}, {"data": ["Create device-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 32477.05078125, 0.0], "isController": false}, {"data": ["Get policy publish result-0", 17, 0, 0.0, 0.7058823529411765, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.10283087345753689, 0.16402847507863538, 0.0], "isController": false}, {"data": ["Get issue schema-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Import Policy", 1, 0, 0.0, 243.0, 243, 243, 243.0, 243.0, 243.0, 243.0, 4.11522633744856, 6.647055041152264, 2.704636059670782], "isController": false}, {"data": ["Get applications", 1, 0, 0.0, 270.0, 270, 270, 270.0, 270.0, 270.0, 270.0, 3.7037037037037037, 152.9007523148148, 2.322048611111111], "isController": false}, {"data": ["Get device issue row", 1, 0, 0.0, 278.0, 278, 278, 278.0, 278.0, 278.0, 278.0, 3.5971223021582737, 164.21706384892084, 2.1884835881294964], "isController": false}, {"data": ["Issue creation", 1, 0, 0.0, 8174.0, 8174, 8174, 8174.0, 8174.0, 8174.0, 8174.0, 0.12233912405187178, 53.95454050189626, 1.2750030584781014], "isController": true}, {"data": ["Token associate", 1, 0, 0.0, 25196.0, 25196, 25196, 25196.0, 25196.0, 25196.0, 25196.0, 0.03968883949833307, 0.920284965867598, 0.15577094330449276], "isController": true}, {"data": ["Get block for waiting device", 1, 0, 0.0, 238.0, 238, 238, 238.0, 238.0, 238.0, 238.0, 4.201680672268908, 14.976693802521009, 2.527573529411765], "isController": false}, {"data": ["Application creation", 1, 0, 0.0, 48231.0, 48231, 48231, 48231.0, 48231.0, 48231.0, 48231.0, 0.02073355310899629, 11.432975225995728, 0.2775744917687794], "isController": true}, {"data": ["Get policy id", 1, 0, 0.0, 236.0, 236, 236, 236.0, 236.0, 236.0, 236.0, 4.237288135593221, 18.314684851694917, 2.5779594809322037], "isController": false}, {"data": ["Get result for issue request approve", 1, 0, 0.0, 3979.0, 3979, 3979, 3979.0, 3979.0, 3979.0, 3979.0, 0.25131942699170645, 0.0, 0.0], "isController": true}, {"data": ["Get result for device approve", 1, 0, 0.0, 13362.0, 13362, 13362, 13362.0, 13362.0, 13362.0, 13362.0, 0.07483909594372101, 0.0, 0.0], "isController": true}, {"data": ["Get block for approve result-0", 2, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.6077180188392586, 26.892115808264965, 0.0], "isController": false}, {"data": ["Approve application", 1, 0, 0.0, 255.0, 255, 255, 255.0, 255.0, 255.0, 255.0, 3.9215686274509802, 174.0310968137255, 18.884037990196077], "isController": false}, {"data": ["Associate token", 1, 0, 0.0, 230.0, 230, 230, 230.0, 230.0, 230.0, 230.0, 4.3478260869565215, 13.879925271739129, 2.6239809782608696], "isController": false}, {"data": ["Get block for waiting device-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3250.9765625, 0.0], "isController": false}, {"data": ["Get issue approve result", 1, 0, 0.0, 729.0, 729, 729, 729.0, 729.0, 729.0, 729.0, 1.371742112482853, 97.98980838477367, 0.861357596021948], "isController": false}, {"data": ["Balance verify-0", 4, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 0.12259033375218363, 7.6602796783536125, 0.0], "isController": false}, {"data": ["Login by user", 9, 0, 0.0, 236.11111111111114, 230, 260, 233.0, 260.0, 260.0, 260.0, 0.0617283950617284, 2.1543718921467763, 0.03995332861796982], "isController": false}, {"data": ["Get application creation status", 13, 0, 0.0, 286.2307692307692, 246, 687, 251.0, 522.5999999999999, 687.0, 687.0, 0.32562683165092804, 11.741107491295743, 0.20447075464018233], "isController": false}, {"data": ["Get tokens", 8, 0, 0.0, 1611.1249999999995, 227, 11253, 235.0, 11253.0, 11253.0, 11253.0, 0.16300582745833164, 0.6081876362626839, 0.09815768394188841], "isController": false}, {"data": ["Choose registrant", 1, 0, 0.0, 4033.0, 4033, 4033, 4033.0, 4033.0, 4033.0, 4033.0, 0.24795437639474338, 0.8998031862137366, 0.16296220245474832], "isController": false}, {"data": ["Get associate result-0", 4, 0, 0.0, 0.75, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.39115978877371405, 1.1556212411989046, 0.0], "isController": false}, {"data": ["Get result for app approve", 1, 0, 0.0, 6787.0, 6787, 6787, 6787.0, 6787.0, 6787.0, 6787.0, 0.14734050390452333, 0.0, 0.0], "isController": true}, {"data": ["Get application creation status-0", 13, 0, 0.0, 1.3076923076923077, 0, 3, 1.0, 3.0, 3.0, 3.0, 0.3276457393452126, 11.73637277263906, 0.0], "isController": false}, {"data": ["Create application-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 35768.5546875, 0.0], "isController": false}, {"data": ["Role approve", 1, 0, 0.0, 7564.0, 7564, 7564, 7564.0, 7564.0, 7564.0, 7564.0, 0.13220518244315177, 34.027470790917505, 1.0669371364357483], "isController": true}, {"data": ["Login by SR-0", 6, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.013898315292547954, 0.4501977397285659, 0.0], "isController": false}, {"data": ["Get issue schema", 1, 0, 0.0, 472.0, 472, 472, 472.0, 472.0, 472.0, 472.0, 2.1186440677966103, 170.3811904131356, 1.3158765889830508], "isController": false}, {"data": ["Issue approve", 1, 0, 0.0, 4733.0, 4733, 4733, 4733.0, 4733.0, 4733.0, 4733.0, 0.21128248468201985, 81.88558063067822, 1.6102036234946124], "isController": true}, {"data": ["Get block for waiting issue request-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3305.6640625, 0.0], "isController": false}, {"data": ["Device approve", 1, 0, 0.0, 14119.0, 14119, 14119, 14119.0, 14119.0, 14119.0, 14119.0, 0.07082654578936186, 27.288831760393798, 0.7084729575394858], "isController": true}, {"data": ["Get tenant", 1, 0, 0.0, 1105.0, 1105, 1105, 1105.0, 1105.0, 1105.0, 1105.0, 0.9049773755656109, 2.341098699095023, 0.7264564479638009], "isController": true}, {"data": ["Approve device", 3, 0, 0.0, 324.0, 246, 476, 250.0, 476.0, 476.0, 476.0, 0.13306129690410717, 8.754367806373637, 0.7862831128581567], "isController": false}, {"data": ["Get Tenant Id-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Login by Admin-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 588.8671875, 0.0], "isController": false}, {"data": ["Publish Policy", 1, 0, 0.0, 262.0, 262, 262, 262.0, 262.0, 262.0, 262.0, 3.8167938931297707, 6.944030295801526, 2.5345896946564883], "isController": false}, {"data": ["Token minting verify", 1, 0, 0.0, 47114.0, 47114, 47114, 47114.0, 47114.0, 47114.0, 47114.0, 0.02122511355435752, 6.817593529789447, 0.06185130746699495], "isController": true}, {"data": ["Create application", 1, 0, 0.0, 533.0, 533, 533, 533.0, 533.0, 533.0, 533.0, 1.876172607879925, 73.32097209193245, 6.141533771106942], "isController": false}, {"data": ["Get policy id-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 1366.2109375, 0.0], "isController": false}, {"data": ["Get issue approve result-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 33007.8125, 0.0], "isController": false}, {"data": ["Get application schema", 1, 0, 0.0, 470.0, 470, 470, 470.0, 470.0, 470.0, 470.0, 2.127659574468085, 76.30277593085107, 1.3069315159574468], "isController": false}, {"data": ["Get block for waiting app approve", 1, 0, 0.0, 234.0, 234, 234, 234.0, 234.0, 234.0, 234.0, 4.273504273504274, 14.973958333333332, 2.5707799145299144], "isController": false}, {"data": ["Get application schema-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Approve application-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 22098.14453125, 0.0], "isController": false}, {"data": ["Device creation", 1, 0, 0.0, 11910.0, 11910, 11910, 11910.0, 11910.0, 11910.0, 11910.0, 0.08396305625524769, 28.321132451721244, 0.8107682619647355], "isController": true}, {"data": ["Get policy import result-0", 11, 0, 0.0, 0.8181818181818181, 0, 2, 1.0, 1.8000000000000007, 2.0, 2.0, 0.10648493238206794, 0.14762683807513963, 0.0], "isController": false}, {"data": ["Get block for approve result", 2, 0, 0.0, 259.0, 249, 269, 259.0, 269.0, 269.0, 269.0, 0.5651313930488839, 25.475615463407742, 0.3548627790336253], "isController": false}, {"data": ["Get device schema", 1, 0, 0.0, 695.0, 695, 695, 695.0, 695.0, 695.0, 695.0, 1.4388489208633093, 123.20846447841727, 0.8838241906474821], "isController": false}, {"data": ["Get block for waiting issue request", 1, 0, 0.0, 238.0, 238, 238, 238.0, 238.0, 238.0, 238.0, 4.201680672268908, 15.206473214285715, 2.5562959558823533], "isController": false}, {"data": ["Grant KYC", 2, 0, 0.0, 12165.5, 232, 24099, 12165.5, 24099.0, 24099.0, 24099.0, 0.08299099547699075, 1.676231703078966, 0.28179657350927423], "isController": true}, {"data": ["Policy import and publish", 1, 0, 0.0, 290705.0, 290705, 290705, 290705.0, 290705.0, 290705.0, 290705.0, 0.0034399133141844824, 0.3761128657057842, 0.06893935647821675], "isController": true}, {"data": ["Get Tenant Id", 1, 0, 0.0, 261.0, 261, 261, 261.0, 261.0, 261.0, 261.0, 3.8314176245210727, 5.773317768199234, 1.6650203544061302], "isController": false}, {"data": ["Create device", 1, 0, 0.0, 4327.0, 4327, 4327, 4327.0, 4327.0, 4327.0, 4327.0, 0.23110700254217703, 15.929907773861798, 1.6423492749017796], "isController": false}, {"data": ["Grant KYC-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Publish", 1, 0, 0.0, 176461.0, 176461, 176461, 176461.0, 176461.0, 176461.0, 176461.0, 0.005666974572285094, 0.37955447662656333, 0.066299175171851], "isController": true}, {"data": ["Get issue creation status", 2, 0, 0.0, 279.5, 277, 282, 279.5, 282.0, 282.0, 282.0, 0.5588153115395362, 51.16025120494551, 0.3508967239452361], "isController": false}, {"data": ["Get hedera id", 1, 0, 0.0, 268.0, 268, 268, 268.0, 268.0, 268.0, 268.0, 3.7313432835820897, 18.75145755597015, 2.120743936567164], "isController": false}, {"data": ["Get block for waiting app creation-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3129.8828125, 0.0], "isController": false}, {"data": ["Get device approve result", 4, 0, 0.0, 266.25, 259, 280, 263.0, 280.0, 280.0, 280.0, 0.3957261574990107, 16.65064181836169, 0.24848820241392955], "isController": false}, {"data": ["Choose registrant-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 3357.421875, 0.0], "isController": false}, {"data": ["Get policy import result", 11, 0, 0.0, 287.3636363636364, 243, 682, 246.0, 597.8000000000003, 682.0, 682.0, 0.10621861722672847, 0.33604462388953266, 0.06462324075415218], "isController": false}, {"data": ["WS open for kyc grant", 1, 0, 0.0, 862.0, 862, 862, 862.0, 862.0, 862.0, 862.0, 1.160092807424594, 3.676270664153132, 0.6774760730858469], "isController": false}, {"data": ["Login by user-0", 9, 0, 0.0, 0.7777777777777778, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06182677511540998, 2.111193844972796, 0.0], "isController": false}, {"data": ["Associate token-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 2791.015625, 0.0], "isController": false}, {"data": ["Get device creation status", 2, 0, 0.0, 263.5, 258, 269, 263.5, 269.0, 269.0, 269.0, 0.5644933672029354, 38.864045300592714, 0.35446214366356193], "isController": false}, {"data": ["Get devices-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 65026.3671875, 0.0], "isController": false}, {"data": ["Balance verify", 4, 0, 0.0, 8693.0, 1167, 11271, 11167.0, 11271.0, 11271.0, 11271.0, 0.0912471200127746, 5.803548514953121, 0.050970070944635806], "isController": false}, {"data": ["Get tokens-0", 8, 0, 0.0, 1.25, 0, 4, 1.0, 4.0, 4.0, 4.0, 0.21148914796309515, 0.6232372462130225, 0.0], "isController": false}, {"data": ["Get block for waiting app creation", 1, 0, 0.0, 236.0, 236, 236, 236.0, 236.0, 236.0, 236.0, 4.237288135593221, 14.590505826271187, 2.5655455508474576], "isController": false}, {"data": ["Approve device-0", 3, 0, 0.0, 2.3333333333333335, 2, 3, 2.0, 3.0, 3.0, 3.0, 0.13451708366962603, 8.678935395368129, 0.0], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 780.0, 780, 780, 780.0, 780.0, 780.0, 780.0, 1.2820512820512822, 1.384715544871795, 0.4720052083333333], "isController": false}, {"data": ["Get associate result", 4, 0, 0.0, 352.25, 230, 715, 232.0, 715.0, 715.0, 715.0, 0.3825188868700392, 1.4002656713206463, 0.22712058907908578], "isController": false}, {"data": ["Get issue creation status-0", 2, 0, 0.0, 3.5, 3, 4, 3.5, 4.0, 4.0, 4.0, 0.6058770069675856, 53.48343778400484, 0.0], "isController": false}, {"data": ["Get devices", 1, 0, 0.0, 267.0, 267, 267, 267.0, 267.0, 267.0, 267.0, 3.745318352059925, 267.7939197097378, 2.362769194756554], "isController": false}, {"data": ["Login by SR", 6, 0, 0.0, 230.66666666666666, 230, 232, 230.5, 232.0, 232.0, 232.0, 0.01389091464727495, 0.460783162532962, 0.008903388978022257], "isController": false}, {"data": ["Get policy publish result", 17, 0, 0.0, 334.52941176470586, 244, 676, 248.0, 673.6, 676.0, 676.0, 0.10241457419634681, 0.379295152401923, 0.06230886691828522], "isController": false}, {"data": ["Get applications-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 35834.9609375, 0.0], "isController": false}, {"data": ["Get device schema-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 44296.875, 0.0], "isController": false}, {"data": ["Get device creation status-0", 2, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.6088280060882801, 39.58214421613394, 0.0], "isController": false}, {"data": ["Publish Policy-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 1417.96875, 0.0], "isController": false}, {"data": ["WS open for kyc grant-0", 1, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 1000.0, 2944.3359375, 0.0], "isController": false}, {"data": ["Get issues-0", 1, 0, 0.0, 2.0, 2, 2, 2.0, 2.0, 2.0, 2.0, 500.0, 44143.06640625, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 220, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
