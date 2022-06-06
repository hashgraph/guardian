const HEDERA_ROOT = "https://testnet.mirrornode.hedera.com";
const HEDERA_TOPIC_API = `${HEDERA_ROOT}/api/v1/topics/`;
const HEDERA_MESSAGE_API = `${HEDERA_ROOT}/api/v1/topics/messages`;

function parsBuffer(buffer) {
    try {
        return JSON.parse(buffer);
    } catch (error) {
        return buffer;
    }
}

async function getMessages(url) {
    try {
        const result = await fetch(url);
        if (result.status === 200) {
            const data = await result.json();
            const r = [];
            const messages = data.messages;
            if (messages.length === 0) {
                return r;
            }
            for (let i = 0; i < messages.length; i++) {
                const buffer = atob(messages[i].message);
                const id = messages[i].consensus_timestamp;
                const payer = messages[i].payer_account_id;
                const topicId = messages[i].topic_id;
                r.push({
                    id: id,
                    buffer: buffer,
                    message: parsBuffer(buffer),
                    payer: payer,
                    topicId: topicId
                });
            }
            if(data.links && data.links.next) {
                const next = await getMessages( `${HEDERA_ROOT}${data.links.next}`);
                for (let i = 0; i < next.length; i++) {
                    r.push(next[i]); 
                }
            }
            return r;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
}

async function getTopicMessages(topicId) {
    return await getMessages(`${HEDERA_TOPIC_API}${topicId}/messages`);
}

async function getMessage(timeStamp) {
    try {
        const result = await fetch(`${HEDERA_MESSAGE_API}/${timeStamp}`);
        if (result.status === 200) {
            const data = await result.json();
            const buffer = atob(data.message);
            const id = data.consensus_timestamp;
            const payer = data.payer_account_id;
            const topicId = data.topic_id;
            return {
                id: id,
                buffer: buffer,
                message: parsBuffer(buffer),
                payer: payer,
                topicId: topicId
            };
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

async function getTopicMessage(topicId, index) {
    try {
        const result = await fetch(`${HEDERA_TOPIC_API}${topicId}/messages/${index + 1}`);
        if (result.status === 200) {
            const data = await result.json();
            const buffer = atob(data.message);
            const id = data.consensus_timestamp;
            const payer = data.payer_account_id;
            const topicId = data.topic_id;
            return {
                id: id,
                buffer: buffer,
                message: parsBuffer(buffer),
                payer: payer,
                topicId: topicId
            };
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

async function getIPFS(url) {
    try {
        const result = await fetch(url);
        if (result.status === 200) {
            return await result.json();
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

async function findTopic(topicId, root) {
    const messages = await getTopicMessages(topicId);
    const topicDiv = renderTopic(root, topicId);
    for (let i = 0; i < messages.length; i++) {
        const item = messages[i];
        renderMessage(topicDiv, item.id, item.message, topicId);
        if (item.message && item.message.type == 'Topic' && item.message.childId) {
            await findTopic(item.message.childId, topicDiv);
        }
    }
}

async function findParentMessages(message, root, messageMap) {
    if (!message) {
        return;
    }
    renderMessage(root, message.id, message.message, message.topicId);
    if (message.message.type == "Topic") {
        if (message.message.rationale) {
            await findMessageById(message.message.rationale, root, messageMap);
            return;
        }
        if (message.message.parentId) {
            await findMessageByIndex(message.message.parentId, 0, root, messageMap);
            return;
        }
        if (message.message.messageType == "USER_TOPIC") {
            await findMessageByIndex(message.topicId, 3, root, messageMap);
            await findMessageByIndex(message.topicId, 1, root, messageMap);
            return;
        }
    }
    if (message.message.type == "VP-Document") {
        if (message.message.relationships && message.message.relationships.length) {
            for (let i = 0; i < message.message.relationships.length; i++) {
                const messageId = message.message.relationships[i];
                await findMessageById(messageId, root, messageMap);
            }
            return;
        }
        await findMessageByIndex(message.topicId, 0, root, messageMap);
        return;
    }
    if (message.message.type == "VC-Document") {
        if (message.message.relationships && message.message.relationships.length) {
            for (let i = 0; i < message.message.relationships.length; i++) {
                const messageId = message.message.relationships[i];
                await findMessageById(messageId, root, messageMap);
            }
            return;
        }
        await findMessageByIndex(message.topicId, 0, root, messageMap);
        return;
    }
    await findMessageByIndex(message.topicId, 0, root, messageMap);
}

async function findMessageById(messageId, root, messageMap) {
    if (messageMap[messageId]) {
        return null;
    }
    messageMap[messageId] = true;
    const message = await getMessage(messageId);
    await findParentMessages(message, root, messageMap);
}

async function findMessageByIndex(topicId, index, root, messageMap) {
    const messageId = `${topicId}/${index}`;
    if (messageMap[messageId]) {
        return null;
    }
    messageMap[messageId] = true;
    const message = await getTopicMessage(topicId, index);
    await findParentMessages(message, root, messageMap);
}

async function findMessage(messageId, root) {
    const messageMap = {};
    findMessageById(messageId, root, messageMap);
}

function render(value, type) {
    const table = document.getElementById('results');
    table.innerHTML = '';
    if (type == 'topic') {
        findTopic(value, table);
    } else {
        findMessage(value, table);
    }
}

function renderTopic(container, topicId) {
    const topicDiv = document.createElement("div");
    topicDiv.className = "topic max";
    container.append(topicDiv);

    const topicNameDiv = document.createElement("div");
    topicNameDiv.className = "topic-name";
    topicNameDiv.innerHTML = `topic(${topicId})`;
    topicDiv.append(topicNameDiv);
    topicNameDiv.addEventListener('click', event => {
        event.preventDefault();
        topicDiv.className =
            topicDiv.className === "topic max" ? "topic min" : "topic max";
    })

    return topicDiv;
}

function renderMessage(container, id, message, topicId) {
    const topicMessageDiv = document.createElement("div");
    topicMessageDiv.className = `topic-message type-${message.type} action-${message.action}`;
    container.append(topicMessageDiv);

    const messageNameDiv = document.createElement("div");
    messageNameDiv.className = "message-name";
    messageNameDiv.innerHTML = `message(${id}): ${message.type}: ${message.action}`;
    topicMessageDiv.append(messageNameDiv);

    const messageTopicNameDiv = document.createElement("div");
    messageTopicNameDiv.className = "message-topic-name";
    messageTopicNameDiv.innerHTML = `topic(${topicId})`;
    topicMessageDiv.append(messageTopicNameDiv);

    const messageBodyDiv = document.createElement("div");
    messageBodyDiv.className = "message-body";
    messageBodyDiv.innerHTML = JSON.stringify(message, null, 4);
    topicMessageDiv.append(messageBodyDiv);

    const messageIPFSDiv = document.createElement("div");
    messageIPFSDiv.className = "message-ipfs";

    messageNameDiv.addEventListener('click', event => {
        event.preventDefault();
        messageBodyDiv.className =
            messageBodyDiv.className === "message-body" ? "message-body max" : "message-body";
        messageIPFSDiv.className =
            messageIPFSDiv.className === "message-ipfs" ? "message-ipfs max" : "message-ipfs";
    });

    if (message.url) {
        getIPFS(message.url).then((data) => {
            messageIPFSDiv.innerHTML = JSON.stringify(data, null, 4);
            topicMessageDiv.append(messageIPFSDiv);
        });
    }
}

function setValue(value) {
    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type') || 'topic';
    searchParams.set('type', type);
    if (type == 'topic') {
        searchParams.set('topic', value);
    } else {
        searchParams.set('message', value);
    }
    window.location.search = searchParams.toString();
}

function setType(type) {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('type', type);
    window.location.search = searchParams.toString();
}

function getValue(type) {
    const searchParams = new URLSearchParams(location.search);
    const _type = type || searchParams.get('type') || 'topic';
    if (_type == 'topic') {
        return searchParams.get('topic');
    } else {
        return searchParams.get('message');
    }
}

function getType() {
    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type') || 'topic';
    return type;
}

function setValueType(value, type) {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('type', type);
    if (type == 'topic') {
        searchParams.set('topic', value);
    } else {
        searchParams.set('message', value);
    }
    window.location.search = searchParams.toString();
}

function isValid(value, type) {
    if (type == 'topic') {
        return !!(value && (/^\d\.\d\.\d\d\d\d\d\d\d\d$/).test(value));
    } else if (type == 'message') {
        return !!(value && (/^\d\d\d\d\d\d\d\d\d\d\.\d\d\d\d\d\d\d\d\d$/).test(value));
    }
    return false;
}

function checkType(value, type) {
    if ((value && (/^\d\.\d\.\d\d\d\d\d\d\d\d$/).test(value))) {
        return 'topic';
    }
    if ((value && (/^\d\d\d\d\d\d\d\d\d\d\.\d\d\d\d\d\d\d\d\d$/).test(value))) {
        return 'message';
    }
    return type;
}

document.addEventListener('DOMContentLoaded', () => {
    const type = getType();
    const value = getValue();
    if (isValid(value, type)) {
        render(value, type);
    }

    const inputElement = document.getElementById("input");
    inputElement.value = value;

    const inputTypeElement = document.getElementById("inputType");
    inputTypeElement.value = type;

    inputElement.addEventListener('input', event => {
        event.preventDefault();
        const value = inputElement.value;
        const type = checkType(value, inputTypeElement.value);
        inputTypeElement.value = type;
        if (isValid(value, type)) {
            setValueType(value, type);
            render(value, type);
        }
    });

    inputTypeElement.addEventListener('change', event => {
        event.preventDefault();
        const type = inputTypeElement.value;
        const value = getValue(type);
        if (isValid(value, type)) {
            setValueType(value, type);
            render(value, type);
        }
    });

    const collapseAll = document.getElementById("collapseAll");
    const expandAll = document.getElementById("expandAll");

    collapseAll.addEventListener('click', event => {
        event.preventDefault();  
        const items = document.querySelectorAll('.topic');
        for (let i = 0; i < items.length; i++) {
            const element = items[i];
            element.classList.remove('max');
            element.classList.add('min');
        }
    });

    expandAll.addEventListener('click', event => {
        event.preventDefault();  
        const items = document.querySelectorAll('.topic');
        for (let i = 0; i < items.length; i++) {
            const element = items[i];
            element.classList.remove('min');
            element.classList.add('max');
        }
    });
})