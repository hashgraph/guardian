/**
 * ACM0010 — Project Transport Emissions, PE_transport,y
 *
 * CustomLogicBlock expression for Guardian.
 *
 * PE_transport,y = SUM_j [ D_j * FC_j * EF_fuel_j * GWP_CO2 / 1000 ]
 *
 * Where:
 *   D_j        = annual transport distance for transport type j (km/yr)
 *   FC_j       = fuel consumption per km for transport type j (L/km)
 *   EF_fuel_j  = CO2 emission factor for the fuel type (kg CO2/L)
 *   GWP_CO2    = global warming potential of CO2 (tCO2e/tCO2, typically 1)
 *
 * Transport emissions from moving manure to treatment facilities.
 * Gated OFF unless the project declares transportActivity.
 */

(function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const parameters = project.parameters || {};
    const transport = project.transportActivity;

    // Gate: no transport activity declared -> no output.
    if (!transport) {
        done(null);
        return;
    }

    const gwpCo2 = parameters.globalWarmingPotentialCo2;
    if (!(gwpCo2 > 0)) {
        throw new Error('parameters.globalWarmingPotentialCo2 must be > 0 for PE_transport,y');
    }

    if (!Array.isArray(transport.transportTypes) || transport.transportTypes.length < 1) {
        throw new Error('transportActivity.transportTypes must be a non-empty array');
    }

    const transportBreakdown = [];
    let totalKgCo2 = 0;

    transport.transportTypes.forEach(function (entry) {
        const distance = entry.distanceKmPerYear;
        if (!(distance >= 0)) {
            throw new Error('distanceKmPerYear must be >= 0 for transport type ' + entry.name);
        }

        const fuelConsumption = entry.fuelConsumptionLPerKm;
        if (!(fuelConsumption >= 0)) {
            throw new Error('fuelConsumptionLPerKm must be >= 0 for transport type ' + entry.name);
        }

        const efFuel = entry.co2EmissionFactorKgCo2PerL;
        if (!(efFuel >= 0)) {
            throw new Error('co2EmissionFactorKgCo2PerL must be >= 0 for transport type ' + entry.name);
        }

        const kgCo2 = distance * fuelConsumption * efFuel;
        totalKgCo2 += kgCo2;

        transportBreakdown.push({
            name: entry.name,
            distanceKmPerYear: distance,
            fuelConsumptionLPerKm: fuelConsumption,
            co2EmissionFactorKgCo2PerL: efFuel,
            transportEmissionsKgCo2: kgCo2,
        });
    });

    const totalTCo2e = (totalKgCo2 * gwpCo2) / 1000;

    done({
        ref: project.id,
        year: project.monitoringYear,
        transportBreakdown: transportBreakdown,
        totalTransportEmissionsKgCo2: totalKgCo2,
        globalWarmingPotentialCo2: gwpCo2,
        projectEmissionsTransportTCo2e: totalTCo2e,
    });
})();