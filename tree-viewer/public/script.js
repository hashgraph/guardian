const Status = {
    FULL: 0,
    LEFT: 1,
    RIGHT: 2,
    LEFT_AND_RIGHT: 3,
    PARTLY: 4,
}
function getProp(result, lvl) {
    if (lvl == 1) {
        const p = {};
        const keys = Object.keys(result.prop);
        for (const key of keys) {
            if (typeof result.prop[key] !== 'object') {
                p[key] = result.prop[key]
            }
        }
        return JSON.stringify(p);
    } else {
        return JSON.stringify(result.prop);
    }
}

function copyProp(json) {
    const prop = Object.assign({}, json, {
        id: undefined,
        permissions: undefined,
        events: undefined,
        children: undefined,
        schema: undefined
    })
    return prop;
}

function copyEvents(json) {
    if (Array.isArray(json.events)) {
        return json.events;
    }
    return [];
}

function getAllBlocks(map, root) {
    map[root.tag] = root;
    for (const child of root.children) {
        getAllBlocks(map, child);
    }
    return map;
}

function calcWeight(result, option) {
    const weight = [];

    let hashState;
    let index = 0;

    if (option.isProp > 0 && option.isChild > 0) {
        //prop + all children
        hashState = MurmurHash3();
        hashState.hash(result.blockType + getProp(result, option.isProp));
        if (option.isChild > 1) {
            for (const child of result.children) {
                hashState.hash(child.weight[index]);
            }
        } else {
            for (const child of result.children) {
                hashState.hash(getProp(child, option.isProp));
            }
        }
        weight.push(String(hashState.result()));
        index++;
    }

    if (option.isProp > 0) {
        //prop
        hashState = MurmurHash3();
        hashState.hash(result.blockType + getProp(result, option.isProp));
        weight.push(String(hashState.result()));
        index++;
    }

    if (option.isChild > 1) {
        //all children
        hashState = MurmurHash3();
        hashState.hash(result.blockType);
        for (const child of result.children) {
            hashState.hash(child.weight[index]);
        }
        weight.push(String(hashState.result()));
        index++;
    }

    if (option.isChild > 0) {
        //children
        hashState = MurmurHash3();
        hashState.hash(result.blockType);
        for (const child of result.children) {
            hashState.hash(child.blockType);
        }
        weight.push(String(hashState.result()));
        index++;
    }

    return weight;
}

function calcEventWeight(event, option) {
    let weight = '';
    if (option.isEvent > 0) {
        hashState = MurmurHash3();
        if (event.start) {
            hashState.hash(event.start);
        }
        if (event.end) {
            hashState.hash(event.end);
        }
        hashState.hash(event.actor);
        hashState.hash(event.disabled);
        hashState.hash(event.input);
        hashState.hash(event.output);
        weight = String(hashState.result());
    }
    return weight;
}

function parseBlock(json, option) {
    const result = {};
    result.children = [];
    if (Array.isArray(json.children)) {
        for (const child of json.children) {
            result.children.push(parseBlock(child, option))
        }
    }
    result.blockType = json.blockType;
    result.tag = json.tag;
    result.prop = copyProp(json);
    result.events = copyEvents(json);
    result.weight = calcWeight(result, option);
    return result;
}

function parseEvents(result, list, option) {
    for (const child of result.children) {
        parseEvents(child, list, option);
    }
    for (const event of result.events) {
        if (list[event.source]) {
            event.start = list[event.source].weight[0];
        }
        if (list[event.target]) {
            event.end = list[event.target].weight[0];
        }
        event.weight = calcEventWeight(event, option);
    }
}

function parseTree(json, option) {
    if (!json) {
        return null;
    }
    const result = parseBlock(json, option);
    const list = getAllBlocks({}, result);
    parseEvents(result, list, option);
    return result;
}

function getDiff(item1, item2) {
    if (!item1) {
        return 0;
    }
    if (!item2) {
        return 0;
    }
    let result = 1;
    const k = 1 / (item1.weight.length + 1);
    for (let i = 0; i < item1.weight.length; i++) {
        if (item1.weight[i] != item2.weight[i]) {
            result -= k;
        }
    }
    return Math.floor(Math.max(0, result) * 100);
}

function mapping(result, child, iteration) {
    for (let i = 0; i < result.length; i++) {
        const element = result[i];
        if (element[0] == child.blockType && element[1] && !element[2]) {
            if (iteration < element[1].weight.length) {
                if (element[1].weight[iteration] == child.weight[iteration]) {
                    element[2] = child;
                    element[3] = getDiff(element[1], element[2]);
                    return true;
                }
            } else {
                element[2] = child;
                element[3] = getDiff(element[1], element[2]);
                return true;
            }
        }
    }
    return false;

}

function merge(children_1, children_2, option) {
    const result = [];
    for (const child of children_1) {
        result.push([child.blockType, child, null, 0]);
    }

    const m = new Array(children_2.length);
    const max = 5;
    for (let iteration = 0; iteration < max; iteration++) {
        for (let i = 0; i < children_2.length; i++) {
            if (!m[i]) {
                const child = children_2[i];
                m[i] = mapping(result, child, iteration);
            }
        }
    }
    for (let i = 0; i < children_2.length; i++) {
        if (!m[i]) {
            const child = children_2[i];
            result.splice(i, 0, [child.blockType, null, child, 0]);
        }
    }

    const children = [];
    for (const item of result) {
        children.push(compare(item[1], item[2], option));
    }
    return children;
}

function compare(tree_1, tree_2, option) {
    const { propRate, eventRate, totalRate } = getBlockRate(tree_1, tree_2, option);
    if (tree_1 && !tree_2) {
        tree_1.difference = -1;
        return {
            propRate,
            eventRate,
            totalRate,
            difference: Status.LEFT,
            items: [tree_1, null],
            children: []
        }
    }
    if (!tree_1 && tree_2) {
        tree_2.difference = 1;
        return {
            propRate,
            eventRate,
            totalRate,
            difference: Status.RIGHT,
            items: [null, tree_2],
            children: []
        }
    }
    if (tree_1.weight == tree_2.weight) {
        tree_1.difference = 0;
        tree_2.difference = 0;
        return {
            propRate,
            eventRate,
            totalRate,
            difference: Status.FULL,
            items: [tree_1, tree_2],
            children: []
        }
    } else {
        if (tree_1.blockType == tree_2.blockType) {
            tree_1.difference = 0;
            tree_2.difference = 0;
            const children = merge(tree_1.children, tree_2.children, option);
            return {
                propRate,
                eventRate,
                totalRate,
                difference: Status.PARTLY,
                items: [tree_1, tree_2],
                children: children
            }
        } else {
            tree_1.difference = -1;
            tree_2.difference = 1;
            return {
                propRate,
                eventRate,
                totalRate,
                difference: Status.LEFT_AND_RIGHT,
                items: [tree_1, tree_2],
                children: []
            }
        }
    }
}

function compareProp(p1, p2, option) {
    if (option.isProp == 0) {
        return true
    }
    if (p1 && p2) {
        if (typeof p1 == 'object') {
            if (option.isProp == 1) {
                return true;
            } else {
                return JSON.stringify(p1) == JSON.stringify(p2);
            }
        } else {
            return p1 == p2;
        }
    } else {
        return p1 == p2;
    }
}

function getBlockRate(item_1, item_2, option) {
    if (!item_1) {
        return {
            propRate: -1,
            eventRate: -1,
            totalRate: -1,
        }
    }
    if (!item_2) {
        return {
            propRate: -1,
            eventRate: -1,
            totalRate: -1,
        }
    }

    const props = Object.assign({}, item_1.prop, item_2.prop);
    const propKeys = Object.keys(props);

    let propCount = 0;
    for (const key of propKeys) {
        if (compareProp(item_1.prop[key], item_2.prop[key], option)) {
            propCount++;
        }
    }

    const events = {};
    for (const event of item_1.events) {
        if (event.weight) {
            events[event.weight] = 1;
        }
    }
    for (const event of item_2.events) {
        if (event.weight) {
            if (events[event.weight]) {
                events[event.weight] = 2;
            } else {
                events[event.weight] = 1;
            }
        }
    }

    const eventKeys = Object.keys(events);
    let eventCount = 0;
    for (const key of eventKeys) {
        if (events[key] == 2) {
            eventCount++;
        }
    }

    let k1 = 0;
    let k2 = 0;
    let k3s = [];
    if (option.isProp == 0) {
        k1 = -1;
    } else {
        k1 = propKeys.length == 0 ? 100 : (propCount) / (propKeys.length) * 100;
        k3s.push(k1);
    }

    if (option.isEvent == 0) {
        k2 = -1;
    } else {
        k2 = eventKeys.length == 0 ? 100 : (eventCount) / (eventKeys.length) * 100;
        k3s.push(k2);
    }
    let k3 = 0;
    for (const v of k3s) {
        k3 += v;
    }
    k3 = k3s.length == 0 ? 100 : (k3) / (k3s.length);

    const p1 = Math.min(Math.max(-1, Math.floor(k1)), 100);
    const p2 = Math.min(Math.max(-1, Math.floor(k2)), 100);
    const p3 = Math.min(Math.max(-1, Math.floor(k3)), 100);

    return {
        propRate: p1,
        eventRate: p2,
        totalRate: p3
    }

}

function getColor(rate) {
    if (rate > -1 && rate < 99) {
        const k = Math.min(Math.floor(50 + (rate * 2)), 240);
        return `rgb(255 ${k} ${k})`;
    }
}

function renderProp(key, value, ignore) {
    const p = document.createElement("div");
    p.className = "prop-tooltip";
    if (ignore && ignore.indexOf(key) > -1) {
        return p;
    }
    if (value !== undefined && value !== "" && value !== null) {
        const n = document.createElement("div");
        n.className = "prop-name-tooltip";
        n.innerText = key;

        const v = document.createElement("div");
        v.className = "prop-value-tooltip";

        if (typeof value != 'object') {
            v.innerText = value;
        } else {
            if (Array.isArray(value)) {
                for (let index = 0; index < value.length; index++) {
                    const s = renderProp(index, value[index], ignore);
                    v.append(s);
                }
            } else {
                const ks = Object.keys(value);
                for (const k of ks) {
                    const s = renderProp(k, value[k], ignore);
                    v.append(s);
                }
            }
        }
        p.append(n);
        p.append(v);
    }
    return p;
}

function renderTooltip(tree) {
    const tooltip = document.createElement("div");
    tooltip.className = "block-tooltip";
    const item_1 = tree.items[0];
    const item_2 = tree.items[1];

    const left = document.createElement("div");
    left.className = "left-tooltip";
    const right = document.createElement("div");
    right.className = "right-tooltip";

    if (item_1) {
        const propKeys = Object.keys(item_1.prop);
        for (const key of propKeys) {
            const p = renderProp(key, item_1.prop[key]);
            left.append(p);
        }
        const p = renderProp('Events', item_1.events, ['start', 'end', 'weight']);
        left.append(p);
    }

    if (item_2) {
        const propKeys = Object.keys(item_2.prop);
        for (const key of propKeys) {
            const p = renderProp(key, item_2.prop[key]);
            right.append(p);
        }
        const p = renderProp('Events', item_2.events, ['start', 'end', 'weight']);
        right.append(p);
    }
    tooltip.append(left);
    tooltip.append(right);

    return tooltip;
}

function renderMerge(container, tree) {
    if (!tree) {
        return;
    }

    const root = document.createElement("div");
    root.className = "merge-container";

    const item_1 = tree.items[0];
    const item_2 = tree.items[1];

    if (item_1) {
        const block = document.createElement("div");
        block.setAttribute('diff', item_1.difference);
        block.setAttribute('propRate', tree.propRate);
        block.setAttribute('eventRate', tree.eventRate);
        block.setAttribute('totalRate', tree.totalRate);
        block.style.background = getColor(tree.totalRate);
        block.className = "block left-block";
        block.innerHTML = `${item_1.blockType} (${item_1.tag})`;

        block.style.gridColumnStart = 1;
        if (item_1.difference == 0) {
            block.style.gridRowStart = 1;
        } else if (item_1.difference < 0) {
            block.style.gridRowStart = 3;
        } else if (item_1.difference > 0) {
            block.style.gridRowStart = 5;
        }

        root.append(block);
        if (!item_2) {
            const clone = block.cloneNode(true);
            clone.setAttribute('fantom', true);
            clone.style.gridColumnStart = 2;
            root.append(clone);
        }

        const tooltip = renderTooltip(tree);
        block.append(tooltip);
    }
    if (item_2) {
        const block = document.createElement("div");
        block.setAttribute('diff', item_2.difference);
        block.setAttribute('propRate', tree.propRate);
        block.setAttribute('eventRate', tree.eventRate);
        block.setAttribute('totalRate', tree.totalRate);
        block.style.background = getColor(tree.totalRate);

        block.className = "block right-block";
        block.innerHTML = `${item_2.blockType} (${item_2.tag})`;
        block.style.gridColumnStart = 2;

        if (item_2.difference == 0) {
            block.style.gridRowStart = 1;
        } else if (item_2.difference < 0) {
            block.style.gridRowStart = 3;
        } else if (item_2.difference > 0) {
            block.style.gridRowStart = 5;
        }

        root.append(block);
        if (!item_1) {
            const clone = block.cloneNode(true);
            clone.setAttribute('fantom', true);
            clone.style.gridColumnStart = 1;
            root.append(clone);
        }

        const tooltip = renderTooltip(tree);
        block.append(tooltip);
    }
    if (tree.difference == Status.PARTLY) {
        const children = document.createElement("div");
        children.className = "merge-children";
        children.style.gridColumnStart = 1;
        children.style.gridColumnEnd = 3;
        children.style.gridRowStart = 2;
        for (const child of tree.children) {
            renderMerge(children, child)
        }
        root.append(children);
    } else {
        if (item_1) {
            const children = document.createElement("div");
            children.setAttribute('diff', item_1.difference);
            children.className = "block-children";
            children.style.gridColumnStart = 1;
            if (item_1.difference == 0) {
                children.style.gridRowStart = 2;
            } else if (item_1.difference < 0) {
                children.style.gridRowStart = 4;
            } else if (item_1.difference > 0) {
                children.style.gridRowStart = 6;
            }
            for (const child of item_1.children) {
                renderTree(children, child)
            }
            root.append(children);
            if (!item_2) {
                const clone = children.cloneNode(true);
                clone.setAttribute('fantom', true);
                clone.style.gridColumnStart = 2;
                root.append(clone);
            }
        }
        if (item_2) {
            const children = document.createElement("div");
            children.setAttribute('diff', item_2.difference);
            children.className = "block-children";
            children.style.gridColumnStart = 2;
            if (item_2.difference == 0) {
                children.style.gridRowStart = 2;
            } else if (item_2.difference < 0) {
                children.style.gridRowStart = 4;
            } else if (item_2.difference > 0) {
                children.style.gridRowStart = 6;
            }
            for (const child of item_2.children) {
                renderTree(children, child)
            }
            root.append(children);
            if (!item_1) {
                const clone = children.cloneNode(true);
                clone.setAttribute('fantom', true);
                clone.style.gridColumnStart = 1;
                root.append(clone);
            }
        }
    }

    container.append(root);
}

function createRow(className) {
    const row = document.createElement("div");
    row.className = "merge-row";
    const columnNames = [
        'lvl',
        'left_type',
        'left_tag',
        'right_type',
        'right_tag',
        'prop_rate',
        'event_rate',
        'total_rate'
    ];
    const columns = {};
    for (const name of columnNames) {
        const col = document.createElement("div");
        col.setAttribute('name', name);
        col.className = "merge-col";
        if (className) {
            col.className += (' ' + className);
        }
        columns[name] = (col);
        row.append(col);
    }

    return { row, columns }
}
function createTable(container) {
    const table = document.createElement("div");
    table.className = "merge-table";
    container.append(table);
    const { row, columns } = createRow('merge-header');
    columns['lvl'].innerHTML = 'lvl';
    columns['left_type'].innerHTML = 'type';
    columns['left_tag'].innerHTML = 'tag';
    columns['right_type'].innerHTML = 'type';
    columns['right_tag'].innerHTML = 'tag';
    columns['prop_rate'].innerHTML = 'prop';
    columns['event_rate'].innerHTML = 'events';
    columns['total_rate'].innerHTML = 'total';
    table.append(row);
    return table;
}
function renderMergeTable(table, tree, lvl) {
    if (!tree) {
        return;
    }

    const item_1 = tree.items[0];
    const item_2 = tree.items[1];
    const { row, columns } = createRow();
    table.append(row);

    columns['lvl'].innerHTML = lvl;

    if (item_1) {
        columns['left_type'].innerHTML = item_1.blockType;
        columns['left_tag'].innerHTML = item_1.tag;
    }
    if (item_2) {
        columns['right_type'].innerHTML = item_2.blockType;
        columns['right_tag'].innerHTML = item_2.tag;
    }
    if (item_1 && item_2) {
        columns['prop_rate'].innerHTML = `${tree.propRate}%`;
        columns['event_rate'].innerHTML = `${tree.eventRate}%`;
        columns['total_rate'].innerHTML = `${tree.totalRate}%`;
        columns['prop_rate'].style.background = getColor(tree.propRate);
        columns['event_rate'].style.background = getColor(tree.eventRate);
        columns['total_rate'].style.background = getColor(tree.totalRate);
        columns['prop_rate'].style.width = '50px';
        columns['event_rate'].style.width = '50px';
        columns['total_rate'].style.width = '50px';
    } else {
        columns['prop_rate'].style.background = 'rgb(255 255 255)';
        columns['event_rate'].style.background = 'rgb(255 255 255)';
        columns['total_rate'].style.background = 'rgb(255 255 255)';
    }

    if (item_1 && item_2) {
        row.style.background = '#cfc';
    } else if (item_1) {
        row.style.background = '#bcdaff';
    } else {
        row.style.background = '#fffdbc';
    }

    if (tree.difference == Status.PARTLY) {
        for (const child of tree.children) {
            renderMergeTable(table, child, lvl + 1);
        }
    } else {
        if (item_1) {
            for (const child of item_1.children) {
                renderMergeTable(table, {
                    propRate: -1,
                    eventRate: -1,
                    totalRate: -1,
                    items: [child, null],
                }, lvl + 1)
            }
        }
        if (item_2) {
            for (const child of item_2.children) {
                renderMergeTable(table, {
                    propRate: -1,
                    eventRate: -1,
                    totalRate: -1,
                    items: [null, child],
                }, lvl + 1)
            }
        }
    }
}

function parseJson(text, option) {
    const json = JSON.parse(text);
    if (json.config) {
        return parseTree(json.config, option);
    }
    return null;
}

function renderTree(container, tree) {
    if (!tree) {
        return;
    }

    const root = document.createElement("div");
    root.className = "block-container";

    const block = document.createElement("div");
    block.className = "block";
    block.innerHTML = `${tree.blockType} (${tree.tag})`;
    root.append(block);

    if (Array.isArray(tree.children)) {
        const children = document.createElement("div");
        children.className = "block-children";
        children.innerHTML = ``;
        for (const child of tree.children) {
            renderTree(children, child)
        }
        root.append(children);
    }

    container.append(root);
}

function onChange(target, container, option) {
    const tree = parseJson(target.value, option);
    container.innerHTML = '';
    renderTree(container, tree);
    return tree;
}

function onCompare(container, tree_1, tree_2, option) {
    const item_1 = JSON.parse(JSON.stringify(tree_1));
    const item_2 = JSON.parse(JSON.stringify(tree_2));
    const tree = compare(item_1, item_2, option);
    container.innerHTML = '';
    // renderMerge(container, tree);
    renderMergeTable(createTable(container), tree, 1);
    return tree;
}

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        tree_1: null,
        tree_2: null,
        tree_3: null,
    }
    const option = {
        isProp: 2,
        isChild: 2,
        isEvent: 1
    }

    const event_rate = document.getElementById("event_rate");
    const prop_rate = document.getElementById("prop_rate");
    const child_rate = document.getElementById("child_rate");

    event_rate.addEventListener('change', event => {
        event.preventDefault();
        option.isEvent = event.target.value;
        state.tree_1 = onChange(json_1, tree_container_1, option);
        state.tree_2 = onChange(json_2, tree_container_2, option);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2, option);
    });
    prop_rate.addEventListener('change', event => {
        event.preventDefault();
        option.isProp = event.target.value;
        state.tree_1 = onChange(json_1, tree_container_1, option);
        state.tree_2 = onChange(json_2, tree_container_2, option);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2, option);
    });
    child_rate.addEventListener('change', event => {
        event.preventDefault();
        option.isChild = event.target.value;
        state.tree_1 = onChange(json_1, tree_container_1, option);
        state.tree_2 = onChange(json_2, tree_container_2, option);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2, option);
    });

    const json_1 = document.getElementById("json_1");
    const tree_container_1 = document.getElementById("tree_container_1");
    const json_2 = document.getElementById("json_2");
    const tree_container_2 = document.getElementById("tree_container_2");
    const tree_container_3 = document.getElementById("tree_container_3");

    json_1.addEventListener('change', event => {
        event.preventDefault();
        state.tree_1 = onChange(json_1, tree_container_1, option);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2, option);
    });
    json_2.addEventListener('change', event => {
        event.preventDefault();
        state.tree_2 = onChange(json_2, tree_container_2, option);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2, option);
    });

    state.tree_1 = onChange(json_1, tree_container_1, option);
    state.tree_2 = onChange(json_2, tree_container_2, option);
    state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2, option);
})