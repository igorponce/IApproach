const axios = require('axios')
var aiFunctions = {
    alreadyAsking: false,
    socket: function(host='0.0.0.0',port=1013){
        var PORT = port;
        var HOST = host;
        var dgram = require('dgram');
        var server = dgram.createSocket('udp4');
        server.bind(PORT, HOST);

        server.on('listening', function () {
            var address = server.address();
            console.log('AI SERVER UDP Server listening on ' + address.address + ":" + address.port);
        });
        
        return server;
    },
    async postAircraftParameters(aircraft){
        if(this.alreadyAsking) return 1;
        this.alreadyAsking = true;
        let res = await axios
        .post('http://127.0.0.1:1013/predict', 
            aircraft
        );
        this.alreadyAsking = false;
        return res.data.willStabilize;
    }
}

module.exports = aiFunctions;