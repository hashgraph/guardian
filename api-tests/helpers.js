const BASE_URL = 'http://localhost:3002/api/v1'

function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time)
    })
}

function GetURL(service, method) {
    return [BASE_URL, service, method].join('/');
}

module.exports = {
    sleep,
    GetURL
}
