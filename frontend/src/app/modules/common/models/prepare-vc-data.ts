export function prepareVcData(data: any) {
    if (Array.isArray(data)) {
        for (let j = 0; j < data.length; j++) {
            let dataArrayElem = data[j];
            if (dataArrayElem === '' || dataArrayElem === null || dataArrayElem === undefined) {
                data.splice(j, 1);
                j--;
            } else if (
                Array.isArray(dataArrayElem) ||
                Object.getPrototypeOf(dataArrayElem) === Object.prototype
            ) {
                prepareVcData(dataArrayElem);
            }
        }
    }

    if (Object.getPrototypeOf(data) === Object.prototype) {
        let dataKeys = Object.keys(data);
        for (let i = 0; i < dataKeys.length; i++) {
            const dataElem = data[dataKeys[i]];
            if (dataElem === '' || dataElem === null || dataElem === undefined) {
                delete data[dataKeys[i]];
            } else if (
                Array.isArray(dataElem) ||
                Object.getPrototypeOf(dataElem) === Object.prototype
            ) {
                prepareVcData(dataElem);
            }
        }
    }
}