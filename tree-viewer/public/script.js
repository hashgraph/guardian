const Status = {
    FULL: 0,
    LEFT: 1,
    RIGHT: 2,
    LEFT_AND_RIGHT: 3,
    PARTLY: 4,
}

function parseTree(json) {
    if (!json) {
        return null;
    }
    const result = {};
    result.children = [];
    if (Array.isArray(json.children)) {
        for (const child of json.children) {
            result.children.push(parseTree(child))
        }
    }
    result.blockType = json.blockType;
    result.tag = json.tag;
    result.weight = new Array(4);

    let hashState;

    hashState = MurmurHash3();
    hashState.hash(result.blockType + result.tag);
    for (const child of result.children) {
        hashState.hash(child.weight[0]);
    }
    result.weight[0] = String(hashState.result());


    hashState = MurmurHash3();
    hashState.hash(result.blockType);
    for (const child of result.children) {
        hashState.hash(child.weight[1]);
    }
    result.weight[1] = String(hashState.result());


    hashState = MurmurHash3();
    hashState.hash(result.blockType + result.tag);
    result.weight[2] = String(hashState.result());


    hashState = MurmurHash3();
    hashState.hash(result.blockType);
    for (const child of result.children) {
        hashState.hash(child.blockType);
    }
    result.weight[3] = String(hashState.result());

    return result;
}



function mapping(result, child, iteration) {
    for (let i = 0; i < result.length; i++) {
        const element = result[i];
        if (element[0] == child.blockType && element[1] && !element[2]) {
            if(iteration < element[1].weight.length) {
                if (element[1].weight[iteration] == child.weight[iteration]) {
                    element[2] = child;
                    return true;
                }
            } else {
                element[2] = child;
                return true;
            }
        }
    }
    return false;

}

function merge(children_1, children_2) {
    const result = [];
    for (const child of children_1) {
        result.push([child.blockType, child, null]);
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
            result.splice(i, 0, [child.blockType, null, child]);
        }
    }

    const children = [];
    for (const item of result) {
        children.push(compare(item[1], item[2]));
    }
    return children;

    // const max = Math.max(children_1?.length, children_2?.length);
    // const children = [];
    // for (let i = 0; i < max; i++) {
    //     children.push(compare(children_1[i], children_2[i]));
    // }
    // return children;
}

function compare(tree_1, tree_2) {
    if (tree_1 && !tree_2) {
        tree_1.difference = -1;
        return {
            difference: Status.LEFT,
            items: [tree_1, null],
            children: []
        }
    }
    if (!tree_1 && tree_2) {
        tree_2.difference = 1;
        return {
            difference: Status.RIGHT,
            items: [null, tree_2],
            children: []
        }
    }
    if (tree_1.weight == tree_2.weight) {
        tree_1.difference = 0;
        tree_2.difference = 0;
        return {
            difference: Status.FULL,
            items: [tree_1, tree_2],
            children: []
        }
    } else {
        if (tree_1.blockType == tree_2.blockType) {
            tree_1.difference = 0;
            tree_2.difference = 0;
            const children = merge(tree_1.children, tree_2.children);
            return {
                difference: Status.PARTLY,
                items: [tree_1, tree_2],
                children: children
            }
        } else {
            tree_1.difference = -1;
            tree_2.difference = 1;
            return {
                difference: Status.LEFT_AND_RIGHT,
                items: [tree_1, tree_2],
                children: []
            }
        }
    }
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
        block.className = "block";
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
        if(!item_2) {
            const clone = block.cloneNode(true);
            clone.setAttribute('fantom', true);
            clone.style.gridColumnStart = 2;
            root.append(clone);
        }
    }
    if (item_2) {
        const block = document.createElement("div");
        block.setAttribute('diff', item_2.difference);
        block.className = "block";
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
        if(!item_1) {
            const clone = block.cloneNode(true);
            clone.setAttribute('fantom', true);
            clone.style.gridColumnStart = 1;
            root.append(clone);
        }
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
            if(!item_2) {
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
            if(!item_1) {
                const clone = children.cloneNode(true);
                clone.setAttribute('fantom', true);
                clone.style.gridColumnStart = 1;
                root.append(clone);
            }
        }
    }

    container.append(root);
}


function parseJson(text) {
    const json = JSON.parse(text);
    if (json.config) {
        return parseTree(json.config);
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

function onChange(target, container) {
    const tree = parseJson(target.value);
    container.innerHTML = '';
    renderTree(container, tree);
    return tree;
}

function onCompare(container, tree_1, tree_2) {
    const item_1 = JSON.parse(JSON.stringify(tree_1));
    const item_2 = JSON.parse(JSON.stringify(tree_2));
    const tree = compare(item_1, item_2);
    container.innerHTML = '';
    renderMerge(container, tree);
    return tree;
}

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        tree_1: null,
        tree_2: null,
        tree_3: null,
    }

    const json_1 = document.getElementById("json_1");
    const tree_container_1 = document.getElementById("tree_container_1");
    const json_2 = document.getElementById("json_2");
    const tree_container_2 = document.getElementById("tree_container_2");
    const tree_container_3 = document.getElementById("tree_container_3");

    json_1.addEventListener('change', event => {
        event.preventDefault();
        state.tree_1 = onChange(json_1, tree_container_1);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2);
    });
    state.tree_1 = onChange(json_1, tree_container_1);

    json_2.addEventListener('change', event => {
        event.preventDefault();
        state.tree_2 = onChange(json_2, tree_container_2);
        state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2);
    });
    state.tree_2 = onChange(json_2, tree_container_2);

    state.tree_3 = onCompare(tree_container_3, state.tree_1, state.tree_2);
})