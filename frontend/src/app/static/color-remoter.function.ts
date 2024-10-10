function componentToHex(c: number) {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r: number, g: number, b: number) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex: string) {
    let result = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i.exec(hex); //#RGB
    if (!result) {
        result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    }//#RRGGBB
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function colorToGradientWithA(hex: string, a: number) {
    const rgbData = hexToRgb(hex);
    const rgb = `rgb(${rgbData?.r},${rgbData?.g},${rgbData?.b})`;
    const rgba = `rgba(${rgbData?.r},${rgbData?.g},${rgbData?.b},${a})`;
    return `linear-gradient(174deg, ${rgb} 4.61%, ${rgba} 128.14%), #FFF`;
}

export function colorToGradient(hex: string, hex1: string) {
    const rgbData = hexToRgb(hex);
    const rgbData1 = hexToRgb(hex1);
    const rgb = `rgb(${rgbData?.r},${rgbData?.g},${rgbData?.b})`;
    const rgb1 = `rgb(${rgbData1?.r},${rgbData1?.g},${rgbData1?.b})`;

    return `linear-gradient(174deg, ${rgb} 4.61%, ${rgb1} 128.14%), #FFF`;
}
