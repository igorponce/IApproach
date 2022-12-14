const xplane = require('./libs/xplane.js');
const aiFunctions = require('./libs/ai_functions.js');
const airports = require('./data/airports.js');
const fs = require('fs');
const approachHistoryFile = './data/approaches_history.json';
let asciiText = require('ascii-text-generator');

var cycle = {};
var alreadyCapturedIF = false;
var approachesHistory = loadApproachHistoryFile();
var willStabilize = null;
var isStabilized = null;
const AirportICAO = 'SBSP';
var airportInfo = airports[AirportICAO];
const aircraftVApp = (process.argv[2]) ? parseInt(process.argv[2]) : 130;


main();

function main(){

    var fdmServer = xplane.socket();
    fdmServer.on('message', function (message, remote) {

        xplane_data = xplane.getRefs(message);
        let aircraft = prepareAircraftObject(xplane_data)

        printParameters(aircraft)
        if(IsInsideRange(aircraft,airportInfo.IF,1.5)){
            
            if(!alreadyCapturedIF){
                //[altitude_msl, v_speed, gs, ias, gw, geardown, speedbrake, flaps]
                willStabilize = null;
                aiFunctions.postAircraftParameters([
                    aircraft.altitude_msl,
                    aircraft.v_speed,
                    aircraft.gs,
                    aircraft.ias,
                    aircraft.gw,
                    aircraft.gear,
                    aircraft.speedbrake,
                    aircraft.flaps
                ]).then((res)=>{
                    willStabilize = res;
                })
                captureAircraftInfoAtIF(aircraft);
            }
        }

        if(aircraft.altitude_msl <= airportInfo.stabilizationAltitude() && alreadyCapturedIF){
            captureAircraftInfoAt1000AGL(aircraft);
        }

    });
}

function printParameters(aircraft){
    console.clear();
    console.info("\x1b[35m",'****************************************************');
    console.info("\x1b[35m",'***                  IApproach                   ***');
    console.info("\x1b[35m",'****************************************************');
    console.info("\x1b[37m",`               ALTITUDE:  ${Math.round(aircraft.altitude_msl)}FT`);
    console.info(`                     V/S:  ${Math.round(aircraft.v_speed)}FT/MIN`);
    console.info(`                     IAS:  ${Math.round(aircraft.ias)}KT`);
    console.info(`                      GS:  ${Math.round(aircraft.gs)}KT`);
    console.info(`                      GW:  ${Math.round(aircraft.gw)}KG`);
    console.info(`                    GEAR:  ${(aircraft.gear) ? 'DOWN' : 'UP'}`);
    console.info(`              SPEEDBRAKE:  ${aircraft.speedbrake.toFixed(2)*100}%`);
    console.info(`                   FLAPS:  ${aircraft.flaps.toFixed(2)*100}%`);
    console.info("\x1b[35m",'****************************************************');
    if(willStabilize != null){
        let text = (willStabilize) ? 'stabilized' : 'unstabilized';
        let color = (willStabilize) ? "\x1b[32m" : "\x1b[31m";
        console.log(color,"*** THIS APPROACH WILL BE: "+text.toUpperCase());
    }
    if(isStabilized != null){
        let text = (isStabilized.result) ? 'stabilized' : 'unstabilized';
        let color = (isStabilized.result) ? "\x1b[32m" : "\x1b[31m";
        console.log(color,"*** 1000ft APPROACH "+text.toUpperCase());
    }
}


function prepareAircraftObject(xplane_data){
    return {
        altitude_msl: xplane_data["globalposition"]["values"]['altmsl'],
        v_speed: xplane_data["clbstats"]["values"]['v-spd'],
        lat: xplane_data["globalposition"]["values"]['lat'],
        lng: xplane_data["globalposition"]["values"]['lon'],
        gs: xplane_data["airspeed"]["values"]['truegnd'],
        ias: xplane_data["airspeed"]["values"]['indicated'],
        pitch: xplane_data["attitude"]["values"]['pitch'],
        bank: xplane_data["attitude"]["values"]['roll'],
        gw: xplane_data["payload"]["values"]['curnt']*0.453592,
        gear: xplane_data["gear"]["values"]['gear'],
        speedbrake: xplane_data["surfaces"]["values"]['sb_postn'],
        flaps: xplane_data["surfaces"]["values"]['f_postn'],
    };
}

function captureAircraftInfoAtIF(aircraft){
    isStabilized = null;
    cycle = aircraft;
    alreadyCapturedIF = true;
    isOnFinal = true;
}
function captureAircraftInfoAt1000AGL(aircraft){
    alreadyCapturedIF = false;
    cycle.atOneThousandAFE = aircraft;
    cycle.stabilized = IsAircraftStabilized(aircraft).result;
    approachesHistory.push(cycle);
    fs.writeFileSync(approachHistoryFile, JSON.stringify(approachesHistory));
    cycle = {};
    isStabilized = IsAircraftStabilized(aircraft);
}
function IsAircraftStabilized(aircraft){
    if(aircraft.ias >= aircraftVApp+20){
        return {result: false, reason:'IAS'};
    }
    if(aircraft.v_speed <= -1000){
        return {result: false, reason:'VS'};
    }
    if(aircraft.flaps < 0.75){
        return {result: false, reason:'FLAP'};
    }
    if(aircraft.speedbrake > 0.01 && aircraft.speedbrake <= 1){
        return {result: false, reason:'SPEED BRAKE'};
    }
    if(aircraft.gear == 0){
        return {result: false, reason:'GEAR'};
    }
    return {result: true, reason:''};
}
function IsInsideRange(checkPoint, centerPoint, km) {
    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * centerPoint.lat / 180.0) * ky;
    var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx;
    var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky;
    return Math.sqrt(dx * dx + dy * dy) <= km;
}
function loadApproachHistoryFile(){
    if(fs.existsSync(approachHistoryFile)) {
        let file = require(approachHistoryFile)
        return file;
    }
    else{
        fs.writeFileSync(approachHistoryFile, '[]');
        let file = require(approachHistoryFile)
        return file;
    }
}