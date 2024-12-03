
class SiteLocation {
    constructor(address, lat, lon) {
        this.address = address;
        this.lat = lat;
        this.lon = lon;
    }
}

class Equipment {
    constructor(id, group, units, eq_type, name, accuracy, installed, serial_no, manufacturer) {
        this.id = id;
        this.group = group;
        this.units = units;
        this.eqType = eq_type;
        this.name = name;
        this.accuracy = accuracy;
        this.installed = installed;
        this.serialNo = serial_no;
        this.manufacturer = manufacturer;
    }
}

class ProjectInfo {
    constructor(project_type, id, methodology, developer) {
        this.type = project_type;
        this.projectId = id;
        this.methodology = methodology;
        this.projectDev = developer;
    }
}

class NewSite {
    constructor(id, name, location, sensors, project, announcement) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.sensors = sensors;
        this.project = project;
        this.announcement = announcement;
    }
}

class NewStreamRequest {
    constructor(sub_identifier, author, address, project, credentials) {
        this.subIdentifier = sub_identifier;
        this.author = author;
        this.address = address;
        this.project = project;
        this.credentials = credentials;
    }
}

class MockSensorData {
    constructor(id, value, timestamp) {
        this.id = id;
        this.value = value;
        this.timestamp = timestamp;
    }
}

const makeMockSensorData = () => {
    return new MockSensorData(
        "Flow_Meter_4.3",
        Math.random() * (400000.00 - 339999.99) + 339999.99,
        new Date()
    )
};

class DataSendRequest {
    constructor(site, topic, data) {
        this.site = site
        this.topic = topic
        this.data = data
    }
}


// This function is used to create a new site request with the Demo Molina Project site
const createNewSiteRequest = (sub_identifier, auth_identifier, announcement, id) => {
    const location = new SiteLocation(
        "Km 205, Route 5 South, San Pedro Lote D Fund, Molina, Curicó",
        -35.091408,
        -71.313095
    );

    const sensors = [
        ["Flow_Meter_4.3", new Equipment("FIQ_4_3.Totalizador", "Flowmeters", "Nm3/hour", "Esters GD300-12527SIR1000-V4-P0R0", "Flowmeter 4.3", 1.5, 2016, "1506 A 11426", "Esters Elektronik")],
        ["Flow_Meter_4.4", new Equipment("FIQ_4_4.Totalizador", "Flowmeters", "Nm3/hour", "Esters GD300-12527SIR1000-V4-P0R0", "Flowmeter 4.4", 1.5, 2016, "1506 A 11425", "Esters Elektronik")],
        ["Feedstock", new Equipment("Feedstock", "Manual", "Tonnes", "Liquid industrial waste", "Feedstock", 0.0, 0, "", "")],
        ["Grape Harvest", new Equipment("Grape Harvest", "Manual", "Tonnes", "Agricultural Residue", "Grape Harvest", 0.0, 0, "", "")],
        ["Digestors 1 + 2", new Equipment("Digestors 1 + 2", "Manual", "Nm3", "Anaerobic Digester", "Digestors 1 + 2", 0.0, 0, "", "")]
    ];

    const project = new ProjectInfo("CHP Plant", "BEM", "Anaerobic Digestion Process", "Bio E");

    const newSite = new NewSite(
        id,
        "Demo Molina " + id.slice(0, 5),
        location,
        sensors,
        project,
        announcement
    );

    return new NewStreamRequest(
        sub_identifier,
        auth_identifier,
        announcement,
        newSite
    );
};

module.exports = {
    createNewSiteRequest, NewStreamRequest, NewSite, ProjectInfo, Equipment,
    SiteLocation, makeMockSensorData, DataSendRequest
};