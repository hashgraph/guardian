const HEDERA_TOPIC_API = "https://testnet.mirrornode.hedera.com/api/v1/topics/";
async function getTopicMessages(topicId) {
    try {
        const result = await fetch(`${HEDERA_TOPIC_API}${topicId}/messages`);
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
                r.push({
                    id: id,
                    message: buffer,
                    payer: payer
                });
            }
            return r;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
}

async function find(topicId, root) {
    const messages = await getTopicMessages(topicId);
    const topicDiv = renderTopic(root, topicId);
    for (let i = 0; i < messages.length; i++) {
        const message = JSON.parse(messages[i].message);
        renderMessage(topicDiv, messages[i].id, message, topicId);
        if (message && message.type == 'Topic' && message.childId) {
            await find(message.childId, topicDiv);
        }
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
    topicMessageDiv.className = `topic-message type-${message.type}`;
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

    messageNameDiv.addEventListener('click', event => {
        event.preventDefault();
        messageBodyDiv.className =
            messageBodyDiv.className === "message-body" ? "message-body max" : "message-body";
    })
}

function render(value) {
    if (value) {
        if ((/^\d\.\d\.\d\d\d\d\d\d\d\d$/).test(value)) {
            const table = document.getElementById('results');
            table.innerHTML = '';
            find(value, table);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    var searchParams = new URLSearchParams(location.search);
    var value = searchParams.get('topic');
    render(value);

    const inputElement = document.getElementById("input");
    inputElement.value = value;
    inputElement.addEventListener('input', event => {
        event.preventDefault();
        if ((/^\d\.\d\.\d\d\d\d\d\d\d\d$/).test(event.target.value)) {
            render(event.target.value);
            searchParams.set("topic", event.target.value);
            window.location.search = searchParams.toString();
        }
    })
})