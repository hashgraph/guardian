/**
 * VM0010 v1.4 — Equations (17)-(19) - Transport Fuel Calculations
 *
 * Eq (17): N_TRUCKS-TRANSPORT = SUM_{j,i}(V_EX,j,i|BSL * A_i) / CAP_TRUCK; trips
 * Eq (18): KM_TRANSPORT-TOTAL = KM_TRANSPORT * N_TRUCKS-TRANSPORT * 2; km
 * Eq (19): E_TRANSPORT = (KM_TRANSPORT-TOTAL / EFF_VEHICLE) * EF_FUEL; tCO2e
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 8.1.4 pp. 29-31 of VM0010 v1.4. Eqs 17-19 from the equation ledger.
 *
 * INPUTS:
 *   V_EX,j,i|BSL     m3/ha: approved merchantable extraction (P2)
 *   A_i              ha: plot/stratum area (P1)
 *   CAP_TRUCK        m3/trip: truck capacity (P5)
 *   KM_TRANSPORT     km: one-way depot-to-processing distance (P5)
 *   EFF_VEHICLE      km/kL: vehicle fuel efficiency (P5/P10)
 *   EF_FUEL          tCO2e/kL: fuel emission factor (P5/P10)
 *
 * VALIDATION:
 *   - All input parameters must be finite numbers
 *   - CAP_TRUCK must be positive
 *   - EFF_VEHICLE must be positive
 *   - EF_FUEL must be non-negative
 *   - V_EX and A_i must be valid from existing plots
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.strata || !Array.isArray(project.strata) || project.strata.length === 0) {
        throw new Error('project missing strata array or no species/stratum combinations provided');
    }

    if (!project.plotAreas || !Array.isArray(project.plotAreas)) {
        throw new Error('project missing plotAreas array for transport calculation');
    }

    // Build volume*area lookup by species:stratum
    // Eq (17): numerator = SUM_{j,i}(V_EX,j,i|BSL * A_i)
    let totalVolumeAreaProduct = 0;
    const transportDetails = [];

    project.strata.forEach(function (stratum) {
        const j = stratum.species;
        const i = stratum.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const vEx = stratum.treeVolumes ? stratum.treeVolumes.reduce(function (s, v) { return s + v; }, 0) : 0;
        const area = project.plotAreas.find(function (a) { return a.species === j && a.stratum === i; });
        if (!area) {
            throw new Error('no plot area found for species j=' + j + ' stratum i=' + i);
        }
        const a = area.area;

        if (typeof a !== 'number' || Number.isNaN(a) || !Number.isFinite(a)) {
            throw new Error('plot area must be a finite number at species j=' + j + ' stratum i=' + i);
        }
        if (a <= 0) {
            throw new Error('plot area must be positive at species j=' + j + ' stratum i=' + i);
        }

        const volumeAreaProduct = vEx * a;
        totalVolumeAreaProduct += volumeAreaProduct;

        transportDetails.push({
            species: j,
            stratum: i,
            vExJiBsl: vEx,
            areaHa: a,
            volumeAreaProduct: volumeAreaProduct,
        });
    });

    // Eq (17): N_TRUCKS-TRANSPORT = SUM_{j,i}(V_EX,j,i|BSL * A_i) / CAP_TRUCK
    const capTruck = project.capTruck;
    if (typeof capTruck !== 'number' || Number.isNaN(capTruck) || !Number.isFinite(capTruck) || capTruck <= 0) {
        throw new Error('CAP_TRUCK must be a positive number');
    }

    const nTrucksTransport = totalVolumeAreaProduct / capTruck;

    // Eq (18): KM_TRANSPORT-TOTAL = KM_TRANSPORT * N_TRUCKS-TRANSPORT * 2
    const kmTransport = project.kmTransport;
    if (typeof kmTransport !== 'number' || Number.isNaN(kmTransport) || !Number.isFinite(kmTransport) || kmTransport < 0) {
        throw new Error('KM_TRANSPORT must be a non-negative number');
    }

    const kmTransportTotal = kmTransport * nTrucksTransport * 2;

    // Eq (19): E_TRANSPORT = (KM_TRANSPORT-TOTAL / EFF_VEHICLE) * EF_FUEL
    const effVehicle = project.effVehicle;
    if (typeof effVehicle !== 'number' || Number.isNaN(effVehicle) || !Number.isFinite(effVehicle) || effVehicle <= 0) {
        throw new Error('EFF_VEHICLE must be a positive number');
    }

    const efFuel = project.efFuel;
    if (typeof efFuel !== 'number' || Number.isNaN(efFuel) || !Number.isFinite(efFuel) || efFuel < 0) {
        throw new Error('EF_FUEL must be a non-negative number');
    }

    const eTransportTco2e = (kmTransportTotal / effVehicle) * efFuel;

    // Per-journey breakdown matching transportDetails schema: journeyId, distanceKm, fuelPerKm, emissionsTco2e
    const distanceKm = kmTransport * 2;
    const fuelPerKm = 1 / effVehicle;
    const perJourneyEmissions = eTransportTco2e / (transportDetails.length || 1);

    const transportDetailRows = transportDetails.map(function (d, idx) {
        return {
            journeyId: 'journey-' + d.species + '-' + d.stratum,
            distanceKm: distanceKm,
            fuelPerKm: fuelPerKm,
            emissionsTco2e: perJourneyEmissions,
        };
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        nTrucksTransport: nTrucksTransport,
        kmTransportTotal: kmTransportTotal,
        eTransportTco2e: eTransportTco2e,
        transportDetails: transportDetailRows,
    });
}

calc();
