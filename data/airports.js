module.exports = {
    SBSP:{
        ICAO: 'SBSP',
        elevation: 2631,
        IF:{'name': 'GERSU', 'lat':-23.511388889, 'lng':-46.736138889},
        stabilizationAltitude: function(){return this.elevation + 1000;}
    }
};