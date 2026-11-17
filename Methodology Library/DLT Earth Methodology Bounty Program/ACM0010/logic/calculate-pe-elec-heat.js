/**
 * ACM0010 — Project Electricity/Heat Emissions, PE_elec/heat,y
 *
 * CustomLogicBlock expression for Guardian.
 *
 * PE_elec/heat,y = SUM_m [ EL_m * EF_elec ] + SUM_n [ HE_n * EF_heat ]
 *
 * Where:
 *   EL_m      = electricity consumption in month m (kWh/month)
 *   EF_elec   = grid electricity emission factor (kg CO2/kWh)
 *   HE_n      = heat consumption in month n (GJ/month)
 *   EF_heat   = heat emission factor (kg CO2/GJ)
 *
 * Electricity and heat consumption from treatment systems.
 * Gated OFF unless the project declares energyActivity.
 */

(function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const parameters = project.parameters || {};
    const energy = project.energyActivity;

    // Gate: no energy activity declared -> no output.
    if (!energy) {
        done(null);
        return;
    }

    const efElectricity = parameters.gridElectricityEmissionFactorKgCo2PerKwh;
    if (!(efElectricity >= 0)) {
        throw new Error('parameters.gridElectricityEmissionFactorKgCo2PerKwh must be >= 0 for PE_elec/heat,y');
    }

    const efHeat = parameters.heatEmissionFactorKgCo2PerGj;
    if (!(efHeat >= 0)) {
        throw new Error('parameters.heatEmissionFactorKgCo2PerGj must be >= 0 for PE_elec/heat,y');
    }

    const MONTHS_IN_YEAR = 12;
    const electricityMonthly = energy.electricityConsumptionKwhPerMonth;
    const heatMonthly = energy.heatConsumptionGjPerMonth;

    if (!Array.isArray(electricityMonthly) || electricityMonthly.length !== MONTHS_IN_YEAR) {
        throw new Error('electricityConsumptionKwhPerMonth must hold exactly 12 monthly values');
    }
    if (!Array.isArray(heatMonthly) || heatMonthly.length !== MONTHS_IN_YEAR) {
        throw new Error('heatConsumptionGjPerMonth must hold exactly 12 monthly values');
    }

    let totalElectricityKgCo2 = 0;
    let totalHeatKgCo2 = 0;

    electricityMonthly.forEach(function (kwh) {
        if (!(kwh >= 0) || !isFinite(kwh)) {
            throw new Error('electricityConsumptionKwhPerMonth must be a finite number >= 0');
        }
        totalElectricityKgCo2 += kwh * efElectricity;
    });

    heatMonthly.forEach(function (gj) {
        if (!(gj >= 0) || !isFinite(gj)) {
            throw new Error('heatConsumptionGjPerMonth must be a finite number >= 0');
        }
        totalHeatKgCo2 += gj * efHeat;
    });

    const totalKgCo2 = totalElectricityKgCo2 + totalHeatKgCo2;
    const totalTCo2e = totalKgCo2 / 1000;

    done({
        ref: project.id,
        year: project.monitoringYear,
        electricityEmissionFactorKgCo2PerKwh: efElectricity,
        heatEmissionFactorKgCo2PerGj: efHeat,
        electricityConsumptionKwhPerMonth: electricityMonthly,
        heatConsumptionGjPerMonth: heatMonthly,
        totalElectricityEmissionsKgCo2: totalElectricityKgCo2,
        totalHeatEmissionsKgCo2: totalHeatKgCo2,
        totalEnergyEmissionsKgCo2: totalKgCo2,
        projectEmissionsElectricityHeatTCo2e: totalTCo2e,
    });
})();