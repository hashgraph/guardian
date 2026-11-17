/**
 * ACM0010 — Project Flare Emissions, PE_flare,y
 *
 * CustomLogicBlock expression for Guardian.
 *
 * PE_flare,y = SUM_i [ MCF_flare * EF_CH4 * Q_flare,i * GWP_CH4 / 1000 ]
 *
 * Where:
 *   MCF_flare  = flaring methane conversion factor (dimensionless, 0-1)
 *   EF_CH4     = CH4 emission factor for the flaring system (kg CH4/m3)
 *   Q_flare,i  = annual methane volume flared per livestock type i (m3 CH4/yr)
 *   GWP_CH4    = global warming potential of methane (tCO2e/tCH4)
 *
 * The formula follows the ACM0010 v9.0 methodology framework for project-side
 * methane emissions from flaring systems. Gated OFF unless the project declares
 * flareActivity in the project description.
 */

(function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const parameters = project.parameters || {};
    const flare = project.flareActivity;

    // Gate: no flare activity declared -> no output.
    if (!flare) {
        done(null);
        return;
    }

    const gwpCh4 = parameters.globalWarmingPotentialCh4;
    if (!(gwpCh4 > 0)) {
        throw new Error('parameters.globalWarmingPotentialCh4 must be > 0 for PE_flare,y');
    }

    const mcfFlare = flare.methaneConversionFactor;
    if (!(mcfFlare >= 0 && mcfFlare <= 1)) {
        throw new Error('flareActivity.methaneConversionFactor must be within [0, 1]');
    }

    const efCh4 = flare.emissionFactorKgCh4PerM3;
    if (!(efCh4 >= 0)) {
        throw new Error('flareActivity.emissionFactorKgCh4PerM3 must be >= 0');
    }

    const livestockFlare = project.livestock || [];
    if (!Array.isArray(livestockFlare) || livestockFlare.length < 1) {
        throw new Error('at least one livestock type is required for PE_flare,y');
    }

    const flareBreakdown = [];
    let totalKgCh4 = 0;

    livestockFlare.forEach(function (entry) {
        const qFlare = entry.flaredMethaneVolumeM3PerYear;
        if (!(qFlare >= 0)) {
            throw new Error('flaredMethaneVolumeM3PerYear must be >= 0 for livestock type ' + entry.type);
        }

        const kgCh4 = mcfFlare * efCh4 * qFlare;
        totalKgCh4 += kgCh4;

        flareBreakdown.push({
            type: entry.type,
            flaredMethaneVolumeM3PerYear: qFlare,
            methaneEmissionsKgCh4: kgCh4,
        });
    });

    const totalTCo2e = (totalKgCh4 * gwpCh4) / 1000;

    done({
        ref: project.id,
        year: project.monitoringYear,
        flareMethaneConversionFactor: mcfFlare,
        flareEmissionFactorKgCh4PerM3: efCh4,
        flareBreakdown: flareBreakdown,
        totalFlaringEmissionsKgCh4: totalKgCh4,
        globalWarmingPotentialCh4: gwpCh4,
        projectEmissionsFlaringTCo2e: totalTCo2e,
    });
})();