import express from "express";
import bodyParser from "body-parser";
import path from "path";
import * as fs from "fs";

import axios from "axios";

process.on("uncaughtException", (error) => {
    if(error.message === "read ECONNRESET") return;
    console.error(`Caught Unhandled Exception`);
    console.dir(error != null ? error.stack : error);
});

process.on("unhandledRejection", (error) => {
    console.error(`Caught Unhandled Rejection`);
    console.dir(error != null ? error.stack : error);
});

const app = express();
const port = 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/frontend", express.static(path.resolve("frontend")));

app.get("*", (req, res) => {
    return res.sendFile(path.resolve("./frontend/index.html"));
});

app.post("/getNewPlans", async(req, res) => {
    const atlDepartures = (await axios.get("https://data.vatsim.net/v3/vatsim-data.json")).data["pilots"].filter((pilot) => pilot["flight_plan"] !== null && pilot["flight_plan"].departure == "KATL" && isAtATL(pilot["latitude"], pilot["longitude"]));
    const stripsToPrint = checkForPrintedStrips(atlDepartures);
    let formattedStrips = [];

    for(let i = 0; i < stripsToPrint.length; i++) {
        let strip = stripsToPrint[i];
        formattedStrips.push([
            strip["callsign"], //0
            strip["flight_plan"].revision_id > 1 ? strip["flight_plan"].revision_id - 1 : false, //1
            getGate(formatRoute(strip["flight_plan"].route)[0]), //2
            formatAcType(strip["flight_plan"].aircraft_faa), //3
            getCID(strip["flight_plan"].remarks), //4
            strip["flight_plan"].assigned_transponder, //5
            "P" + strip["flight_plan"].deptime, //6
            formatAltitude(strip["flight_plan"].altitude), //7
            "KATL " + formatRoute(strip["flight_plan"].route)[0], //8
            strip["flight_plan"].arrival, //9
            " " + formatRemarks(strip["flight_plan"].remarks)[0], //10
            strip["cid"], //11
            formatRoute(strip["flight_plan"].route)[1], //12 (2nd line arrival?)
            formatRemarks(strip["flight_plan"].remarks)[1] //13
        ]);
    }

    return res.send([])//formattedStrips);
});

app.post("/printCallsign", async(req, res) => {
    let strip = (await axios.get("https://data.vatsim.net/v3/vatsim-data.json")).data["pilots"].filter((pilot) => pilot["flight_plan"] !== null && pilot["callsign"] == req.body.callsign)[0];
    if(strip == undefined || strip == null) return res.send("callsign not found");
    if(strip.length === 0) return res.send("callsign not found");
    const formattedStrip = [
        strip["callsign"], //0
        strip["flight_plan"].revision_id > 1 ? strip["flight_plan"].revision_id - 1 : false, //1
        getGate(formatRoute(strip["flight_plan"].route)[0]), //2
        formatAcType(strip["flight_plan"].aircraft_faa), //3
        getCID(strip["flight_plan"].remarks), //4
        strip["flight_plan"].assigned_transponder, //5
        "P" + strip["flight_plan"].deptime, //6
        formatAltitude(strip["flight_plan"].altitude), //7
        "KATL " + formatRoute(strip["flight_plan"].route)[0], //8
        strip["flight_plan"].arrival, //9
        " " + formatRemarks(strip["flight_plan"].remarks)[0], //10
        strip["cid"], //11
        formatRoute(strip["flight_plan"].route)[1], //12 (2nd line arrival?)
        formatRemarks(strip["flight_plan"].remarks)[1] //13
    ];

    return res.send(formattedStrip);
})

app.use((error, req, res, next) => {
    if(error) {
        console.error("Error during API call", error);
        return res.send("callsign not found");
    }
    return next();
});

app.listen(port, () => {
    console.log(`App running on port ${port}`);
});

const getCID = (remarks) => {
    remarks = remarks.toLowerCase();
    let r1 = Math.floor(Math.random() * 10);
    let r2 = Math.floor(Math.random() * 10);
    let r3 = Math.floor(Math.random() * 10);

    if(remarks.includes("blind") || remarks.includes("vision")) r2 = "B";
    if(remarks.includes("/t/")) r3 = "T";
    if(remarks.includes("/r/")) r3 = "R";

    return `${r1}${r2}${r3}`;
}

const checkForPrintedStrips = (atlDepartures) => {
    const printedStrips = JSON.parse(fs.readFileSync("./printed_strips.json"));
    const newStrips = atlDepartures.map(plan => plan["callsign"]);

    //Check for new data with different revision_id
    const updatedStrips = atlDepartures.filter(plan => {
        const printedStrip = printedStrips.find(printedStrip => printedStrip["callsign"] == plan["callsign"]);
        return !printedStrip || printedStrip["flight_plan"].revision_id !== plan["flight_plan"].revision_id;
    });

    //Filter printed strips to keep up-to-date data
    const final = printedStrips.filter(printedStrip => newStrips.includes(printedStrip["callsign"]))
    .map(printedStrip => {
        const newStrip = atlDepartures.find(strip => strip["callsign"] == printedStrip["callsign"]);
        return newStrip ? { ...printedStrip, flight_plan: { ...printedStrip["flight_plan"], revision_id: newStrip["flight_plan"].revision_id } } : printedStrip;
    });
    final.push(...updatedStrips.filter(strip => !final.some(printedStrip => printedStrip["callsign"] == strip["callsign"])));

    fs.writeFileSync("./printed_strips.json", JSON.stringify(final, null, 2));

    return updatedStrips;
}

const getGate = (route) => {
    const gates = {
        "PENCL": "N3",
        "VARNM": "N5",
        "PADGT": "N4",
        "SMKEY": "N6",

        "PLMMR": "E3",
        "JACCC": "E5",
        "PHIIL": "E4",
        "GAIRY": "E6",

        "VRSTY": "S3",
        "SMLTZ": "S5",
        "BANNG": "S4",
        "HAALO": "S6",

        "POUNC": "W3",
        "KAJIN": "W5",
        "NASSA": "W4",
        "CUTTN": "W6"
    }

    let sid = route.split(" ")[0].substring(0,5);
    return gates[sid] ?? false;
}

const formatRoute = (route) => {
    route = route.toUpperCase().replace("DCT", "")
    route = route.replace("KATL", "")
    route = route.trim();
    route = route.replace(".", " ");
    route = route.split(" ").map(a => {
        if(a.includes("/")) return a.split("/")[0];
        return a;
    }).join(" ");
    let tooBig = route.split(" ");
    if(tooBig.length >= 4) route = tooBig.slice(0,3).join(" ") + " . / ."

    return [route, tooBig.length >= 4 ? true : false];
}

const formatRemarks = (remarks) => {
    remarks = remarks.replace("  ", " ");
    remarks = remarks.replace("/V/", "");
    remarks = remarks.replace("/T/", "");
    remarks = remarks.replace("/R/", "");
    if(remarks.trim().length == 0) return "";

    if(remarks.includes("RMK/")) remarks = remarks.split("RMK/")[1];

    if(remarks.length > 25) remarks = remarks.substring(0,25).slice(0, -3) + "***";
    remarks = remarks.trim();

    return [remarks, remarks.length > 0 ? true : false];
}

const formatAltitude = (altitude) => {
    let formatted = Math.floor(altitude / 100).toString();
    while (formatted.length < 3) formatted = "0" + formatted;

    return formatted;
}

const formatAcType = (acType) => {
    acType = acType.replace("H/", "");
    acType = acType.replace("J/", "");

    acType = acType + "/";
    if(JSON.parse(fs.readFileSync("./acft_database.json"))["aircraft"][acType.toUpperCase().split("/")[0]]) acType = JSON.parse(fs.readFileSync("./acft_database.json"))["aircraft"][acType.toUpperCase().split("/")[0]].recat + "/" + acType;

    return acType.slice(0,-1);
}

const isAtATL = (lat, long) => {
    const fence = 0.026079;

    const northernLat = 33.63669961 + fence;
    const westernLong = (-84.427864) - fence;

    const southernLat = 33.63669961 - fence;
    const easternLong = (-84.427864) + fence;

    if((lat < northernLat && lat > southernLat) && (long > westernLong && long < easternLong)) return true;
    return false;
}