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

    var data = {"OkPercent": 99.96245541580628, "KoPercent": 0.03754458419373005};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.7233935742971888, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "Invite user-0"], "isController": false}, {"data": [0.45, 500, 1500, "WS open for sr link"], "isController": false}, {"data": [0.895, 500, 1500, "Agree terms"], "isController": false}, {"data": [0.45, 500, 1500, "Link SR profile"], "isController": false}, {"data": [1.0, 500, 1500, "Invite sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link user profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Import Policy-0"], "isController": false}, {"data": [0.7425742574257426, 500, 1500, "Get Admin Access Token"], "isController": false}, {"data": [1.0, 500, 1500, "Agree terms-0"], "isController": false}, {"data": [0.88, 500, 1500, "Import Policy"], "isController": false}, {"data": [0.95, 500, 1500, "Invite sr"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user keys"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr keys"], "isController": false}, {"data": [0.94, 500, 1500, "Get policy id"], "isController": false}, {"data": [0.0, 500, 1500, "Tenant creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Get Access Token-0"], "isController": false}, {"data": [0.43, 500, 1500, "WS open for policy import"], "isController": false}, {"data": [1.0, 500, 1500, "Generate sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Dry Run Policy"], "isController": false}, {"data": [0.42, 500, 1500, "Invite and accept user"], "isController": true}, {"data": [0.8123324396782842, 500, 1500, "Get SR link result"], "isController": false}, {"data": [0.87, 500, 1500, "Get User Access Token"], "isController": false}, {"data": [0.5, 500, 1500, "Accept user"], "isController": false}, {"data": [0.45, 500, 1500, "Login by user"], "isController": false}, {"data": [0.58, 500, 1500, "Get SR DID"], "isController": false}, {"data": [0.95, 500, 1500, "Link user profile"], "isController": false}, {"data": [0.0, 500, 1500, "Get key gen result"], "isController": false}, {"data": [0.94, 500, 1500, "Invite user"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for policy import-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation flow"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for DryRun"], "isController": true}, {"data": [1.0, 500, 1500, "WS open for sr key gen"], "isController": false}, {"data": [0.8608247422680413, 500, 1500, "Get user link result"], "isController": false}, {"data": [1.0, 500, 1500, "Generate user keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Link user"], "isController": true}, {"data": [1.0, 500, 1500, "Login by Admin-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(SR side)"], "isController": true}, {"data": [0.0, 500, 1500, "Get Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Get user keys"], "isController": false}, {"data": [1.0, 500, 1500, "Get policy id-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen-0"], "isController": false}, {"data": [0.0, 500, 1500, "Requests for Import"], "isController": true}, {"data": [1.0, 500, 1500, "Setup ipfs-0"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(user side)"], "isController": true}, {"data": [1.0, 500, 1500, "Get policy import result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get Admin Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept sr-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by SR OS"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant-0"], "isController": false}, {"data": [0.0, 500, 1500, "Get sr keys"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user key gen"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Verify link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Dry Run Policy-0"], "isController": false}, {"data": [0.0, 500, 1500, "Policy import and dry run"], "isController": true}, {"data": [0.0, 500, 1500, "Invite and accept SR"], "isController": true}, {"data": [1.0, 500, 1500, "Get key gen result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Link SR"], "isController": true}, {"data": [0.5, 500, 1500, "Accept sr"], "isController": false}, {"data": [0.0, 500, 1500, "User creation(admin side)"], "isController": true}, {"data": [1.0, 500, 1500, "Login by user OS-0"], "isController": false}, {"data": [0.44, 500, 1500, "WS open for user link"], "isController": false}, {"data": [0.8418674698795181, 500, 1500, "Get policy import result"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for sr link-0"], "isController": false}, {"data": [1.0, 500, 1500, "WS open for user link-0"], "isController": false}, {"data": [1.0, 500, 1500, "Create new tenant"], "isController": false}, {"data": [0.0, 500, 1500, "Get user key gen result"], "isController": false}, {"data": [1.0, 500, 1500, "Login by user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get User Access Token-0"], "isController": false}, {"data": [1.0, 500, 1500, "Link SR profile-0"], "isController": false}, {"data": [1.0, 500, 1500, "Accept user-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get sr keys-0"], "isController": false}, {"data": [0.0, 500, 1500, "Login by user OS"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR link result-0"], "isController": false}, {"data": [0.0, 500, 1500, "Generate user hedera data"], "isController": true}, {"data": [0.715, 500, 1500, "Verify link"], "isController": false}, {"data": [0.5, 500, 1500, "Login by Admin"], "isController": false}, {"data": [0.9533333333333334, 500, 1500, "Get SR Access Token"], "isController": false}, {"data": [0.0, 500, 1500, "Generate sr hedera data"], "isController": true}, {"data": [0.5, 500, 1500, "Login by SR"], "isController": false}, {"data": [1.0, 500, 1500, "Get user key gen result-0"], "isController": false}, {"data": [1.0, 500, 1500, "Login by SR OS-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get SR DID-0"], "isController": false}, {"data": [1.0, 500, 1500, "Get user keys-0"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 5327, 2, 0.03754458419373005, 714.0852262061215, 0, 100604, 8.0, 2038.0, 2056.0, 9656.600000000028, 5.762158186223607, 359.7647228881371, 2.1086537330445223], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Invite user-0", 50, 0, 0.0, 1.98, 0, 15, 1.0, 3.0, 7.599999999999966, 15.0, 0.10211375472276116, 3.5668813182885737, 0.0], "isController": false}, {"data": ["WS open for sr link", 50, 0, 0.0, 1222.82, 912, 3698, 974.5, 2049.899999999999, 3572.399999999999, 3698.0, 0.10107074345617471, 4.612460105482482, 0.06226313123732826], "isController": false}, {"data": ["Agree terms", 100, 0, 0.0, 435.4400000000001, 254, 3266, 303.5, 776.0000000000003, 955.1999999999987, 3247.9299999999907, 0.14194605198348317, 8.075134850967292, 0.09319645475540565], "isController": false}, {"data": ["Link SR profile", 50, 0, 0.0, 1312.0000000000002, 690, 12426, 759.0, 1564.1999999999991, 6645.0499999999765, 12426.0, 0.09881071424336683, 4.667212153273204, 0.1273384481876139], "isController": false}, {"data": ["Invite sr-0", 50, 0, 0.0, 2.2199999999999998, 0, 15, 2.0, 3.8999999999999986, 10.699999999999974, 15.0, 0.1021173001002792, 3.558002083958802, 0.0], "isController": false}, {"data": ["Link user profile-0", 50, 0, 0.0, 3.1999999999999997, 0, 10, 3.0, 5.899999999999999, 7.8999999999999915, 10.0, 0.0872002274181931, 6.706041520606285, 0.0], "isController": false}, {"data": ["Import Policy-0", 50, 0, 0.0, 5.38, 0, 99, 3.0, 5.899999999999999, 10.0, 99.0, 0.08521269941901982, 6.901711052364055, 0.0], "isController": false}, {"data": ["Get Admin Access Token", 101, 0, 0.0, 516.8019801980196, 233, 1001, 551.0, 779.4, 826.4, 1000.96, 0.204952962280538, 7.168435157499249, 0.16997438151385158], "isController": false}, {"data": ["Agree terms-0", 100, 0, 0.0, 2.5499999999999994, 0, 14, 2.0, 5.0, 6.899999999999977, 13.93999999999997, 0.14200430557054491, 8.0469693552046, 0.0], "isController": false}, {"data": ["Import Policy", 50, 0, 0.0, 456.94000000000005, 240, 3143, 272.5, 894.0, 1295.349999999998, 3143.0, 0.08515972558130029, 6.926777312746538, 0.06800636132505128], "isController": false}, {"data": ["Invite sr", 50, 0, 0.0, 372.71999999999997, 256, 616, 368.0, 524.6999999999998, 579.4499999999999, 616.0, 0.10198898926871855, 3.583909018682343, 0.08017689097785002], "isController": false}, {"data": ["Generate user keys", 50, 0, 0.0, 2045.72, 2032, 2066, 2045.0, 2055.9, 2063.9, 2066.0, 0.08694518106333957, 5.532921317328174, 0.06222184334652001], "isController": false}, {"data": ["Generate sr keys", 50, 0, 0.0, 2045.4399999999998, 2032, 2067, 2043.0, 2056.0, 2060.15, 2067.0, 0.10169401896796842, 3.8359977060371673, 0.07426642701623647], "isController": false}, {"data": ["Get policy id", 50, 0, 0.0, 349.82000000000005, 234, 1938, 273.5, 566.5999999999999, 738.5499999999996, 1938.0, 0.08518003652519966, 7.8440631963467995, 0.06386339965025077], "isController": false}, {"data": ["Tenant creation flow", 1, 0, 0.0, 1710.0, 1710, 1710, 1710.0, 1710.0, 1710.0, 1710.0, 0.5847953216374269, 12.555966739766083, 1.4402869152046784], "isController": true}, {"data": ["Get Access Token-0", 100, 0, 0.0, 2.8900000000000006, 0, 87, 1.0, 2.0, 3.0, 87.0, 0.14207713936204525, 7.08128279761964, 0.0], "isController": false}, {"data": ["WS open for policy import", 50, 0, 0.0, 1407.22, 909, 8165, 992.5, 2901.2999999999993, 3847.0499999999965, 8165.0, 0.08505643494458574, 6.906346618794069, 0.06169415672923985], "isController": false}, {"data": ["Generate sr keys-0", 50, 0, 0.0, 0.82, 0, 2, 1.0, 2.0, 2.0, 2.0, 0.10211959429927576, 3.8187422835881555, 0.0], "isController": false}, {"data": ["Dry Run Policy", 50, 1, 2.0, 24359.34, 8148, 100300, 19709.5, 52317.99999999999, 74296.04999999996, 100300.0, 0.0789447923278293, 8.020678342502771, 0.062272330620000815], "isController": false}, {"data": ["Invite and accept user", 50, 0, 0.0, 1289.0, 1065, 1970, 1220.5, 1661.8999999999999, 1902.4999999999998, 1970.0, 0.10188777672720159, 10.86098824966479, 0.2666415056924701], "isController": true}, {"data": ["Get SR link result", 373, 0, 0.0, 792.5844504021446, 240, 18331, 297.0, 1072.6000000000006, 2508.400000000001, 10693.619999999983, 0.6077868411704703, 38.06769682954838, 0.38930615958559694], "isController": false}, {"data": ["Get User Access Token", 50, 0, 0.0, 510.97999999999996, 250, 4350, 289.0, 788.0, 1851.4999999999925, 4350.0, 0.08730818391992792, 5.969446405543896, 0.05736591045410733], "isController": false}, {"data": ["Accept user", 50, 0, 0.0, 661.7999999999998, 537, 1359, 600.0, 909.1999999999999, 1132.0499999999986, 1359.0, 0.10199939208362319, 3.6570626960938313, 0.08733897164722898], "isController": false}, {"data": ["Login by user", 50, 0, 0.0, 1186.92, 565, 7293, 721.0, 1527.6999999999998, 6762.2, 7293.0, 0.08712789852736426, 5.783580535148265, 0.03257256065844295], "isController": false}, {"data": ["Get SR DID", 50, 0, 0.0, 1271.4400000000003, 261, 18899, 752.5, 1932.3999999999996, 5369.34999999998, 18899.0, 0.08709496486589116, 6.608895215612295, 0.05331334558324014], "isController": false}, {"data": ["Link user profile", 50, 0, 0.0, 366.04, 253, 2075, 281.0, 426.9, 968.6499999999991, 2075.0, 0.08715964159955374, 6.7321153862915315, 0.077929571741101], "isController": false}, {"data": ["Get key gen result", 50, 0, 0.0, 2037.9800000000005, 2031, 2054, 2037.0, 2047.0, 2054.0, 2054.0, 0.10169774210672974, 3.903701597595255, 0.07645405842636982], "isController": false}, {"data": ["Invite user", 50, 0, 0.0, 354.08000000000004, 252, 721, 313.5, 520.8, 612.0499999999993, 721.0, 0.1020549790583183, 3.5952254917519166, 0.07713921268665855], "isController": false}, {"data": ["Login by SR-0", 50, 0, 0.0, 1.56, 0, 5, 1.0, 3.0, 4.0, 5.0, 0.10211354617880898, 4.079226757297545, 0.0], "isController": false}, {"data": ["WS open for policy import-0", 50, 0, 0.0, 5.399999999999999, 0, 117, 3.0, 5.899999999999999, 7.349999999999987, 117.0, 0.08519643742577261, 6.898578513415883, 0.0], "isController": false}, {"data": ["User creation flow", 50, 0, 0.0, 42402.680000000015, 32905, 61497, 43790.5, 53842.0, 55858.899999999994, 61497.0, 0.09213787511632407, 207.78477405777508, 2.6476466259110136], "isController": true}, {"data": ["Setup ipfs", 1, 0, 0.0, 270.0, 270, 270, 270.0, 270.0, 270.0, 270.0, 3.7037037037037037, 20.38845486111111, 2.6222511574074074], "isController": false}, {"data": ["WS open for sr key gen-0", 50, 0, 0.0, 0.7999999999999999, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.10211959429927576, 3.789041836738341, 0.0], "isController": false}, {"data": ["Requests for DryRun", 50, 1, 2.0, 24682.399999999998, 8455, 100604, 20142.5, 52583.29999999999, 74557.24999999996, 100604.0, 0.0789110278161373, 14.95908956401657, 0.15037020368909054], "isController": true}, {"data": ["WS open for sr key gen", 50, 0, 0.0, 1.86, 1, 3, 2.0, 2.0, 3.0, 3.0, 0.10211938573147095, 3.801898747224906, 0.07387898763436358], "isController": false}, {"data": ["Get user link result", 97, 0, 0.0, 571.5257731958765, 252, 6962, 296.0, 897.2000000000003, 1316.5999999999995, 6962.0, 0.1652084607170047, 13.577593009063474, 0.10339500193310931], "isController": false}, {"data": ["Generate user keys-0", 50, 0, 0.0, 1.88, 0, 11, 1.5, 3.0, 6.599999999999966, 11.0, 0.08725683700946388, 5.524293407767779, 0.0], "isController": false}, {"data": ["Link user", 50, 0, 0.0, 7168.58, 3753, 27951, 5088.5, 15824.5, 21548.299999999996, 27951.0, 0.08645597920906613, 57.91809652248115, 0.4865479089324589], "isController": true}, {"data": ["Login by Admin-0", 1, 0, 0.0, 4.0, 4, 4, 4.0, 4.0, 4.0, 4.0, 250.0, 1025.87890625, 0.0], "isController": false}, {"data": ["User creation(SR side)", 50, 0, 0.0, 21206.02000000001, 15206, 37306, 18273.5, 31103.3, 34457.399999999994, 37306.0, 0.09550478096933533, 93.27281558480443, 1.2513271433899231], "isController": true}, {"data": ["Get Access Token", 100, 0, 0.0, 2049.109999999999, 2027, 2140, 2046.0, 2061.0, 2067.0, 2139.87, 0.1416649312712586, 7.159836933924643, 0.14882150050432716], "isController": false}, {"data": ["Get user keys", 50, 0, 0.0, 2047.1, 2026, 2160, 2045.0, 2061.7, 2071.5, 2160.0, 0.08694639059448725, 5.653953963190376, 0.06409069780129967], "isController": false}, {"data": ["Get policy id-0", 50, 0, 0.0, 5.38, 1, 109, 3.0, 6.899999999999999, 9.0, 109.0, 0.08521938025057907, 7.42733170344167, 0.0], "isController": false}, {"data": ["WS open for user key gen-0", 50, 0, 0.0, 5.32, 0, 107, 1.0, 2.8999999999999986, 45.39999999999961, 107.0, 0.08725622791326731, 5.5055765591597225, 0.0], "isController": false}, {"data": ["Requests for Import", 50, 0, 0.0, 6742.499999999998, 3656, 25625, 4926.5, 16781.3, 22240.799999999992, 25625.0, 0.08466826971924002, 77.52434311975057, 0.6993185659523488], "isController": true}, {"data": ["Setup ipfs-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["User creation(user side)", 50, 0, 0.0, 18144.300000000003, 14419, 38679, 15770.0, 27645.0, 32221.249999999996, 38679.0, 0.08487998818470564, 90.31783457463243, 0.9096432499401595], "isController": true}, {"data": ["Get policy import result-0", 332, 0, 0.0, 8.271084337349402, 0, 116, 3.0, 8.0, 82.34999999999997, 108.67000000000002, 0.5282645396063157, 44.71080723634906, 0.0], "isController": false}, {"data": ["Get Admin Access Token-0", 101, 0, 0.0, 2.4554455445544567, 0, 114, 1.0, 3.0, 3.0, 111.80000000000044, 0.20505615696338225, 7.049891901398443, 0.0], "isController": false}, {"data": ["Accept sr-0", 50, 0, 0.0, 1.66, 0, 4, 1.5, 3.0, 3.0, 4.0, 0.1021129205520633, 3.5657532697833574, 0.0], "isController": false}, {"data": ["Get user link result-0", 97, 0, 0.0, 6.896907216494843, 1, 97, 3.0, 7.0, 17.699999999999562, 97.0, 0.16527911723912309, 13.394984888994626, 0.0], "isController": false}, {"data": ["Login by SR OS", 50, 0, 0.0, 2481.6799999999994, 2456, 2625, 2476.5, 2494.8, 2549.65, 2625.0, 0.10160577771094376, 3.64408526413946, 0.03282541345931095], "isController": false}, {"data": ["Create new tenant-0", 1, 0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, Infinity, Infinity, NaN], "isController": false}, {"data": ["Get sr keys", 50, 0, 0.0, 2045.54, 2032, 2061, 2044.0, 2057.9, 2059.45, 2061.0, 0.10170994763971895, 3.979298402238433, 0.07646323426953949], "isController": false}, {"data": ["WS open for user key gen", 50, 0, 0.0, 6.379999999999999, 1, 108, 2.0, 3.8999999999999986, 46.8499999999996, 108.0, 0.08725607564054685, 5.516559171726065, 0.06184785627091965], "isController": false}, {"data": ["Get SR Access Token-0", 150, 0, 0.0, 3.4333333333333336, 0, 111, 2.0, 5.0, 6.0, 58.98000000000093, 0.1789083726732966, 12.521678197062801, 0.0], "isController": false}, {"data": ["Verify link-0", 100, 0, 0.0, 3.880000000000001, 0, 86, 3.0, 5.0, 7.0, 85.30999999999965, 0.14530427441584048, 10.321919009032113, 0.0], "isController": false}, {"data": ["Dry Run Policy-0", 50, 0, 0.0, 6.700000000000001, 1, 86, 4.0, 6.0, 42.54999999999966, 86.0, 0.08005405249624546, 7.088176561814538, 0.0], "isController": false}, {"data": ["Policy import and dry run", 49, 0, 0.0, 29919.44897959183, 12621, 85497, 25372.0, 50569.0, 72513.5, 85497.0, 0.07686913578697524, 84.71738018023458, 0.7821284431293896], "isController": true}, {"data": ["Invite and accept SR", 50, 0, 0.0, 1763.3600000000001, 1582, 2299, 1707.5, 1958.6, 2186.899999999999, 2299.0, 0.10170746492109535, 10.969964546049072, 0.23388942631395873], "isController": true}, {"data": ["Get key gen result-0", 50, 0, 0.0, 0.8, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.10212293150002247, 3.847020694318493, 0.0], "isController": false}, {"data": ["Link SR", 50, 0, 0.0, 10547.32, 4554, 26646, 7629.0, 20444.2, 23808.249999999996, 26646.0, 0.09750047775234098, 73.22548102165388, 0.878435505505852], "isController": true}, {"data": ["Accept sr", 50, 0, 0.0, 624.8400000000001, 545, 1084, 583.5, 740.3, 907.15, 1084.0, 0.10199585488845733, 3.8442277549590385, 0.08733594285478238], "isController": false}, {"data": ["User creation(admin side)", 50, 0, 0.0, 3052.360000000001, 2696, 4195, 2953.5, 3572.1, 3759.9, 4195.0, 0.10148389754997574, 21.763786730193893, 0.4989598534775487], "isController": true}, {"data": ["Login by user OS-0", 50, 0, 0.0, 1.4, 0, 8, 1.0, 2.0, 3.4499999999999957, 8.0, 0.08726841145310632, 5.389751634101004, 0.0], "isController": false}, {"data": ["WS open for user link", 50, 0, 0.0, 1563.0800000000002, 916, 13019, 986.0, 1732.3999999999996, 7067.299999999975, 13019.0, 0.08709511657681354, 6.179340684524068, 0.052377846377278624], "isController": false}, {"data": ["Get policy import result", 332, 0, 0.0, 609.3403614457836, 232, 15335, 305.0, 850.3999999999999, 1298.6999999999957, 6714.810000000006, 0.5280460863355351, 46.09310603378143, 0.3959072004730148], "isController": false}, {"data": ["WS open for sr link-0", 50, 0, 0.0, 1.88, 0, 4, 2.0, 3.0, 4.0, 4.0, 0.10129680165478455, 4.600024276411622, 0.0], "isController": false}, {"data": ["WS open for user link-0", 50, 0, 0.0, 3.1399999999999983, 0, 7, 3.0, 5.0, 6.0, 7.0, 0.08723689352911619, 6.169805441008667, 0.0], "isController": false}, {"data": ["Create new tenant", 1, 0, 0.0, 364.0, 364, 364, 364.0, 364.0, 364.0, 364.0, 2.7472527472527473, 15.97645518543956, 2.0416595123626373], "isController": false}, {"data": ["Get user key gen result", 57, 0, 0.0, 2044.6315789473688, 2026, 2131, 2039.0, 2053.4, 2121.8, 2131.0, 0.09911905763860147, 6.6026898162558725, 0.07306566224572483], "isController": false}, {"data": ["Login by user-0", 50, 0, 0.0, 5.199999999999999, 0, 114, 3.0, 5.0, 10.249999999999979, 114.0, 0.08734707710475885, 5.743227271417067, 0.0], "isController": false}, {"data": ["Get User Access Token-0", 50, 0, 0.0, 6.320000000000002, 0, 95, 2.0, 6.899999999999999, 47.09999999999967, 95.0, 0.08735653872428005, 5.9215824101931105, 0.0], "isController": false}, {"data": ["Link SR profile-0", 50, 0, 0.0, 2.22, 0, 10, 2.0, 4.0, 4.449999999999996, 10.0, 0.09895405563197007, 4.640836978141049, 0.0], "isController": false}, {"data": ["Accept user-0", 50, 0, 0.0, 1.5799999999999998, 0, 9, 1.0, 3.0, 3.4499999999999957, 9.0, 0.10211876003316817, 3.5774914169182193, 0.0], "isController": false}, {"data": ["Get sr keys-0", 50, 0, 0.0, 0.8000000000000002, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.10213419616302252, 3.922886703046867, 0.0], "isController": false}, {"data": ["Login by user OS", 50, 0, 0.0, 2493.62, 2463, 2683, 2480.5, 2549.2, 2568.0, 2683.0, 0.0868848983620459, 5.432047239536451, 0.06937555497728828], "isController": false}, {"data": ["Get SR link result-0", 373, 0, 0.0, 3.0321715817694384, 0, 98, 2.0, 4.0, 5.0, 14.259999999999991, 0.6080464267083986, 37.23390327497391, 0.0], "isController": false}, {"data": ["Generate user hedera data", 50, 0, 0.0, 10975.72, 10611, 17060, 10670.0, 12501.599999999997, 12723.25, 17060.0, 0.08565369184542591, 33.76047290366872, 0.43590200992811945], "isController": true}, {"data": ["Verify link", 100, 0, 0.0, 701.9699999999999, 255, 6731, 674.5, 938.3000000000001, 1164.9499999999994, 6728.419999999998, 0.1451222945576237, 10.563658733495968, 0.09188055274179552], "isController": false}, {"data": ["Login by Admin", 1, 0, 0.0, 825.0, 825, 825, 825.0, 825.0, 825.0, 825.0, 1.2121212121212122, 5.743371212121213, 0.4296875], "isController": false}, {"data": ["Get SR Access Token", 150, 0, 0.0, 372.6666666666665, 234, 6814, 272.0, 496.30000000000007, 822.4999999999999, 4036.0300000000498, 0.17885162945757876, 12.638123061322858, 0.16552042955093935], "isController": false}, {"data": ["Generate sr hedera data", 50, 0, 0.0, 10658.7, 10618, 10802, 10657.0, 10679.0, 10733.4, 10802.0, 0.09994642871420918, 22.54820517764978, 0.4090502802997594], "isController": true}, {"data": ["Login by SR", 50, 0, 0.0, 673.92, 553, 1387, 606.5, 927.5999999999999, 1143.349999999999, 1387.0, 0.10199252598769563, 4.139296945757315, 0.037731258490877786], "isController": false}, {"data": ["Get user key gen result-0", 57, 0, 0.0, 5.964912280701754, 0, 91, 1.0, 2.200000000000003, 88.0, 91.0, 0.09947279419078882, 6.557472301953157, 0.0], "isController": false}, {"data": ["Login by SR OS-0", 50, 0, 0.0, 0.74, 0, 2, 1.0, 1.0, 2.0, 2.0, 0.10211771721970218, 3.5840985194718065, 0.0], "isController": false}, {"data": ["Get SR DID-0", 50, 0, 0.0, 2.72, 0, 13, 3.0, 5.0, 5.449999999999996, 13.0, 0.08720296490080663, 6.2814254278395465, 0.0], "isController": false}, {"data": ["Get user keys-0", 50, 0, 0.0, 3.98, 0, 126, 1.0, 2.0, 5.699999999999974, 126.0, 0.08725881663083239, 5.611893998425851, 0.0], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["500", 1, 50.0, 0.018772292096865026], "isController": false}, {"data": ["500/Internal Server Error", 1, 50.0, 0.018772292096865026], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 5327, 2, "500", 1, "500/Internal Server Error", 1, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Dry Run Policy", 50, 1, "500/Internal Server Error", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Requests for DryRun", 1, 1, "500", 1, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
