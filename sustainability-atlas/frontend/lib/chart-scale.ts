export interface NiceAxis {
    max: number;
    ticks: number[];
}

// "Nice" round axis scale (0..niceMax, step 1/2/5/10…) for bar charts with no
// inherent target/goal — bars are plotted against a clean rounded scale
// rather than each other, so the axis reads as real numbers rather than
// relative-to-top-item percentages. Originally written for the Top SDGs bar
// chart's x-axis; extracted here so any bar chart can share it.
export function niceAxis(rawMax: number, tickCount = 4): NiceAxis {
    if (rawMax <= 0) return { max: 1, ticks: [0, 1] };
    const rawStep = rawMax / tickCount;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const residual = rawStep / magnitude;
    const step = Math.max(1, Math.round(
        residual > 5 ? 10 * magnitude : residual > 2 ? 5 * magnitude : residual > 1 ? 2 * magnitude : magnitude,
    ));
    const max = Math.ceil(rawMax / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= max; v += step) ticks.push(v);
    return { max, ticks };
}
