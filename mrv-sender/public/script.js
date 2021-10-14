const configs = [];

async function makeRequest() {

}

function addFile() {
    let configFile;
    const config = document.getElementById('config');
    const inputElement = document.getElementById("file-input");
    config.addEventListener('dragover', event => {
        event.preventDefault();
    })
    config.addEventListener('dragenter', event => {
        event.preventDefault();
        config.classList.add('alert')
    });
    config.addEventListener('dragleave', event => {
        event.preventDefault();
        config.classList.remove('alert')
    })
    config.addEventListener('drop', (event) => {
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = event => {
            configFile = event.target.result;
            const config = JSON.parse(configFile)
            addConfig(config)
        }
        if (event.dataTransfer.files.length) {
            reader.readAsText(event.dataTransfer.files[0]);
        }
    });
    config.addEventListener('click', event => {
        event.preventDefault();
        inputElement.click();
    })
    inputElement.addEventListener("change", (event) => {
        const reader = new FileReader();
        reader.onload = event => {
            configFile = event.target.result;
            const config = JSON.parse(configFile)
            addConfig(config)
        }
        if (event.target.files.length) {
            reader.readAsText(event.target.files[0]);
        }
    });
}

function addConfig(config) {
    const dialog = document.createElement("div");
    const content = document.createElement("div");
    dialog.className = "dialog";
    content.className = "dialog-content";

    let keys;
    if (config.schema) {
        const context = config.schema['@context'][config.type];
        const fields = context['@context'];
        keys = Object.keys(fields);
    } else {
        keys = ["accountId", "amount", "date", "period"]
    }
    keys = keys.filter(e => e != "accountId");

    const bSetting = document.createElement("div");
    bSetting.className = "dialog-content-setting";

    const setting = {};
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key == "policyId") {
            continue;
        }

        setting[key] = {
            value: null,
            random: false,
            decimal: 0
        }

        const row = renderSetting(setting, key);
        bSetting.append(row);
    }

    let wipe = false;
    const bWipe = createCheckbox("dialog-content-setting", "Wipe", (event) => {
        wipe = event.currentTarget.checked;
    });


    const b1 = document.createElement("div");
    const b2 = document.createElement("div");

    b1.textContent = "Ok";
    b2.textContent = "Cancel";
    b1.className = "btn-ok";
    b2.className = "btn-cancel";

    content.append(bSetting);
    // content.append(bWipe);
    content.append(b1);
    content.append(b2);
    dialog.append(content);
    document.body.append(dialog);

    b1.addEventListener('click', () => {
        configs.push({
            name: config.did,
            file: config,
            start: false,
            task: null,
            lastTime: null,
            setting: setting,
            wipe: wipe
        });
        dialog.remove();
        renderConfigs();
    });
    b2.addEventListener('click', () => {
        dialog.remove();
        renderConfigs();
    });
}

function createCheckbox(className, text, callback) {
    const id = String(Math.round(Math.random() * 1000000));
    const body = document.createElement("div");
    const checkbox = document.createElement("input");
    const label = document.createElement("label");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("id", id);
    checkbox.setAttribute("name", id);
    label.setAttribute("for", id);
    label.textContent = text;
    body.className = className;
    body.append(checkbox);
    body.append(label);

    checkbox.addEventListener('change', callback);

    return body;
}

function renderSetting(setting, key) {
    const item = setting[key];

    const row = document.createElement("div");
    row.className = "dialog-content-row";

    const bName = document.createElement("div");
    bName.className = "dialog-row-name";
    bName.textContent = key;

    const bValue = document.createElement("input");
    bValue.className = "dialog-row-value";
    bValue.addEventListener('input', (event) => {
        item.value = event.target.value
    })

    const bRandom = createCheckbox("dialog-row-input", "Random Value", (event) => {
        item.random = event.currentTarget.checked;
        if (item.random) {
            bValue.setAttribute("disabled", "true");
        } else {
            bValue.removeAttribute("disabled");
        }
    });

    const bEx = document.createElement("div");
    bEx.className = "dialog-row-ex";
    bEx.textContent = "(1-9)";

    const bDecimal = document.createElement("input");
    bDecimal.className = "dialog-row-decimal";
    bDecimal.value = "0";
    bDecimal.setAttribute("type", "number");
    bDecimal.setAttribute("min", "0");
    bDecimal.setAttribute("max", "6");
    bDecimal.addEventListener('input', (event) => {
        item.decimal = event.target.value;
        const _decimal = Math.pow(10, item.decimal);
        bEx.textContent = `(${_decimal}-${10 * _decimal-1})`;
    })

    row.append(bName);
    row.append(bValue);
    row.append(bRandom);
    row.append(bDecimal);
    row.append(bEx);

    return row;
}

function renderConfigs() {
    const table = document.getElementById('results');
    table.innerHTML = '';

    const body = document.createElement("div");
    body.className = "t-body";
    for (let index = 0; index < configs.length; index++) {
        const row = renderConfigFiles(configs[index], index);
        body.append(row);
    }
    table.append(body);
}

function renderConfigFiles(config, index) {
    const row = document.createElement("div");
    row.className = "config-row";

    const header = document.createElement("div");
    const body = document.createElement("div");
    header.className = "config-header";
    body.className = "config-body";



    //
    const hStatus = document.createElement("div");
    const hName = document.createElement("div");
    const hCollapse = document.createElement("div");
    const hControl = document.createElement("div");
    hStatus.className = "config-status";
    hName.className = "config-name";
    hCollapse.className = "config-collapse";
    hControl.className = "config-control";

    //
    hCollapse.className = "config-collapse " +
        (config.show ? "config-collapse-show" : "config-collapse-hide");
    hStatus.className = "config-status " +
        (config.start ? "config-status-started" : "config-status-stopped");
    hName.textContent = config.name;

    hControl.className = "config-control " +
        (config.start ? "config-control-stop" : "config-control-start");
    // hControl.textContent = config.start ? "stop" : "start";

    //
    const text1 = document.createElement("div");
    const bConfig = document.createElement("pre");
    const text2 = document.createElement("div");
    const bLastValue = document.createElement("pre");
    bConfig.className = "config-config";
    bLastValue.className = "config-last-value";
    bConfig.textContent = "config-label";
    bConfig.textContent = "config-label";

    //
    bConfig.textContent = JSON.stringify(config.file, null, 4);
    bLastValue.textContent = JSON.stringify(config.lastValue, null, 4);
    text1.textContent = "File:"
    text2.textContent = "Last VC:"

    //
    hControl.setAttribute("index", (index));
    hControl.setAttribute("status", (config.start ? "1" : "0"));
    hControl.addEventListener('click', startStop);

    //
    hCollapse.setAttribute("index", (index));
    hCollapse.setAttribute("status", (config.show ? "1" : "0"));
    hCollapse.addEventListener('click', showHide);

    //
    body.className = "config-body " +
        (config.show ? "config-body-show" : "config-body-hide");


    //
    header.append(hCollapse);
    header.append(hStatus);
    header.append(hName);
    header.append(hControl);
    body.append(text1);
    body.append(bConfig);
    body.append(text2);
    body.append(bLastValue);
    row.append(header);
    row.append(body);

    return row;
}


function startStop(event) {
    const btn = event.target;
    const index = btn.getAttribute("index");
    const status = btn.getAttribute("status");
    const config = configs[index];
    if (config.start) {
        config.start = false;
        clearInterval(config.task);
    } else {
        send(config, config.wipe);
        config.start = true;
        config.task = setInterval(() => {
            send(config, config.wipe);
        }, 60 * 1000);
    }

    renderConfigs();
}

function showHide(event) {
    const btn = event.target;
    const index = btn.getAttribute("index");
    const status = btn.getAttribute("status");
    const config = configs[index];
    if (config.show) {
        config.show = false;
    } else {
        config.show = true;
    }
    renderConfigs();
}

async function generateAndSendMRV(config) {
    try {
        const result = await fetch('/mrv-generate', {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify({
                config: config.file,
                setting: config.setting
            })
        });
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

async function generateAndSendWipe(config) {
    try {
        const result = await fetch('/wipe-generate', {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify({
                config: config.file,
                setting: config.setting
            })
        });
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

async function send(config, wipe) {
    let result;
    if (wipe) {
        result = await generateAndSendWipe(config);
    } else {
        result = await generateAndSendMRV(config);
    }
    if (result) {
        config.lastTime = new Date();
        config.lastValue = result;
        renderConfigs();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    addFile();
    renderConfigs()
})