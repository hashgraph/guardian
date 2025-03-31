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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.7778793418647166, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for sr link"], "isController": false}, {"data": [0.95, 500, 1500, "Agree terms"], "isController": false}, {"data": [0.4, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id"], "isController": false}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [1.0, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.975, 500, 1500, "Get SR link result"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.5, 500, 1500, "Accept user"], "isController": false}, {"data": [0.5, 500, 1500, "Login by user"], "isController": false}, {"data": [0.5, 500, 1500, "Get SR DID"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [0.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [1.0, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [1.0, 500, 1500, "Link SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.5, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.5, 500, 1500, "WS open for user link"], "isController": false}, {"data": [0.875, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user link-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [0.75, 500, 1500, "Verify link"], "isController": false}, {"data": [0.75, 500, 1500, "Login by Admin"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.5, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 482, 0, 0.0, 512.3174273858918, 0, 23913, 3.0, 2058.0, 2070.85, 8247.630000000008, 1.4120362910904025, 20.266080016427374, 0.5149717821611772], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 5, 0, 0.0, 0.8, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.12531328320802004, 1.1138197055137844, 0.0], "isController": false}, {"data": ["WS open for sr link", 5, 0, 0.0, 1011.2, 917, 1091, 1032.0, 1091.0, 1091.0, 1091.0, 0.12229423994129877, 1.4286451326892504, 0.07523962027638499], "isController": false}, {"data": ["Agree terms", 10, 0, 0.0, 350.1, 262, 528, 297.0, 524.2, 528.0, 528.0, 0.05831583858175881, 0.8570378105318405, 0.03824129453872172], "isController": false}, {"data": ["Link SR profile", 5, 0, 0.0, 891.8, 705, 1565, 729.0, 1565.0, 1565.0, 1565.0, 0.12052549114137641, 1.4212827302036881, 0.15512948957454503], "isController": false}, {"data": ["Invite sr-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12511573205214824, 1.105099365350449, 0.0], "isController": false}, {"data": ["Link user profile-0", 5, 0, 0.0, 1.2, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12507504502701622, 2.293588066902642, 0.0], "isController": false}, {"data": ["Import Policy-0", 5, 0, 0.0, 1.4, 0, 2, 2.0, 2.0, 2.0, 2.0, 0.09380159087498124, 1.7430973754314874, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 10, 0, 0.0, 246.0, 232, 264, 242.0, 263.8, 264.0, 264.0, 0.2395898222243519, 2.216439830011021, 0.19911224483683934], "isController": false}, {"data": ["Agree terms-0", 10, 0, 0.0, 1.3, 0, 3, 1.0, 2.9000000000000004, 3.0, 3.0, 0.058405074232849345, 0.8454020422794333, 0.0], "isController": false}, {"data": ["Import Policy", 5, 0, 0.0, 270.6, 246, 298, 271.0, 298.0, 298.0, 298.0, 0.09337242525537358, 1.767310226381445, 0.07449733538441428], "isController": false}, {"data": ["Invite sr", 5, 0, 0.0, 341.0, 286, 418, 341.0, 418.0, 418.0, 418.0, 0.12382367508667656, 1.1305681958890539, 0.09734185394997523], "isController": false}, {"data": ["Generate user keys", 5, 0, 0.0, 2058.6, 2047, 2070, 2061.0, 2070.0, 2070.0, 2070.0, 0.11759448717044145, 1.7031218763964346, 0.08406168418824526], "isController": false}, {"data": ["Generate sr keys", 5, 0, 0.0, 2071.2, 2069, 2074, 2071.0, 2074.0, 2074.0, 2074.0, 0.11918382913806254, 1.2554340377097637, 0.08694367223255149], "isController": false}, {"data": ["Get policy id", 5, 0, 0.0, 350.2, 260, 437, 355.0, 437.0, 437.0, 437.0, 0.09271621421154132, 2.194440677848242, 0.06944661748071503], "isController": false}, {"data": ["Get Access Token-0", 10, 0, 0.0, 0.7, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.058393478616308135, 0.6941182621224862, 0.0], "isController": false}, {"data": ["WS open for policy import", 5, 0, 0.0, 1020.2, 918, 1152, 1013.0, 1152.0, 1152.0, 1152.0, 0.0919083857211132, 1.7285418332506157, 0.06659767793463475], "isController": false}, {"data": ["Generate sr keys-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12537298462927207, 1.2797349458388707, 0.0], "isController": false}, {"data": ["Dry Run Policy", 5, 0, 0.0, 11810.4, 8156, 23913, 8799.0, 23913.0, 23913.0, 23913.0, 0.08015646542050081, 2.573147784475296, 0.06317018319760172], "isController": false}, {"data": ["Invite and accept user", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.125012501250125, 0.0, 0.0], "isController": true}, {"data": ["Get SR link result", 20, 0, 0.0, 280.2, 250, 520, 265.0, 321.70000000000005, 510.1999999999999, 520.0, 0.2472952086553323, 3.3251787094281298, 0.15818199381761977], "isController": false}, {"data": ["Get User Access Token", 5, 0, 0.0, 269.4, 257, 300, 261.0, 300.0, 300.0, 300.0, 0.1231405772830263, 2.1193647793320856, 0.08081100384198601], "isController": false}, {"data": ["Accept user", 5, 0, 0.0, 561.0, 536, 592, 561.0, 592.0, 592.0, 592.0, 0.12357578903141297, 1.20710858141173, 0.10571522577296656], "isController": false}, {"data": ["Login by user", 5, 0, 0.0, 593.6, 567, 622, 580.0, 622.0, 622.0, 622.0, 0.12205541315757354, 1.9707658214329304, 0.045532390455266684], "isController": false}, {"data": ["Get SR DID", 5, 0, 0.0, 743.0, 724, 760, 746.0, 760.0, 760.0, 760.0, 0.12285012285012285, 2.2680963989557736, 0.07510173525798525], "isController": false}, {"data": ["Link user profile", 5, 0, 0.0, 272.8, 265, 285, 273.0, 285.0, 285.0, 285.0, 0.12424829779832017, 2.3200457544356645, 0.11090131268326625], "isController": false}, {"data": ["Get key gen result", 5, 0, 0.0, 2060.4, 2052, 2067, 2061.0, 2067.0, 2067.0, 2067.0, 0.11927765452420144, 1.316853261647463, 0.08957472297764738], "isController": false}, {"data": ["Invite user", 5, 0, 0.0, 279.8, 247, 357, 260.0, 357.0, 357.0, 357.0, 0.12420508744038154, 1.1409644292155208, 0.09388157976450716], "isController": false}, {"data": ["Login by SR-0", 5, 0, 0.0, 1.2, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12542644992976118, 1.3292998930739515, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 5, 0, 0.0, 1.4, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.09389318711034327, 1.7447811525858183, 0.0], "isController": false}, {"data": ["User creation flow", 5, 0, 0.0, 33598.6, 33179, 34186, 33429.0, 34186.0, 34186.0, 34186.0, 0.0673927108043994, 33.92682004545639, 1.8182869278358855], "isController": true}, {"data": ["WS open for sr key gen-0", 5, 0, 0.0, 0.2, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12537927229870358, 1.279725662316006, 0.0], "isController": false}, {"data": ["Requests for DryRun", 5, 0, 0.0, 12071.4, 8414, 24167, 9049.0, 24167.0, 24167.0, 24167.0, 0.07976771640981462, 4.11584279079321, 0.15182351492453974], "isController": true}, {"data": ["WS open for sr key gen", 5, 0, 0.0, 1.4, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12537612838515547, 1.295488026579739, 0.090603842778335], "isController": false}, {"data": ["Get user link result", 6, 0, 0.0, 283.66666666666663, 265, 358, 270.5, 358.0, 358.0, 358.0, 0.11210133961100835, 2.2151691796050295, 0.07006333725688021], "isController": false}, {"data": ["Generate user keys-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.12361245024598878, 1.7499611779648447, 0.0], "isController": false}, {"data": ["Link user", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12378995320739769, 0.0, 0.0], "isController": true}, {"data": ["Login by Admin-0", 10, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.24105098228275282, 2.0317490508617575, 0.0], "isController": false}, {"data": ["User creation(SR side)", 5, 0, 0.0, 15792.4, 15599, 16234, 15647.0, 16234.0, 16234.0, 16234.0, 0.08906305664410402, 16.914848759796936, 0.9682998140808693], "isController": true}, {"data": ["Get Access Token", 10, 0, 0.0, 2064.0, 2057, 2072, 2063.5, 2072.0, 2072.0, 2072.0, 0.05769940915805022, 0.7261842533263709, 0.06054493666047359], "isController": false}, {"data": ["Get user keys", 5, 0, 0.0, 2072.2, 2061, 2082, 2071.0, 2082.0, 2082.0, 2082.0, 0.11777453243510623, 1.8183283671738824, 0.08672070064069345], "isController": false}, {"data": ["Get policy id-0", 5, 0, 0.0, 17.0, 1, 79, 2.0, 79.0, 79.0, 79.0, 0.09322444717902822, 1.7466292079184846, 0.0], "isController": false}, {"data": ["WS open for user key gen-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12355746657770529, 1.740205561012677, 0.0], "isController": false}, {"data": ["Requests for Import", 5, 0, 0.0, 3650.8, 3435, 4145, 3461.0, 4145.0, 4145.0, 4145.0, 0.08761631065239106, 14.687111887123907, 0.5496554488583595], "isController": true}, {"data": ["User creation(user side)", 5, 0, 0.0, 14556.4, 14333, 14795, 14525.0, 14795.0, 14795.0, 14795.0, 0.09070130247070349, 21.507812074837645, 0.9194135934042014], "isController": true}, {"data": ["Get policy import result-0", 20, 0, 0.0, 1.75, 0, 12, 1.0, 2.0, 11.499999999999993, 12.0, 0.23596035865974518, 4.423599999262624, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 10, 0, 0.0, 0.5000000000000001, 0, 2, 0.0, 1.9000000000000004, 2.0, 2.0, 0.24110328864885716, 2.0868148899363486, 0.0], "isController": false}, {"data": ["Accept sr-0", 5, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.12500937570317774, 1.1111673219241442, 0.0], "isController": false}, {"data": ["Get user link result-0", 6, 0, 0.0, 3.3333333333333335, 1, 11, 2.0, 11.0, 11.0, 11.0, 0.11267394039548553, 2.0798281663724625, 0.0], "isController": false}, {"data": ["Login by SR OS", 5, 0, 0.0, 2511.8, 2503, 2524, 2512.0, 2524.0, 2524.0, 2524.0, 0.11790228258819091, 1.1451950030065081, 0.03799585278720996], "isController": false}, {"data": ["Get sr keys", 5, 0, 0.0, 2061.6, 2058, 2067, 2060.0, 2067.0, 2067.0, 2067.0, 0.11931465661241827, 1.3200349069942252, 0.08960251067866178], "isController": false}, {"data": ["WS open for user key gen", 5, 0, 0.0, 1.8, 1, 3, 2.0, 3.0, 3.0, 3.0, 0.12355441336364535, 1.7557275192744883, 0.0874774899303153], "isController": false}, {"data": ["Get SR Access Token-0", 15, 0, 0.0, 1.2666666666666668, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.05094035902765043, 0.8203089182560059, 0.0], "isController": false}, {"data": ["Verify link-0", 10, 0, 0.0, 0.7999999999999999, 0, 2, 1.0, 1.9000000000000004, 2.0, 2.0, 0.06483108261424858, 1.0158410191932419, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 5, 0, 0.0, 1.6, 0, 3, 2.0, 3.0, 3.0, 3.0, 0.09314109012331881, 1.749833655834358, 0.0], "isController": false}, {"data": ["Policy import and dry run", 5, 0, 0.0, 15722.2, 11874, 27628, 12802.0, 27628.0, 27628.0, 27628.0, 0.07561665381183552, 16.577267696187405, 0.6182990648110339], "isController": true}, {"data": ["Invite and accept SR", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12498125281207818, 0.0, 0.0], "isController": true}, {"data": ["Link SR", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12547681188516363, 0.0, 0.0], "isController": true}, {"data": ["Get key gen result-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1254610694301558, 1.295434550096605, 0.0], "isController": false}, {"data": ["Accept sr", 5, 0, 0.0, 582.0, 555, 592, 589.0, 592.0, 592.0, 592.0, 0.12330152154077582, 1.4374741837439273, 0.10548059850558555], "isController": false}, {"data": ["User creation(admin side)", 5, 0, 0.0, 3249.8, 3103, 3396, 3231.0, 3396.0, 3396.0, 3396.0, 0.11545744238673626, 8.817701357779523, 0.6894748634715744], "isController": true}, {"data": ["Login by user OS-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1235635734585444, 1.5897225997775855, 0.0], "isController": false}, {"data": ["WS open for user link", 5, 0, 0.0, 940.4, 905, 1009, 928.0, 1009.0, 1009.0, 1009.0, 0.12202860350466149, 2.179616761543906, 0.07328866323766292], "isController": false}, {"data": ["Get policy import result", 20, 0, 0.0, 434.75, 249, 1264, 274.0, 848.7, 1243.3499999999997, 1264.0, 0.2352692067898693, 5.11973594340011, 0.17622215000764624], "isController": false}, {"data": ["WS open for sr link-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1252379521090071, 1.4349040520739405, 0.0], "isController": false}, {"data": ["WS open for user link-0", 5, 0, 0.0, 2.2, 2, 3, 2.0, 3.0, 3.0, 3.0, 0.12510321014837242, 2.206434566329722, 0.0], "isController": false}, {"data": ["Get user key gen result", 5, 0, 0.0, 2075.0, 2060, 2120, 2063.0, 2120.0, 2120.0, 2120.0, 0.11763321962122103, 1.7632116809787082, 0.08661664804140688], "isController": false}, {"data": ["Login by user-0", 5, 0, 0.0, 1.2, 0, 3, 1.0, 3.0, 3.0, 3.0, 0.12393416617093002, 1.923400164832441, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 5, 0, 0.0, 1.2, 1, 2, 1.0, 2.0, 2.0, 2.0, 0.12405100977521959, 2.062469181077259, 0.0], "isController": false}, {"data": ["Link SR profile-0", 5, 0, 0.0, 0.8, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12267229323584974, 1.4055082159768395, 0.0], "isController": false}, {"data": ["Accept user-0", 5, 0, 0.0, 1.0, 1, 1, 1.0, 1.0, 1.0, 1.0, 0.1252850234282994, 1.1210317926407578, 0.0], "isController": false}, {"data": ["Get sr keys-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.1254736630781199, 1.2984808668348016, 0.0], "isController": false}, {"data": ["Login by user OS", 5, 0, 0.0, 2509.4, 2492, 2522, 2513.0, 2522.0, 2522.0, 2522.0, 0.1163710841130196, 1.5853741912209653, 0.09273320765256249], "isController": false}, {"data": ["Get SR link result-0", 20, 0, 0.0, 1.1999999999999997, 0, 4, 1.0, 3.0, 3.9499999999999993, 4.0, 0.24806816913287774, 2.9466816231100306, 0.0], "isController": false}, {"data": ["Generate user hedera data", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.12353609724761574, 0.0, 0.0], "isController": true}, {"data": ["Verify link", 10, 0, 0.0, 512.2, 255, 760, 527.0, 759.4, 760.0, 760.0, 0.06452736928368168, 1.1243200932581803, 0.04080221837029676], "isController": false}, {"data": ["Login by Admin", 10, 0, 0.0, 496.9999999999999, 245, 784, 482.5, 781.0, 784.0, 784.0, 0.23687701345461434, 2.146929259640894, 0.12514693777240857], "isController": false}, {"data": ["Get SR Access Token", 15, 0, 0.0, 282.9333333333334, 239, 494, 265.0, 381.20000000000005, 494.0, 494.0, 0.05089472934182936, 0.8538021596754274, 0.04703454967495233], "isController": false}, {"data": ["Generate sr hedera data", 5, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.1252944419385556, 0.0, 0.0], "isController": true}, {"data": ["Login by SR", 5, 0, 0.0, 572.4, 562, 581, 571.0, 581.0, 581.0, 581.0, 0.12368583797155226, 1.3893639842300558, 0.045657467532467536], "isController": false}, {"data": ["Get user key gen result-0", 5, 0, 0.0, 0.4, 0, 1, 0.0, 1.0, 1.0, 1.0, 0.1238083446824316, 1.767267395072428, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12536355430749171, 1.1216855051524421, 0.0], "isController": false}, {"data": ["Get SR DID-0", 5, 0, 0.0, 1.0, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.12507817385866166, 2.2150562851782363, 0.0], "isController": false}, {"data": ["Get user keys-0", 5, 0, 0.0, 0.6, 0, 1, 1.0, 1.0, 1.0, 1.0, 0.12378688849277084, 1.8226652245494155, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 482, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
