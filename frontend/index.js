$("#callsign-request").submit(function() {
    $.post("/printCallsign", { callsign: $(this).find("input[name='cs']").val() })
    .done(async function(data) {
        if(data === "callsign not found") {
            $("#not-found").html("Callsign not found");
            setTimeout(() => {
                $("#not-found").html("");
            }, 5000);
            return;
        }
        qz.websocket.connect().then(() => {
            var config = qz.configs.create("Boca BIDI FGL 26/46 300 DPI");
            return qz.print(config, getData(data))
        }).then(() => {
            return qz.websocket.disconnect();
        }).catch((err) => {
            console.error(err);
            // process.exit(1);
        });
    });
});

$("#blank-strip").click(function() {
    qz.websocket.connect().then(() => {
        var config = qz.configs.create("Boca BIDI FGL 26/46 300 DPI");
        return qz.print(config, getEmptyFormat())
    }).then(() => {
        return qz.websocket.disconnect();
    }).catch((err) => {
        console.error(err);
        // process.exit(1);
    });
});

setInterval(() => {
    $.post("/getNewPlans")
    .done(function(data) {
        if(data.length == 0) return;
        qz.websocket.connect().then(async() => {
            var config = qz.configs.create("Boca BIDI FGL 26/46 300 DPI");
            var dataToPrint = [];
            for(let i = 0; i < data.length; i++) {
                dataToPrint.push(getData(data[i]));
            }
            await qz.print(config, dataToPrint);
            return;
        }).then(() => {
            return qz.websocket.disconnect();
        }).catch((err) => {
            console.error(err);
            // process.exit(1);
        });
    });
}, 15000);

function getData(data) {
    return [
        `<RC10,10><TTF1,12><HW1,1>${data[0]}`,
        `<RC65,130><TTF1,12><HW1,1>${data[1] ? data[1] : " "}`,
        `<RC60,300><TTF1,24><HW1,1>${data[2] ? data[2] : " "}`,
        `<RC120,10><TTF1,12><HW1,1>${data[3]}`,
        `<RC225,10><TTF1,12><HW1,1>${data[4]}`,
        `<RC0,455><LT4><VX375>`,
        `<RC0,465><TTF1,12><HW1,1>${data[5]}`,
        `<RC90,455><LT4><HX185>`,
        `<RC110,465><TTF1,12><HW1,1>${data[6]}`,
        `<RC190,455><LT4><HX185>`,
        `<RC220,465><TTF1,12><HW1,1>${data[7]}`,
        `<RC0,635><LT4><VX375>`,
        `<RC0,690><TTF1,12><HW1,1>KATL`,
        `<RC0,915><LT4><VX375>`,
        `<RC0,935><TTF1,12><HW1,1>${data[12] ? data[8] : data[8] + " " + data[9]}`,
        `<RC120,935><TTF1,12><HW1,1>${data[12] ? data[9] : ""}`,
        `<RC226,935><F10><HW1,1>${data[13] ? "o" : " "}`,
        `<RC220,955><TTF1,12><HW1,1>${data[10]}`,
        `<RC0,1850><LT4><VX375>`,
        `<RC0,2050><LT4><VX375>`,
        `<RC0,2250><LT4><VX375>`,
        `<RC90,1850><LT4><HX600>`,
        `<RC190,1850><LT4><HX600>`,
        `<RC200,190><X2><NP10>*${data[11]}*`,
        `<p>`
    ];
}

function getEmptyFormat() {
    return [
        `<RC0,455><LT4><VX375>`,
        `<RC90,455><LT4><HX185>`,
        `<RC190,455><LT4><HX185>`,
        `<RC0,635><LT4><VX375>`,
        `<RC0,915><LT4><VX375>`,
        `<RC0,1850><LT4><VX375>`,
        `<RC0,2050><LT4><VX375>`,
        `<RC0,2250><LT4><VX375>`,
        `<RC90,1850><LT4><HX600>`,
        `<RC190,1850><LT4><HX600>`,
        `<p>`
    ];
}