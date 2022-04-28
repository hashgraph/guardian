const { expect, assert } = require('chai');
const { configAPI } = require('../../dist/api/config.service');
const {
    createChannel,
    createTable,
    checkMessage,
    checkError
} = require('./helper');
const { ApplicationState, ApplicationStates } = require('interfaces');

describe('Config service', function () {
    let service, channel, settingsRepository, topicRepository;

    const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
    const GET_TOPIC = 'UPDATE_SETTINGS';
    const GET_SETTINGS = 'GET_SETTINGS';


    before(async function () {
        const state = new ApplicationState();
        state.updateState(ApplicationStates.READY);

        channel = createChannel();
        settingsRepository = createTable();
        topicRepository = createTable();

        topicRepository.findOne = async function (param) {
            return param;
        }

        service = configAPI(channel, settingsRepository, topicRepository);
    });

    it('Config service init', async function () {
        assert.exists(channel.map[UPDATE_SETTINGS]);
        assert.exists(channel.map[GET_TOPIC]);
        assert.exists(channel.map[GET_SETTINGS]);
    });

    it('Test UPDATE_SETTINGS', async function () {

    });

    it('Test GET_SETTINGS', async function () {

    });

    it('Test GET_TOPIC', async function () {
        value = await channel.run(GET_TOPIC, {
            type: 'type',
            owner: 'owner'
        });
        checkMessage(value, null);
    });
});
