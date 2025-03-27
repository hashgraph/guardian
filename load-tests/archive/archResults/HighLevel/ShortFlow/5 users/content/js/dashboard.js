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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.889763779527559, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Get issues"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve-0"], "isController": false}, {"data": [0.0, 500, 1500, "Import"], "isController": true}, {"data": [1.0, 500, 1500, "Get device issue row-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create device-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy publish result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications"], "isController": false}, {"data": [1.0, 500, 1500, "Get device issue row"], "isController": false}, {"data": [0.0, 500, 1500, "Issue creation"], "isController": true}, {"data": [0.0, 500, 1500, "Token associate"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting device"], "isController": false}, {"data": [0.0, 500, 1500, "Application creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for issue request approve"], "isController": true}, {"data": [0.0, 500, 1500, "Get result for device approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for approve result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting device-0"], "isController": false}, {"data": [0.9, 500, 1500, "Get issue approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Balance verify-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user"], "isController": false}, {"data": [0.9765625, 500, 1500, "Get application creation status"], "isController": false}, {"data": [0.8225806451612904, 500, 1500, "Get tokens"], "isController": false}, {"data": [0.0, 500, 1500, "Choose registrant"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get result for app approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get application creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Role approve"], "isController": true}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [0.9, 500, 1500, "Get issue schema"], "isController": false}, {"data": [0.0, 500, 1500, "Issue approve"], "isController": true}, {"data": [1.0, 500, 1500, "Get block for waiting issue request-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device approve"], "isController": true}, {"data": [0.5, 500, 1500, "Get tenant"], "isController": true}, {"data": [1.0, 500, 1500, "Approve device"], "isController": false}, {"data": [1.0, 500, 1500, "Get Tenant Id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy"], "isController": false}, {"data": [0.0, 500, 1500, "Token minting verify"], "isController": true}, {"data": [0.5, 500, 1500, "Create application"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue approve result-0"], "isController": false}, {"data": [0.9, 500, 1500, "Get application schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app approve"], "isController": false}, {"data": [1.0, 500, 1500, "Get application schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Approve application-0"], "isController": false}, {"data": [0.0, 500, 1500, "Device creation"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [0.9666666666666667, 500, 1500, "Get block for approve result"], "isController": false}, {"data": [0.5, 500, 1500, "Get device schema"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting issue request"], "isController": false}, {"data": [0.5, 500, 1500, "Grant KYC"], "isController": true}, {"data": [0.0, 500, 1500, "Policy import and publish"], "isController": true}, {"data": [1.0, 500, 1500, "Get Tenant Id"], "isController": false}, {"data": [0.0, 500, 1500, "Create device"], "isController": false}, {"data": [1.0, 500, 1500, "Grant KYC-0"], "isController": false}, {"data": [0.0, 500, 1500, "Publish"], "isController": true}, {"data": [1.0, 500, 1500, "Get issue creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get hedera id"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device approve result"], "isController": false}, {"data": [1.0, 500, 1500, "Choose registrant-0"], "isController": false}, {"data": [0.9278350515463918, 500, 1500, "Get policy import result"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for kyc grant"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Associate token-0"], "isController": false}, {"data": [0.9411764705882353, 500, 1500, "Get device creation status"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices-0"], "isController": false}, {"data": [0.1956521739130435, 500, 1500, "Balance verify"], "isController": false}, {"data": [1.0, 500, 1500, "Get tokens-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get block for waiting app creation"], "isController": false}, {"data": [1.0, 500, 1500, "Approve device-0"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get associate result"], "isController": false}, {"data": [1.0, 500, 1500, "Get issue creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get devices"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR"], "isController": false}, {"data": [0.9166666666666666, 500, 1500, "Get policy publish result"], "isController": false}, {"data": [1.0, 500, 1500, "Get applications-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device schema-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get device creation status-0"], "isController": false}, {"data": [1.0, 500, 1500, "Publish Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for kyc grant-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get issues-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1190, 0, 0.0, 402.8504201680673, 0, 15084, 192.5, 294.9000000000001, 684.2500000000002, 11568.979999999998, 1.8971490154753157, 48.616976561740245, 0.814793555014133], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Get issues", 5, 0, 0.0, 276.2, 259, 291, 280.0, 291.0, 291.0, 291.0, 0.07084962874794536, 6.672346814246443, 0.045249665235504166], "isController": false}, {"data": ["Get block for waiting app approve-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06978269668253059, 0.22942424477676515, 0.0], "isController": false}, {"data": ["Import", 5, 0, 0.0, 200983.0, 165686, 227719, 207163.0, 227719.0, 227719.0, 227719.0, 0.018690540717342954, 1.2922172588452985, 0.251431578603069], "isController": true}, {"data": ["Get device issue row-0", 5, 0, 0.0, 1.8, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.07040270346381301, 2.7760390999014364, 0.0], "isController": false}, {"data": ["Get hedera id-0", 5, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06978951482329294, 0.22160897109318295, 0.0], "isController": false}, {"data": ["Import Policy-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12564708247474493, 0.15161087412675278, 0.0], "isController": false}, {"data": ["Get device approve result-0", 21, 0, 0.0, 2.8095238095238098, 0, 21, 2.0, 5.400000000000002, 19.49999999999998, 21.0, 0.28247827607543513, 11.142273105209707, 0.0], "isController": false}, {"data": ["Create device-0", 5, 0, 0.0, 1.4, 0, 2, 2.0, 2.0, 2.0, 2.0, 0.07067837100490508, 4.59085008852466, 0.0], "isController": false}, {"data": ["Get policy publish result-0", 84, 0, 0.0, 0.5357142857142856, 0, 2, 1.0, 1.0, 1.0, 2.0, 0.3532157349200008, 0.5632784083741564, 0.0], "isController": false}, {"data": ["Get issue schema-0", 5, 0, 0.0, 1.6, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.07104492881298133, 3.1246725272812528, 0.0], "isController": false}, {"data": ["Import Policy", 5, 0, 0.0, 245.6, 243, 250, 244.0, 250.0, 250.0, 250.0, 0.12486265108380783, 0.2016336717111178, 0.08206305095644792], "isController": false}, {"data": ["Get applications", 5, 0, 0.0, 275.2, 263, 312, 266.0, 312.0, 312.0, 312.0, 0.07180812868016659, 2.9645116374048546, 0.045020330676432574], "isController": false}, {"data": ["Get device issue row", 5, 0, 0.0, 272.0, 264, 282, 273.0, 282.0, 282.0, 282.0, 0.0701419673419, 3.2021452043936924, 0.04267426333398799], "isController": false}, {"data": ["Issue creation", 5, 0, 0.0, 12889.2, 8085, 18158, 14671.0, 18158.0, 18158.0, 18158.0, 0.05834101490029521, 33.03423231975543, 0.6592990472912267], "isController": true}, {"data": ["Token associate", 5, 0, 0.0, 14935.0, 4937, 24782, 15306.0, 24782.0, 24782.0, 24782.0, 0.05164328947096614, 0.8861665702658597, 0.14749605897147225], "isController": true}, {"data": ["Get block for waiting device", 5, 0, 0.0, 241.4, 235, 256, 238.0, 256.0, 256.0, 256.0, 0.06953329254046837, 0.2546113610446682, 0.041828621293875504], "isController": false}, {"data": ["Application creation", 5, 0, 0.0, 53655.8, 44688, 66960, 46156.0, 66960.0, 66960.0, 66960.0, 0.03667409928412158, 19.969090037664298, 0.48637591593562957], "isController": true}, {"data": ["Get policy id", 5, 0, 0.0, 230.8, 229, 232, 231.0, 232.0, 232.0, 232.0, 0.06074669841694104, 0.2626108247579244, 0.036958196400150654], "isController": false}, {"data": ["Get result for issue request approve", 5, 0, 0.0, 3617.2, 3522, 3967, 3535.0, 3967.0, 3967.0, 3967.0, 0.06772314777190844, 0.0, 0.0], "isController": true}, {"data": ["Get result for device approve", 5, 0, 0.0, 14037.4, 6816, 16685, 16658.0, 16685.0, 16685.0, 16685.0, 0.06422937594738329, 0.0, 0.0], "isController": true}, {"data": ["Get block for approve result-0", 15, 0, 0.0, 2.466666666666667, 0, 18, 2.0, 8.400000000000006, 18.0, 18.0, 0.20652622883106156, 9.140654580579652, 0.0], "isController": false}, {"data": ["Approve application", 5, 0, 0.0, 254.8, 248, 264, 253.0, 264.0, 264.0, 264.0, 0.07184011264529663, 3.188031280083047, 0.3459410111855055], "isController": false}, {"data": ["Associate token", 5, 0, 0.0, 228.6, 227, 231, 228.0, 231.0, 231.0, 231.0, 0.060882800608828, 0.20024733637747336, 0.03674372146118721], "isController": false}, {"data": ["Get block for waiting device-0", 5, 0, 0.0, 3.0, 0, 12, 1.0, 12.0, 12.0, 12.0, 0.06976127691041256, 0.233577650405313, 0.0], "isController": false}, {"data": ["Get issue approve result", 5, 0, 0.0, 364.8, 270, 721, 279.0, 721.0, 721.0, 721.0, 0.07084862482819208, 5.060930370857127, 0.044487954848171404], "isController": false}, {"data": ["Balance verify-0", 23, 0, 0.0, 3.0869565217391304, 1, 21, 2.0, 5.200000000000003, 17.999999999999957, 21.0, 0.2097219815991757, 13.089378251260612, 0.0], "isController": false}, {"data": ["Login by user", 45, 0, 0.0, 234.31111111111107, 228, 275, 232.0, 240.8, 249.79999999999998, 275.0, 0.1868995850829211, 6.5269569554680595, 0.12096962077035857], "isController": false}, {"data": ["Get application creation status", 64, 0, 0.0, 270.65624999999994, 240, 711, 247.0, 276.0, 585.0, 711.0, 0.5374944360927514, 19.380391347389374, 0.3375087132887101], "isController": false}, {"data": ["Get tokens", 31, 0, 0.0, 1414.096774193548, 227, 11567, 231.0, 9208.800000000007, 11409.199999999999, 11567.0, 0.27947566758623177, 1.0608084256279187, 0.16778752749679957], "isController": false}, {"data": ["Choose registrant", 5, 0, 0.0, 10203.8, 4184, 15084, 12994.0, 15084.0, 15084.0, 15084.0, 0.05764153879851976, 0.21478228070276564, 0.03788355040176153], "isController": false}, {"data": ["Get associate result-0", 11, 0, 0.0, 0.8181818181818181, 0, 2, 1.0, 1.8000000000000007, 2.0, 2.0, 0.13432489528763844, 0.4177737976395452, 0.0], "isController": false}, {"data": ["Get result for app approve", 5, 0, 0.0, 10156.8, 6792, 17055, 6821.0, 17055.0, 17055.0, 17055.0, 0.06567368061575643, 0.0, 0.0], "isController": true}, {"data": ["Get application creation status-0", 64, 0, 0.0, 1.359375, 0, 15, 1.0, 2.0, 2.0, 15.0, 0.53859359746861, 19.292451260961222, 0.0], "isController": false}, {"data": ["Create application-0", 5, 0, 0.0, 1.2, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.06780120686148214, 2.4250982058105635, 0.0], "isController": false}, {"data": ["Role approve", 5, 0, 0.0, 10921.2, 7538, 17803, 7590.0, 17803.0, 17803.0, 17803.0, 0.06500936134803412, 19.62503108260089, 0.5654671694599022], "isController": true}, {"data": ["Login by SR-0", 30, 0, 0.0, 1.0666666666666669, 0, 4, 1.0, 2.0, 2.8999999999999986, 4.0, 0.05186784763992649, 1.68095556081678, 0.0], "isController": false}, {"data": ["Get issue schema", 5, 0, 0.0, 606.4, 473, 1121, 479.0, 1121.0, 1121.0, 1121.0, 0.06993300418199365, 5.624020391589857, 0.04343495181616012], "isController": false}, {"data": ["Issue approve", 5, 0, 0.0, 4398.0, 4280, 4745, 4312.0, 4745.0, 4745.0, 4745.0, 0.06703131703131703, 25.97869388640873, 0.5108519512816387], "isController": true}, {"data": ["Get block for waiting issue request-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06976225025114409, 0.23732790524891173, 0.0], "isController": false}, {"data": ["Device approve", 5, 0, 0.0, 14808.0, 7586, 17468, 17430.0, 17468.0, 17468.0, 17468.0, 0.06359947594031826, 25.024244815847716, 0.644168285803325], "isController": true}, {"data": ["Get tenant", 5, 0, 0.0, 991.4, 937, 1166, 945.0, 1166.0, 1166.0, 1166.0, 0.12205243372552849, 0.3155484502392228, 0.09797568410389103], "isController": true}, {"data": ["Approve device", 15, 0, 0.0, 332.6, 247, 499, 261.0, 495.4, 499.0, 499.0, 0.16036777676805475, 10.550790228925, 0.9476315683968568], "isController": false}, {"data": ["Get Tenant Id-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1256281407035176, 0.0994965059673367, 0.0], "isController": false}, {"data": ["Login by Admin-0", 5, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.12565971349585323, 0.07392325332998241, 0.0], "isController": false}, {"data": ["Publish Policy", 5, 0, 0.0, 253.2, 250, 261, 251.0, 261.0, 261.0, 261.0, 0.06073415445910162, 0.11050769198066225, 0.040331274445497174], "isController": false}, {"data": ["Token minting verify", 5, 0, 0.0, 48235.0, 42043, 60158, 43559.0, 60158.0, 60158.0, 60158.0, 0.04396841309203468, 15.806670269328514, 0.14286299222638457], "isController": true}, {"data": ["Create application", 5, 0, 0.0, 531.4, 519, 547, 533.0, 547.0, 547.0, 547.0, 0.06731468267858585, 2.6306104684428764, 0.22035040658068336], "isController": false}, {"data": ["Get policy id-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.060917663685762326, 0.08327397033918955, 0.0], "isController": false}, {"data": ["Get issue approve result-0", 5, 0, 0.0, 2.2, 2, 3, 2.0, 3.0, 3.0, 3.0, 0.07112780243541596, 4.695435195459201, 0.0], "isController": false}, {"data": ["Get application schema", 5, 0, 0.0, 561.2, 465, 918, 477.0, 918.0, 918.0, 918.0, 0.06737364073679813, 2.422635058884562, 0.04138478517914652], "isController": false}, {"data": ["Get block for waiting app approve", 5, 0, 0.0, 238.2, 233, 244, 239.0, 244.0, 244.0, 244.0, 0.06955166993559515, 0.25046751763134834, 0.04183967644563146], "isController": false}, {"data": ["Get application schema-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0678002874732189, 0.23420232114284167, 0.0], "isController": false}, {"data": ["Approve application-0", 5, 0, 0.0, 1.4, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.07210429164743885, 3.186657619080238, 0.0], "isController": false}, {"data": ["Device creation", 5, 0, 0.0, 22584.4, 18639, 27385, 22372.0, 27385.0, 27385.0, 27385.0, 0.05441939942750792, 23.420536452834707, 0.5733275047889071], "isController": true}, {"data": ["Get policy import result-0", 97, 0, 0.0, 0.5876288659793812, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.37823694790078494, 0.5248395600265936, 0.0], "isController": false}, {"data": ["Get block for approve result", 15, 0, 0.0, 282.4666666666666, 238, 705, 250.0, 453.0000000000001, 705.0, 705.0, 0.2058149586311933, 9.23800977792566, 0.12923732265611065], "isController": false}, {"data": ["Get device schema", 5, 0, 0.0, 699.4, 687, 731, 690.0, 731.0, 731.0, 731.0, 0.0713918556171112, 6.113276230260152, 0.04385300506168256], "isController": false}, {"data": ["Get block for waiting issue request", 5, 0, 0.0, 235.2, 233, 242, 234.0, 242.0, 242.0, 242.0, 0.06953619358876295, 0.258356838015437, 0.0423057115291009], "isController": false}, {"data": ["Grant KYC", 10, 0, 0.0, 9370.000000000002, 225, 24585, 7276.5, 24535.8, 24585.0, 24585.0, 0.11571127722107796, 1.9884033796371294, 0.3295398415623337], "isController": true}, {"data": ["Policy import and publish", 5, 0, 0.0, 375362.2, 342156, 394233, 393907.0, 394233.0, 394233.0, 394233.0, 0.011519967559771352, 1.567500835917646, 0.28834343802487855], "isController": true}, {"data": ["Get Tenant Id", 5, 0, 0.0, 270.2, 258, 287, 269.0, 287.0, 287.0, 287.0, 0.12481901243197363, 0.18795988004892905, 0.05424263723850417], "isController": false}, {"data": ["Create device", 5, 0, 0.0, 10239.6, 4523, 14590, 13079.0, 14590.0, 14590.0, 14590.0, 0.059649499540698855, 4.111563111407371, 0.4238959064039703], "isController": false}, {"data": ["Grant KYC-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.0693702568086907, 0.21091538823064224, 0.0], "isController": false}, {"data": ["Publish", 5, 0, 0.0, 174361.8, 145080, 186871, 186598.0, 186871.0, 186871.0, 186871.0, 0.02011465352509303, 1.3462871178215832, 0.2328781869154179], "isController": true}, {"data": ["Get issue creation status", 17, 0, 0.0, 286.05882352941177, 264, 429, 280.0, 321.7999999999999, 429.0, 429.0, 0.21119848930962942, 19.15110970441529, 0.13261780139266768], "isController": false}, {"data": ["Get hedera id", 5, 0, 0.0, 271.2, 268, 280, 270.0, 280.0, 280.0, 280.0, 0.06953039173422702, 0.35619387593692203, 0.03951824998957044], "isController": false}, {"data": ["Get block for waiting app creation-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06978464458680513, 0.2251236278594258, 0.0], "isController": false}, {"data": ["Get device approve result", 21, 0, 0.0, 266.04761904761904, 253, 296, 263.0, 283.0, 294.7, 296.0, 0.28152398316218463, 11.829361799373945, 0.17677726677078587], "isController": false}, {"data": ["Choose registrant-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.06779752945802656, 0.23421927754952612, 0.0], "isController": false}, {"data": ["Get policy import result", 97, 0, 0.0, 309.680412371134, 240, 678, 249.0, 667.0, 669.1, 678.0, 0.37787594761159027, 1.199389396781432, 0.2298991360957234], "isController": false}, {"data": ["WS open for kyc grant", 5, 0, 0.0, 863.0, 856, 876, 858.0, 876.0, 876.0, 876.0, 0.06853164105867679, 0.2237852552460971, 0.040021407571375706], "isController": false}, {"data": ["Login by user-0", 45, 0, 0.0, 1.5999999999999999, 0, 14, 1.0, 2.3999999999999986, 3.6999999999999957, 14.0, 0.187081405355517, 6.392264690567355, 0.0], "isController": false}, {"data": ["Associate token-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06105155193045007, 0.176298280330411, 0.0], "isController": false}, {"data": ["Get device creation status", 17, 0, 0.0, 322.05882352941177, 256, 718, 262.0, 703.6, 718.0, 718.0, 0.22753128555176336, 15.442784142240514, 0.14287364903299202], "isController": false}, {"data": ["Get devices-0", 5, 0, 0.0, 1.6, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.07751337105650724, 5.040367510270522, 0.0], "isController": false}, {"data": ["Balance verify", 23, 0, 0.0, 7411.391304347825, 798, 11905, 11239.0, 11723.6, 11875.6, 11905.0, 0.20821074548499524, 13.248858518535283, 0.11630522111075906], "isController": false}, {"data": ["Get tokens-0", 31, 0, 0.0, 0.5161290322580645, 0, 2, 0.0, 1.0, 1.3999999999999986, 2.0, 0.3108673198223042, 0.9225054307768674, 0.0], "isController": false}, {"data": ["Get block for waiting app creation", 5, 0, 0.0, 240.6, 234, 253, 239.0, 253.0, 253.0, 253.0, 0.06955554009876887, 0.24618857376365025, 0.04211370591917646], "isController": false}, {"data": ["Approve device-0", 15, 0, 0.0, 1.7333333333333332, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.1607941085038644, 10.374182546201506, 0.0], "isController": false}, {"data": ["Login by Admin", 5, 0, 0.0, 711.6, 670, 869, 671.0, 869.0, 869.0, 869.0, 0.12297702789118993, 0.13275274085050912, 0.04527572218259629], "isController": false}, {"data": ["Get associate result", 11, 0, 0.0, 228.36363636363635, 226, 234, 227.0, 233.4, 234.0, 234.0, 0.13395521024879137, 0.5127616122422884, 0.07953590608521986], "isController": false}, {"data": ["Get issue creation status-0", 17, 0, 0.0, 11.647058823529411, 1, 160, 2.0, 34.39999999999989, 160.0, 160.0, 0.2119357211424582, 18.710839129100023, 0.0], "isController": false}, {"data": ["Get devices", 5, 0, 0.0, 269.0, 265, 271, 270.0, 271.0, 271.0, 271.0, 0.07719504099056677, 5.5194755851384105, 0.04869921531240833], "isController": false}, {"data": ["Login by SR", 30, 0, 0.0, 232.26666666666665, 227, 241, 231.5, 238.0, 239.35, 241.0, 0.05184696159522731, 1.7206828520279076, 0.033231337038086776], "isController": false}, {"data": ["Get policy publish result", 84, 0, 0.0, 327.21428571428555, 236, 719, 249.0, 669.5, 676.5, 719.0, 0.35284777558881475, 1.3213619202164975, 0.21467203534358553], "isController": false}, {"data": ["Get applications-0", 5, 0, 0.0, 4.2, 1, 17, 1.0, 17.0, 17.0, 17.0, 0.07208661928172892, 2.5832634243306756, 0.0], "isController": false}, {"data": ["Get device schema-0", 5, 0, 0.0, 1.8, 1, 2, 2.0, 2.0, 2.0, 2.0, 0.07214278500007215, 3.1956999293000705, 0.0], "isController": false}, {"data": ["Get device creation status-0", 17, 0, 0.0, 8.647058823529413, 1, 120, 2.0, 25.599999999999916, 120.0, 120.0, 0.22831663488140966, 14.846299675656075, 0.0], "isController": false}, {"data": ["Publish Policy-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06092657129627373, 0.08640387386371945, 0.0], "isController": false}, {"data": ["WS open for kyc grant-0", 5, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.06935774726036899, 0.21090444669857122, 0.0], "isController": false}, {"data": ["Get issues-0", 5, 0, 0.0, 2.4, 2, 3, 2.0, 3.0, 3.0, 3.0, 0.07111363959607453, 6.278306562011093, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1190, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
