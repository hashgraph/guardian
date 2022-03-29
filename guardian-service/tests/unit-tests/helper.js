'use strict';

const { assert } = require('chai');

function createChannel() {
    let channel;
    channel = {
        value: null,
        map: {},
        response: function (name, callback) {
            channel.map[name] = callback
        },
        run: async function (name, param) {
            await channel.map[name]({
                payload: param
            }, channel);
            return channel.value;
        },
        send: function (value) {
            channel.value = value;
        }
    };
    return channel;
}

function createTable() {
    return {
        findOne: async function (id) {
            return id;
        },
        find: async function (filters) {
            return filters;
        },
        update: async function (id, item) {
            return [id, item];
        },
        create: function (item) {
            item._id = '1';
            return item;
        },
        save: async function (item) {
            return item;
        }
    };
}

function checkMessage(result, value, text) {
    if(!result) {
        assert.fail(text);
    }
    if(result.error) {
        assert.fail(result.error);
    }
    if(result.body != value) {
        assert.deepEqual(result.body, value, text);
    }
}

function checkError(result, value, text) {
    if(!result) {
        assert.fail(text || value);
    }
    if(!result.error) {
        assert.fail(text || value);
    }
    if(result.error != value) {
        assert.equal(result.error, value, text);
    }
}

module.exports.createChannel = createChannel;
module.exports.createTable = createTable;
module.exports.checkMessage = checkMessage;
module.exports.checkError = checkError;