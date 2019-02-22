angular.module('starter.services', [])

// statusService polls the ALREADY CONNECTED alarm for changes to zones and other data fields.
// It also provides access to events and the IP modules onboard IOs.
// This service uses the IP module's HTTP(s) services exclusively.

.service('statusService', function ($http, $timeout, $interval, $q, $parse, databaseService) {
    var data = { response: {}, calls: 0 };
    var ala
    var sessionProto
    var sessionIP
    var sessionPort
    var poll = 0
    var cred
    var first_poll = 0
    var poll_timeout
    changeToAction = 0;
    //var statusZones, statusZones_old
    changed = 0
    var statusZones_old, statusAreas_old, statusAlarm_old, statusTroubles_old

    var comms = 0;
    //var promiseSet = 0

    var poller = function () {

        var pollDeferred = $q.defer();

        console.log("Poller started, with poll=" + poll)

        comms++;

        $http.get(sessionProto + sessionIP + ":" + sessionPort + "/statuslive.html?u=" + cred[0] + "&p=" + cred[1], { timeout: 8000, cache: false })
                            .success(function (data, status) {
                                
                                
                                statusZones = (data.split('tbl_statuszone = new Array('))[1].split(');var')[0].split(',');
                                statusAreas = (data.split('tbl_useraccess = new Array('))[1].split(')')[0].split(',');
                                /*
                                xx = "; tbl_useraccess = new Array(1, 0); t";
                                statusAreas = (xx.split('tbl_useraccess = new Array('))[1].split(')')[0].split(',');
                                */
                                statusAlarm = (data.split('tbl_alarmes = new Array('))[1].split(')')[0].split(',');
                                statusTroubles = (data.split('tbl_troubles = new Array('))[1].split(')')[0].split(',');

                                if ((statusTroubles.length >= 1) && (statusTroubles[0] != '')) {
                                    for (var i = 0; i < statusTroubles.length; i++) {
                                        statusTroubles[i] = statusTroubles[i].replace(/['"]+/g, '');
                                    }
                                }
                                else {
                                    statusTroubles.splice(0, 1);    //Remove empty elements
                                }
                                //alert(data)

                                //First assignment of _old
                                if (statusZones_old == null) {
                                    statusZones_old = statusZones.slice(0)
                                    statusAreas_old = statusAreas.slice(0)
                                    statusAlarm_old = statusAlarm.slice(0);
                                    statusTroubles_old = statusTroubles.slice(0);
                                    //alert(statusTroubles)
                                }

                                //console.log("Poller new status zones: " + statusZones)
                                //console.log("Poller old status zones: " + statusZones_old)
                                if (statusZones.length === statusZones_old.length) {
                                    for (var i = statusZones.length; i--;) {
                                        if (statusZones[i] !== statusZones_old[i]) {
                                            changed = 1;
                                            break;
                                        }

                                    }
                                } else {
                                    changed = 1
                                    databaseService.addLog(2, "statusService - Poller - statusZones changed")
                                }

                                //Check if a area status has changed
                                //console.log("Poller new status areas: " + statusAreas)
                                //console.log("Poller old status areas: " + statusAreas_old)
                                if (statusAreas.length === statusAreas_old.length) {
                                    for (var i = statusAreas.length; i--;) {
                                        if (statusAreas[i] !== statusAreas_old[i]) {
                                            changed = 1;
                                            break;
                                        }

                                    }
                                } else {
                                    changed = 1
                                    databaseService.addLog(2, "statusService - Poller - statusAreas changed")
                                }

                                //Check if a alarm status has changed
                                //console.log("Poller new status alarm: " + statusAlarm)
                                //console.log("Poller old status alarm: " + statusAlarm_old)
                                if (statusAlarm.length === statusAlarm_old.length) {
                                    for (var i = statusAlarm.length; i--;) {
                                        if (statusAlarm[i] !== statusAlarm_old[i]) {
                                            changed = 1;
                                            break;
                                        }

                                    }
                                } else {
                                    changed = 1
                                    databaseService.addLog(2, "statusService - Poller - statusAlarm changed")
                                }

                                //Check if a alarm troubles has changed
                                //console.log("Poller new status troubles: " + statusTroubles)
                                //console.log("Poller old status troubles: " + statusTroubles_old)
                                if (statusTroubles.length === statusTroubles_old.length) {
                                    for (var i = statusTroubles.length; i--;) {
                                        if (statusTroubles[i] !== statusTroubles_old[i]) {
                                            changed = 1;
                                            break;
                                        }

                                    }
                                } else {
                                    changed = 1
                                    databaseService.addLog(2, "statusService - Poller - statusTroubles changed")
                                }


                                if (changed == 1) {
                                    databaseService.addLog(2, "Poll & Parse Done. Reply from poller GET HTTP: " + data, " | status: " + status);
                                    console.log("****************************************STATUSES HAS CHANGED (Above)**********************************");

                                    changed = 1;
                                    statusZones_old = statusZones.slice(0);
                                    statusAreas_old = statusAreas.slice(0);
                                    statusAlarm_old = statusAlarm.slice(0);
                                    statusTroubles_old = statusTroubles.slice(0);
                                    changeToAction = 1
                                }


                                //          if (deferPollTillChange == 0) {

                                //No need to wait for change, just resolve
                                if (poll == 1) {
                                    console.log("In normal status poll cycle, next in 1000ms...")
                                    $timeout(poller, poll_timeout);
                                }
                                promiseSet = 0;
                                pollDeferred.resolve(true);
                            })

        return pollDeferred.promise;

    }

    return {

        getComms: function () {
            return comms;
        },

        startPoller: function (openedAlarm, alarmIP, alarmPort, u_p, timeout) {
            var startPollerDeferred = $q.defer();

            first_poll = 0  //To wait before givin promise
            ala = openedAlarm;
            cred = u_p;
            databaseService.addLog(1, "statusService - startPoller called!: Starting poller service for: " + openedAlarm.name)
            poll = 1;
            changed = 1;
            poll_timeout = timeout;
            poller();

            startPollerDeferred.resolve(true)

            return startPollerDeferred.promise;

        },

        setPollTimeout: function (interval) {
            poll_timeout = interval
            databaseService.addLog(2, "statusService - poll timeout set to " + poll_timeout);
        },

        getPollTimeout: function () {
            return poll_timeout;
        },

        pollOnce: function (openedAlarm, alarmIP, alarmPort, u_p) {
            var pollOnceDeferred = $q.defer()
            ala = openedAlarm;
            cred = u_p;

            if (poll == 0) {    //Only poll once if not already polling, otherwise simply return the current status
                poller().then(function () {
                    changed = 0;
                    databaseService.addLog(2, "statusService - pollOnce is resolving, last update should've been saved in statusService")
                    pollOnceDeferred.resolve([statusZones, statusAreas, statusAlarm, statusTroubles]);
                })
            }
            else //Already polling, so just resolve the promise
            {
                databaseService.addLog(1, "statusService - pollOnce has detected the poller is already on, so just resolving (poller not called)")
                pollOnceDeferred.resolve([statusZones, statusAreas, statusAlarm, statusTroubles]);
            }

            return pollOnceDeferred.promise;
        },

        getUpdates: function () {
            if (changeToAction == 1) {
                changed = 0;
                changeToAction = 0;
                return [1, statusZones, statusAreas, statusAlarm, statusTroubles];
            }
            return [0, statusZones, statusAreas, statusAlarm, statusTroubles];
        },

        waitForPolledUpdate: function (openedAlarm, alarmIP, alarmPort, u_p, intervalStartStop, theInterval) {
            var waitForPolledUpdateDeferred = $q.defer();
            //var chain = $q.when();
            ala = openedAlarm;
            cred = u_p;
            iteration = 10;

            databaseService.addLog(1, "statusService - waitForPolledUpdate - Calling poller and check for change")

            if (intervalStartStop == 1) {
                myInterval = $interval(function () {

                    poller().then(function () {

                        if (changed == 1) {
                            changed = 0;
                            databaseService.addLog(1, "statusService - waitForPolledUpdate - got a change, resolving")
                            waitForPolledUpdateDeferred.resolve([statusZones, statusAreas, statusAlarm, statusTroubles, myInterval]);
                        }
                        else {
                            if (iteration < 1) {
                                databaseService.addLog(1, "statusService - waitForPolledUpdate - exceeded iteration, rejecting")
                                waitForPolledUpdateDeferred.reject([statusZones, statusAreas, statusAlarm, statusTroubles, myInterval]);
                            }
                        }
                        iteration--;

                    })  //poller().then
                }, 1000)    //timeout
            } //interval check start/stop
            else {
                databaseService.addLog(2, "statusService - The waitForPolledUpdate interval was stopped with return: " + $interval.cancel(theInterval))
            }

            return waitForPolledUpdateDeferred.promise;

        },

        stopPoller: function () {
            poll = 0;
        },

        getIOconfig: function (openedAlarm, alarmIP, alarmPort) {
            var getIOconfigDeferred = $q.defer();
            var ioCfg = []

            databaseService.addLog(1, "statusService - Get IO config called");

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/io_sync.html?msgid=3&") //?u=" + cred[0] + "&p=" + cred[1])
                        .success(function (statusData, status) {
                            databaseService.addLog(2, "statusService - Get IO STATUS completed - Data: " + data + " - \n<br>Status: " + status);

                            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/io.html") //?u=" + cred[0] + "&p=" + cred[1])
                               .success(function (data, status) {

                                   ioCfg[0] = (data.split('var io_cfg1 = new Array('))[1].split(');')[0].split(',');
                                   ioCfg[1] = (data.split('var io_cfg2 = new Array('))[1].split(');')[0].split(',');

                                   databaseService.addLog(2, "statusService - Get IO CONFIG completed - Data: " + data + " - \n<br>Status: " + status
                                       + "\n<br> ioCfg1 = " + ioCfg[0] + "\n<br> ioCfg2 = " + ioCfg[1]);


                                   getIOconfigDeferred.resolve([statusData, ioCfg]);


                               })

                        })

            return getIOconfigDeferred.promise;

        },

        getIOstatus: function (openedAlarm) {
            var getIOstatusDeferred = $q.defer();

            databaseService.addLog(1, "statusService - Get IO status called");

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/io_sync.html?msgid=3&") //?u=" + cred[0] + "&p=" + cred[1])
                        .success(function (statusData, status) {
                            databaseService.addLog(2, "statusService - Get IO STATUS completed - Data: " + data + " - \n<br>Status: " + status);

                            getIOstatusDeferred.resolve(statusData);

                        })

            return getIOstatusDeferred.promise;

        },

        controlIO: function (openedAlarm, IOnum) {

            var controlIODeferred = $q.defer();

            databaseService.addLog(1, "statusService - Controlling IO");

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/io_sync.html?msgid=2&num=" + IOnum + "&" + Math.random().toString().replace(",", ".").split(".")[1]) //?u=" + cred[0] + "&p=" + cred[1])
                        .success(function (data, status) {
                            databaseService.addLog(2, "statusService - control IO - Data: " + data + " - \n<br>Status: " + status + "\n<b> Get new status values...");

                            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/io_sync.html?msgid=3&") //?u=" + cred[0] + "&p=" + cred[1])
                                .success(function (statusData, status) {
                                    databaseService.addLog(2, "statusService - Get IO status completed - Data: " + statusData + " - \n<br>Status: " + status);

                                    controlIODeferred.resolve(statusData);

                                })

                        }).error(function (err) { controlIODeferred.reject(err); databaseService.addLog(0, "statusService - Get IO status ERROR: " + err); })


            return controlIODeferred.promise;

        },

        getEvents: function (openedAlarm, alarmIP, alarmPort) {
            var getEventsDeferred = $q.defer();

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/event.html") //?u=" + cred[0] + "&p=" + cred[1])
                        .success(function (data, status) {
                            databaseService.addLog(2, "statusService - Get events completed - Data: " + data + " - \n<br>Status: " + status);

                            //console.log("Reply from poller GET HTTP: " + data);
                            rawEvents = (data.split('var events = '))[1].split(';')[0];
                            alarmEvents = [];
                            alarmEvents = JSON.parse(rawEvents)
                            getEventsDeferred.resolve(alarmEvents);
                        })

            return getEventsDeferred.promise;
        },

        setConnDetails: function (proto, ip, port) {
            sessionProto = proto;
            sessionIP = ip;
            sessionPort = port;
        }

    }

})

// alarmSwpService makes a software port connection to the alarm.
// It provides access and control to PGMs and Bypassing of zones.

.service('alarmSwpService', function ($q, $timeout, $interval, ts, statusService, databaseService) {

    //console.log("alarmSwpService - Constructor")

    var state = 0;
    var temp = ''
    var ip
    var port
    var pass
    var timeout = 6000
    var gotReply = 0
    var expectReply = 0
    var SwpLoggedIn = 0
    var commandBusy = 0
    var flagToDisconnect = 0
    var alarmType = 0   //0=MG/SP, 1=EVO

    var header = new Uint8Array(16);  //New array of length 32
    var message = new Uint8Array(48);  //New array of length 32
    var packet = new Uint8Array(64);  //New array of length 32
    var lastReply

    var aliveSeq = 0;
    var keepAliveInterval;
    var deferKeepAlive = 0;
    var nextAliveZero = 0;

    function format37ByteMessage(inputData) {

        inputDataLen = inputData.length

        var message = new Uint8Array(48);

        for (i = 0; i < inputDataLen; i++)
            message[i] = inputData[i]

        var checksum = 0

        //if (inputDataLen % 37 != 0)
        {
            for (i = 0; i < message.length; i++)    //for val in message:  # Calculate checksum
                checksum += message[i]              //checksum += ord(val)

            while (checksum > 255) {
                checksum = checksum - 256

            }

            //var msgLen = message.length

            message[36] = checksum      //message += bytes(bytearray([checksum]))  # Add check to end of message

            inputDataLen = 37

            //msgLen = message.length             //msgLen = len(message)  # Pad with 0xee till end of last 16 byte message

            if (inputDataLen % 16 != 0) {                 //if (msgLen % 16) != 0:
                //message = message.ljust((msgLen / 16 + 1) * 16, '\xee')
                for (var i = (inputDataLen) ; (i % 16) != 0; i++)
                    message[i] = 0xee;
            }

        }

        return message
    }

    function format39ByteMessage(inputData) {   // Used by EVO bypass

        inputDataLen = inputData.length

        var message = new Uint8Array(48);

        for (i = 0; i < inputDataLen; i++)
            message[i] = inputData[i]

        var checksum = 0

        //if (inputDataLen % 37 != 0)
        {
            for (i = 0; i < message.length; i++)    //for val in message:  # Calculate checksum
                checksum += message[i]              //checksum += ord(val)

            while (checksum > 255) {
                checksum = checksum - 256

            }

            //var msgLen = message.length

            message[38] = checksum      // 39 Byte starting from 0, thus checlsum at byte 38    //message += bytes(bytearray([checksum]))  # Add check to end of message

            inputDataLen = 39

            //msgLen = message.length             //msgLen = len(message)  # Pad with 0xee till end of last 16 byte message

            if (inputDataLen % 16 != 0) {                 //if (msgLen % 16) != 0:
                //message = message.ljust((msgLen / 16 + 1) * 16, '\xee')
                for (var i = (inputDataLen) ; (i % 16) != 0; i++)
                    message[i] = 0xee;
            }

        }

        return message
    }

    function toHexString(byteArray) {
        var array = [].slice.call(byteArray)
        return array.map(function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join(',')
    }

    function joinUint8Arrays(array1, array2) {
        a1Len = array1.length;
        a2Len = array2.length;
        newArray = new Uint8Array(a1Len + a2Len)

        for (i = 0; i < a1Len; i++) {
            newArray[i] = array1[i];
        }

        for (i = (a1Len) ; i < (a1Len + a2Len) ; i++) {
            newArray[i] = array2[i - a1Len];
        }

        return newArray
    }

    function createSocket() {
        socket = new Socket();
        databaseService.addLog(2, "Swp - Socket created")

    }

    function logoutDisconnect() {

        var logoutDisconnectDeferred = $q.defer();

        databaseService.addLog(2, "Swp - Logout, disconnect")

        if (SwpLoggedIn != 0) {
            SwpLoggedIn = 0;

            if (alarmType == 0) {
                header = [0xaa, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14]

                for (var i = 8; i < 16; i++)
                    header[i] = 0xee;

                message = new Uint8Array([0x70, 0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00])

                messageToSend = format37ByteMessage(message)
                packet = joinUint8Arrays(header, messageToSend)

                sendData(packet, 1).then(function (reply) {

                    socket.close();
                    logoutDisconnectDeferred.resolve();
                });

            } else if (alarmType == 1) {

                header = [0xaa, 0x07, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14]

                for (var i = 8; i < 16; i++)
                    header[i] = 0xee;

                message = new Uint8Array([0x70, 0x07, 0x05, 0x00, 0x00, 0x00, 0x7c, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee])

                //messageToSend = format37ByteMessage(message)
                packet = joinUint8Arrays(header, message)

                sendData(packet, 1).then(function (reply) {

                    socket.close();
                    logoutDisconnectDeferred.resolve();
                });
            }
        }
        else
            logoutDisconnectDeferred.resolve();


        return logoutDisconnectDeferred.promise;

    }

    function sendData(dataSend, expectReply) {
        var sendDataDeferred = $q.defer();

        gotReply = 0;
        var timeoutPromise;

        console.log("setting callback functions")
        socket.onData = function (dataReceive) {

            databaseService.addLog(2, "Swp - Received: " + toHexString(dataReceive))

            if (dataReceive[16] != 0xe0) {      //Don't look at events for now
                $timeout.cancel(timeoutPromise);    //Bugfix - Moved into if statement to not cause hangs when events are received
                gotReply = 1;
                
                if (flagToDisconnect == 1) {
                    databaseService.addLog(2, "Swp - Received data (not event) - flagged to disconnect")
                    flagToDisconnect = 0;
                    logoutDisconnect();
                    sendDataDeferred.resolve(dataReceive);
                }
                else {
                    databaseService.addLog(2, "Swp - Received data (not event) - proceeding")
                    sendDataDeferred.resolve(dataReceive);
                }

            }
        };
        socket.onError = function (errorMessage) {
            databaseService.addLog(2, "Swp - Error on sending: " + errorMessage)
            // invoked after error occurs during connection
        };
        socket.onClose = function (hasError) {
            // invoked after connection close
        };

        $timeout(function () {

            if (state == 0) {
                databaseService.addLog(2, "Swp - opening port")
                socket.open(ip, parseInt(port),

                    function () {
                        databaseService.addLog(2, "Swp - Sending: " + toHexString(dataSend))
                        socket.write(dataSend);

                    },
                    function (errorMessage) {
                        // invoked after unsuccessful opening of socket
                        databaseService.addLog(0, "Swp - Error opening socket: " + errorMessage)
                    })
            }
            else {

                databaseService.addLog(2, "Swp - Sending: " + toHexString(dataSend))
                socket.write(dataSend);
                if (expectReply == 0) {
                    databaseService.addLog(2, "SWP sendData, NO promise - resolving")
                    sendDataDeferred.resolve();
                }
                else {
                    timeoutPromise = $timeout(function () {
                        databaseService.addLog(2, "SWP sendData promise resolve")
                        sendDataDeferred.resolve();
                    }, timeout)
                }
            }

        }, 250)
        return sendDataDeferred.promise;

    }

    function ab2str(array) {
        var out, i, len, c;
        var char2, char3;

        out = "";
        len = array.length;
        i = 0;
        while (i < len) {
            c = array[i++];
            switch (c >> 4) {
                case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                    // 0xxxxxxx
                    out += String.fromCharCode(c);
                    break;
                case 12: case 13:
                    // 110x xxxx   10xx xxxx
                    char2 = array[i++];
                    out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                    break;
                case 14:
                    // 1110 xxxx  10xx xxxx  10xx xxxx
                    char2 = array[i++];
                    char3 = array[i++];
                    out += String.fromCharCode(((c & 0x0F) << 12) |
                                   ((char2 & 0x3F) << 6) |
                                   ((char3 & 0x3F) << 0));
                    break;
            }
        }

        return out;
    }

    function loginStateMachine(_State, _lastReply) {
        var loginStateMachineDeferred = $q.defer();

        state = _State;
        lastReply = _lastReply

        databaseService.addLog(2, "Swp LoginStateMachine state = " + state)

        if (state == 0) {

            createSocket();
            header[0] = 0xAA;  //# First construct the 16 byte header, starting with 0xaa

            /*header[1] = pass.length.toString(16);
            var x = pass.length.toString(16);
            header[1] = x;
            header[1] = ('0' + (x & 0xFF));*/
            header[1] = pass.length

            header[2] = 0x00;   //# No idea what this is
            header[3] = 0x03;
            header[4] = 0x08;     //# Encryption off [default for now] else: header += "\x09"  # Encryption on

            header[5] = 0xF0; //# No idea what this is, although the fist byte seems like a sequence number
            header[6] = 0x00;
            header[7] = 0x0A;


            for (var i = 8; i < 16; i++)
                header[i] = 0xee;

            var message2 = new Uint8Array(16);

            for (var i = 0; i < (pass.length) ; i++) {
                message2[i] = pass.charCodeAt(i);
            }

            for (var i = (pass.length) ; i < 16; i++)
                message2[i] = 0xee;

            packet = joinUint8Arrays(header, message2)


            sendData(packet, 1).then(function (reply) {
                loginStateMachineDeferred.resolve(reply)
            })
        } else if (state == 1) {

            header[1] = 0x00
            header[5] = 0xf2

            //packet = joinUint8Arrays(header, message)

            sendData(header, 1).then(function (reply) {
                loginStateMachineDeferred.resolve(reply)
            })

        } else if (state == 2) {

            header[5] = 0xf3

            sendData(header, 1).then(function (reply) {
                loginStateMachineDeferred.resolve(reply)
            })

        } else if (state == 3) {

            header[1] = 0x25
            header[3] = 0x04
            header[5] = 0x00
            message2 = new Uint8Array([0x72, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

            messageToSend = format37ByteMessage(message2)
            packet = joinUint8Arrays(header, messageToSend)

            sendData(packet, 1).then(function (reply) {
                databaseService.addLog(2, "sendData resolved, testing fot alarm type...");
                
                //var myString = new TextDecoder("utf-8").decode(reply);    //Not always working!!

                var myString = ab2str(reply)

                databaseService.addLog(2, "test done:");
                if (myString.indexOf("EVO") >= 0) {  // Changed to "EVO" only to process further (from "EVO192")
                    alarmType = 1;
                    databaseService.addLog(2, "EVO detected");
                }
                else
                {
                    alarmType = 0;
                    databaseService.addLog(2, "Non-EVO detected");
                }
                loginStateMachineDeferred.resolve(reply)
            })

        } else if (state == 4) {

            //EVO Stuur eers dit vir state 4: aa 09 00 03 08 f8 00 0a  ee ee ee ee ee ee ee ee  0a 50 08 00 00 01 00 00  59 ee ee ee ee ee ee ee
            if (alarmType == 0) {
                header[1] = 0x26
                header[3] = 0x03
                header[5] = 0xf8
                message[0] = 0x50
                message[2] = 0x80

                messageToSend = format37ByteMessage(message)
                packet = joinUint8Arrays(header, messageToSend)

                sendData(packet, 1).then(function (reply) {
                    loginStateMachineDeferred.resolve(reply)
                })

            }
            else if (alarmType == 1) {
                var packet = new Uint8Array([0xaa, 0x09, 0x00, 0x03, 0x08, 0xf8, 0x00, 0x0a, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0x0a, 0x50, 0x08, 0x00, 0x00, 0x01, 0x00, 0x00, 0x59, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee])
                sendData(packet, 1).then(function (reply) {
                    loginStateMachineDeferred.resolve(reply)
                })
            }

        } else if (state == 5) {

            header[1] = 0x25    //EVO: Presies dieselfde
            header[3] = 0x04
            header[5] = 0x00
            message[0] = 0x5f
            message[1] = 0x20
            message[2] = 0x00

            messageToSend = format37ByteMessage(message)
            packet = joinUint8Arrays(header, messageToSend)

            sendData(packet, 1).then(function (reply) {
                loginStateMachineDeferred.resolve(reply)
            })

        } else if (state == 6) {
            header[1] = 0x25
            header[3] = 0x04
            header[5] = 0x00
            header[7] = 0x14

            for (i = 0; i < 10; i++)        //message = reply[16:26]
                message[i] = lastReply[i + 16];

            message[10] = lastReply[24 + 16]         //message += reply[24:26]
            message[11] = lastReply[25 + 16]

            if (alarmType == 0) {
                message[12] = 0x19          
                message[13] = 0x00          
                message[14] = 0x00          
            } else if (alarmType == 1) {
                message[12] = 0x0a          //EVO: 0x0a
                message[13] = 0x30          //EVO: 0x30
                message[14] = 0x02          //EVO: 0x02
            }

            for (i = 0; i < 9; i++)        //message += reply[31:39]
                message[i + 15] = lastReply[i + 31];

            for (i = 0; i < 13; i++)        //message += '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00'
                message[i + 25] = 0x00;

            message[33] = 0x02              //Go back for the 0x02

            //message = self.format37ByteMessage(message) - But message > 37 ??????

            messageToSend = format37ByteMessage(message)
            packet = joinUint8Arrays(header, messageToSend)

            sendData(packet, 1).then(function (reply) {
                loginStateMachineDeferred.resolve(reply)
            })

        } else if (state == 7) {

            /* EVO is klaar, of stuur:

            00000120  aa 08 00 04 08 00 00 14  ee ee ee ee ee ee ee ee   ........ ........
            00000130  50 08 00 00 00 00 20 78  ee ee ee ee ee ee ee ee   P..... x ........

            en dan

            00000140  aa 08 00 04 08 00 00 14  ee ee ee ee ee ee ee ee   ........ ........
            00000150  50 08 80 00 00 01 40 19  ee ee ee ee ee ee ee ee   P.....@. ........

            */
            if (alarmType == 0) {
                header[1] = 0x25
                header[3] = 0x04
                header[5] = 0x00
                header[7] = 0x14

                message = new Uint8Array([0x50, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

                messageToSend = format37ByteMessage(message)
                packet = joinUint8Arrays(header, messageToSend)

                sendData(packet, 0).then(function (reply) {
                    loginStateMachineDeferred.resolve(reply)
                })
            }
            else if (alarmType == 1)
            {
                var packet = new Uint8Array([0xaa, 0x08, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0x50, 0x08, 0x00, 0x00, 0x00, 0x00, 0x20, 0x78, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee])
                sendData(packet, 1).then(function (reply) {
                    loginStateMachineDeferred.resolve(reply)
                })
            }

        } else if (state == 8) {

            if (alarmType == 0) {
                message = new Uint8Array([0x50, 0x00, 0x0e, 0x52, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

                messageToSend = format37ByteMessage(message)
                packet = joinUint8Arrays(header, messageToSend)

                sendData(packet, 0).then(function (reply) {
                    loginStateMachineDeferred.resolve(reply)
                })
            }
            else if (alarmType == 1)
                var packet = new Uint8Array([0xaa, 0x08, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0x50, 0x08, 0x80, 0x00, 0x00, 0x01, 0x40, 0x19, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee])
                sendData(packet, 1).then(function (reply) {
                    loginStateMachineDeferred.resolve(reply)
                })
        }


        return loginStateMachineDeferred.promise;
    }

    function toggleBypass(toggleBypass, onOff /*on=1, off=0*/) {
        var toggleBypassDeferred = $q.defer();

        if (alarmType == 0) {
            header = new Uint8Array([0xaa, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]);
            message = new Uint8Array([0x40, 0x00, 0x10, toggleBypass]);

            messageToSend = format37ByteMessage(message)
            packet = joinUint8Arrays(header, messageToSend)

            sendData(packet, 1).then(function (reply) {

                /*if ((reply[16] == 0x42) && (reply[17] == 0x00) && (reply[18] == 0x10) && (reply[19] == toggleBypass))
                    toggleBypassDeferred.resolve()
                else*/
                toggleBypassDeferred.resolve()  //For now always resolve because of apparent differences in reply/consistency of replies  //toggleBypassDeferred.reject()
            })
        }
        else if (alarmType == 1) {

            header = new Uint8Array([0xaa, 0x27, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]);
            
            if (onOff == 1)
                var onOffByte = 0x08    //to bypass
            else if (onOff == 0)
                var onOffByte = 0x00    //to un-bypass

            message = new Uint8Array([0xd0, 0x27, 0x08, onOffByte, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ])    //0x40, 0x00, 0x10, toggleBypass])

            var byteVal = Math.pow(2, (toggleBypass - 8 * (~~(toggleBypass / 8))))  // => pow(2, index - 8*(index div 8)

            var byteLoc = (Math.floor(toggleBypass / 8)) + 6

            message[byteLoc] = byteVal
            
            messageToSend = format39ByteMessage(message)
            packet = joinUint8Arrays(header, messageToSend)

            sendData(packet, 1).then(function (reply) {
                toggleBypassDeferred.resolve()  //For now always resolve because of apparent differences in reply/consistency of replies  //toggleBypassDeferred.reject()
            })
        }


        return toggleBypassDeferred.promise;
    }

    function keepAlive() {

        if (deferKeepAlive == 0) {

            if (alarmType == 0) {

                headerKA = new Uint8Array([0xaa, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]);

                messageKA = new Uint8Array([0x50, 0x00, 0x80, aliveSeq, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

                messageToSend = format37ByteMessage(messageKA)

                //messageToSend = joinUint8Arrays(messageToSend, new Uint8Array([0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]))

                packet = joinUint8Arrays(headerKA, messageToSend)

                aliveSeq++
                if (aliveSeq > 6)
                    aliveSeq = 0;

                sendData(packet, 0)

            } else if (alarmType == 1) {

                if (aliveSeq == 0)
                    aliveSeq = 1    //For EVO it starts at 0x01

                header1KA = new Uint8Array([0xaa, 0x08, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]);

                var header2KA = new Uint8Array([0x50, 0x08, 0x80, 0x00, 0x00, aliveSeq, 0x40, 0x00 /*Checksum!*/, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]);

                var checksum = 0; 

                for (i = 0; i < 7; i++)    //for val in message:  # Calculate checksum
                    checksum += header2KA[i]              //checksum += ord(val)

                while (checksum > 255) {
                    checksum = checksum - 256
                }

                header2KA[7] = checksum

                //messageToSend = joinUint8Arrays(messageToSend, new Uint8Array([0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]))

                packet = joinUint8Arrays(header1KA, header2KA)

                aliveSeq++
                if (nextAliveZero == 0) {
                    if (aliveSeq > 17) {
                        aliveSeq = 10;
                        nextAliveZero = 1   //0 -> 17, then 16m then back to zero
                    }
                } else {
                    aliveSeq = 1;       //Starts at 0x01
                    nextAliveZero = 0;
                }

                sendData(packet, 0)


            }
        }
    }

    return {

        setAlarmType: function (type) {
            alarmType = type;
        },

        sendBypass: function (toggleZoneBypass, onOff) {
            var sendBypassDeferred = $q.defer();
            deferKeepAlive = 1;

            toggleBypass(toggleZoneBypass, onOff).then(function () {
                deferKeepAlive = 0;
                sendBypassDeferred.resolve();

            }, function () {
                deferKeepAlive = 0;
                sendBypassDeferred.reject();
            });

            return sendBypassDeferred.promise;

        },

        controlPGM: function (pgm, toState, finalMessage) {

            var controlPgmDeferred = $q.defer();
            deferKeepAlive = 1
            commandBusy = 1;

            if (alarmType == 0) {

                var header = new Uint8Array([0xaa, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee])

                if (toState == 1)
                    state = 0x30
                else
                    state = 0x31

                message = new Uint8Array([0x40, 0x00, state, pgm])

                messageToSend = format37ByteMessage(message)
                packet = joinUint8Arrays(header, messageToSend)

                sendData(packet, 1).then(function (reply) {
                    if (finalMessage == 1)
                        commandBusy = 0;
                    deferKeepAlive = 0;
                    controlPgmDeferred.resolve(reply)
                })

            } else if (alarmType == 1) {

                var header = new Uint8Array([0xaa, 0x27, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee])

                if (toState == 1)
                    state = 0x02
                else
                    state = 0x01

                var message = new Uint8Array(48);

                message[0] = 0xa4;
                message[1] = 0x27;

                message[6 + pgm] = state

                messageToSend = format39ByteMessage(message)
                packet = joinUint8Arrays(header, messageToSend)

                sendData(packet, 1).then(function (reply) {
                    if (finalMessage == 1)
                        commandBusy = 0;
                    deferKeepAlive = 0;
                    controlPgmDeferred.resolve(reply)
                })
            }

            

            return controlPgmDeferred.promise;

        },

        logout: function () {

            var logoutDeferred = $q.defer();

            deferKeepAlive = 1;
            $interval.cancel(keepAliveInterval);

            if (commandBusy == 0) {
                logoutDisconnect().then(function () {
                    logoutDeferred.resolve();
                })
            }
            else {
                flagToDisconnect = 1;
                logoutDeferred.reject([ts.gt('controlStillInOp')]);
            }




            return logoutDeferred.promise;

        },

        login: function (_ip, _port, _pass) {
            ip = _ip;
            port = _port;
            pass = _pass;

            var loginDeferred = $q.defer();

            //alert("Stop")

            databaseService.addLog(1, "Swp - Within Login, SwpLoggedIn = " + SwpLoggedIn)

            if (SwpLoggedIn == 0/* || SwpLoggedIn == 2*/) {

                loginStateMachine(0).then(
                    function (reply) {

                        state = 1
                        if (reply[4] == 0x38) {
                            databaseService.addLog(1, "Swp - Login to alarm panel successful");
                        }
                        else if (reply[4] == 0x78) {
                            //if (SwpLoggedIn == 0) { //2 = Re-login / unlock only so ignore this error
                                databaseService.addLog(1, "Swp - Login to alarm panel unsuccessful, another user logged in.");
                                loginDeferred.reject(ts.gt('loginFailAnotherUser'));
                            //}
                        }
                        else {
                            databaseService.addLog(0, "Swp - Login request unsuccessful, panel returned: " + toHexString(reply[4]))
                        }

                        return loginStateMachine(1, reply);
                    }
                ).then(
                    function (reply) {
                        return loginStateMachine(2, reply);
                    }
                ).then(
                    
                    function (reply) {
                        //if (SwpLoggedIn != 2)
                            return loginStateMachine(3, reply);
                        /*else {
                            console.log("swp - login resolving from SwpLoggedIn = 2")
                            SwpLoggedIn = 1
                            $timeout(function () { SwpLoggedIn = 2 }, 40000);   //2 = Logged in only requiring unlock
                            loginDeferred.resolve();
                        }*/
                    }
                ).then(
                    function (reply) {
                        return loginStateMachine(4, reply);
                    },
                    function (err) { loginDeferred.reject(err); }
                ).then(
                    function (reply) {
                        return loginStateMachine(5, reply);
                    }
                ).then(
                    function (reply) {
                        return loginStateMachine(6, reply);
                    }
                ).then(
                    function (reply) {
                            return loginStateMachine(7, reply);
                    }
                ).then(
                    function (reply) {
                            return loginStateMachine(8, reply);
                    }
                ).then(
                    function (reply) {
                        databaseService.addLog(1, "Swp - Done with Swp login")
                        SwpLoggedIn = 1
                        //$timeout(function () {SwpLoggedIn = 2 }, 40000);   //2 = Logged in only requiring unlock

                        keepAliveInterval = $interval(function () {
                            keepAlive();
                        }, 10000)

                        loginDeferred.resolve();
                    }
                )

            } else {
                loginDeferred.resolve();
            }

            return loginDeferred.promise;

        }
    }
})

// alarmService performs many functions on the HTTP(s) layer:
// loginAlarm creates the initial connection to the alarm panel.
// getPMHIP resolves a ParadoxMyHome name to an IP address
// getEmailSettings and sendEmailSettings is responsible for setting the email address of the Alarmin server to enable push notifications
// determineIPAvail checks whether a configured IP can be pinged, i.e. is available to be connected to. First check LAN, then WAN IPs

.service('alarmService', function ($q, $http, ts, statusService, $httpParamSerializerJQLike, $ionicPopup, $interval, $timeout, databaseService) {

    console.log("alarmService - Constructor")

    var state = 0; //0-socket connection, 1-Get u and p values and send login request to default.html, 2-login, 3-retrieve zones, 4-polling...?
    var received_data;
    var ses;
    var openedAlarm2
    var sessionIP
    var sessionPort
    var sessionProto
    var u_p
    var callAlarmDeferred
    var socket_open = 0
    var loginStage = 0
    var connected = 0
    var errors = 0
    var proto = 'https://'
    //var globalGotComms = 0

    var replaceNbsps = function (str) {
        var re = new RegExp(String.fromCharCode(160), "g");
        var x = str.replace(re, " ");
        return x.replace("&nbsp;","")
    }

    var getAlarmDetails = function (userRequested) {

        var getAlarmDetailsDeferred = $q.defer();

        var getDetailsTimeout = 500

        if (userRequested == 1)
            getDetailsTimeout = 5000

        var error = 0;
        var panelDetail = [];
        var ipModuleDetail = [];
            
        databaseService.addLog(2, "alarmService - get alarm details, session: " + sessionProto + sessionIP + ":" + sessionPort);
        $http.get(sessionProto + sessionIP + ":" + sessionPort + "/version.html", { timeout: getDetailsTimeout, cache: false })
            .success(function (data) {

                databaseService.addLog(2, "alarmService - get alarm details reply: " + data);

                try {
                    error = 0;
                    panelDetail = (data.split("tbl_panel = new Array("))[1].split(")")[0].split(",")
                        
                    for (var i = 0; i < panelDetail.length; i++) {
                        panelDetail[i] = panelDetail[i].replace(/['"]+/g, '');
                    }

                    ipModuleDetail = (data.split("tbl_ipmodule = new Array("))[1].split(")")[0].split(",")
                        
                    for (var i = 0; i < ipModuleDetail.length; i++) {
                        ipModuleDetail[i] = ipModuleDetail[i].replace(/['"]+/g, '');
                    }

                }
                catch (err) {
                    error = 1
                }
                finally {
                    if (error == 1) {
                        databaseService.addLog(1, "alarmService - Error parsing version");
                        getAlarmDetailsDeferred.resolve([0, "Unable to determine alarm details"]);
                    }
                    else {
                        databaseService.addLog(1, "alarmService - Got version");
                        getAlarmDetailsDeferred.resolve([1, panelDetail, ipModuleDetail]);
                    }
                }
            }).error(function (err) {
                databaseService.addLog(1, "alarmService - Request for version timed out");
                getAlarmDetailsDeferred.resolve([0, "Unable to determine alarm details"]);
            })



        return getAlarmDetailsDeferred.promise;
    }

    var loginStages = function () {

        var loginStagesDeferred = $q.defer();

        databaseService.addLog(2, "alarmService - State 2, errors: " + errors)

        $http.get(sessionProto + sessionIP + ":" + sessionPort + "/index.html", { timeout: 15000, cache: false })
            .success(function (data) {

                databaseService.addLog(2, "alarmService - Reply from GET HTTP: " + data)

                try {

                    //Get and return all alarm info
                    var alarmName = (data.split('top.document.title="'))[1].split('";')[0]
                    for (var i = 0; i < alarmName.length; i++) {
                        alarmName[i] = alarmName[i].replace(/\"/g, '');
                        alarmName[i] = replaceNbsps(alarmName[i]);
                    }

                    var areaNames = (data.split('tbl_areanam = new Array('))[1].split(');')[0].split(',')
                    for (var i = 0; i < areaNames.length; i++) {
                        areaNames[i] = areaNames[i].replace(/\"/g, '');
                        areaNames[i] = replaceNbsps(areaNames[i]);
                    }

                    //var areaTotal = areaNames.length;

                    var zoneNamesTemp = (data.split('tbl_zone = new Array('))[1].split(');')[0].split(',')
                    var zoneAreaAlloc = []
                    var zoneNames = []

                    for (var i = 0; i < zoneNamesTemp.length; i++) {
                        zoneNamesTemp[i] = zoneNamesTemp[i].replace(/\"/g, '');     //e.g.:1,Voordeur,1,Sitkamer,1,Hoof Slaapk PIR,1,Garagedeur,
                        if ((i % 2) == 0) {
                            zoneAreaAlloc.push(zoneNamesTemp[i])
                            //zoneAreaAlloc.push('255') //For testing only
                            console.log("Area: " + zoneNamesTemp[i])
                        }
                        else {
                            zoneNames.push(replaceNbsps(zoneNamesTemp[i]))
                            console.log("Name: " + zoneNamesTemp[i])
                        }
                    }

                    //zoneAreaAlloc[1] = '3';   //Test sitkamer in areas 1 and 2

                    var troubleNames = (data.split('tbl_troublename = new Array('))[1].split(');')[0].split('","')
                    for (var i = 0; i < troubleNames.length; i++) {
                        troubleNames[i] = troubleNames[i].replace(/\"/g, '');
                        //var t = t + troubleNames[i] + " | "
                    }
                    //alert(t)
                    //check for changes in the data and notify
                    var changeFlag = 0;
                    var changeDetail = '';

                    for (var i = 0; i < alarmName.length; i++) {
                        if (openedAlarm2.alarmName[i] != alarmName[i]) {
                            changeFlag = 1
                            changeDetail += '*'+ts.gt('alarmNames')+'\n'
                            break;
                        }
                    }
                    for (var i = 0; i < areaNames.length; i++) {
                        if (openedAlarm2.areaNames[i] != areaNames[i]) {
                            changeFlag = 1
                            changeDetail += '*'+ts.gt('areaNames')+'\n'
                            break;
                        }
                    }

                    var tempFlag = 0
                    for (var i = 0; i < zoneAreaAlloc.length; i++) {
                        if ((zoneAreaAlloc[i] != "0") && (zoneAreaAlloc[i] != "1") && (zoneAreaAlloc[i] != "2")) {
                            if (zoneAreaAlloc[i] == "4")
                                zoneAreaAlloc[i] = "3"
                            else if (zoneAreaAlloc[i] == "8")
                                zoneAreaAlloc[i] = "4"
                            else if (zoneAreaAlloc[i] == "16")
                                zoneAreaAlloc[i] = "5"
                            else if (zoneAreaAlloc[i] == "32")
                                zoneAreaAlloc[i] = "6"
                            else if (zoneAreaAlloc[i] == "64")
                                zoneAreaAlloc[i] = "7"
                            else if (zoneAreaAlloc[i] == "128")
                                zoneAreaAlloc[i] = "8"
                            else if ((zoneAreaAlloc[i] == "3") || (zoneAreaAlloc[i] == "255"))  //Cater for belonging to all partitions
                                zoneAreaAlloc[i] = "255"
                        }

                        if (openedAlarm2.zoneAreaAlloc[i] != zoneAreaAlloc[i]) {
                            changeFlag = 1
                            tempFlag = 1
                        }
                    }
                    if (tempFlag == 1)
                        changeDetail += '*'+ts.gt('zonePartitions') + '\n'


                    for (var i = 0; i < zoneNames.length; i++) {
                        if (openedAlarm2.zoneNames[i] != zoneNames[i]) {
                            changeFlag = 1
                            changeDetail += '*' + ts.gt('zoneNames') + '\n'
                            break;
                        }
                    }
                    for (var i = 0; i < troubleNames.length; i++) {
                        if (openedAlarm2.troubleNames[i] != troubleNames[i]) {
                            changeFlag = 1
                            changeDetail += '*' + ts.gt('troubleNames') + '\n'
                            //alert("Change, Old: " + openedAlarm.troubleNames[i] + " New: " + troubleNames[i])
                            break;
                        }
                    }

                    //troubleNames[12] = "This is dummy data"
                    //changeFlag = 1
                    //alert("New: " + troubleNames)
                    //alert("Old: " + openedAlarm.troubleNames)

                    databaseService.addLog(2, "alarmService - changeFlag: " + changeFlag);
                    databaseService.addLog(2, "alarmService - changeDetail: " + changeDetail);
                    //Prepare updated alarm to send back if there was a change




                    //Get version info
                    getAlarmDetails().then(function (version) { //Confirm that we got it in time

                        var er = 0

                        try {
                            if (version[0] == 1) {
                                if (openedAlarm2.alarmDetails != null) {
                                    databaseService.addLog(2, "alarmService - Version success")
                                    for (var i = 0; i < openedAlarm2.alarmDetails[1].length; i++) {
                                        if (openedAlarm2.alarmDetails[i] != version[1][i]) {
                                            changeFlag = 1
                                            changeDetail += '*' + ts.gt('alarmDetails') + '\n'
                                            break;
                                        }
                                    }

                                    for (var i = 0; i < openedAlarm2.ipModuleDetails.length; i++) {
                                        if (openedAlarm2.ipModuleDetails[i] != version[2][i]) {
                                            changeFlag = 1
                                            changeDetail += '*' + ts.gt('ipModuleDetails') + '\n'
                                            break;
                                        }
                                    }
                                } else {    //Silently add new parameters to alarm (not to annoy user) - I.e. do not set changeDetail
                                    databaseService.addLog(2, "alarmService - Got version, no history, just adding")
                                    changeFlag = 1
                                }
                            }   //If versino check[0] == 1, thus success
                        }
                        catch (err) {
                            databaseService.addLog(2, "alarmService - Extract versioning error: " + err)
                        }


                        var updatedAlarm = openedAlarm2
                        if (changeFlag == 1) {
                            updatedAlarm.alarmName = alarmName
                            updatedAlarm.areaNames = areaNames
                            updatedAlarm.zoneAreaAlloc = zoneAreaAlloc
                            updatedAlarm.zoneNames = zoneNames
                            updatedAlarm.troubleNames = troubleNames
                            if (version[1] != null) {
                                updatedAlarm.alarmDetails = version[1]
                                updatedAlarm.ipModuleDetails = version[2]
                            }
                        }


                        loginStage += 1;

                        databaseService.addLog(2, "alarmService - Final login stage, resolving login")
                        loginStagesDeferred.resolve([loginStage, ts.gt('successConnected'), changeFlag, changeDetail, updatedAlarm, u_p, version]);
                    })



                    
                } // try

                catch (err) {
                    databaseService.addLog(0, "alarmService - Error connecting to alarm: " + err.message);
                    errorDetail = err.message;
                    loginStagesDeferred.reject([errorDetail]);

                }

                //loginAlarmDeferred.resolve([loginStage, "success, connected to alarm", changeFlag, changeDetail, updatedAlarm, u_p]);
            }).error(function (err) {
                databaseService.addLog(0, "alarmService - error in login 2: " + err);
                loginStagesDeferred.reject([ts.gt('requestAlarmDataTimeout')]);


            })


        return loginStagesDeferred.promise;

    }

    var loginStageZero = function () {

        var deferred = $q.defer();

        databaseService.addLog(2, "alarmService - loginState 0 sending: " + sessionProto + sessionIP + ":" + sessionPort + "/login_page.html");

        $http.get(sessionProto + sessionIP + ":" + sessionPort + "/login_page.html", { timeout: 8000, cache: false })
                    .success(function (data) {

                        var error = 1
                        /*
                        if (sessionProto == "http://") {

                            try {
                                error = 0;
                                var newPort = (data.split('function redirect(){var port="'))[1].split('"')[0]
                                var newProto = (data.split('window.location = "'))[1].split('"')[0]
                            }
                            catch (err) {
                                error = 1
                            }
                            finally {
                                if (error == 0) {   // If no error then we got a redirect
                                    console.log("Redirect detected!!")
                                    deferred.reject([-1,newProto, newPort]);
                                }
                            }

                        }
                        */
                        if (error == 1)  // Signifies that no redirect occured
                        {

                            try {
                                error = 1;  // It's an error to not get an exception here!!!
                                ses = (data.split("document.getElementById('ERROR').innerHTML = sre; document.getElementById('MESSAGE').innerHTML = top.cant('"))[1].split("')")[0]
                            }
                            catch (err) {
                                error = 0
                            }
                            finally {
                                if (error == 1) {
                                    deferred.reject([ses + " " + ts.gt('currentlyLoggedIn')]);
                                }
                            }

                            databaseService.addLog(2, "alarmService - Reply from GET HTTP: " + data)
                            ses = (data.split('loginaff("'))[1].split('",')[0]

                            if (ses.length == 16) {
                                databaseService.addLog(2, "Got the ses: " + ses)
                                console.log("Calculating hashes, pwd used: " + openedAlarm2.password)

                                u_p = loginencrypt(openedAlarm2.pincode, openedAlarm2.password, ses)
                                databaseService.addLog(2, "UP, 0: " + u_p[0] + " ,1: " + u_p[1])

                                loginStage += 1;
                                deferred.resolve([loginStage, ts.gt('readySendLoginRequest')]);
                            } else
                                deferred.reject([loginStage]);

                        }
                    }).error(function (err) { databaseService.addLog(0, "alarmService - error in login 0: " + JSON.stringify(err)); deferred.reject(["<br>" + ts.gt('loginError1')]); })
                        
        return deferred.promise;


    }

    var deleteEmail = function (id) {

        var url = "/email_sync.html?msgid=" + '2' + "&eid=" + id + "&em=" + encodeURIComponent(ts.gt('doNotModEmail').trim());
        url += "&ea=" + '0' + "&eo1=" + '0' + "&eo2=" + '0';
        $http.get(sessionProto + sessionIP + ":" + sessionPort + url)
        .success(function (data, status) {
            databaseService.addLog(2, "alarmService - deleted email id: " + id);
        })
        .error(function () {
            databaseService.addLog(2, "alarmService - FAILED to delete email id: " + id);
        })
    }

    //return connected;

    var pushIntsToBinObject = function(input)
    {
        //(Email address, ea = 00 = area2 area1, e01 = 000000 = IO2 IO1 Trouble Arm/Disarm WebAccess Active, eo2 = 0/255 = noAlarms Alarms)
        var number = parseInt(input);
        var output = []

        for (i = 0; i < 8; i++)
        {
            if ((number & Math.pow(2, i)) == Math.pow(2, i))
                output[i] = true
            else
                output[i] = false
        }
        

        //output[0] = number;

        return output;

    }

    var checkPMH = function (alarm, forcePMH) {

        var checkPMHDeferred = $q.defer();
        var sessionAlarm = {}
        //if (openedAlarm2.ip.indexOf('paradoxmyhome.com') != -1) {

        if (alarm.siteName != '""' && alarm.siteName != null && alarm.siteName != "") {

            if (alarm.siteName.indexOf(",") == -1)  
            {
                //PMH

                databaseService.addLog(1, "Checking DNS (PMH) now: " + "http://www.paradoxmyhome.com/" + alarm.siteName);

                $http.get("http://www.paradoxmyhome.com/" + alarm.siteName, { timeout: (2000 + forcePMH * 3000), cache: false })
                            .success(function (data) {

                                databaseService.addLog(1, "Got Paradoxmyhome reply")

                                try {

                                    if (data.indexOf("https") != -1)
                                        sessionAlarm.secure = false
                                    else
                                        sessionAlarm.secure = true

                                    var pmh = (data.split('content="0;URL='))[1].split('://')[1].split('">')[0] //Keep http(s) to "secure" setting
                                    sessionAlarm.ip = pmh.split(':')[0]
                                    sessionAlarm.port = pmh.split(':')[1]
                                    databaseService.addLog(1, "PMH (Old) got connection details: " + sessionAlarm.ip + ":" + sessionAlarm.port + ", resolving...");


                                    //globalGotComms = 1;
                                    checkPMHDeferred.resolve(sessionAlarm)
                                }

                                catch (err) {
                                    databaseService.addLog(1, "invalid sitename from PMH")
                                    checkPMHDeferred.reject();
                                }


                                //}).error(function (err) {
                            }, function (err) {
                                databaseService.addLog(1, "no PMH reply")
                                checkPMHDeferred.reject();
                            })

            }
            else
            {
                // Insite Gold

                databaseService.addLog(1, "Checking DNS (Insite Gold) now: " + "http://insightgoldatpmh.com/r");

                userData = alarm.siteName.split(",");

                var data = 'email=' + userData[0] + "&site=" + userData[1];//{email : userData[0], site: userData[1]}
                //alert("Request data: " + JSON.stringify(data))

                var htmlData = 'POST /r HTTP/1.1\r\nhost: insightgoldatpmh.com\r\nconnection: keep-alive\r\ncontent-length: ' + data.length +'\r\naccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\r\nuser-agent: Mozilla/5.0 (Linux; U; Android 2.3.2; en-us; Nexus S Build/GRH78C) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1\r\ncontent-type: application/x-www-form-urlencoded; charset=utf-8\r\naccept-language: en-US,en;q=0.8\r\n\r\n';

                function uintToString(uintArray) {
                    var encodedString = String.fromCharCode.apply(null, uintArray),
                        decodedString = decodeURIComponent(escape(encodedString));
                    return decodedString;
                }

                function stringToUint(string) {
                    var string = (unescape(encodeURIComponent(string))),
                        charList = string.split(''),
                        uintArray = [];
                    for (var i = 0; i < charList.length; i++) {
                        uintArray.push(charList[i].charCodeAt(0));
                    }
                    return new Uint8Array(uintArray);
                }

                var htmlData2 = stringToUint(htmlData+data)

                socket = new Socket();


                socket.onData = function (dataReceive) {
                    var reply = uintToString(dataReceive)
                    databaseService.addLog(1, "Swp - Received: " + reply)

                    try {

                        if (reply.indexOf("https") != -1)
                            sessionAlarm.secure = false
                        else
                            sessionAlarm.secure = true

                        var pmh = (reply.split('ocation:'))[1].split('://')[1].split('\r\n')[0];
                        sessionAlarm.ip = pmh.split(':')[0]
                        sessionAlarm.port = pmh.split(':')[1]
                        databaseService.addLog(1, "PMH (Gold) got connection details: " + sessionAlarm.ip + ":" + sessionAlarm.port + ", resolving...");


                        //globalGotComms = 1;
                        checkPMHDeferred.resolve(sessionAlarm)
                    }

                    catch (err) {
                        databaseService.addLog(0, "invalid sitename from PMH Gold")
                        checkPMHDeferred.reject();
                    }
                    

                };
                socket.onError = function (errorMessage) {
                    databaseService.addLog(2, "Swp - Error on sending: " + errorMessage)
                    // invoked after error occurs during connection
                };
                socket.onClose = function (hasError) {
                    // invoked after connection close
                    databaseService.addLog(2, "socket closed")
                };

                socket.open('54.174.120.148', 80,

                    function () {
                        console.log("Socket opened")
                        //databaseService.addLog(2, "Swp - Sending: " + toHexString(htmlData))
                        console.log("sending: " + uintToString(htmlData2))
                    socket.write(htmlData2);

                },
                    function (errorMessage) {
                        // invoked after unsuccessful opening of socket
                        console.log(0, "Swp - Error opening socket: " + errorMessage)
                    })




            }
        }
        else {
            databaseService.addLog(1, "no PMH sitename configured")
            checkPMHDeferred.reject();
        }

        return checkPMHDeferred.promise;

    }

    return {

        initialise: function () {
            var initDeferred = $q.defer();
            databaseService.addLog(2, "alarmService - initialise")

        },

        getAlarmAndIpDetails: function() {
            var deferred = $q.defer();

            getAlarmDetails(1).then(function (data) {
                deferred.resolve(data);
            })

            return deferred.promise;
        },

        testPushEmail: function(emailLocation) {

            var deferred = $q.defer();

            var url = "/email_sync.html?msgid=3" + "&eid=" + emailLocation + "&" + Math.random().toString().replace(",", ".").split(".")[1]

            $http.get(sessionProto + sessionIP + ":" + sessionPort + url)
            .success(function (data, status) {
                databaseService.addLog(1, "alarmService - SUCCESS sending test push email, response:" + JSON.stringify(data));
                deferred.resolve();
            })
            .error(function (err) {
                databaseService.addLog(0, "alarmService - FAILED to send test push email, error: " + JSON.stringify(err));
                deferred.reject();
            })

            return deferred.promise;
        },

        sendEmailSettings: function(email, emailLocation, pushUpdate, smtpDetails) {

            var sendEmailSettingsDeferred = $q.defer();

            databaseService.addLog(2, "alarmService - sendEmailSettings with: \nEmail: " + email + "\nLocation: " + emailLocation + "\nPush Update: " + JSON.stringify(pushUpdate) + "\nSMTP server and port (only if overriding): " + smtpDetails.server + ":" + smtpDetails.port);

            var ea = 0
            var e01 = 0
            var e02 = 0


            if (pushUpdate.smtpOverride == true)
                $http.get(sessionProto + sessionIP + ":" + sessionPort + "/email_sync.html?msgid=1&smtp=" + smtpDetails.server + "&smtpp=" + smtpDetails.port + "&esmtp=1&euser=" + smtpDetails.user + "&epass=" + smtpDetails.pass)


            var url = "/email_sync.html?msgid=2" + "&eid=" + emailLocation + "&em=" + email;

            for (i = 0; i < 8; i++) {
                if (pushUpdate.areas[i] == true)
                    ea += Math.pow(2, i)
            }

            for (i = 0; i < 6; i++)
            {
                if (pushUpdate.events[i] == true)
                    e01 += Math.pow(2,i)
            }

            if (pushUpdate.alarms == true)
                e02 = 255
            else
                e02 = 0


            url += "&ea=" + ea + "&eo1=" + e01 + "&eo2=" + e02;

            databaseService.addLog(2, "alarmService - Push updating email with: " + sessionProto + sessionIP + ":" + sessionPort + url);

            $http.get(sessionProto + sessionIP + ":" + sessionPort + url)
            .success(function (data, status) {
                databaseService.addLog(1, "alarmService - SUCCESS sending updated push email address to panel, response:" + JSON.stringify(data));
                sendEmailSettingsDeferred.resolve();
            })
            .error(function (err) {
                databaseService.addLog(0, "alarmService - FAILED to updated push email address to panel, error: " + JSON.stringify(err));
                sendEmailSettingsDeferred.reject();
            })

            

            return sendEmailSettingsDeferred.promise;

        },

        getEmailSettings: function (uuid, readPrepare, serverSMTP, smtpOverride) {    //readWrite: 0=read, 1=read&prepare; smtpServerToUse: 0=theirs, 1:ours
            var getEmailSettingsDeferred = $q.defer();
            databaseService.addLog(1, "alarmService - Get Email settings. UUID of device: " + uuid)

            var EmailLocation = -1;
            var foundEmail = 0;
            var lastAvailableEmail = -1
            var existingEmail = 0;

            var smtpServer = '';
            var smtpPort = '';
            var smtpAuth = 0;
            var smtpUser = '';
            var smtpPass = '';

            var existingSMTP = 0    //0 = None, 1 = already correct, 2 = not alarmin

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/email.html")
                .success(function (data, status) {
                    databaseService.addLog(2, "alarmService - Got Email settings: " + JSON.stringify(data));

                    //(Email address, ea = 00 = area2 area1, e01 = 000000 = IO2 IO1 Trouble Arm/Disarm WebAccess Active, eo2 = 0/255 = noAlarms Alarms)

                    smtpServer = (data.split('var smtpserver = "'))[1].split('";')[0];
                    smtpServer = smtpServer.replace(/\"/g, '');
                    smtpPort = (data.split('var smtpport = "'))[1].split('";')[0];
                    smtpPort = smtpPort.replace(/\"/g, '');
                    smtpAuth = (data.split('tblesmtp = new Array('))[1].split('");')[0].split(',')[0];
                    smtpAuth = smtpAuth.replace(/\"/g, '');
                    smtpUser = (data.split('tblesmtp = new Array('))[1].split('");')[0].split(',')[1];
                    smtpUser = smtpUser.replace(/\"/g, '');
                    smtpPass = (data.split('tblesmtp = new Array('))[1].split('");')[0].split(',')[2];
                    smtpPass = smtpPass.replace(/\"/g, '');


                    if ((smtpServer == '') || (smtpPort == ''))
                        existingSMTP = 0
                    else if ((smtpServer == serverSMTP.server) && (smtpPort == serverSMTP.port) && (smtpAuth == '1') && (smtpUser == serverSMTP.user) && (smtpPass == serverSMTP.pass))
                        existingSMTP = 1
                    else
                        existingSMTP = 2

                    var strArray = (data.split('tblemail = new Array('))[1].split(')')[0].split(',');
                    for (var i = 0; i < strArray.length; i++) {
                        strArray[i] = strArray[i].replace(/\"/g, '');
                    }

                    databaseService.addLog(2, "alarmService - Push - interating over emails with smtpOverride: " + smtpOverride + ", and readPrepare: " + readPrepare);

                    // Iterate over all email entries
                    for (var i = 0; i < Math.round(strArray.length / 4) ; i++) {

                        if (strArray[i * 4].substring(0, 8) == 'alarmin-')
                            databaseService.addLog(2, "alarmService - Push - found alarmin- address at loc: " + i);

                        // If we override, then check query type then Delete all email addresses that DONT start with 'alarmin-' and is active
                        if ((smtpOverride == true) && (strArray[i * 4].substring(0, 8) != 'alarmin-')) //&& (strArray[i * 4] != '')) // && Math.abs(strArray[i * 4 + 2] % 2) != 0)    //No 'alarmin-' and active
                        {

                            databaseService.addLog(2, "alarmService - Push1 - entry available at address at loc: " + i);
                            lastAvailableEmail = i;

                            //Delete non-standard emails only if ACTIVE (Only do the actual delete if we update the settings)
                            if ((readPrepare == 1) && (((strArray[i * 4 + 2] & 1) == 1) || (strArray[i * 4] == '')))
                                deleteEmail(i);

                            
                        }
                        else {

                            
                            // Check if any entries is this phone
                            if (strArray[i * 4].substring(8,8+uuid.length /*24*/) == uuid) {
                                foundEmail = 1;
                                existingEmail = 1;
                                EmailLocation = i;
                                databaseService.addLog(2, "alarmService - found existing email location: " + EmailLocation);
                            } 
                            // If none found yet, check if any entries is available (empty) or inactive
                            else if ((foundEmail == 0) && ((strArray[i * 4] == '') || ((parseInt(strArray[i * 4 + 2]) & 1) == 0))) {
                                databaseService.addLog(2, "alarmService - Push2 - entry available at address at loc: " + i);
                                lastAvailableEmail = i;
                            }



                        }

                    }

                    //Check if we found an existing email, otherwise use the last open one
                    if (foundEmail != 1)
                    {
                        //Check for an open email location
                        if (lastAvailableEmail != -1)
                        {
                            foundEmail = 1;
                            EmailLocation = lastAvailableEmail;
                            databaseService.addLog(2, "alarmService - no existing location found, using: " + EmailLocation);
                        }
                    }

                    //Now resolve or reject the promise
                    if (foundEmail == 1) {
                        var push = {}

                        //Check if we got an location, otherwise it was set by deleting one (use that then)
                        if (EmailLocation == -1)
                            EmailLocation = lastAvailableEmail;

                        push.areas = pushIntsToBinObject(strArray[EmailLocation * 4 + 1]);
                        push.events = pushIntsToBinObject(strArray[EmailLocation * 4 + 2]);
                        if (strArray[EmailLocation * 4 + 3] > 0)
                            push.alarms = true
                        else
                            push.alarms = false

                        getEmailSettingsDeferred.resolve([existingEmail, EmailLocation, push, existingSMTP]);
                    }
                    else {
                        getEmailSettingsDeferred.reject(ts.gt('noEmailOpen') + ' (' + Math.round(strArray.length / 4) + ')')
                    }


                }).error(function (err) {

                                       // if (data.indexOf("404: The requested file cannot be found.") == -1) //Ensure user has rights

                        getEmailSettingsDeferred.reject(ts.gt('userNoPermission'));

                })

            return getEmailSettingsDeferred.promise;

        },

        getState: function () {
            return connected;

        },

        controlAlarm: function (alarm, area, action) {
            var armAlarmDeferred = $q.defer();
            databaseService.addLog(1, "alarmService - Sending a control: " + sessionProto + sessionIP + ":" + sessionPort + "/statuslive.html?area=0" + area + "&value=" + action)

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/statuslive.html?area=0" + area + "&value=" + action)
                .success(function (data, status) {
                    databaseService.addLog(2, "alarmService - Done with control, status : " + status + '\n...with Data: ' + data);
                    if (status == 200)
                        armAlarmDeferred.resolve(status)
                    else
                        armAlarmDeferred.reject(status)
                })

            return armAlarmDeferred.promise;
        },

        disconnectAlarm: function (alarm, alarmIP, alarmPort) {

            var disconnectAlarmDeferred = $q.defer();
            //globalGotComms = 0;

            connected = 0

            $http.get(sessionProto + sessionIP + ":" + sessionPort + "/logout.html")
                .success(function (data, status) {
                    databaseService.addLog(1, "alarmService - Disconnect status : " + status);
                    statusService.stopPoller();
                    disconnectAlarmDeferred.resolve(status)
                })


            statusService.stopPoller();

            return disconnectAlarmDeferred.promise;
        },

        getPMHIP: function (alarm, forcePMH) {

            var getPMHIPDeferred = $q.defer();
            

            //var sessionAlarm = {}
            //var goodResponse = 0
            //if (openedAlarm2.ip.indexOf('paradoxmyhome.com') != -1) {

            if (alarm.siteName != '""' && alarm.siteName != null && alarm.siteName != "") {

                checkPMH(alarm, forcePMH).then(function (sessionAlarm) {
                    //globalGotComms = 1
                    $timeout.cancel(phmCheck1);
                    $timeout.cancel(pmhCheckfinal);
                    //$timeout.cancel(phmCheck2);
                    getPMHIPDeferred.resolve(sessionAlarm);
                })
                
                var phmCheck1 = $timeout(function () {
                    //if (globalGotComms == 0) {
                    checkPMH(alarm, forcePMH).then(function (sessionAlarm) {
                            getPMHIPDeferred.resolve(sessionAlarm);
                        })
                    //}
                }, 500);
                /*
                var phmCheck2 = $timeout(function () {
                    if (globalGotComms == 0) {
                        checkPMH(alarm).then(function (sessionAlarm) {
                            getPMHIPDeferred.resolve(sessionAlarm);
                        })
                    }
                }, 2000);
                */
                var pmhCheckfinal = $timeout(function () {
                    //if (globalGotComms == 0) {
                        databaseService.addLog(1, "no PMH DNS reply in ultimate timeout")
                        getPMHIPDeferred.reject();
                    //}
                }, (2600 + forcePMH*3000));

            }
            else {
                databaseService.addLog(1, "no PMH sitename configured")
                getPMHIPDeferred.reject(-1);
            }


            return getPMHIPDeferred.promise;

        },

        determineIPAvail: function (alarm) {

            var determineWebRouteDeferred = $q.defer();

            //var goodResponse = 0;

            databaseService.addLog(1, "Checking IP...");

            if (alarm.ip != '""' && alarm.ip != null && alarm.ip != '') {

                if (alarm.secure == true)
                    var protoTemp = "https://";
                else
                    var protoTemp = "http://";

                var testIP = function () {
                    databaseService.addLog(1, "Checking IP now: " + protoTemp + alarm.ip + ":" + alarm.port);
                    $http.get(protoTemp + alarm.ip + ":" + alarm.port + "/login_page.html", { timeout: 2000, cache: false })
                            .success(function (reply) {

                                if (reply.indexOf("loginaff") != -1) {
                                    //globalGotComms = 1
                                    $timeout.cancel(ipCheck1);
                                    //$timeout.cancel(ipCheck2);
                                    databaseService.addLog(1, "Good HTTP response for IP, resolving");
                                    determineWebRouteDeferred.resolve();
                                }
                                else
                                    databaseService.addLog(1, "Bad HTTP response for IP, rejecting");

                            })
                        .error(function (data) {
                            databaseService.addLog(1, "no HTTP reply for IP");
                            //determineWebRouteDeferred.reject();
                        });
                }
                
                var ipCheck1 = $timeout(function () {
                    //if (globalGotComms == 0)
                        testIP();
                }, 500);
                /*
                var ipCheck2 = $timeout(function () {
                    if (globalGotComms == 0)
                        testIP();
                }, 2000);
                */
                testIP();


                $timeout(function () {
                    //if (globalGotComms == 0)
                        determineWebRouteDeferred.reject();
                }, 2600);

            }
            else {
                databaseService.addLog(1, "no IP configured, rejecting");
                determineWebRouteDeferred.reject(-1);
            }

            return determineWebRouteDeferred.promise;
        },

        loginAlarm: function (alarm, alarmIP, alarmPort, stage_reset) {

            var loginAlarmDeferred = $q.defer();
            //globalGotComms = 0;

            connected = 1
            //alert("gne to 1");
            openedAlarm2 = alarm
            var errorDetail = ''

            if (stage_reset == 1) loginStage = 0

            // Only get new alarm details if conecting to another alarm (to save possible redirect parameters
            if (alarmIP != sessionIP) {
                if (alarm.secure == true) {
                    proto = "https://";
                }
                else {
                    proto = "http://";
                }

                sessionIP = alarmIP
                sessionPort = alarmPort
                sessionProto = proto
            }

            databaseService.addLog(2, "alarmService - Login alarm, using : " + sessionProto + sessionIP + ":" + sessionPort + "/...")

            if (loginStage == 0) {
                

                loginStageZero().then(function (data) {

                    loginAlarmDeferred.resolve(data)    // Happy with parsing first reply for SES, resolve

                }, function (err) {

                    if (err[0] == -1)   // Signifies a redirect
                    {
                        // Get redirect parameters
                        databaseService.addLog(2, "alarmService - got redirected with: "+ err[1] + "IP:" + err[2]);
                        sessionProto = err[1];
                        sessionPort = err[2];

                        // Now retry the connection
                        loginStageZero().then(function (data) {
                            loginAlarmDeferred.resolve(data)
                        }, function (err) {
                            loginAlarmDeferred.reject(err);
                        })
                    }
                    else
                        loginAlarmDeferred.reject(err); // Issue with parsing reply, just reject
                })

    

            } else if (loginStage == 1) {
                databaseService.addLog("alarmService - loginState 1 sending (default.html)")
                $http.get(sessionProto + sessionIP + ":" + sessionPort + "/default.html?u=" + u_p[0] + "&p=" + u_p[1], { timeout: 8000, cache: false })
                    .success(function (data, status) {
                        databaseService.addLog(2, "alarmService - Reply from GET HTTP: " + data + "HTTP status code: " + status)
                        loginStage += 1;
                        loginAlarmDeferred.resolve([loginStage, ts.gt('retrievingAlarmInfo')]);

                        statusService.setConnDetails(sessionProto, sessionIP, sessionPort)

                    }).error(function (err) { databaseService.addLog(0, "alarmService - error in login 1: " + err); loginAlarmDeferred.reject([ts.gt('loginError2')]); })
            } else if (loginStage == 2) {
                databaseService.addLog(2, "alarmService - loginState 2 sending (delayed - index.html)")

                errors = 0

                loginStages().then(function (reply) {

                    databaseService.addLog(2, "alarmService - connected to alarm, resolving")
                    loginAlarmDeferred.resolve(reply)

                }, function (err) { //Retry 3 times on errors
                    databaseService.addLog(2, "alarmService - error connecting to alarm, retrying:" + err)

                    loginStages().then(function (reply) {
                        databaseService.addLog(2, "alarmService - connected to alarm, resolving")
                        loginAlarmDeferred.resolve(reply)

                    }, function (err) {
                        databaseService.addLog(2, "alarmService - error connecting to alarm, retrying:" + err)

                        loginStages().then(function (reply) {
                            databaseService.addLog(2, "alarmService - connected to alarm, resolving")
                            loginAlarmDeferred.resolve(reply)

                        }, function (err) {
                            databaseService.addLog(2, "alarmService - error connecting to alarm, rejecting:" + err)
                            loginAlarmDeferred.reject(err)
                        })
                    })
                })

            }


            return loginAlarmDeferred.promise;
        },
    }

})

// databaseService is responsible for manageing all long-term settings, and temporarily saves logs for each session
// The service saves alarms settings to a webview's local storage using IndexedDb

.service('databaseService', function ($q, ts) {

    console.log("databaseService - Constructor")

    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    //alert(indexedDB)

    var logIndex = 0
    var feedback = [0, 0, 0]
    var db = 0
    var lastTimeLog = 0
    var debugLevel = 2

    return {

        initialise: function () {
            var initialdeferred = $q.defer();
            if (db == 0) {
                var myDatabase = indexedDB.open("DataBase", 15);

                //Check foor first run on database, if so create objects needed
                myDatabase.onupgradeneeded = function (e) {
                    console.log("running onupgradeneeded");
                    var thisDB = e.target.result;

                    //Check if an "alarms" object store exists, otherwise create it
                    if (!thisDB.objectStoreNames.contains("alarms")) {
                        thisDB.createObjectStore("alarms");
                    }

                    if (!thisDB.objectStoreNames.contains("logs")) {
                        thisDB.createObjectStore("logs");
                    }

                    if (!thisDB.objectStoreNames.contains("settings")) {
                        thisDB.createObjectStore("settings");
                    }
                }

                myDatabase.onsuccess = function (e) {
                    console.log("Success opening database");
                    db = e.target.result;

                    initialdeferred.resolve();
                }
            }




            console.log("databaseService - Initialise returning promise")
            return initialdeferred.promise;

        },

        addLog: function (level, output1, output2, output3) {

            var deferredLog = $q.defer();

            //if (level < 2)
                console.log("Logging, O1: " + output1 + " O2: " + output2 + " O3: " + output3);

            if (level <= parseInt(debugLevel)) {


                currentDate = new Date
                currentDate = currentDate.getTime();


                if (currentDate == lastTimeLog) {
                    currentDate += 1
                    output2 += "(logging to fast!!)"
                }

                lastTimeLog = currentDate;
                //Open transaction to alarms table in read/write
                var transactionLog = db.transaction(['logs'], 'readwrite');

                //Open the object store to work with it now
                var storeLog = transactionLog.objectStore('logs');

                //Define new alarm
                var log = {
                    dateTime: currentDate,
                    detail1: output1,
                    detail2: output2,
                    detail3: output3,
                };


                var requestLogs = storeLog.add(log, currentDate);

                requestLogs.onerror = function (e) {
                    //alert("logging Error");
                    console.log("Error adding log: ", e.target.error, e.target.source);
                    deferredLog.reject();

                }

                requestLogs.onsuccess = function (e) {
                    //alert("logs Gd");
                    deferredLog.resolve;

                }
            }
            else
                deferredLog.resolve;

            return deferredLog.promise;

        },

        getSetting: function (setting) {
            var deferred = $q.defer();
            var transaction = db.transaction(['settings'], 'readwrite');
            var store = transaction.objectStore('settings');
            //var request = store.clear();
            var request = store.get(setting);

            request.onerror = function (e) {
                console.log('Error retrieving setting ' + setting + ': ' + e);
                deferred.reject(-1);
            }

            request.onsuccess = function (e) {
                if (setting == 'logLevel') {
                    debugLevel = request.result

                }

                if (setting != "uuids")
                    console.log(setting + ' setting retrieved as: ' + request.result);

                if (typeof request.result == 'undefined')
                    deferred.reject(-1);
                else
                    deferred.resolve(request.result);
            }

            return deferred.promise;
        },

        setSetting: function (setting, data) {

            var deferred = $q.defer();
            var transaction = db.transaction(['settings'], 'readwrite');
            var store = transaction.objectStore('settings');

            /*
            var value = {
                level: data
            }
            */
            //var request = store.delete(setting)
            var request = store.put(data, setting)

            request.onerror = function (e) {
                console.log("Error updating setting for " + setting + ": " + e)
                deferred.resolve();
            }

            request.onsuccess = function (e) {
                console.log("Setting for " + setting + " updated to: " + data)
                if (setting == 'logLevel') {
                    debugLevel = data
                }

                deferred.resolve();
            }

            return deferred.promise;

        },

        clearAllLogs: function () {

            //Open transaction to alarms table in read/write
            var transactionLog = db.transaction(['logs'], 'readwrite');

            //Open the object store to work with it now
            var storeLog = transactionLog.objectStore('logs');

            storeLog.clear();

            storeLog.onsuccess = function (event) {
                // report the success of our clear operation
                //alert("Logs cleared")
            };

        },

        getAllLogsAsList: function () {
            var deferredGetAllLogsAsList = $q.defer();
            var items = [];
            var prevTime = -1;

            console.log("In service to get logs as list")
            var transaction = db.transaction(['logs'], 'readwrite');

            var store = transaction.objectStore('logs');

            var request = store.openCursor();

            request.onerror = function (e) {
                console.log("Error getting log list: ", e.target.error.name);
                deferredGetAllLogsAsList.resolve(feedback);
            }

            request.onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor) {
                    if (prevTime != -1)
                        cursor.value.detail3 = cursor.value.dateTime - prevTime

                    items.push(cursor.value);
                    prevTime = cursor.value.dateTime
                    cursor.continue();
                }
                else {
                    deferredGetAllLogsAsList.resolve(items);
                }
            }
            return deferredGetAllLogsAsList.promise;

        },

        addAlarm: function (addAlarmData) {
            var deferred = $q.defer();
            //Open transaction to alarms table in read/write
            var transaction = db.transaction(['alarms'], 'readwrite');

            //Open the object store to work with it now
            var store = transaction.objectStore('alarms');

            //Define new alarm
            var newAlarm = {
                name: addAlarmData.name,
                siteName: addAlarmData.siteName,
                ip: addAlarmData.ip,
                port: addAlarmData.port,
                SwpPort: addAlarmData.SwpPort,
                ipLan: addAlarmData.ipLan,
                portLan: addAlarmData.portLan,
                SwpPortLan: addAlarmData.SwpPortLan,
                pincode: addAlarmData.pincode,
                password: addAlarmData.password,
                alarmDetails: addAlarmData.alarmDetails,
                ipModuleDetails: addAlarmData.ipModuleDetails,
                alarmName: ['-'],
                areaNames: [ts.gt('selectConnectUpdateInfo')],
                zoneNames: ['-'],
                zoneAreaAlloc: ['-'],
                userNames: ['-'],
                troubleNames: ['-'],
                connectionsmade: 0,
                secure: addAlarmData.secure,
                PgmNames: ['PGM 1', 'PGM 2', 'PGM 3', 'PGM 4', 'PGM 5', 'PGM 6', 'PGM 7', 'PGM 8', 'PGM 9', 'PGM 10', 'PGM 11', 'PGM 12', 'PGM 13', 'PGM 14', 'PGM 15', 'PGM 16', ],
                PgmPulseDelay: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],

            };

            //Perform the add, using the alarm's name as the key
            var request = store.add(newAlarm, addAlarmData.name)

            request.onerror = function (e) {
                console.log("Error", e.target.error, e.target.source);
                console.log("Returning error to controller");
                feedback = [1, ts.gt('error'), ts.gt('alarmExist')]
                deferred.resolve(feedback);
            }

            request.onsuccess = function (e) {
                console.log("New alarm addedd successfully");
                feedback = [0, ts.gt('success'), ts.gt('alarmAdded')]
                deferred.resolve(feedback);
            }

            return deferred.promise;

        },

        updateAlarm: function (addAlarmData, oldAlarmData) {
            var deferred = $q.defer();
            //Open transaction to alarms table in read/write
            var transaction = db.transaction(['alarms'], 'readwrite');

            //Open the object store to work with it now
            var store = transaction.objectStore('alarms');

            //Define new alarm
            var newAlarm = {
                name: addAlarmData.name,
                siteName: addAlarmData.siteName,
                ip: addAlarmData.ip,
                port: addAlarmData.port,
                SwpPort: addAlarmData.SwpPort,
                ipLan: addAlarmData.ipLan,
                portLan: addAlarmData.portLan,
                SwpPortLan: addAlarmData.SwpPortLan,
                pincode: addAlarmData.pincode,
                password: addAlarmData.password,
                alarmName: addAlarmData.alarmName,
                areaNames: addAlarmData.areaNames,
                zoneNames: addAlarmData.zoneNames,
                alarmDetails: addAlarmData.alarmDetails,
                ipModuleDetails: addAlarmData.ipModuleDetails,
                zoneAreaAlloc: addAlarmData.zoneAreaAlloc,
                userNames: [],
                troubleNames: addAlarmData.troubleNames,
                connectionsmade: addAlarmData.connectionsmade,
                secure: addAlarmData.secure,
                PgmNames: addAlarmData.PgmNames,
                PgmPulseDelay: addAlarmData.PgmPulseDelay
            };


            //alert("service: " + addAlarmData.secure)
            //Perform the add, using the alarm's name as the key
            //var request = store.delete(addAlarmData.name)
            //var request = store.add(newAlarm, addAlarmData.name)
            var request = store.delete(oldAlarmData.name)
            var request = store.put(newAlarm, addAlarmData.name)
            //alert("sssss")

            request.onerror = function (e) {

                console.log("Error", e.target.error.name);
                //if (e.target.error.name == "source") {
                console.log("Returning error to controller");
                feedback = [1, ts.gt('error'), ts.gt('coulntUpdateAlarm')]

                deferred.resolve(feedback);
                //return deferred.promise;
                //}

            }

            request.onsuccess = function (e) {
                console.log("Alarm changed successfully");
                feedback = [0, ts.gt('success'), ts.gt('alarmChanged')]
                //alert("Update completed - New: " + newAlarm.troubleNames[0] + " ||||||||||||||||||||||| old: " + oldAlarm.troubleNames[0])
                //alert("alarm data updates with: " + newAlarm.troubleNames)
                deferred.resolve(feedback);
                //return deferred.promise;
            }


            //attach data to deferred object
            //deferred.resolve(feedback);

            //return promise to be catched with "then"
            return deferred.promise;

        },

        deleteAlarm: function (AlarmData) {
            var deferred = $q.defer();
            //Open transaction to alarms table in read/write
            var transaction = db.transaction(['alarms'], 'readwrite');

            //Open the object store to work with it now
            var store = transaction.objectStore('alarms');

            var request = store.delete(AlarmData.name)

            request.onerror = function (e) {

                console.log("Error", e.target.error.name);

                console.log("Returning error to controller");
                feedback = [1, ts.gt('error'), ts.gt('couldntDeleteAlarm')]

                deferred.resolve(feedback);


            }

            request.onsuccess = function (e) {
                console.log("Alarm changed deleted");
                feedback = [0, ts.gt('success'), ts.gt('alarmDeleted')]
                deferred.resolve(feedback);
            }

            return deferred.promise;

        },

        getAlarmsAsList: function () {

            var deferred = $q.defer();
            var items = [];
            console.log("getAlarmsAsList - started");
            //Open transaction to alarms table in read/write
            var transaction = db.transaction(['alarms'], 'readwrite');

            //Open the object store to work with it now
            var store = transaction.objectStore('alarms');

            console.log("getAlarmsAsList - opened store");

            //var request = store.clear();

            var request = store.openCursor();

            console.log("getAlarmsAsList - set cursor");

            request.onerror = function (e) {
                console.log("Error", e.target.error.name);
                //if (e.target.error.name == "source") {
                console.log("Returning error to controller");
                feedback = [1, "Error", "Error retrieving alarm list", 0]

                deferred.resolve(feedback);
                //return deferred.promise;
                //}

            }

            request.onsuccess = function (e) {
                var cursor = e.target.result;
                //                console.log("getAlarmsAsList - cursor onsuccess");
                if (cursor) {
                    items.push(cursor.value);
                    cursor.continue();
                }
                else {

                    console.log("All alarms added to list in services");
                    feedback = [0, 0, 0, items]
                    deferred.resolve(feedback);
                }
            }

            return deferred.promise;



        }

    }
})

// ts is for translation services.
// All translations are hardcoded here and called by reference.

.service('ts', function ($http/*, $cordovaFile*/) {

    var updatedLanguage = 0;

    
    var engUK = {
        'checkingComms': "checking comms...",
        'noComms': "No comms available to alarm, check your network connection and settings (defaulting to configured IP address)",
        'ready': "ready...",
        'loading': "loading...",
        'connect': "Connect",
        'disconnect': "Disconnect",
        'disconnected': "disconnected",
        'loadingAlarms': "loading alarms....",
        'ipReady': "(IP) ready...",
        'noIpCheckPMH': "no IP, checking PMH...",
        'noCommsShort': "no comms available to alarm",
        'getIoData': "getting IO data...",
        'pollingIO': "polling IOs...",
        'stillWaitLogin': "still waiting for login...",
        'togglingBypass': "toggling bypass...",
        'bypassToggled': "bypass toggled",
        'replyReceived': "reply received",
        'controllingIO': "controlling IO...",
        'ioControlDone': "IO control done",
        'ioControlError': "IO control error",
        'errorWithIoControl': "Error with IO control",
        'detail': "Detail: ",
        'closingConnection': "closing connection...",
        'reconnecting': "reconnecting...",
        'waitLoginBeforeControl': "wait for login before control...",
        'readyUserInput': "ready for user input",
        'performingPgmControl': "performing PGM control...",
        'pgmControlSent': "PGM control sent",
        'pulseToState': 'Pulse to state',
        'eg': "E.g.",   //for exmaple
        'onDelayOff': "On = On..delay..Off",
        'offDelayOn': "Off = Off..delay..On",
        'allDelays1Sec': "All delays are 1 second.",
        'off' : "Off",
        'pgmControlOff': "PGM control Off...",
        'pgmControlOnDone': "PGM control On. Done",
        'pgmControlOn': "PGM control On...",
        'pgmControlOffDone': "PGM control Off. Done",
        'instantControlBusy': "instant control busy...",
        'area': "area",
        'noChangeDisconnecting': "no change detected, disconnecting",
        'getAlarmInfoFailed': "get alarm info failed",
        'loginRequestFailed':"login request failed",
        'couldNotConnect': "could not connect!",
        'controllingArea': "controlling area",
        'errorDisconnecting': "error, disconnecting",
        'connectingIpModule': "connecting to ip module...",
        'pinPassIncorrect': "Pin and/or password might be incorrect.",
        'internalError': "Internal error",
        'errorWithConnection': "error with connection",
        'errorWithLogin': "Error with login",
        'confirmAlarmSettings': "Please confirm your alarm's setting. ",
        'commsError': "Comms error",
        'commsToAlarmFailDisconnecting': "Connection with alarm failed, disconnecting",
        'linkToAlarmUnstable': "link to alarm unstable",
        'disconnectingFromIpModule': "disconnecting from ip module...",
        'disconnectedReady': "(disconnected) ready...",
        'busy': "busy...",
        'alarmInfoChanged': "Alarm info changed",
        'updateSaveInfo': "Should the new info be saved (select yes if this is your first connection to the alarm)",
        'yes': "Yes",
        'no': "No",
        'errorConnecting': "error connecting",
        /*      --------------- Display: generic views ---------------       */
        'close': "Close",   //Close the view
        /*      --------------- Display: Menu ---------------       */
        'menu': "Menu",
        'manageAlarms': "Manage Alarms",
        'viewLogs': "View Logs",
        'settings': "Settings",
        'about': "About",
        'settingsDisabled': "settings disabled",
        'home': "Home",
        /*      --------------- Display: Settings ---------------       */
        'language': "Language",
        'loggingType': "Logging Type",
        'limited': "Limited",
        'normal': "Normal",
        'verbose': "Verbose",
        /*      --------------- Display: Troubles view ---------------       */
        'noTroubles': "no troubles",
        /*      --------------- Display: one status view ---------------       */
        'zoneStatus': "Zone Status",
        /*      --------------- Display: Main (home) view ---------------       */
        'connectToAlarm': "Connect to Alarm",
        /*      --------------- Display: Open Alarm---------------        */
        'instantControls': "Instant Controls",
        'alarmSounding': "Alarm Sounding",
        'events': "Events",
        'ioS': "I/O's",
        'troubles': "Troubles",
        'entryDelay': "entry delay",
        'exitDelay': "exit delay",
        'ARM': "ARM",
        'DISARM': "DISARM",
        'SLEEP': "SLEEP",
        'STAY': "STAY",
        'viewZones': "View Zones",
        'open': "open",
        'alarmDisarmed': "alarm disarmed",
        'alarmArmed': "alarm armed",
        'inAlarm': "In Alarm!!",
        'armedInSleep': "armed in sleep",
        'armedInStay': "armed in stay",
        'readyToArm': "ready to arm",
        'notReadyToArm': "not ready to arm",
        'instant': "instant",
        'waitingForConnection': "waiting for connection",
        'specialFunctions': "Special Functions",
        'onlySupportedForSomeAlarms': "only supported for some alarms",
        'pgmControl': "PGM Control",
        'bypassZones': "Bypass Zones",
        /*      --------------- Display: Add Alarm ---------------       */
        'addAlarm': "Add Alarm",
        'pullToRefresh': "Pull to refresh...",
        'name': "Name",
        'siteName': "Sitename",
        'ipAddress': "IP Address",
        'or': "or", //this (or) that
        'secureOption': "Use SSL/TLS (HTTPS)",
        'webPort': "Web Port",
        'softwarePort': "Software port",
        'typicalSoftPort': "typically 10000",
        'pinCode': "Pin code",
        'password': "Password",
        'save': "Save",
        'discoveredAlarms': "Discovered Alarms",
        'selectPullToRefresh': "(pull to refresh)",
        'discoveredName': "Name:",
        /*      --------------- Display: Manage Alarms ---------------        */
        'addNewAlarm': "Add new alarm",
        'existingAlarms': "Existing Alarms",
        /*      --------------- Display: Bypass Zones ---------------        */
        'bypassMsg1': "Always confirm the bypass state of zones from",
        'bypassMsg2': "the 'View Zones' option in the main window",
        'zones': "Zones",
        'previousState': "Previous state",
        'bypass': "Bypass",
        'closed': "Closed",
        'Open': "Open",
        'closedTrouble': "Closed - Trouble",
        'openTrouble': "Open - Trouble",
        'closedAlarmInMem': "Closed - Alarm In Memory",
        'openAlarmInMem': "Open - Alarm In Memory",
        'bypassed': "Bypassed",
        /*      --------------- Display: Alarm Events ---------------        */
        'time': "Time",
        'detail': "Detail",
        /*      --------------- Display: Alarm IOs ---------------        */
        'inputsOutputs': "Inputs / Outputs",
        'loadingIoStatuses': "loading IO statuses",
        'output': "Output",
        'input': "Input",
        'Off': "Off",
        'On': "On",
        'toggledOutput': "Toggled Output",  //Type of output
        'pulsedOutput': "Pulsed Output",
        'ioNote': "Note: Your IOs' behavior can be changed within the IP module's web interface",
        /*      --------------- Display: PGM Control ---------------        */
        'selectPgmToControl': "Select PGM to control",
        'pulse': "Pulse",
        /*      --------------- Display: Logs View ---------------        */
        'allLogs': "All Logs",
        'sessionLogs': "Session Logs",
        'logsNote': "Logs are only stored locally and deleted once you close the app. If you are encountering issues with the app, switch the logs to 'verbose' mode in the settings. Then perform the action again with which you are having issues and send the resulting logs using the button below",
        'message': "Message",
        'noEvents': "no events",
        'emailLogFeedback': "Email feedback",
        /*      --------------- Software port service ---------------        */
        'evo192Reject1': "EVO192 Detected - special functions are unsupported.",
        'evo192Reject2': "Subsequent re-login to panel might fail temporarily",
        'loginFailAnotherUser': "Login to alarm panel on software port unsuccessful, another user might be logged in",
        /*      --------------- Alarm service ---------------        */
        'currentlyLoggedIn': "currently logged in",
        'readySendLoginRequest': "ready to send login request...",
        'loginError1': "Error: Login request timed out or IP module returned error.",
        'loginError2': "Error: Timeout during login",
        'retrievingAlarmInfo': "retrieving alarm info...",
        'successConnected': "success, connected to alarm",
        /*      --------------- Database service ---------------        */
        'selectConnectUpdateInfo': "select 'connect' to update info",
        'error': "Error",
        'success': "Success",
        'alarmExist': "Alarm name already exists",
        'alarmAdded': "Alarm added",
        'couldntUpdateAlarm': "Couldn't update alarm details",
        'alarmChanged': "Alarm changed",
        'couldntDeleteAlarm': "Couldn't delete alarm",
        'alarmDeleted': "Alarm deleted",
        //---------------------------------------ADDED----------2016/08/02
        'checkIpDns': "Check IP / DNS", 
        'siteDnsIpReq': "Sitename or IP/DNS required",
        'importantNotice': "Important notice!",
        'specialFeaturesNotice': "Most special functions will make a new ('software port') connection to your alarm panel which is not encrypted, and connect using your password (unprotected). Use these features with caution as network interruptions might leave the alarm panel in incorrect states. <b>Also ensure the correct software port is configured in your settings.</b>",
        //---------------------------------------ADDED----------2016/08/06
        'noEmailOpen': "Cannot set - all available email locations used",
        'retrievingSettings': "retrieving settings...",
        'doneSelectOptions': "done, select options",
        'updating': "updating...",
        'online': "Online",
        'offline': "Offline",
        'savingSettings': "saving settings...",
        'successSettingsSaved': "success, settings saved",
        'newPushConfigSuccess': "New user successfully registered for push notifications",
        'existingPushConfigSuccess': "Existing user's push notifications successfully updated",
        'failPushUpdate': "Failed to update alarm on push server, try again later",
        'errorConnectServer': "error connecting to server, try again later",
        'googlePlayError': "google play services error, try again later",
        'pushService': "Push service",
        'pushNotifications': "Push Notifications",
        'pushNotification': "Push Notification",
        'selectAreasNotify': "Select areas to be notified",
        'area': "Area",
        'selectEventsNotify': "Select events to be notified",
        'alarms': "Alarms",
        'armDisarm': "Arm / Disarm",
        'IO1': "IO1",
        'IO2': "IO2",
        'webAccessBlocked': "Web access blocked",
        'pushNote1': "Note: An active internet connection is required. If you delete this alarm in the future the push notifications will continue to be sent. Use this app to disable the notifications",
        //---------------------------------------ADDED----------2016/08/08
        'userNoPermission': "Error: The configured pin for this alarm might not allow editing of email settings",
        'alarmNames': "Alarm Names",
        'areaNames': "Area Names",
        'zonePartitions': "Zone Partitions",
        'zoneNames': "Zone Names",
        'troubleNames': "Trouble Names",
        'delete': "Delete",
        //---------------------------------------ADDED----------2016/08/09
        'alertSmtpOverride': "You have selected to override your SMTP settings. If you were receiving emails from your alarm before, this will NOT continue to work. If you selected the override by mistake, unselect the option before saving. Alarmin can work with either your own SMTP server or override the setting if you don't have one.",
        'note': "Note",
        'doNotModEmail': "Use_own_SMTP_server_before@editing.com",
        'pushNote2': "Your IP module is not configured for sending emails. Enabling push notification will configure an SMTP server on your IP module which can only be used for push notifications (not personal emails). You can change the SMTP server setting if you wish to also send personal emails, as long as the alarmin notification emails remain unchanged.",
        'pushNote3': "Your IP module is already configured for sending emails. If you would like to continue using personal emails in conjunction with push notifications, ensure the following option is not selected. Overriding the SMTP server will delete or disable your existing email notifications",
        'overrideSMTP': "Set (override) SMTP server",
        'pushNotReachable': "Push service not reachable, try again later",
        //---------------------------------------ADDED----------2016/08/10
        'updateExistingPushUser': "Existing user profile on this alarm will be updated",
        'createNewPushUser': "New user profile will be created for this alarm",
        'requestAlarmDataTimeout': "Error: Request for alarm data timed out",
        'fullScreen': "Full Screen",
        'controlStillInOp': "control still in operation...",
        'pmhReady': "(PHM) ready...",
        'updatingEvents': "updating events",
        'earlyPushNote': "This feature is in an early testing phase. Ensure that you backup your IP module's email setting before proceeding.",
        'ok': "Ok",
        //---------------------------------------ADDED----------2016/08/12
        'alarmDetails': "Alarm Details",
        'ipModuleDetails' : "IP Module Details",
        //---------------------------------------ADDED----------2016/08/13
        'disconnectingAlarm': "Disconnecting alarm...",
        'backToExit': "Press back button again to exit",
        //---------------------------------------ADDED----------2016/08/18
        'push': "Push",
        'compressedView': "Compress Alarm Screen",
        'helpIssues': "Help / Issues",
        'help': "Help",
        'serviceAnnouncements': "Service Announcements",
        'noAnnounce': "No announcements currently",
        'gotoGithub': "Go to GitHub",
        'enhancements': "Enhancements",
        'bugs': "Bugs",
        'all': "All",
        'helpWanted': "Help Wanted",
        'question': "Question",
        'unread': "unread",
        'filterBy': "Filter by",
        //---------------------------------------ADDED----------2016/08/24
        'appAuthentication': "App authentication",
        'pinCreated': "Pin created",
        'pinNoMatch': "Pin does not match",
        'confirmPin': "Confirm pin",
        'appPin': "Application pin",
        'cancel': "Cancel",
        'createNewPin': "Create new pin",
        'requirePinStartup': "Require Pin on Startup",
        'enterPinProceed': "Enter your pin to proceed",
        'authenticate': "Authenticate",
        //---------------------------------------ADDED----------2016/09/03
        'autoConnect': "Automatic Connect",
        //---------------------------------------Modified----------2016/09/06
        'checkSitename': "Check sitename. If you do not use the ParadoxMyHome.com service, simply remove the sitename.",
        'bypassed2': "bypassed",
        //---------------------------------------ADDED----------2016/09/06
        'pushHistory': "Push History",
        'retrievingHistory': "Retrieving History...",
        'noHistory': "No history available",
        'zone': "Zone",
        'errorTTS': "Error with text to speech engine, or triggering too fast.",
        'zoneTesting': "Zone Testing",
        'trigZoneTest': 'Tigger zones to be tested',
        'speakWithTestMode': 'Tigger zones to be tested, will only speak changes once per zone',
        'speakOnWithTestMode': 'Testing in progress, will only speak changes once per zone',
        'testZones': "Test Zones",
        'resetTest': "Reset Test",
        'speakZones': "Speak Zones",
        'untested': "Untested",
        'egSpecialFunc': "e.g. bypass/pgm",
        'specialFunctionsNotSupported': 'not supported for your alarm type',
        "changePgmName": "Change PGM Name",
        "connectedAlarmDetails": "Connected alarm's details:",
        "panelDetails": "Panel details",
        "type": "Type",
        "firmwareVersion": "Firmware version",
        "serialNumber": "Serial number",
        "ipModDetails": "IP module details",
        "hardware": "Hardware",
        "eco": "ECO",
        "serialBoot": "Serial boot",
        "ipModule": "IP module",
        "pgm": 'PGM',
        "connectingSwp": "connecting to software port...",
        "FORCE": "FORCE ARM",
        "disarmBeforeBypass": "Bypass not possible whilst alarm is armed",
        "forceArmShowArm": "Force arming - upon completion alarm will show as ARM",
        //---------------------------------------ADDED----------2016/11
        "optional": "optional",
        "settings2": "settings",
        "nameOnly": "name only",
        "genericSettings": "Generic settings",
        "homeWifi": "Home WiFi",
        "testPushNotif": "Would you like to trigger a test push notification? <br><br>If this application is open the notification will be shown within the app. Minimize the app to see it in the notification bar.",
        //---------------------------------------ADDED----------2017/04/29
        "pushSounds": "Push Notification Sounds",
        "alarm": "Alarm",
        "disarm": "Disarm",
        "arm": "Arm",
        "saveSounds": "Save Sounds",
        "soundsUpdated" : "Sounds updated on the server",
        "errorSetSound": "Either you haven't registered for push notifications, or there's been an error connecting to the server. To register for notifications connect to your alarm and select the 'Push' option.",
        //---------------------------------------ADDED----------2017/05/01
        "ifttt": "IFTTT",
        "makerKey": "Maker key",
        "eventName": "Event name",
        "enabledEvents": "Enabled Events",
        "add": "Add",
        "remove": "Remove",
        "eventAlreadyAdded": "A similar event is already configured",
        "selectPushEvents": "Select from past Push events",
        "iftttUpdated": "IFTTT settings updated on the server",
        "errorSetIfttt": "Either you haven't registered for push notifications, or there's been an error connecting to the server. To register for notifications connect to your alarm and select the 'Push' option.",
        "errorNoUuidForIfttt": "Your device is not registered on the server for push notifications. This is required for IFTTT integration",
        "errorReceiveIFTTT": "Error receiving IFTTT settings from server",
        "errorReceivePushHistory": "Error receiving push history fro server",
        "errorIfttt": "Error updating the IFTTT setting on the server, please try again later",
        "iftttDisabled": "IFTTT service is disabled within the settings",
        "IftttHistory": "IFTTT History",
        "serverResponse": "Server response:",
        "response": "Response",
        "path": "Path",
        "statusCode": "Status Code",
        "emptyEvent": "One or more enabled event does not have any fields selected. Select at least one field for each event to be trigger upon."
         





    }

    var afrikaans = {
        'checkingComms': "kommunikasie word nagegaan...",
        'noComms': "Geen verbinding beskikbaar tot alarm, gaan jou netwerkverbinding en instellings na (IP-adres sal gebruik work)",
        'ready': "gereed...",
        'loading': "besig om te laai...",
        'connect': "Verbind",
        'disconnect': "Ontkoppel",
        'disconnected': "Verbinding gestaak",
        'loadingAlarms': "alarms word gelaai....",
        'ipReady': "(IP) gereed...",
        'noIpCheckPMH': "geen IP, PMH word nagegaan...",
        'noCommsShort': "geen verbinding beskikbaar tot alarm",
        'getIoData': "IO data word gelaai...",
        'pollingIO': "verbind aan IOs...",
        'stillWaitLogin': "wag nosteeds vir aantekening...",
        'togglingBypass': "skakel omseil...",
        'bypassToggled': "omseil geskakel",
        'replyReceived': "terugvoer ontvang",
        'controllingIO': "IO word geskakel...",
        'ioControlDone': "IO skakeling gedoen",
        'ioControlError': "IO skakeling fout",
        'errorWithIoControl': "Fout met IO skakeling",
        'detail': "Detail: ",
        'closingConnection': "staak verbinding...",
        'reconnecting': "herverbinding...",
        'waitLoginBeforeControl': "wag vir aanteken voor skakeling...",
        'readyUserInput': "gereed vir gebruiker se invoer",
        'performingPgmControl': "PGM skakeling word uitgevoer...",
        'pgmControlSent': "PGM beheer gestuur",
        'pulseToState': 'Pols na staat',
        'eg': "Bv.",   //for exmaple
        'onDelayOff': "On = Aan..wag..Af",
        'offDelayOn': "Off = Af..wag..Aan",
        'allDelays1Sec': "Alle vertragings is 1 sekonde.",
        'off': "Af",
        'pgmControlOff': "PGM skakel Af...",
        'pgmControlOnDone': "PGM skakel Aan. Klaar",
        'pgmControlOn': "PGM skakel Aan...",
        'pgmControlOffDone': "PGM skakel Af. Klaar",
        'instantControlBusy': "onmidellike beheer besig...",
        'area': "area",
        'noChangeDisconnecting': "geen verandering, ontkoppel tans",
        'getAlarmInfoFailed': "kry van alarm inligting het misluk",
        'loginRequestFailed': "aanvraag vir inteken het misluk",
        'couldNotConnect': "kon nie verbind!",
        'controllingArea': "beheer tans area",
        'errorDisconnecting': "fout, verbinding word gestaak",
        'connectingIpModule': "verbind tans tot ip module...",
        'pinPassIncorrect': "Pin en/of wagwoord mag verkeerd wees.",
        'internalError': "Interne fout",
        'errorWithConnection': "fout met verbinding",
        'errorWithLogin': "Fout gedurende intekening",
        'confirmAlarmSettings': "Bevestig asb. jou alarm se instellings. ",
        'commsError': "Kommunikasie fout",
        'commsToAlarmFailDisconnecting': "Verbinding met alarm het misluk, ontkoppel tans",
        'linkToAlarmUnstable': "verbinding tot alarm is onstabiel",
        'disconnectingFromIpModule': "ontkoppel tans van ip module...",
        'disconnectedReady': "(ontbind) gereed...",
        'busy': "besig...",
        'alarmInfoChanged': "Alarm inligting verander",
        'updateSaveInfo': "Wil u die nuwe inligting stoor (kies ja indien dit die eerste konneksie is na die alarm)",
        'yes': "Ja",
        'no': "Nee",
        'errorConnecting': "fout gedurende verbinding",
        /*      --------------- Display: generic views ---------------       */
        'close': "Maak toe",   //Close the view
        /*      --------------- Display: Menu ---------------       */
        'menu': "Menu",
        'manageAlarms': "Bestuur Alarms",
        'viewLogs': "Sien Loglêer",
        'settings': "Instellings",
        'about': "Inligting",
        'settingsDisabled': "installeing afgeskakel",
        'home': "Hoof",
        /*      --------------- Display: Settings ---------------       */
        'language': "Taal",
        'loggingType': "Loglêer tipe",
        'limited': "Beperk",
        'normal': "Normaal",
        'verbose': "Baie besig!",
        /*      --------------- Display: Troubles view ---------------       */
        'noTroubles': "geen probleme",
        /*      --------------- Display: one status view ---------------       */
        'zoneStatus': "Sone Status",
        /*      --------------- Display: Main (home) view ---------------       */
        'connectToAlarm': "Verbind tot alarm",
        /*      --------------- Display: Open Alarm---------------        */
        'instantControls': "Onmiddellike Beheer",
        'alarmSounding': "Alarm Klinkende",
        'events': "Gebeure",
        'ioS': "I/O's",
        'troubles': "Probleme",
        'entryDelay': "ingaan vertraag...",
        'exitDelay': "uitgaan vertraag...",
        'ARM': "WAPEN",
        'DISARM': "ONTWAPEN",
        'SLEEP': "SLAAP",
        'STAY': "BLY",
        'viewZones': "Sien Sones",
        'open': "oop",
        'alarmDisarmed': "alarm ontwapen",
        'alarmArmed': "alarm gewapen",
        'inAlarm': "In Alarm!!",
        'armedInSleep': "(slaap) gewapen",
        'armedInStay': "(bly) gewapen",
        'readyToArm': "gereed om te wapen",
        'notReadyToArm': "nie gerred om te wapen nie",
        'instant': "onmiddellike",
        'waitingForConnection': "wag vir verbinding",
        'specialFunctions': "Spesiale Funksies",
        'onlySupportedForSomeAlarms': "slegs gesteun vir party alarms",
        'pgmControl': "PGM Beheer",
        'bypassZones': "Omseil Sones",
        /*      --------------- Display: Add Alarm ---------------       */
        'addAlarm': "Voeg alarm by",
        'pullToRefresh': "Trek om te verfris...",
        'name': "NaAm",
        'siteName': "'Sitename'",
        'ipAddress': "IP Adres",
        'or': "of", //this (or) that
        'secureOption': "Gebruik SSL/TLS (HTTPS)",
        'webPort': "Web Poort",
        'softwarePort': "Sagteware poort",
        'typicalSoftPort': "tiepies 10000",
        'pinCode': "Pin kode",
        'password': "Wagwoord",
        'save': "Stoor",
        'discoveredAlarms': "Ontdek Alarms",
        'selectPullToRefresh': "(trek om te verfris)",
        'discoveredName': "Naam:",
        /*      --------------- Display: Manage Alarms ---------------        */
        'addNewAlarm': "Voeg nuwe alarm by",
        'existingAlarms': "Bestaande Alarms",
        /*      --------------- Display: Bypass Zones ---------------        */
        'bypassMsg1': "Bevestig altys die staat van sone onseiling met hulp van",
        'bypassMsg2': "die 'Sien Sones' opsie in die hoof alarm venster",
        'zones': "Sones",
        'previousState': "Vorige staat",
        'bypass': "Omseil",
        'closed': "Toe",
        'Open': "Oop",
        'closedTrouble': "Toe - Probleem",
        'openTrouble': "Oop - Probleem",
        'closedAlarmInMem': "Toe - Alarm in geheue",
        'openAlarmInMem': "Oop - Alarm in geheue",
        'bypassed': "Omseil",
        /*      --------------- Display: Alarm Events ---------------        */
        'time': "Tyd",
        'detail': "Detail",
        /*      --------------- Display: Alarm IOs ---------------        */
        'inputsOutputs': "Digitale Insette / Uitsette",
        'loadingIoStatuses': "laai tans IO statusse",
        'output': "Uitset",
        'input': "Inset",
        'Off': "Af",
        'On': "Aan",
        'toggledOutput': "Klinkende Uitset",  //Type of output
        'pulsedOutput': "Gepolste Uitset",
        'ioNote': "Nota: Die greag van u IO's kan binne die IP module se webblad verander word",
        /*      --------------- Display: PGM Control ---------------        */
        'selectPgmToControl': "Selekteer PGM om te beheer",
        'pulse': "Pols",
        /*      --------------- Display: Logs View ---------------        */
        'allLogs': "Alle Loglêer",
        'sessionLogs': "Sessie Loglêer",
        'logsNote': "Hierdie loglêer word slegs op u foon gestoor en verwyder wanner die applikasie verlaat word. Indien u probleme ondervind met die applikasie, skakel die loglêer type na 'Baie besig' (sien instellings) en herhaal die problematiese aksie. Stuur die loglêer vir ondersoek met die knoppie onderaan",
        'message': "Boodskap",
        'noEvents': "geen gebeurtenisse",
        'emailLogFeedback': "E-pos loglêer",
        /*      --------------- Software port service ---------------        */
        'evo192Reject1': "EVO192 Ontdek - spesiale funksies is nie gesteun nie.",
        'evo192Reject2': "Die volgende verbinding tot u alarm mag tydelik misluk",
        'loginFailAnotherUser': "Intekening tot alarm met sagteware poort was onsuksesvol, 'n ander gebruiker mag dalk tans verbind wees",
        /*      --------------- Alarm service ---------------        */
        'currentlyLoggedIn': "huidiglik verbind",
        'readySendLoginRequest': "gereed vir inteken vesoek...",
        'loginError1': "Fout: Tydverstreke met versoek van inteken of die IP module het 'n fout teruggekeer.",
        'loginError2': "Fout: Tydverstreke gedurdende inteken",
        'retrievingAlarmInfo': "laai tans alarm inligting...",
        'successConnected': "sukses, verbind aan alarm",
        /*      --------------- Database service ---------------        */
        'selectConnectUpdateInfo': "selekteer 'verbind' vir opdateer van inligting",
        'error': "Fout",
        'success': "Sukses",
        'alarmExist': "Alarm naam bestaan reeds",
        'alarmAdded': "Alarm bygevoeg",
        'couldntUpdateAlarm': "Kon nie alarm se inligting opdateer",
        'alarmChanged': "Alarm verander",
        'couldntDeleteAlarm': "Kon nie alarm verwyder",
        'alarmDeleted': "Alarm verwyder",
        //---------------------------------------ADDED----------2016/08/02
        'checkIpDns': "Bevestig IP / DNS",
        'siteDnsIpReq': "'Sitename' of IP/DNS benodig",
        'importantNotice': "Belangerlike nota!",
        'specialFeaturesNotice': "Meeste spesiale funksies sal 'n nuwe ('sagteware poort') verbinding tot u alarm maak wat nie geënkripteer is nie en konnekteer met u wagwoord (onbeskermd). Gebruik die funksies versigtig siendende dat netwerk onderbrekings dalk u alarm in 'n verkeerde staat kan laat. <b>Daarby bevestig dat die korrekte sagteware poort ingestel is vir die alarm.</b>",
        //---------------------------------------ADDED----------2016/08/06
        'noEmailOpen': "Kon nie stel - alle beskikbare e-pos slotte word tans gebruik",
        'retrievingSettings': "laai tans instellings...",
        'doneSelectOptions': "klaar, selekteer opsies",
        'updating': "inligting work opdateer...",
        'online': "Aanlyn",
        'offline': "Af van lyn",
        'savingSettings': "stoor tans instellings...",
        'successSettingsSaved': "sukses, instellings gestoor",
        'newPushConfigSuccess': "Nuwe gebruiker sukses geregistreet vir 'push notifications'",
        'existingPushConfigSuccess': "Opdateer van bestaande gebruiker se 'push notifications' suksesvol",
        'failPushUpdate': "Opdateer van alarm op bediener het misluk, probeer weer later",
        'errorConnectServer': "fout gedurende verbinding aan bediener, probeer weer later",
        'googlePlayError': "'google play services' fout, probeer weer later",
        'pushService': "'Push service'",
        'pushNotifications': "'Push Notifications'",
        'pushNotification': "'Push Notification'",
        'selectAreasNotify': "Areas om te moniteer",
        'area': "Area",
        'selectEventsNotify': "Gebeurtenisse om te moniteer",
        'alarms': "Alarms",
        'armDisarm': "Wapen / Ontwapen",
        'IO1': "IO1",
        'IO2': "IO2",
        'webAccessBlocked': "Web toegang geblokkeer",
        'pushNote1': "Nota: 'n Aktiewe Internet verbindig is benodig. Indien u in die toekoms die alarm verwyder sal die 'push notifications' aanhou om te stuur. Gebruik die applikasie om die funksie te af te skakel",
        //---------------------------------------ADDED----------2016/08/08
        'userNoPermission': "Fout: Die pin ingestel vir hierdie alarm mag dalk nie toegang tot e-pos instelleing hê nie",
        'alarmNames': "Alarm Name",
        'areaNames': "Area Name",
        'zonePartitions': "Sone Partisies",
        'zoneNames': "Sone Name",
        'troubleNames': "Probleem Name",
        'delete': "Verwyder",
        //---------------------------------------ADDED----------2016/08/09
        'alertSmtpOverride': "U het geselektter om die SMTP instellings te verander. Indien u tervore e-posse ontvang het van die alarm sal dit nie meer werk nie. Indien u dit perongleuk geselekteer het, verander u opsie nou voor u die isntellings stoor. Alarmin kan werk met beide u eie SMTP bediener of u kan nou een laat stel.",
        'note': "Nota",
        'doNotModEmail': "Use_own_SMTP_server_before@editing.com",
        'pushNote2': "U IP module is nie ingestel om e-posse te stuur nie. Die instel van 'push notifications' sal 'n SMTP bediener stoor op u IP module wat slegs vir die doel gebruik kan word (nie persoonlike e-posse nie). Indien u ook persoonlike e-posse wil ontvang kan die u u eie SMTP bediener instel, solank as Alarmin se e-pos instellings onveranderd bly.",
        'pushNote3': "U IP module is klaar ingestel om e-posse te stuur. Indien u graag wil voortgaan om persoonlike e-posse te ontvang van die IP module, maar in samewerking met 'push notifications', maak seker dat die volgende opsie NIE geselekteer is nie. Die stoor van Alarmin se SMTP bediener sal ook u huidige e-pos kennisgewings verwyder of onaktief maak",
        'overrideSMTP': "Stoor (nuwe) SMTP server",
        'pushNotReachable': "Geen verbinding tot 'Push' dienste tans moontlik, probeer weer later.",
        //---------------------------------------ADDED----------2016/08/10
        'updateExistingPushUser': "Bestaan gebruiker se profiel op hierdie alarm sal opdateer word",
        'createNewPushUser': "Nuwe gebruiker profiel sal vir hierdie alarm gemaak word",
        'requestAlarmDataTimeout': "Fout: Versoek om data van die alarm het misluk",
        'fullScreen': "Vol Skerm",
        'controlStillInOp': "beheer nog besig...",
        'pmhReady': "(PHM) gereed...",
        'updatingEvents': "gebeurtenisse word opdateer",
        'earlyPushNote': "Hierdie funksie is nog in 'n vroeë toets fase. Sttor asb 'n kopie van u IP module se e-pos instellings voordat u voortgaan.",
        'ok': "Ok",
        //---------------------------------------ADDED----------2016/08/13
        'disconnectingAlarm': "Ontkoppel tans van alarm...",
        'backToExit': "Druk weer terug om te verlaat",
        //---------------------------------------ADDED----------2016/08/18
        'push': "Push",
        'compressedView': "Onderdruk Alarm Skrem",
        'helpIssues': "Help / Probleme",
        'help': "Help",
        'serviceAnnouncements': "Diens Afkondigings",
        'noAnnounce': "Geen afkondigings huideglik",
        'gotoGithub': "Gaan na GitHub",
        'enhancements': "Verbeteringe",
        'bugs': "Foute",
        'all': "Als",
        'helpWanted': "Hulp Benodig",
        'question': "Vrae",
        'unread': "ongelees",
        'filterBy': "Filtreer met",
        //---------------------------------------ADDED----------2016/08/24
        'appAuthentication': "Applikasie Aanteken",
        'pinCreated': "Pin geskep",
        'pinNoMatch': "Pin is nie dieselfde nie",
        'confirmPin': "Bevestig pin",
        'appPin': "Applikasie pin",
        'cancel': "kanselleer",
        'createNewPin': "Skep nuwe pin",
        'requirePinStartup': "Applikasie pin",
        'enterPinProceed': "Pin benodig om voort te gaan",
        'authenticate': "Teken aan",
        //---------------------------------------ADDED----------2016/09/03
        'autoConnect': "Konnekteer Automaties",
        //---------------------------------------Modified----------2016/09/06
        'checkSitename': "Bevestig 'sitename'",
        'bypassed2': "ge-omseil",

        'pushHistory': "Push Geskiedenis",
        'retrievingHistory': "Geskiendenis word gelaai...",
        'noHistory': "Geen geskiedenis beskikbaar",
        'zone': "Sone",
        'errorTTS': "Fout met teks tot spraak enjin, of sones verader te vinnig.",
        'zoneTesting': "Sone Toetsing",
        'trigZoneTest': 'Sneller nou sones wat getoets moet work.',
        'speakWithTestMode': 'Sneller nou sones, sal slegs eens sone verandering aankondig',
        'speakOnWithTestMode': 'Toets tans besig, sal slegs eens sone verandering aankondig',
        'testZones': "Toets Sones",
        'resetTest': "Herstel Toets",
        'speakZones': "Praat Zones",
        'untested': "Ongetoets",
        'egSpecialFunc': "e.g. omseil/pgm",
        "specialFunctionsNotSupported": "word nie gesteun vir hierdie alarm tipe nie",
        "changePgmName": "Verander PGM Naam",
        "connectedAlarmDetails": "Alarm besonderhede:",
        "panelDetails": "Panel besonderhede",
        "type": "Tipe",
        "firmwareVersion": "Firmware weergawe",
        "serialNumber": "Serialle nommer",
        "ipModDetails": "IP module besonderhede",
        "hardware": "Hardewaarde",
        "eco": "ECO",
        "serialBoot": "Serial laai",
        "ipModule": "IP module",
        "pgm": 'PGM',
        "connectingSwp": "konnekteer tans aan sagtewaarde poort...",
        "FORCE": "FORSEER",
        "disarmBeforeBypass": "Kan nie omseil terwyl alarm gewapen is nie",
        "forceArmShowArm": "Forseer wapen - alarm sal as gewapen toon",
        "optional": "opsioneel",
        "settings2": "instellings",
        "nameOnly": "name slleen",
        "genericSettings": "Generiese instelliings",
        "homeWifi": "Huis WiFi",
        "testPushNotif": "Wil u 'n toets push boodskap genereer? <br><br>Indien die applikasie oop is sal die nofikasie binne die applikasie wys. Minimiseer die applikasie om die notifikasie reg te vertoon.",
        //---------------------------------------ADDED----------2017/04/29
        "pushSounds": "Push notifikasie tone",
        "alarm": "Alarm",
        "disarm": "Ontwapen",
        "arm": "Wapen",
        "saveSounds": "Stoor Tone",
        "soundsUpdated" : "Tone is opdateer op die bediener",
        "errorSetSound": "Daar was 'n probleem. U mag dalk nie geristreer wees with push notifikasies nie, of die bediener is van lyn af. Om te registreer vir push notifikasies, konnekteer aan u alarm en selekteer die 'push' opsie.",

    }

    var catala = {
        'checkingComms': "comprovant comunicació.",
        'noComms': "Sense comunicació, comprova la connexió i configuració del panell (per defecte IP)",
        'ready': "Preparat ...",
        'loading': "carregant ...",
        'connect': "Connectar",
        'disconnect': "desconnectar",
        'disconnected': "desconnectat",
        'loadingAlarms': "carregant alarmes....",
        'ipReady': "(IP) Preparat...",
        'noIpCheckPMH': "no IP, comprovant PMH...",
        'noCommsShort': "Sense comunicaciós disponibles",
        'getIoData': "agafant dades E/S...",
        'pollingIO': "verificant E/S...",
        'stillWaitLogin': "esperant per connectar...",
        'togglingBypass': "enviant anulacion...",
        'bypassToggled': "anul·lada",
        'replyReceived': "resposta rebuda",
        'controllingIO': "consultant E/S...",
        'ioControlDone': "IO preparat",
        'ioControlError': "IO control error",
        'errorWithIoControl': "Error amb IO control",
        'detail': "Detalls: ",
        'closingConnection': "tancant connexió ...",
        'reconnecting': "reconnectant ...",
        'waitLoginBeforeControl': "esperant connexió a Alarma...",
        'readyUserInput': "preparat per utilitzar",
        'performingPgmControl': "realitzant control PGM...",
        'pgmControlSent': "Enviar senyal a PGM ",
        'pulseToState': 'Prem per estat',
        'eg': "Exemp.",   //per exemple
        'onDelayOff': "Activa = Actiu..espera..Apagat",
        'offDelayOn': "Desactivar = Apagat..espera..Actiu",
        'allDelays1Sec': "Tots els polsos són d'1 segon.",
        'off': "Apagat",
        'pgmControlOff': "PGM control Apagat ...",
        'pgmControlOnDone': "PGM control Actiu. A punt",
        'pgmControlOn': "PGM control Actiu ...",
        'pgmControlOffDone': "PGM control Apagat. A punt",
        'instantControlBusy': "control panell ocupat...",
        'area': "area",
        'noChangeDisconnecting': "no hi ha canvis detectats, desconnectant",
        'getAlarmInfoFailed': "error carregant info del panell",
        'loginRequestFailed': "petició inicial fallida",
        'couldNotConnect': "no es pot connectar!",
        'controllingArea': "area de control",
        'errorDisconnecting': "error, desconnectant",
        'connectingIpModule': "connectant a mòdul IP...",
        'pinPassIncorrect': "Codi i / o clau IP errònia.",
        'internalError': "Error Intern",
        'errorWithConnection': "error amb connexió",
        'errorWithLogin': "Error amb conexio",
        'confirmAlarmSettings': "Si us plau confirma configuració alarma. ",
        'commsError': "Comunicació error",
        'commsToAlarmFailDisconnecting': "Fallada amb connexió panell, desconnectant",
        'linkToAlarmUnstable': "connexió amb panell inestable",
        'disconnectingFromIpModule': "desconexion mòdul IP...",
        'disconnectedReady': "(Desconnectat) Preparat...",
        'busy': "Ocupat...",
        'alarmInfoChanged': "Infor panell canviada",
        'updateSaveInfo': "Infor panell canviada",
        'yes': "Si",
        'no': "No",
        'errorConnecting': "error connectant",
        /*      --------------- Display: generic views ---------------       */
        'close': "Tancar",   //Close the view
        /*      --------------- Display: Menu ---------------       */
        'menu': "Menu",
        'manageAlarms': "Configura alarmes",
        'viewLogs': "Veure Registres",
        'settings': "Configuració",
        'about': "Acerca de",
        'settingsDisabled': "config desactivada",
        'home': "Inici",
        /*      --------------- Display: Settings ---------------       */
        'language': "Idioma",
        'loggingType': "Tipus de registres",
        'limited': "Limitat",
        'normal': "Normal",
        'verbose': "Extens",
        /*      --------------- Display: Troubles view ---------------       */
        'noTroubles': "sense errors",
        /*      --------------- Display: one status view ---------------       */
        'zoneStatus': "Estat Zona",
        /*      --------------- Display: Main (home) view ---------------       */
        'connectToAlarm': "Connectar a l'Alarma",
        /*      --------------- Display: Open Alarm---------------        */
        'instantControls': "Panell de Control",
        'alarmSounding': "Alarma disparada !!",
        'events': "Events",
        'ioS': "E/S's",
        'troubles': "Fallos",
        'entryDelay': "temps entrada",
        'exitDelay': "temps sortida",
        'ARM': "ARMAT",
        'DISARM': "DESARMAT",
        'SLEEP': "MODO NIT",
        'STAY': "INTERIOR",
        'viewZones': "Veure Zones",
        'open': "oberta",
        'alarmDisarmed': "alarma desarmada",
        'alarmArmed': "alarma armada",
        'inAlarm': "En Alarma!!",
        'armedInSleep': "armat nit",
        'armedInStay': "armat a casa",
        'readyToArm': "Preparada per armar",
        'notReadyToArm': "No preparada per armar",
        'instant': "instantània",
        'waitingForConnection': "Preparada per connectar",
        'specialFunctions': "Funcions Especials",
        'onlySupportedForSomeAlarms': "només suportat per algunes alarmes",
        'pgmControl': "PGM Control",
        'bypassZones': "Zones anul·lades",
        /*      --------------- Display: Add Alarm ---------------       */
        'addAlarm': "Afegir alarma",
        'pullToRefresh': "Deixa anar per refrescar ...",
        'name': "Nom",
        'siteName': "Lloc",
        'ipAddress': "Direcció IP",
        'or': "o", //this (or) that
        'secureOption': "Utilitza SSL/TLS (HTTPS)",
        'webPort': "Port Web",
        'softwarePort': "Port Software",
        'typicalSoftPort': "Per defecte 10000",
        'pinCode': "Codi usuari",
        'password': "Clau",
        'save': "Guardar",
        'discoveredAlarms': "descobrir alarmes",
        'selectPullToRefresh': "(Arrossega per refrescar)",
        'discoveredName': "Nom:",
        /*      --------------- Display: Manage Alarms ---------------        */
        'addNewAlarm': "Afegeix una alarma",
        'existingAlarms': "Alarmes existents",
        /*      --------------- Display: Bypass Zones ---------------        */
        'bypassMsg1': "Sempre confirma l'anul·lació de la zona",
        'bypassMsg2': "a 'Veure Zones' del panell principal",
        'zones': "Zones",
        'previousState': "Estat anterior",
        'bypass': "Anular",
        'closed': "Tancada",
        'Open': "Oberta",
        'closedTrouble': "Tancada - Problema",
        'openTrouble': "Oberta - Problema",
        'closedAlarmInMem': "Tancada - Alarma en memoria",
        'openAlarmInMem': "Oberta - Alarma en memoria",
        'bypassed': "Anulada",
        /*      --------------- Display: Alarm Events ---------------        */
        'time': "Temps",
        'detail': "Detalls",
        /*      --------------- Display: Alarm IOs ---------------        */
        'inputsOutputs': "Entrades / Sortides",
        'loadingIoStatuses': "carregant estat E/S",
        'output': "Sortida",
        'input': "Entrada",
        'Off': "Apaga",
        'On': "Activa",
        'toggledOutput': "Sortida ON/OFF ",  //Type of output
        'pulsedOutput': "Sortida Puls",
        'ioNote': "Nota: La configuració i tipus de IOs es canvia des del web de Mòdul IP",
        /*      --------------- Display: PGM Control ---------------        */
        'selectPgmToControl': "Selecciona PGM a controlar",
        'pulse': "Puls",
        /*      --------------- Display: Logs View ---------------        */
        'allLogs': "Tots registres",
        'sessionLogs': "Lista de registres",
        'logsNote': "Els registres NOMÉS s'emmagatzemen localment al mòbil, quant es tanca l'aplicació s'esborren. Si veus un problema o error en l'aplicació canvia a registres DETALLAT i enviamelos amb el botó de sota per poder solucionar.",
        'message': "Missatge",
        'noEvents': "sense events",
        'emailLogFeedback': "Enviar registre",

        /*      --------------- Software port service ---------------        */
        'evo192Reject1': "EVO192 Detectada - funcions especials no suportades.",
        'evo192Reject2': "Espera un minut a connectar el panell, pot fallar",
        'loginFailAnotherUser': "Connexió al panell no realitzada, un altre usuari pot estar connectat",
        /*      --------------- Alarm service ---------------        */
        'currentlyLoggedIn': "actualment connectat",
        'readySendLoginRequest': "preparat per poder connectar...",
        'loginError1': "Error: Temps de sol·licitud d'accés exhaurit o mòdul IP va tornar l'error.",
        'loginError2': "Error: Temps d'espera esgotat",
        'retrievingAlarmInfo': "recuperant estat de panell...",
        'successConnected': "Connectat a l'alarma",
        /*      --------------- Database service ---------------        */
        'selectConnectUpdateInfo': "seleccioneu 'connectar' per actualitzar informació",
        'error': "Error",
        'success': "Aconsegit",
        'alarmExist': "Nom d'alarma ja existeix",
        'alarmAdded': "alarma afegida",
        'couldntUpdateAlarm': "No puc actualitzar detalls de l'alarma",
        'alarmChanged': "Canvis en Alarma",
        'couldntDeleteAlarm': "No s'ha pogut esborrar l'alarma",
        'alarmDeleted': "alarma eliminada",
        //---------------------------------------ADDED----------2016/08/02
        'checkIpDns': "Comprova IP / DNS",
        'siteDnsIpReq': "Nom o IP / DNS requerit",
        'importantNotice': "Notificació important!",
        'specialFeaturesNotice': "La majoria de les funcions especials fan una nova connexió ('port de programari') perquè el panell d'alarma no es pot encriptat, i connectar-se a través de la seva contrasenya (sense protecció). Utilitzar aquestes característiques amb cura, ja que les interrupcions de xarxa poden deixar el panell d'alarma en estat incorrecte. A més comprova la correcta configuracion del port de programari en les opcions.</b>",
        //---------------------------------------ADDED----------2016/08/06
        'noEmailOpen': "No es pot configura, tots els destins de correus electrònics usats",
        'retrievingSettings': "recuperan configuració...",
        'doneSelectOptions': "fet, seleccioneu l'opció",
        'updating': "actualitzant...",
        'online': "En línia",
        'offline': "Desconnectat",
        'savingSettings': "Guardant configuració...",
        'successSettingsSaved': "correcte, configuració guardada",
        'newPushConfigSuccess': "Nou usuari registrat correctament per les notificacions",
        'existingPushConfigSuccess': "Usuari existent, la configuració de notificacions s'han actualitzat",
        'failPushUpdate': "Fallada al actualizar servidor de notificacions",
        'errorConnectServer': "error en connectar amb el Servidor",
        'googlePlayError': "error dels Serveis de Google Play",
        'pushService': "servei notificacions",
        'pushNotifications': "Notificacions Push",
        'pushNotification': "Notificacion Push",
        'selectAreasNotify': "Seleccioneu les àrees que han de notificar",
        'area': "Àrea",
        'selectEventsNotify': "Seleccioneu els esdeveniments que han de notificar",
        'alarms': "Alarmes",
        'armDisarm': "Armat / Desarmat",
        'IO1': "E/S 1",
        'IO2': "E/S 2",
        'webAccessBlocked': "BLOQUEJAT Web Accés",
        'pushNote1': "Es requereix una connexió a internet activa. Sí es elimina el panell d'alarma, en el futur continuaras rebent notificacions push. Utilitzeu aquesta aplicació per desactivar les notificacions push abans d'esborrar",
        //---------------------------------------ADDED----------2016/08/08
        'userNoPermission': "Error: el codi d'usuari NO té dret a editar les options correu o notificacions",
        'alarmNames': "Nom Alarma",
        'areaNames': "Noms Area",
        'zonePartitions': "Zones Particions",
        'zoneNames': "Noms Zones",
        'troubleNames': "Noms Avaries",
        'delete': "Esborrar",
        //---------------------------------------ADDED----------2016/08/09
        'alertSmtpOverride': "Ha seleccionat anul·lar la configuration d'SMTP actual. Si estaves rebent missatges de correu electrònic des la teva alarma, això NO continuarà funcionant. Si ha seleccionat la anul·lació per error, desmarca de nou l'opció abans de guardar. Les notificacions push funcionen igualment amb el teu propi Servidor SMTP.",
        'note': "Nota",
        'doNotModEmail': "Utiliza_el_teu_SMTP_abans@editar.com",
        'pushNote2': "El seu mòdul IP no està configurat per a enviar correus electrònics. El Servidor SMTP en el mòdul IP només pot ser per notificacions push (NO missatges de correu electrònic personals). Pot cambiar la configuració del servidor SMTP perque pugui també enviar correus electrònics personals, però sempre que els correus electrònics de sortida configurats es mantinguin.",
        'pushNote3': "El seu mòdul IP ja està configurat per a enviar correus electrònics. Si desitja continuà utilitzant el correus electrònics personals i amb les notificacions Push, assegura't de NO triar la següent opció. Anul·lació del Servidor SMTP, Elimina o desactiva les seves notificacions per correu electrònic existents",
        'overrideSMTP': "(Sobreescriure) del servidor SMTP",
        'pushNotReachable': "Notificacions push no disponibles",
        //---------------------------------------ADDED----------2016/08/10
        'updateExistingPushUser': "El perfil d'usuari existent sobre aquesta alarma es a actualitzat",
        'createNewPushUser': "Nou perfil d'usuari creat per a aquesta alarma",
        'requestAlarmDataTimeout': "Temps esgotat en petició a la alarma",
        'fullScreen': "Pantalla Completa",
        'controlStillInOp': "control encara en funcionament...",
        'pmhReady': "(PHM) Preparat...",
        'updatingEvents': "actualitzant eveniments",
        'earlyPushNote': "Aquesta característica es troba en una fase primerenca de proves. Assegurar-se fer una còpia de seguretat de la configuració dels correus electrònics que hi ha al seu mòdul IP abans de continuar.",
        'ok': "Acceptar",
        //---------------------------------------ADDED----------2016/08/13
        'disconnectingAlarm': "Desconnectant panell...",
        'backToExit': "Prem botó enrere de nou per sortir",
        //---------------------------------------ADDED----------2016/08/18
        'push': "Push",
        'compressedView': "Vista panell comprimida",
        'helpIssues': "Ajuda",   //"Ajuda / Suggeriments",
        'help': "Ajuda",
        'serviceAnnouncements': "Servei Alertes",
        'noAnnounce': "No hi ha alertes",
        'gotoGithub': "Anar a GitHub",
        'enhancements': "Millores",
        'bugs': "Errades",
        'all': "Tot",
        'helpWanted': "Buscar ajuda",
        'question': "Pregunta",
        'unread': "sense llegir",
        'filterBy': "Filtrar per",
        //---------------------------------------ADDED----------2016/08/24
        'appAuthentication': "Creació de codi",
        'pinCreated': "Codi creat",
        'pinNoMatch': "Codis no coincideixen",
        'confirmPin': "Confirma codi",
        'appPin': "Aplicar codi",
        'cancel': "Cancelar",
        'createNewPin': "Crear nou codi",
        'requirePinStartup': "Requereix codi al inicia",
        'enterPinProceed': "Introdueix el teu codi per obrir",
        'authenticate': "Autentificació",
        //---------------------------------------ADDED----------2016/09/03
        'autoConnect': "Connecti Automàticament",
        //---------------------------------------Modified----------2016/09/06
        'checkSitename': "Comprova el nom. Si tu no fas servir paradoxmyhome.com, simplement esborra el Lloc.",
        'bypassed2': "anul·lada",
        //---------------------------------------ADDED----------2016/09/06
        'pushHistory': "Push Historial",
        'retrievingHistory': "Rebent historial...",
        'noHistory': "Sense historial disponible",
        'zone': "Zona",
        'errorTTS': "Error en text quan parla",
        'zoneTesting': "Prova de Zones",
        'trigZoneTest': 'Proba de obertura de zones',
        'speakWithTestMode': "Prova d'obertura de zones, parlara només d'una vegada per zona",
        'speakOnWithTestMode': "Prova en marxa, parlara només d'una vegada per zona",
        'testZones': "Provar Zones",
        'resetTest': "Reiniciar",
        'speakZones': "Zona parlada",
        'untested': "No comprovada",
        'egSpecialFunc': "Ejemp. Anular/Pgm",
        'specialFunctionsNotSupported': "no suportat per el teu model d'alarma",
        "changePgmName": "Canviar nom de la PGM",
        "connectedAlarmDetails": "Detalls de l'alarma connectada:",
        "panelDetails": "Detalls de l'alarma",
        "type": "Tipus",
        "firmwareVersion": "Versió del firmware",
        "serialNumber": "Número de sèrie",
        "ipModDetails": "Detalls mòdul IP",
        "hardware": "Hardware",
        "eco": "ECO",
        "serialBoot": "Boot sèrie",
        "ipModule": "Mòdulo IP",
        "pgm": 'PGM',
        "connectingSwp": "Connectant al port de software...",
        "FORCE": "FORÇAT",
        "disarmBeforeBypass": "Anular zones no es possible amb l'alarma armada",
        "forceArmShowArm": "Armat forçat, quan esta armada es mostrarà com armat normal",
        "optional": "opcional",
        "settings2": "configuració",
        "nameOnly": "sol nom",
        "genericSettings": "Configuració general",
        "homeWifi": "WiFi local",
        "testPushNotif": "¿T'agradaria fer una prova de notificació push? <br><br>Si l'aplicació es manté oberta no la veuras. Minimízala perquè la puguis veure-la en la barra de tasques.",
        "pushSounds": "Sons de Notificació Push",
        "alarm": "Alarma",
        "disarm": "Desarmat",
        "arm": "Armat",
        "saveSounds": "Salvar sons",
        "soundsUpdated": "Sons actualitzats al servidor",
        "errorSetSound": "O no s'ha registrat els sons per a les notificacions push, o s'ha produït un error en connectar-se al servidor. Per poder guardar els sons per a notificacions, connecteu-vos a la seva alarma i seleccioneu l'opció 'Push'.",

    }

    var spanish = {
        'checkingComms': "comprobando comunicación.",
        'noComms': "Sin comunicación, comprueba la conexión y configuración del panel (por defecto IP)",
        'ready': "Preparado...",
        'loading': "Cargando...",
        'connect': "Conectar",
        'disconnect': "Desconectar",
        'disconnected': "Desconectado",
        'loadingAlarms': "Cargando alarmas....",
        'ipReady': "(IP) Preparado...",
        'noIpCheckPMH': "No IP, comprobando PMH...",
        'noCommsShort': "Sin comunicaciones disponibles",
        'getIoData': "leyendo datos de E/S...",
        'pollingIO': "verificando E/S's...",
        'stillWaitLogin': "esperando para conectar...",
        'togglingBypass': "enviando anulación...",
        'bypassToggled': "anulada",
        'replyReceived': "respuesta recibida",
        'controllingIO': "consultando E/S...",
        'ioControlDone': "IO preparado",
        'ioControlError': "IO control error",
        'errorWithIoControl': "Error con IO control",
        'detail': "Detalles: ",
        'closingConnection': "cerrando conexión...",
        'reconnecting': "reconectando...",
        'waitLoginBeforeControl': "esperando conexión con Panel...",
        'readyUserInput': "preparado para usar",
        'performingPgmControl': "realizando control PGM...",
        'pgmControlSent': "Enviada señal a PGM ",
        'pulseToState': 'Pulsa para estado',
        'eg': "Ejm.",   //por ejemplo
        'onDelayOff': "Activar = Activo..espera..Apagado",
        'offDelayOn': "Desactivar = Paro..espera..Activo",
        'allDelays1Sec': "Todos los pulsos son de 1 segundo.",
        'off': "Apagado",
        'pgmControlOff': "PGM control Apagado...",
        'pgmControlOnDone': "PGM control Activo. Listo",
        'pgmControlOn': "PGM control Activo...",
        'pgmControlOffDone': "PGM control Apagado. Listo",
        'instantControlBusy': "control panel ocupado...",
        'area': "area",
        'noChangeDisconnecting': "no hay cambios detectados, desconectando",
        'getAlarmInfoFailed': "error cargando info del panel",
        'loginRequestFailed': "petición de inicio fallo",
        'couldNotConnect': "no se puede conectar!",
        'controllingArea': "area de control",
        'errorDisconnecting': "error, desconectando",
        'connectingIpModule': "conectando a modulo IP...",
        'pinPassIncorrect': "Código y/o clave IP errónea.",
        'internalError': "Error interno",
        'errorWithConnection': "error con conexión",
        'errorWithLogin': "Error con conexión",
        'confirmAlarmSettings': "Por favor confirma configuración alarma. ",
        'commsError': "Error de comunicación",
        'commsToAlarmFailDisconnecting': "Fallo con conexion panel, desconectando",
        'linkToAlarmUnstable': "conexion con panel inestable",
        'disconnectingFromIpModule': "desconexión modulo IP...",
        'disconnectedReady': "(desconectado) Listo...",
        'busy': "Ocupado...",
        'alarmInfoChanged': "Info panel cambiada",
        'updateSaveInfo': "Info panel cambiada",
        'yes': "Si",
        'no': "No",
        'errorConnecting': "error conectando",
        /*      --------------- Display: generic views ---------------       */
        'close': "Atras",   //Close the view
        /*      --------------- Display: Menu ---------------       */
        'menu': "Menu",
        'manageAlarms': "Configurar alarmas",
        'viewLogs': "Ver Registros",
        'settings': "Configuración",
        'about': "Acerca de",
        'settingsDisabled': "Config desactivada",
        'home': "Principal",
        /*      --------------- Display: Settings ---------------       */
        'language': "Idioma",
        'loggingType': "Tipo de registros",
        'limited': "Limitado",
        'normal': "Normal",
        'verbose': "Extenso",
        /*      --------------- Display: Troubles view ---------------       */
        'noTroubles': "Sin fallos",
        /*      --------------- Display: one status view ---------------       */
        'zoneStatus': "Estado Zona",
        /*      --------------- Display: Main (home) view ---------------       */
        'connectToAlarm': "Conectar a Panel de Alarma",
        /*      --------------- Display: Open Alarm---------------        */
        'instantControls': "Panel de Control",
        'alarmSounding': "Alarma disparada",
        'events': "Eventos",
        'ioS': "E/S's",
        'troubles': "Fallos",
        'entryDelay': "tiempo entrada",
        'exitDelay': "tiempo salida",
        'ARM': "ARMADO",
        'DISARM': "DESARMADO",
        'SLEEP': "NOCHE",
        'STAY': "INTERIOR",
        'viewZones': "Ver Zonas",
        'open': "abierta",
        'alarmDisarmed': "Alarma desarmada",
        'alarmArmed': "Alarma armada",
        'inAlarm': "En Alarma!!",
        'armedInSleep': "Armado noche",
        'armedInStay': "Armado en casa",
        'readyToArm': "Lista para armar",
        'notReadyToArm': "No preparada para armar",
        'instant': "Instantanea",
        'waitingForConnection': "Preparada para conectar",
        'specialFunctions': "Funciones Especiales",
        'onlySupportedForSomeAlarms': "Solo soportado por algunos modelos de Panel",
        'pgmControl': "PGM Control",
        'bypassZones': "Zonas anuladas",
        /*      --------------- Display: Add Alarm ---------------       */
        'addAlarm': "Añadir alarma",
        'pullToRefresh': "Suelta para refrescar...",
        'name': "Nombre",
        'siteName': "Sitio",
        'ipAddress': "Dirección IP",
        'or': "o", //this (or) that
        'secureOption': "Usar SSL/TLS (HTTPS)",
        'webPort': "Puerto Web",
        'softwarePort': "Puerto Software",
        'typicalSoftPort': "Por defecto 10000",
        'pinCode': "Código usuario",
        'password': "Contraseña",
        'save': "Guardar",
        'discoveredAlarms': "Descubrir alarmas",
        'selectPullToRefresh': "(Arrastra para refrescar)",
        'discoveredName': "Nombre:",
        /*      --------------- Display: Manage Alarms ---------------        */
        'addNewAlarm': "Añadir nueva alarma",
        'existingAlarms': "Alarmas existentes",
        /*      --------------- Display: Bypass Zones ---------------        */
        'bypassMsg1': "Siempre confirma la anulacion de la zona",
        'bypassMsg2': "en 'Ver Zonas' del panel principal",
        'zones': "Zonas",
        'previousState': "Estado anterior",
        'bypass': "Anular",
        'closed': "Cerrada",
        'Open': "Abierta",
        'closedTrouble': "Cerrada - Problema",
        'openTrouble': "Abierta - Problema",
        'closedAlarmInMem': "Cerrada - Memoria Alarma",
        'openAlarmInMem': "Abierta - Memoria Alarma",
        'bypassed': "Anulada",
        /*      --------------- Display: Alarm Events ---------------        */
        'time': "Tiempo",
        'detail': "Detalles",
        /*      --------------- Display: Alarm IOs ---------------        */
        'inputsOutputs': "Entradas / Salidas",
        'loadingIoStatuses': "cargando estado E/S",
        'output': "Salida",
        'input': "Entrada",
        'Off': "Apagar",
        'On': "Activar",
        'toggledOutput': "Salida ON/OFF ",  //Type of output
        'pulsedOutput': "Salida Pulso",
        'ioNote': "Nota: La configuración y el tipo de E/S se cambia desde la web de Modulo IP",
        /*      --------------- Display: PGM Control ---------------        */
        'selectPgmToControl': "Selecciona PGM a controlar",
        'pulse': "Pulso",
        /*      --------------- Display: Logs View ---------------        */
        'allLogs': "Todos registros",
        'sessionLogs': "Registros",
        'logsNote': "Los registros SOLO se almacenan en el movil, estos en cuanto se cierra la aplicación se borran. Si ves un problema o error en la aplicación cambia a registros DETALLADO y enviamelos con el boton de abajo para poder solucionarlos.",
        'message': "Mensaje",
        'noEvents': "sin eventos",
        'emailLogFeedback': "Enviar registro",
        /*      --------------- Software port service ---------------        */
        'evo192Reject1': "EVO192 Detectada - funciones especiales no soportadas.",
        'evo192Reject2': "Espera un minuto para reconectar al panel, puede fallar",
        'loginFailAnotherUser': "Conexion al panel no realizada, otro usuario puede estar conectado",
        /*      --------------- Alarm service ---------------        */
        'currentlyLoggedIn': "actualmente conectado",
        'readySendLoginRequest': "preparado para poder conectarse...",
        'loginError1': "Error: Tiempo de solicitud de acceso agotado o módulo IP devolvió el error.",
        'loginError2': "Error: Tiempo de espera agotado",
        'retrievingAlarmInfo': "recuperando estado de panel...",
        'successConnected': "Conectado a la alarma",
        /*      --------------- Database service ---------------        */
        'selectConnectUpdateInfo': "seleccione 'conectar' para actualizar información",
        'error': "Error",
        'success': "Conseguido",
        'alarmExist': "Nombre de alarma ya existe",
        'alarmAdded': "Alarma añadida",
        'couldntUpdateAlarm': "No pudo actualizar detalles de la alarma",
        'alarmChanged': "Cambios en Alarma",
        'couldntDeleteAlarm': "No se pudo borrar la alarma",
        'alarmDeleted': "Alarma eliminada",
        //---------------------------------------ADDED----------2016/08/02
        'checkIpDns': "Comprueba IP / DNS",
        'siteDnsIpReq': "Nombre o IP/DNS requerido",
        'importantNotice': "Notificación importante!",
        'specialFeaturesNotice': "La mayoría de las funciones especiales se hacen desde una nueva conexión ('puerto de software'). Esto conecta a través de su contraseña, pero sin encriptar. Utilizar estas características con cautela, ya que las interrupciones de red pueden dejar el panel de alarma en estado incorrecto. Además comprueba la correcta configuracion del puerto de software en las opciones.</b>",
        //---------------------------------------ADDED----------2016/08/06
        'noEmailOpen': "No se puede configurar, todos los destinos de emails usados",
        'retrievingSettings': "recuperando configuración...",
        'doneSelectOptions': "Preparado, selecciona opciones",
        'updating': "actualizando...",
        'online': "En Línea",
        'offline': "No Disponible",
        'savingSettings': "guardando ajustes ...",
        'successSettingsSaved': "correcto, los ajustes guardados",
        'newPushConfigSuccess': "Nuevo usuario registrado, notificaciones push guardadas",
        'existingPushConfigSuccess': "Usuario existente, notificaciones push actualizadas correctamente",
        'failPushUpdate': "Fallo al acualizar servidor notificaciones",
        'errorConnectServer': "error al conectar con el servidor",
        'googlePlayError': "error de los servicios de Google Play",
        'pushService': "Servicio Notificaciones",
        'pushNotifications': "Notificaciones Push",
        'pushNotification': "Notificaciones Push",
        'selectAreasNotify': "Seleccione las áreas que deben notificarse",
        'area': "Area",
        'selectEventsNotify': "Seleccione los eventos que deben notificarse",
        'alarms': "Alarmas",
        'armDisarm': "Armado / Desarmado",
        'IO1': "E/S 1",
        'IO2': "E/S 2",
        'webAccessBlocked': "Acceso Web bloqueado",
        'pushNote1': "Se requiere una conexión a internet. Si eliminas el panel de alarma, en el futuro seguiras recibiendo notificaciones push. Utiliza esta aplicación para desactivar las notificaciones antes de borrar",
        //---------------------------------------ADDED----------2016/08/08
        'userNoPermission': "Error: El codigo de usuario no tiene derecho a editar las opciones de correo o notificaciones",
        'alarmNames': "Nombres Alarma",
        'areaNames': "Nombres Area",
        'zonePartitions': "Zonas Particiones",
        'zoneNames': "Nombres Zonas",
        'troubleNames': "Nombres Averias",
        'delete': "Borrar",
        //---------------------------------------ADDED----------2016/08/09
        'alertSmtpOverride': "Ha seleccionado SOBREESCRIBIR la configuración de SMTP actual. Si estas recibiendo mensajes de correo electrónico desde tu alarma, esto no seguirá funcionando. Si lo seleccionado por error, desmarca de nuevo la opción antes de guardar. Las notificaciones push funcionan igualmente con tu propio servidor SMTP.",
        'note': "Nota",
        'doNotModEmail': "Usa_tu_SMTP_server_antes_de@editar.com",
        'pushNote2': "Su módulo IP no está configurado para enviar correos electrónicos. El servidor SMTP en el módulo IP sólo podrá ser utilizado para notificaciones push (NO mensajes de correo electrónico personales). Puede cambiar a su servidor SMTP personal para que también pueda enviar correos electrónicos personales, pero siempre que los correos electrónicos configurados de salida se mantengan.",
        'pushNote3': "Su módulo IP ya está configurado para enviar correos electrónicos. Si desea seguir utilizando correos electrónicos personales y las notificaciones push, asegúrese de NO elegir la siguiente opción. Sobrescribir servidor SMTP. Esto eliminar y desactiva las notificaciones por correo electrónico existentes",
        'overrideSMTP': "(Sobrescribir) servidor SMTP",
        'pushNotReachable': "Notificaciones push no disponibles",
        //---------------------------------------ADDED----------2016/08/10
        'updateExistingPushUser': "Perfil de usuario existente en esta alarma, se ha actualizado",
        'createNewPushUser': "Perfil de usuario creado para esta alarma",
        'requestAlarmDataTimeout': "Tiempo agotado en petición a la alarma",
        'fullScreen': "Pantalla Completa",
        'controlStillInOp': "control aún en funcionamiento...",
        'pmhReady': "(PHM) Preparado...",
        'updatingEvents': "actualizando eventos",
        'earlyPushNote': "Esta característica se encuentra en una fase temprana de prueba. Asegurarse de hacer una copia de seguridad de la configuración de los correos electrónicos que hay en su módulo IP antes de continuar.",
        'ok': "Aceptar",
        //---------------------------------------ADDED----------2016/08/13
        'disconnectingAlarm': "Desconectando panel...",
        'backToExit': "Pulsa botón atras de nuevo para salir",
        //---------------------------------------ADDED----------2016/08/18
        'push': "Push",
        'compressedView': "Vista alarma comprimida",
        'helpIssues': "Ayuda",  //Ayuda / Peticiones 
        'help': "Ayuda",
        'serviceAnnouncements': "Servicio Alertas",
        'noAnnounce': "No hay alertas",
        'gotoGithub': "Ir a GitHub",
        'enhancements': "Mejoras",
        'bugs': "Fallos",
        'all': "Todo",
        'helpWanted': "Buscar ayuda",
        'question': "Pregunta",
        'unread': "sin leer",
        'filterBy': "Filtrar por",
        //---------------------------------------ADDED----------2016/08/24
        'appAuthentication': "Creacion código",
        'pinCreated': "Código creado",
        'pinNoMatch': "Códigos no coinciden",
        'confirmPin': "Confirmar código",
        'appPin': "Aplicar código",
        'cancel': "Cancelar",
        'createNewPin': "Crear nuevo código",
        'requirePinStartup': "Requiere codigo al iniciar",
        'enterPinProceed': "Introduce tu código para abrir",
        'authenticate': "Autentificación",
        //---------------------------------------ADDED----------2016/09/03
        'autoConnect': "Conectar automáticamente",
        //---------------------------------------Modified----------2016/09/06
        'checkSitename': "Comprueba el nombre. Si tu no usas paradoxmyhome.com, simplemente borra el sitio.",
        'bypassed2': "anulada",
        //---------------------------------------ADDED----------2016/09/06
        'pushHistory': "Push Historial",
        'retrievingHistory': "Recibiendo historial...",
        'noHistory': "Sin historial disponible",
        'zone': "Zona",
        'errorTTS': "Error en texto cuando habla",
        'zoneTesting': "Prueba de zonas",
        'trigZoneTest': 'Apertura de zonas a probar',
        'speakWithTestMode': 'Prueba de apertura de zonas, solo hablara una vez por zona',
        'speakOnWithTestMode': 'Prueba en marcha, solo hablara una vez por zona',
        'testZones': "Probar Zonas",
        'resetTest': "Reiniciar",
        'speakZones': "Zona hablada",
        'untested': "No comprobada",
        'egSpecialFunc': "Ejemp. Anular/Pgm",
        'specialFunctionsNotSupported': 'no sorportado para tu modelo de alarma',
        "changePgmName": "Cambiar nombre de la PGM",
        "connectedAlarmDetails": "Detalles de la alarma conectada:",
        "panelDetails": "Detalles de la alarma",
        "type": "Tipo",
        "firmwareVersion": "Versión del firmware",
        "serialNumber": "Número de serie",
        "ipModDetails": "Detalles modulo IP",
        "hardware": "Hardware",
        "eco": "ECO",
        "serialBoot": "Boot serie",
        "ipModule": "Modulo IP",
        "pgm": 'PGM',
        "connectingSwp": "conectando a puerto software...",
        "FORCE": "FORZADO",
        "disarmBeforeBypass": "Anular zonas no es posible con la alarma armada",
        "forceArmShowArm": "Armado forzado, cuando este armado se mostrará como armado normal",
        "optional": "opcional",
        "settings2": "configuración",
        "nameOnly": "solo nombre",
        "genericSettings": "Configuración general",
        "homeWifi": "WiFi local",
        "testPushNotif": "¿Te gustaría hacer una prueba de notificación push? <br><br>Si la aplicación se mantiene abierta no la veras. Minimízala para que la puedas verla en la barra de tareas.",
        "pushSounds": "Sonidos de Notificacion Push",
        "alarm": "Alarma",
        "disarm": "Desarmado",
        "arm": "Armado",
        "saveSounds": "Salvar Sonidos",
        "soundsUpdated": "Sonidos actualizados en el servidor",
        "errorSetSound": "O no se ha registrado los sonidos para las notificaciones push, o se ha producido un error al conectarse al servidor. Para poder guardar los sonidos para notificaciones, conéctese a su alarma y seleccione la opción 'Push'.",

    }

    var italian = {
        'checkingComms': "controllo comunicazioni...",
        'noComms': "Nessuna comunicazione disponibile con l'allarme, controlla la connessione di rete e le impostazioni (problema indirizzo IP)",
        'ready': "Pronto...",
        'loading': "caricamento...",
        'connect': "Connetti",
        'disconnect': "Disconnetti",
        'disconnected': "disconnesso",
        'loadingAlarms': "caricamento allarmi....",
        'ipReady': "(IP) pronto...",
        'noIpCheckPMH': "nessun IP, controllo PMH...",
        'noCommsShort': "nessuna comunicazione disponibile con l'allarme",
        'getIoData': "ottenimento dati IO...",
        'pollingIO': "interrogazione IOs...",
        'stillWaitLogin': "in attesa per il login...",
        'togglingBypass': "invio annullamento",
        'bypassToggled': "annullato",
        'replyReceived': "risposta ricevuta",
        'controllingIO': "controllo IO...",
        'ioControlDone': "controllo IO: ok",
        'ioControlError': "controllo IO: errore",
        'errorWithIoControl': "Errore nel controllo IO",
        'detail': "Dettaglio: ",
        'closingConnection': "disconnessione...",
        'reconnecting': "riconnessione...",
        'waitLoginBeforeControl': "in attesa di login prima del controllo..",
        'readyUserInput': "Pronto per l'immissione dell'utente",
        'performingPgmControl': "esecuzione controllo PGM...",
        'pgmControlSent': "controllo PGM inviato",
        'pulseToState': 'Premi per lo stato',
        'eg': "Per esempio:",   //for exmaple
        'onDelayOff': "On = On..attesa..Off",
        'offDelayOn': "Off = Off..attesa..On",
        'allDelays1Sec': "Tutti i ritardi sono 1 secondo.",
        'off': "Off",
        'pgmControlOff': "Controllo PGM Off...",
        'pgmControlOnDone': "Controllo PGM On. Eseguito",
        'pgmControlOn': "Controllo PGM On...",
        'pgmControlOffDone': "Controllo PGM Off. Eseguito",
        'instantControlBusy': "controllo instantaneo occupato...",
        'area': "area",
        'noChangeDisconnecting': "nessuna modifica rilevata, disconnessione",
        'getAlarmInfoFailed': "Impossibile ottenere info allarme",
        'loginRequestFailed': "Login fallito",
        'couldNotConnect': "Impossibile connettersi!",
        'controllingArea': "controllo area",
        'errorDisconnecting': "errore, disconnessione",
        'connectingIpModule': "connessione al modulo ip...",
        'pinPassIncorrect': "Pin e/o password non corrette.",
        'internalError': "Errore interno",
        'errorWithConnection': "errore di connessione",
        'errorWithLogin': "Errore login",
        'confirmAlarmSettings': "Prego confermare le impostazioni dell'allarme. ",
        'commsError': "Errore di comunicazione",
        'commsToAlarmFailDisconnecting': "Connessione con l'allarme fallita, disconnessione",
        'linkToAlarmUnstable': "collegamento instabile con l'allarme",
        'disconnectingFromIpModule': "disconnessione dal modulo ip...",
        'disconnectedReady': "(disconnesso) pronto...",
        'busy': "occupato...",
        'alarmInfoChanged': "Informazioni Allarme modificate",
        'updateSaveInfo': "Nuove informazioni devono essere salvate(seleziona Si se è la tua prima connessione all'allarme)",
        'yes': "Si",
        'no': "No",
        'errorConnecting': "errore connessione",
        /*      --------------- Display: generic views ---------------       */
        'close': "Chiudi",   //Close the view
        /*      --------------- Display: Menu ---------------       */
        'menu': "Menu",
        'manageAlarms': "Gestisci Allarmi",
        'viewLogs': "Vedi Logs",
        'settings': "Impostazioni",
        'about': "About",
        'settingsDisabled': "impostazioni disabilitate",
        'home': "Home",
        /*      --------------- Display: Settings ---------------       */
        'language': "Lingua",
        'loggingType': "Tipo Collegamento",
        'limited': "Limitato",
        'normal': "Normale",
        'verbose': "Esteso",
        /*      --------------- Display: Troubles view ---------------       */
        'noTroubles': "nessun guasto",
        /*      --------------- Display: one status view ---------------       */
        'zoneStatus': "Stato Zone",
        /*      --------------- Display: Main (home) view ---------------       */
        'connectToAlarm': "Connetti all'Allarme",
        /*      --------------- Display: Open Alarm---------------        */
        'instantControls': "Controlli Istantanei",
        'alarmSounding': "Allarme Suonante",
        'events': "Eventi",
        'ioS': "I/O",
        'troubles': "Guasti",
        'entryDelay': "ritardo entrata",
        'exitDelay': "ritardo uscita",
        'ARM': "TOTALE",
        'DISARM': "DISINSERITO",
        'SLEEP': "NOTTE",
        'STAY': "PERIMETRALE",
        'viewZones': "Visualizza Zone",
        'open': "aperta",
        'alarmDisarmed': "allarme disabilitato",
        'alarmArmed': "allarme inserito",
        'inAlarm': "In Allarme!!",
        'armedInSleep': "Inserito in Notte",
        'armedInStay': "Inserito in Perimetrale",
        'readyToArm': "Pronto per l'inserimento",
        'notReadyToArm': "Non pronto per l'inserimento",
        'instant': "instantaneo",
        'waitingForConnection': "In attesa di connessiome",
        'specialFunctions': "Funzioni Speciali",
        'onlySupportedForSomeAlarms': "supportato solo per alcuni allarmi",
        'pgmControl': "Controlli PGM",
        'bypassZones': "Escludi Zone",
        /*      --------------- Display: Add Alarm ---------------       */
        'addAlarm': "Aggiungi Allarme",
        'pullToRefresh': "Trascina per aggiornare...",
        'name': "Nome",
        'siteName': "Nome Sito",
        'ipAddress': "Indirizzo IP",
        'or': "oppure", //this (or) that
        'secureOption': "Usa SSL/TLS (HTTPS)",
        'webPort': "Porta Web",
        'softwarePort': "Porta Software",
        'typicalSoftPort': "Solitamente 10000",
        'pinCode': "Codice Pin",
        'password': "Password",
        'save': "Salva",
        'discoveredAlarms': "Allarmi Trovati",
        'selectPullToRefresh': "(Trascina per aggiornare)",
        'discoveredName': "Nome:",
        /*      --------------- Display: Manage Alarms ---------------        */
        'addNewAlarm': "Aggiungi nuovo allarme",
        'existingAlarms': "Allarmi esistenti",
        /*      --------------- Display: Bypass Zones ---------------        */
        'bypassMsg1': "Conferma sempre lo stato di esclusione delle zone con",
        'bypassMsg2': "l'opzione 'Visualizza Zone' nella finestra principale",
        'zones': "Zone",
        'previousState': "Stato precedente",
        'bypass': "Escludi",
        'closed': "Chiusa",
        'Open': "Aperta",
        'closedTrouble': "Chiusa - Guasto",
        'openTrouble': "Chiusa - Guasto",
        'closedAlarmInMem': "Chiusa - Allarme In Memoria",
        'openAlarmInMem': "Aperta - Allarme In Memoria",
        'bypassed': "Esclusa",
        /*      --------------- Display: Alarm Events ---------------        */
        'time': "Ora",
        'detail': "Dettagli",
        /*      --------------- Display: Alarm IOs ---------------        */
        'inputsOutputs': "Ingressi / Uscite",
        'loadingIoStatuses': "caricamento stato I/O",
        'output': "Uscite",
        'input': "Ingressi",
        'Off': "Off",
        'On': "On",
        'toggledOutput': "UScita a commutazione",  //Type of output
        'pulsedOutput': "Uscita ad impulsi",
        'ioNote': "Nota: Il comportamento degli Ingressi/Uscite può essere modificato con l'interfaccia web del modulo IP",
        /*      --------------- Display: PGM Control ---------------        */
        'selectPgmToControl': "Seleziona PGM da controllare",
        'pulse': "Impulso",
        /*      --------------- Display: Logs View ---------------        */
        'allLogs': "Tutti i Logs",
        'sessionLogs': "Logs Sessione",
        'logsNote': "I Logs non sono salvati localmente dopo che chiudi l'app. Se riscontri problemi con l'app, metti i logs nella modalità 'Esteso' dalle impostazioni. Dopodichè ripeti l'azione che ti ha creato problemi e invia i logs risultanti usando il pulsante qui sotto",
        'message': "Messaggio",
        'noEvents': "nessun evento",
        'emailLogFeedback': "Email feedback",
        /*      --------------- Software port service ---------------        */
        'evo192Reject1': "EVO192 Rilevato - funzioni speciali non supportate.",
        'evo192Reject2': "Un successivo tentativo di ricollegamento al pannello potrebbe non funzionare temporaneamente",
        'loginFailAnotherUser': "Login al pannello di allarme tramite la porta software senza successo, un altro utente potrebbe essere collegato",
        /*      --------------- Alarm service ---------------        */
        'currentlyLoggedIn': "attualmente collegato",
        'readySendLoginRequest': "pronto per l'invio di richiesta collegamento...",
        'loginError1': "Errore: Timeout richiesta collegamento oppure il modulo IP ha restituito un errore.",
        'loginError2': "Errore: Timeout durante il collegamento",
        'retrievingAlarmInfo': "recupero informazione allarme...",
        'successConnected': "successo, connesso all'allarme",
        /*      --------------- Database service ---------------        */
        'selectConnectUpdateInfo': "seleziona 'connetti' per aggiornare le informazioni",
        'error': "Errore",
        'success': "Successo",
        'alarmExist': "Nome allarme già esistente",
        'alarmAdded': "Allarme aggiunto",
        'couldntUpdateAlarm': "Impossibile aggiornare dettagli allarme",
        'alarmChanged': "Allarme modificato",
        'couldntDeleteAlarm': "Impossibile eliminare l'allarme",
        'alarmDeleted': "Allarme eliminato",
        //---------------------------------------ADDED----------2016/08/02
        'checkIpDns': "Controllo IP / DNS",
        'siteDnsIpReq': "Nome Sito o IP/DNS richiesto",
        'importantNotice': "Notizia importante!",
        'specialFeaturesNotice': "Molte funzioni speciali necessitano di una nuova connessione ('porta software') non criptata al tuo allarme, e si connette usando la tua password (non protetta). Usa queste funzioni con cautela perchè le interruzioni di rete potrebbero lasciare il pannello di allarme in uno stato incorretto. <b>Controlla anche che la corretta porta software sia configurata nelle tue impostazioni.</b>",
        //---------------------------------------ADDED----------2016/08/06
        'noEmailOpen': "Impossibile impostare - tutti gli spazi email disponibili sono utilizzati",
        'retrievingSettings': "recupero delle impostazioni",
        'doneSelectOptions': "fatto, seleziona opzioni",
        'updating': "aggiornamento...",
        'online': "Online",
        'offline': "Offline",
        'savingSettings': "salvataggio impostazioni...",
        'successSettingsSaved': "impostazioni salvate",
        'newPushConfigSuccess': "Nuovo utente registrato correttamente per le notifiche push",
        'existingPushConfigSuccess': "Notifiche push degli utenti esistenti correttamente aggiornate",
        'failPushUpdate': "Errore nell'aggiornamento dell'allarme sul server delle notifiche push, riprovare più tardi",
        'errorConnectServer': "errore di connessione con il server, riprovare più tardi",
        'googlePlayError': "errore google play services, riprovare più tardi",
        'pushService': "Servizio Push",
        'pushNotifications': "Notifiche Push",
        'pushNotification': "Notifica Push",
        'selectAreasNotify': "Seleziona aree da notificare",
        'area': "Area",
        'selectEventsNotify': "Seleziona eventi da notificare",
        'alarms': "Allarmi",
        'armDisarm': "Inserimento / Disinserimento",
        'IO1': "IO1",
        'IO2': "IO2",
        'webAccessBlocked': "Accesso Web bloccato",
        'pushNote1': "Nota: Una connessione internet attiva è richiesta. Se elimini questo allarme, in futuro le notifiche push continueranno ad arrivare. Usa questa app per disabilitare le notifiche",
        //---------------------------------------ADDED----------2016/08/08
        'userNoPermission': "Errore: Il pin configurato per questo allarme potrebbe non permettere la modifica delle impostazioni email",
        'alarmNames': "Nomi Allarme",
        'areaNames': "Nomi Area",
        'zonePartitions': "Suddivisioni Zone",
        'zoneNames': "Nomi Zone",
        'troubleNames': "Nomi Errori",
        'delete': "Elimina",
        //---------------------------------------ADDED----------2016/08/09
        'alertSmtpOverride': "Hai scelto di sovrascrivere le tue impostazioni SMTP. Se stavate già ricevendo mail dal tuo allarme, queste non funzioneranno più. Se hai selezionato di sovrascrivere per errore, deseleziona l'opzione prima di salvare. Alarmin può funzionare sia con il proprio server SMTP o sovrascrivere l'impostazione se non si dispone di uno.",
        'note': "Nota",
        'doNotModEmail': "Use_own_SMTP_server_before@editing.com",
        'pushNote2': "Il tuo modulo IP non è configurato per inviare email. L'attivazione della notifica push configurerà un server SMTP sul modulo IP, che può essere utilizzato solo per le notifiche push (non e-mail personali). È possibile modificare l'impostazione del server SMTP se si desidera inviare anche e-mail personali, a patto che le e-mail di notifica AlarmIn rimangono invariati.",
        'pushNote3': "Il tuo modulo IP è già configurato per inviare email. Se si desidera continuare a utilizzare le email personali in concomitanza con le notifiche push, assicurarsi che la seguente opzione non sia selezionata. Sovrascrivendo il server SMTP verranno eliminate o disabilitate le esistenti notifiche via mail",
        'overrideSMTP': "Imposta (sovrascrivi) server SMTP",
        'pushNotReachable': "Servizio Push non raggiungibile, riprovare più tardi",
        //---------------------------------------ADDED----------2016/08/10
        'updateExistingPushUser': "I profili utente esistenti su questo allarme verranno aggiornati",
        'createNewPushUser': "Un nuovo profilo utente verrà creato per questo allarme",
        'requestAlarmDataTimeout': "Errore: Timeout durante la richiesta dei dati per questo allarme",
        'fullScreen': "Schermo Intero",
        'controlStillInOp': "controllo ancora in esecuzione...",
        'pmhReady': "(PHM) pronto...",
        'updatingEvents': "aggiornamento eventi",
        'earlyPushNote': "Questa funzionalità è ancora in fase di test. Assicurati di effettuare il backup delle impostazioni email del tuo modulo IP prima di procedere.",
        'ok': "Ok",
        //---------------------------------------ADDED----------2016/08/12
        'alarmDetails': "Dettagli Allarme",
        'ipModuleDetails': "Dettagli Modulo IP",
        //---------------------------------------ADDED----------2016/08/13
        'disconnectingAlarm': "Disconnessione allarme...",
        'backToExit': "Premi ancora il pulsante indietro per uscire",
        //---------------------------------------ADDED----------
        'push': "Push",
        'compressedView': "Comprimi Finestra Allarmi",
        'helpIssues': "Aiuto / Problemi",
        'help': "Aiuto",
        'serviceAnnouncements': "Annunci di Servizio",
        'noAnnounce': "Nessun annuncio al momento",
        'gotoGithub': "Vai a GitHub",
        'enhancements': "Miglioramenti",
        'bugs': "Bugs",
        'all': "Tutto",
        'helpWanted': "Ricerca di Aiuto",
        'question': "Domande",
        'unread': "Non letti",
        'filterBy': "Filtra per",
        //---------------------------------------ADDED----------2016/08/24
        'appAuthentication': "Autenticazione app",
        'pinCreated': "Pin creato",
        'pinNoMatch': "Il Pin non corrisponde",
        'confirmPin': "Conferma pin",
        'appPin': "Pin Applicazione",
        'cancel': "Cancella",
        'createNewPin': "Crea nuovo pin",
        'requirePinStartup': "Richiedi Pin all'Avvio",
        'enterPinProceed': "Inserisci il pin per procedere",
        'authenticate': "Autenticato",
        //---------------------------------------ADDED----------2016/09/03
        'autoConnect': "Connessione Automatica",
        //---------------------------------------Modified----------2016/09/06
        'checkSitename': "Check sitename. If you do not use the ParadoxMyHome.com service, simply remove the sitename.",
        'bypassed2': "esclusa",


        'pushHistory': "Storico Push",
        'retrievingHistory': "Recupero Storico...",
        'noHistory': "Nessuno storico disponibile",
        'zone': "Zona",
        'errorTTS': "Errore con text to speech engine, o triggering troppo veloce.",
        'zoneTesting': "Controllo Zona",
        'trigZoneTest': 'Zone ad impulsi da testare',
        'speakWithTestMode': 'Zone ad impulsi da testare, verrà letto solo un cambiamento per zona',
        'speakOnWithTestMode': 'Controllo in corso, verrà letto solo un cambiamento per zona ',
        'testZones': "Controllo Zone",
        'resetTest': "Reset Controllo",
        'speakZones': "Zone lette",
        'untested': "Non testato",
        'egSpecialFunc': "es. bypass/pgm",
        "changePgmName": "Modifica Nome PGM",
        "connectedAlarmDetails": "Dettagli allarme connesso:",
        "panelDetails": "Pannello dettagli",
        "type": "Tipo",
        "firmwareVersion": "Versione Firmware",
        "serialNumber": "Numero Seriale",
        "ipModDetails": "Dettagli modulo IP",
        "hardware": "Hardware",
        "eco": "ECO",
        "serialBoot": "Serial boot",
        "ipModule": "Modulo IP",
        "pgm": 'PGM',
        "connectingSwp": "connessione alla porta software...",
        "FORCE": "FORZA",
        "disarmBeforeBypass": "Esclusione non consentita quando l'allarme è inserito",
        "forceArmShowArm": "Forza inserimento - al termine l'allarme verrà mostrato come INSERITO"
    }

    var czech = {
        'checkingComms': "ověřuji komunikaci...",
        'noComms': "Komunikace se systémem nedostupná, ověřte vaše připojení a nastavení",
        'ready': "připraveno...",
        'loading': "načítání...",
        'connect': "Připojit",
        'disconnect': "Odpojit",
        'disconnected': "Odpojeno",
        'loadingAlarms': "načítám systémy....",
        'ipReady': "(IP) připraveno...",
        'noIpCheckPMH': "bez IP adresy, zkouším PMH...",
        'noCommsShort': "není komunikace se systémem",
        'getIoData': "nahrávám IO data...",
        'pollingIO': "ověřuji IOs...",
        'stillWaitLogin': "stále čekání na login...",
        'togglingBypass': "přepínám přemostění...",
        'bypassToggled': "přemostění přepnuto",
        'replyReceived': "přijata odpověď",
        'controllingIO': "ovládání IO...",
        'ioControlDone': "IO ovládání dokončeno",
        'ioControlError': "chyba ovládání IO",
        'errorWithIoControl': "Chyba při IO ovládání",
        'detail': "Detail: ",
        'closingConnection': "ukončuji spojení...",
        'reconnecting': "připojuji...",
        'waitLoginBeforeControl': "před ovládáním vyčkejte na přihlášení...",
        'readyUserInput': "připraveno",
        'performingPgmControl': "ovládání PGM...",
        'pgmControlSent': "PGM ovládání dokončeno",
        'pulseToState': 'Pulzní -> stav',
        'eg': "např.",   //for exmaple
        'onDelayOff': "Zap = Zap..vyčkat..Vyp",
        'offDelayOn': "Vyp = Vyp..vyčkat..Zap",
        'allDelays1Sec': "Prodleva je vždy 1s.",
        'off': "Vyp",
        'pgmControlOff': "PGM ovládání vypnuto...",
        'pgmControlOnDone': "PGM ovládání zapnuto. Hotovo",
        'pgmControlOn': "PGM ovládání zapnuto...",
        'pgmControlOffDone': "PGM ovládání vypnuto. Hotovo",
        'instantControlBusy': "probíhá ovládání...",
        'area': "oblast",
        'noChangeDisconnecting': "žádná změna, odpojuji",
        'getAlarmInfoFailed': "získávání informací selhalo",
        'loginRequestFailed': "chyba při požadavku na přihlášení",
        'couldNotConnect': "nelze se připojit!",
        'controllingArea': "ovládání oblasti",
        'errorDisconnecting': "chyba, odpojování",
        'connectingIpModule': "připojuji se k IP modulu...",
        'pinPassIncorrect': "Pin a/nebo heslo jsou nesprávné.",
        'internalError': "Vnitřní chyba",
        'errorWithConnection': "chyba při spojení",
        'errorWithLogin': "Chyba při přihlášení",
        'confirmAlarmSettings': "Potvrďte, prosím, nastavení systému. ",
        'commsError': "Chyba komunikace",
        'commsToAlarmFailDisconnecting': "Připojení k systému selhalo, odpojuji",
        'linkToAlarmUnstable': "připojení k systému nestabilní",
        'disconnectingFromIpModule': "odpojuji se od IP modulu...",
        'disconnectedReady': "(odpojeno) připraveno...",
        'busy': "vyčkejte...",
        'alarmInfoChanged': "Změna systémových parametrů",
        'updateSaveInfo': "Mají být změny uloženy? (Zvolte ANO, pokud se k tomuto systému připojujete poprvé)",
        'yes': "Ano",
        'no': "Ne",
        'errorConnecting': "chyba připojení",
        /*      --------------- Display: generic views ---------------       */
        'close': "Zavřít",   //Close the view
        /*      --------------- Display: Menu ---------------       */
        'menu': "Menu",
        'manageAlarms': "Správa systémů",
        'viewLogs': "Prohlížet události",
        'settings': "Nastavení",
        'about': "O aplikaci",
        'settingsDisabled': "Nastavení nedostupné",
        'home': "Home",
        /*      --------------- Display: Settings ---------------       */
        'language': "Jazyk",
        'loggingType': "Typ přihlašování",
        'limited': "Omezené",
        'normal': "Normální",
        'verbose': "Podrobné",
        /*      --------------- Display: Troubles view ---------------       */
        'noTroubles': "žádné problémy",
        /*      --------------- Display: one status view ---------------       */
        'zoneStatus': "Stav zón",
        /*      --------------- Display: Main (home) view ---------------       */
        'connectToAlarm': "Připojit k systému",
        /*      --------------- Display: Open Alarm---------------        */
        'instantControls': "Instantní ovládání",
        'alarmSounding': "Zvuk alarmu",
        'events': "Události",
        'ioS': "I/O",
        'troubles': "Problémy",
        'entryDelay': "prodleva pro příchod",
        'exitDelay': "prodleva pro odchod",
        'ARM': "ZAPNUTO",
        'DISARM': "VYPNUTO",
        'SLEEP': "SPÁNEK",
        'STAY': "STAY",
        'viewZones': "Zobrazit zóny",
        'open': "otevřít",
        'alarmDisarmed': "systém vypnut",
        'alarmArmed': "systém zapnut",
        'inAlarm': "Alarm!!!",
        'armedInSleep': "zapnuto v režimu SPÁNEK",
        'armedInStay': "zapnuto v režimu STAY",
        'readyToArm': "připraveno k zapnutí",
        'notReadyToArm': "NEpřipraveno k zapnutí",
        'instant': "instant",
        'waitingForConnection': "čekání na spojení",
        'specialFunctions': "Speciální funkce",
        'onlySupportedForSomeAlarms': "podporováno jen některými systémy",
        'pgmControl': "PGM ovládání",
        'bypassZones': "Přemostění zón",
        /*      --------------- Display: Add Alarm ---------------       */
        'addAlarm': "Přidat systém",
        'pullToRefresh': "Stáhněte dolů pro obnovení...",
        'name': "Název",
        'siteName': "URL adresa",
        'ipAddress': "IP adresa",
        'or': "nebo", //this (or) that
        'secureOption': "Použít SSL/TLS (HTTPS)",
        'webPort': "Web Port",
        'softwarePort': "Software port",
        'typicalSoftPort': "typicky 10000",
        'pinCode': "Přístupový kód",
        'password': "Heslo",
        'save': "Uložit",
        'discoveredAlarms': "Nalezené systémy",
        'selectPullToRefresh': "(stáhněte dolů pro obnovení)",
        'discoveredName': "Jméno:",
        /*      --------------- Display: Manage Alarms ---------------        */
        'addNewAlarm': "Přidat systém",
        'existingAlarms': "Uložené systémy",
        /*      --------------- Display: Bypass Zones ---------------        */
        'bypassMsg1': "Vždy potvrďte stav přemostění v",
        'bypassMsg2': "'Zobrazit zóny' v hlavním menu",
        'zones': "Zóny",
        'previousState': "Poslední stav",
        'bypass': "Přemostění",
        'closed': "Uzamčeno",
        'Open': "Odemčeno",
        'closedTrouble': "Uzamčeno - problémy",
        'openTrouble': "Odemčeno - problémy",
        'closedAlarmInMem': "Uzamčeno - Alarm v paměti",
        'openAlarmInMem': "Odemčeno - Alarm v paměti",
        'bypassed': "Přemostěno",
        /*      --------------- Display: Alarm Events ---------------        */
        'time': "Čas",
        'detail': "Detail",
        /*      --------------- Display: Alarm IOs ---------------        */
        'inputsOutputs': "Vstupy / Výstupy",
        'loadingIoStatuses': "načítám IO statusy",
        'output': "Výstup",
        'input': "Vstup",
        'Off': "Vyp",
        'On': "Zap",
        'toggledOutput': "Přepínací výstup",  //Type of output
        'pulsedOutput': "Pulsní výstup",
        'ioNote': "Pozn.: Chování IO rozhraní je nastavitelné ve webovém rozhraní IP modulu",
        /*      --------------- Display: PGM Control ---------------        */
        'selectPgmToControl': "Pro nastavení vyberte PGM",
        'pulse': "Pulsní",
        /*      --------------- Display: Logs View ---------------        */
        'allLogs': "Všechny události",
        'sessionLogs': "Session události",
        'logsNote': "Události jsou uloženy lokálně pouze do doby než ukončite tuto aplikaci. Pokud máte jakékoliv potíže s aplikací, přepněte v nastavení aplikace logování na 'Podrobné'. Poté opakujte akci, které způsobuje problémy a odešlete uložené události tlačítkem níže.",
        'message': "Zpráva",
        'noEvents': "žádné události",
        'emailLogFeedback': "Odeslat feedback",
        /*      --------------- Software port service ---------------        */
        'evo192Reject1': "Detekován systém EVO192 - speciální funkce nejsou dostupné.",
        'evo192Reject2': "Následující přihlášení k systému mohou být dočasně nedostupné",
        'loginFailAnotherUser': "Připojení k systému nedostupné, je možné, že je již přihlášen jiný uživatel",
        /*      --------------- Alarm service ---------------        */
        'currentlyLoggedIn': "aktuálně přihlášen",
        'readySendLoginRequest': "připraveno pro přihlášení...",
        'loginError1': "Chyba: Čas spojení vypršel nebo IP modul vrátil chybu.",
        'loginError2': "Chyba: Čas spojení vypršel",
        'retrievingAlarmInfo': "načítání systémových informací...",
        'successConnected': "připojeno k systému",
        /*      --------------- Database service ---------------        */
        'selectConnectUpdateInfo': "pro aktualizaci informací zvolte 'připojit'",
        'error': "Chyba",
        'success': "Dokončeno",
        'alarmExist': "Systém pod stejným názvem již existuje",
        'alarmAdded': "Systém přidán",
        'couldntUpdateAlarm': "Chyba při aktualizaci informací",
        'alarmChanged': "Systém změněn",
        'couldntDeleteAlarm': "Nelze odstranit systém",
        'alarmDeleted': "Systém odstraněn",
        //---------------------------------------ADDED----------2016/08/02
        'checkIpDns': "Ověřte IP / DNS",
        'siteDnsIpReq': "Zadejte URL adresu nebo IP/DNS",
        'importantNotice': "Důležité upozornění!",
        'specialFeaturesNotice': "Některé speciální funkce vytvoří nové připojení skrze ('software port'), které není kryptováno a připojí se Vaším heslem (nechráněným způsobem). Používejte tuto funkci s opatrností, jelikož přerušení spojení může zanechat systém v nefunkčním stavu. <b>Ujistěte se, že máte zadaný správny software port v nastavení.</b>",
        //---------------------------------------ADDED----------2016/08/06
        'noEmailOpen': "Nelze nastavit - všechny e-mailové sloty použity",
        'retrievingSettings': "načítání nastavení...",
        'doneSelectOptions': "dokončeno, zvolte možnosti",
        'updating': "aktualizace...",
        'online': "Online",
        'offline': "Offline",
        'savingSettings': "ukládání nastavení...",
        'successSettingsSaved': "úspěšně uloženo",
        'newPushConfigSuccess': "Uživatel úspěšně zaregistrován pro push notifikace",
        'existingPushConfigSuccess': "Změny nastavení push notifikací uloženy",
        'failPushUpdate': "Chyba při aktualizací na push serveru, opakujte později",
        'errorConnectServer': "chyba při přihlašování k serveru, opakujte později",
        'googlePlayError': "chyba google play services, opakujte později",
        'pushService': "Push služby",
        'pushNotifications': "Push notifikace",
        'pushNotification': "Push notifikace",
        'selectAreasNotify': "Zvolte oblasti pro upozornění",
        'area': "Oblast",
        'selectEventsNotify': "Zvolte události pro upozornění",
        'alarms': "Systémy",
        'armDisarm': "Zap / Vyp",
        'IO1': "IO1",
        'IO2': "IO2",
        'webAccessBlocked': "Web přístup blokován",
        'pushNote1': "Pozn.: Je vyžadováno internetové připojení. Pokud tento systém v budoucnu odstraníte, push notifikace budou stále odesílány. Použijte tuto aplikaci pro jejich vypnutí.",
        //---------------------------------------ADDED----------2016/08/08
        'userNoPermission': "Chyba: PIN zadaný pro tento systém nemusí umožnit změny nastavení e-mailu",
        'alarmNames': "Názvy systémů",
        'areaNames': "Názvy oblastí",
        'zonePartitions': "Oblasti zón",
        'zoneNames': "Názvy zón",
        'troubleNames': "Chybové názvy",
        'delete': "Odstranit",
        //---------------------------------------ADDED----------2016/08/09
        'alertSmtpOverride': "Zvolili jste obcházení SMTP serveru. Pokud od svého systému dostáváte e-maily, již se tak NEBUDE dít. Pokud jste provedli toto nastavení omylem, zrušte tuto možnost před uložením. Alarmin může pracovat buď s vaším vlastním SMTP serverem nebo ho obcházet, pokud žádný nemáte.",
        'note': "Pozn.",
        'doNotModEmail': "nastavte_svuj_SMTP_server@pred_ulozenim.cz",
        'pushNote2': "Váš IP modul není nakonfigurovaný pro odesílání e-mailů. Pokud povolíte push notifikace, dojde k nastavení SMTP serveru, který umožňuje pouze push notifikace (žádná jiná e-mailové upozornění). Pokud si přejete odesílat také osobní e-maily, můžete změnit nastavení SMTP serveru dokud notifikační e-maily Alarminu zustanou nezměněné.",
        'pushNote3': "Váš IP modul je již nakonfigurovaný pro odesílání e-mailů. Pokud si přejete zachovat odesílání e-mailů zároveň s push notifikacemi, ujistěte se, že následující volna NENÍ vybrána. Obcházení SMTP serveru smaže nebo deaktivuje Vaše současné e-mailové notifikace",
        'overrideSMTP': "Nastavit (přepsat) SMTP server",
        'pushNotReachable': "Push služba nedostupná, opakujte později",
        //---------------------------------------ADDED----------2016/08/10
        'updateExistingPushUser': "Uživatelský profil bude upraven",
        'createNewPushUser': "Bude vytvořen nový uživatelský profil pro tento systém",
        'requestAlarmDataTimeout': "Chyba: Požadavek na systémová data vypršel",
        'fullScreen': "Celá obrazovka",
        'controlStillInOp': "Stále probíhá ovládání...",
        'pmhReady': "(PHM) připraveno...",
        'updatingEvents': "aktualizuji události",
        'earlyPushNote': "Tato funkce je v ranném stádiu testovaní. Ujistěte se, že máte zazálohováno nastavení e-mailu Vašeho IP modulu.",
        'ok': "Ok",
        //---------------------------------------ADDED----------2016/08/12
        'alarmDetails': "Systém info",
        'ipModuleDetails': "IP modul info",
        //---------------------------------------ADDED----------2016/08/13
        'disconnectingAlarm': "Odpojuji systém...",
        'backToExit': "Znovu stiskněte 'zpět' pro ukončení",
        //---------------------------------------ADDED----------2016/08/18
        'push': "Push",
        'compressedView': "Stručná systémová obrazovka",
        'helpIssues': "Pomoc / Potíže",
        'help': "Nápověda",
        'serviceAnnouncements': "Servisní oznámení",
        'noAnnounce': "Aktuálně žádná oznámení",
        'gotoGithub': "Přejít na GitHub",
        'enhancements': "Vylepšení",
        'bugs': "Chyby",
        'all': "Vše",
        'helpWanted': "Potřebuji pomoc",
        'question': "Otázka",
        'unread': "nepřečteno",
        'filterBy': "Třídit dle",
        //---------------------------------------ADDED----------2016/08/24
        'appAuthentication': "Přihlášení k aplikaci",
        'pinCreated': "PIN vytvořen",
        'pinNoMatch': "PIN nesouhlasí",
        'confirmPin': "Potvrďte PIN",
        'appPin': "PIN k aplikaci",
        'cancel': "Zrušit",
        'createNewPin': "Vytvořit nový PIN",
        'requirePinStartup': "Požadovat PIN při spuštění",
        'enterPinProceed': "Pro pokračování zadejte PIN",
        'authenticate': "Přihlásit",
        //---------------------------------------ADDED----------2016/09/03
        'autoConnect': "Připojovat automaticky",
        //---------------------------------------Modified----------2016/09/06
        'checkSitename': "Ověřte URL adresu. Pokud nepoužíváte ParadoxMyHome.com (typicky protože máte pevnou IP adresu), odstraňte URL z nastavení.",
        'bypassed2': "přemostěno",
        //---------------------------------------ADDED----------2016/09/06
        'pushHistory': "Historie push",
        'retrievingHistory': "Načítám historii...",
        'noHistory': "Žádná historie",
        'zone': "Zóna",
        'errorTTS': "Chyba v modulu převodu textu na řeč",
        'zoneTesting': "Testování zón",
        'trigZoneTest': 'Projděte zónami pro jejich otestování',
        'speakWithTestMode': 'Projděte zónami pro jejich otestování, upozornění zazní vždy jen jednou pro každou zónu',
        'speakOnWithTestMode': 'Probíhá testování zón, upozornění zazní vždy jen jednou pro každou zónu',
        'testZones': "Testování zón",
        'resetTest': "Resetu test",
        'speakZones': "Mluvené upozornění",
        'untested': "Neotestováno",
        'egSpecialFunc': "např. přemostění/pgm",
        'specialFunctionsNotSupported': 'není podporováno Vaším systémem',
        "changePgmName": "Změnit název PGM",
        "connectedAlarmDetails": "Info o připojeném systému:",
        "panelDetails": "Panel details",
        "type": "Typ",
        "firmwareVersion": "Verze firmware",
        "serialNumber": "Sériové číslo",
        "ipModDetails": "Info o IP modulu",
        "hardware": "Hardware",
        "eco": "ECO",
        "serialBoot": "Sériový boot",
        "ipModule": "IP modul",
        "pgm": 'PGM',
        "connectingSwp": "připojuji se na softwarový port...",
        "FORCE": "VYNUTIT",
        "disarmBeforeBypass": "Není možné přemostit, když je systém v zapnutém stavu.",
        "forceArmShowArm": "Vynucené zapnutí - po dokončení přejde systém do stavu ZAPNUTO."

    }

    var chinese = {
        "checkingComms": "检查通讯...",
        "noComms": "未连接主机，请检查网络或者设置",
        "ready": "准备好...",
        "loading": "加载中...",
        "connect": "连接",
        "disconnect": "断开",
        "disconnected": "已断开",
        "loadingAlarms": "加载中....",
        "ipReady": "网络正常...",
        "noIpCheckPMH": "无网络,检查枫叶服务器PMH...",
        "noCommsShort": "通讯失败",
        "getIoData": "获取I/O数据...",
        "pollingIO": "轮询I/O...",
        "stillWaitLogin": "还在等待登录...",
        "togglingBypass": "旁路...",
        "bypassToggled": "已旁路",
        "replyReceived": "已收到应答",
        "controllingIO": "控制I/O...",
        "ioControlDone": "I/O控制完成",
        "ioControlError": "I/O控制错误",
        "errorWithIoControl": "I/O控制时出错",
        "detail": "详情: ",
        "closingConnection": "关闭连接中...",
        "reconnecting": "重新连接中...",
        "waitLoginBeforeControl": "控制前需要登录...",
        "readyUserInput": "准备用户输入",
        "performingPgmControl": "执行继电器控制...",
        "pgmControlSent": "发送继电器控制命令",
        "pulseToState": "脉冲状态",
        "eg": "例如",
        "onDelayOff": "打开 = 打开..延时..关闭",
        "offDelayOn": "关闭 = 关闭..延时..打开",
        "allDelays1Sec": "所有延时1秒",
        "off": "关闭",
        "pgmControlOff": "继电器恢复控制...",
        "pgmControlOnDone": "继电器激活控制完成",
        "pgmControlOn": "继电器激活控制...",
        "pgmControlOffDone": "继电器恢复控制完成",
        "instantControlBusy": "当前控制忙...",
        "area": "区域",
        "noChangeDisconnecting": "未检测到变化,断开中",
        "getAlarmInfoFailed": "获取事件失败",
        "loginRequestFailed": "登录失败",
        "couldNotConnect": "连接失败!",
        "controllingArea": "控制分区",
        "errorDisconnecting": "错误, 断开中",
        "connectingIpModule": "正在连接网络模块...",
        "pinPassIncorrect": "用户密码和模块密码可能不对",
        "internalError": "网络错误",
        "errorWithConnection": "连接出错",
        "errorWithLogin": "登录出错",
        "confirmAlarmSettings": "请检查设置",
        "commsError": "通讯错误",
        "commsToAlarmFailDisconnecting": "连接主机失败, 断开中",
        "linkToAlarmUnstable": "通讯不稳定",
        "disconnectingFromIpModule": "正在断开网络模块...",
        "disconnectedReady": "(已断开) 准备好...",
        "busy": "忙...",
        "alarmInfoChanged": "主机信息改变",
        "updateSaveInfo": "新的设置将保持(如果是第一次请选择是)",
        "yes": "是",
        "no": "否",
        "errorConnecting": "连接错误",
        "close": "关闭",
        "menu": "菜单",
        "manageAlarms": "管理主机",
        "viewLogs": "查看日志",
        "settings": "设置",
        "about": "关于",
        "settingsDisabled": "设置禁用",
        "home": "主页",
        "language": "语言",
        "loggingType": "日志类型",
        "limited": "受限",
        "normal": "常态",
        "verbose": "详细",
        "noTroubles": "无故障",
        "zoneStatus": "防区状态",
        "connectToAlarm": "连接主机",
        "instantControls": "立即控制",
        "alarmSounding": "报警声音",
        "events": "事件",
        "ioS": "I/O",
        "troubles": "故障",
        "entryDelay": "进入延时",
        "exitDelay": "退出延时",
        "ARM": "布防",
        "DISARM": "撤防",
        "SLEEP": "睡眠布防",
        "STAY": "留守布防",
        "viewZones": "产看防区",
        "open": "打开",
        "alarmDisarmed": "已撤防",
        "alarmArmed": "已布防",
        "inAlarm": "报警中!!!",
        "armedInSleep": "已睡眠布防",
        "armedInStay": "已留守布防",
        "readyToArm": "准备好布防",
        "notReadyToArm": "未准备好布防",
        "instant": "立即布防",
        "waitingForConnection": "等待连接中",
        "specialFunctions": "特殊功能",
        "onlySupportedForSomeAlarms": "仅仅支持部分主机",
        "pgmControl": "继电器控制",
        "bypassZones": "旁路防区",
        "addAlarm": "增加主机",
        "pullToRefresh": "下拉刷新...",
        "name": "名称",
        "siteName": "站点名称",
        "ipAddress": "IP地址",
        "or": "或",
        "secureOption": "使用SSL/TLS (HTTPS)",
        "webPort": "Web端口",
        "softwarePort": "软件端口",
        "typicalSoftPort": "默认10000",
        "pinCode": "用户密码",
        "password": "模块密码",
        "save": "保存",
        "discoveredAlarms": "发现主机",
        "selectPullToRefresh": "(下拉刷新)",
        "discoveredName": "名称:",
        "addNewAlarm": "增加主机",
        "existingAlarms": "现有主机",
        "bypassMsg1": "确认防区旁路状态",
        "bypassMsg2": "'查看防区'选项在主页",
        "zones": "防区",
        "previousState": "以前状态",
        "bypass": "旁路",
        "closed": "关闭",
        "Open": "打开",
        "closedTrouble": "关闭 - 有故障",
        "openTrouble": "打开 - 有故障",
        "closedAlarmInMem": "关闭 - 有报警记录",
        "openAlarmInMem": "打开 - 有报警记录",
        "bypassed": "已旁路",
        "time": "时间",
        "detail": "详情",
        "inputsOutputs": "输入/输出",
        "loadingIoStatuses": "加载I/O口状态",
        "output": "输出",
        "input": "输入",
        "Off": "关闭",
        "On": "打开",
        "toggledOutput": "持续输出",
        "pulsedOutput": "脉冲输出",
        "ioNote": "注意: 您的I/O状态变化是通过web端口",
        "selectPgmToControl": "选择继电器控制",
        "pulse": "脉冲",
        "allLogs": "所有日志",
        "sessionLogs": "Session日志",
        "logsNote": "日志仅仅保存在本地，如果要获取更加相信的日志信息，请在设置里面打开'详细的'模式",
        "message": "消息",
        "noEvents": "无事件",
        "emailLogFeedback": "邮件反馈",
        "evo192Reject1": "EVO192特殊功能不支持",
        "evo192Reject2": "请稍等一会儿再登录",
        "loginFailAnotherUser": "通过软件端口未成功登录,可能有其他用户已经登录",
        "currentlyLoggedIn": "已登录",
        "readySendLoginRequest": "准备好发送登陆请求...",
        "loginError1": "错误: 登陆失败，请检查网络或者设置",
        "loginError2": "错误: 登陆超时",
        "retrievingAlarmInfo": "恢复主机信息...",
        "successConnected": "连接主机成功",
        "selectConnectUpdateInfo": "选择'连接'更新信息",
        "error": "错误",
        "success": "成功",
        "alarmExist": "主机名称已存在",
        "alarmAdded": "主机已添加",
        "couldntUpdateAlarm": "更新主机信息失败",
        "alarmChanged": "主机信息改变",
        "couldntDeleteAlarm": "不能删除主机",
        "alarmDeleted": "已删除主机",
        "checkIpDns": "检查IP/DNS",
        "siteDnsIpReq": "站点名称或者IP/DNS是必填项",
        "importantNotice": "重要提示!",
        "specialFeaturesNotice": "所有特色功能会使用软件端口连接到系统，数据没有加密，包括密码。所有请谨慎使用， <b>前提是软件端口要配置正确</b>",
        "noEmailOpen": "设置失败 - 请使用可以使用的电子邮箱",
        "retrievingSettings": "恢复设置...",
        "doneSelectOptions": "完成, 选择选项",
        "updating": "更新中...",
        "online": "在线",
        "offline": "离线",
        "savingSettings": "保存设置...",
        "successSettingsSaved": "设置已保存",
        "newPushConfigSuccess": "用户成功注册推送消息",
        "existingPushConfigSuccess": "当前用户的推送功能已升级",
        "failPushUpdate": "推送服务器更新失败，请稍后重试",
        "errorConnectServer": "服务器连接失败，一会儿再试试",
        "googlePlayError": "谷歌服务出错，一会儿再试试",
        "pushService": "推送服务",
        "pushNotifications": "推送消息",
        "pushNotification": "推送消息",
        "selectAreasNotify": "选择要通知的分区",
        "area": "分区",
        "selectEventsNotify": "选择要通知的事件",
        "alarms": "报警",
        "armDisarm": "布/撤防",
        "IO1": "IO1",
        "IO2": "IO2",
        "webAccessBlocked": "web访问不了",
        "pushNote1": "注意: 如果不需要推送功能，请直接在APP里面关闭功能",
        "userNoPermission": "错误: 当前配置的用户可能没有权限设置邮件",
        "alarmNames": "主机名称",
        "areaNames": "分区标签",
        "zonePartitions": "防区所在分区",
        "zoneNames": "防区标签",
        "troubleNames": "故障名称",
        "delete": "删除",
        "alertSmtpOverride": "修改邮件SMTP可能会有风险",
        "note": "注意",
        "doNotModEmail": "Use_own_SMTP_server_before@editing.com",
        "pushNote2": "您的网络模块没有配置邮件功能，推送功能是通过网络模块的SMTP服务实现的，您也可以修改SMTP来实现给私人发邮件。",
        "pushNote3": "您的网络模块以及设置好发送邮件功能，如果您想实现个人邮件和推送功能，下面的选择不能选择，重新设置SMTP将会删除或者关闭现有的邮件推送",
        "overrideSMTP": "设置(覆盖)SMTP服务",
        "pushNotReachable": "推送服务无法接通，请稍后再试",
        "updateExistingPushUser": "现有的用户信息更新成功",
        "createNewPushUser": "新用户推送功能设置成功",
        "requestAlarmDataTimeout": "错误: 请求超时",
        "fullScreen": "全屏",
        "controlStillInOp": "控制仍然在进行...",
        "pmhReady": "(PHM) 准备好...",
        "updatingEvents": "更新事件",
        "earlyPushNote": "此功能还在测试阶段，请提前备份邮件设置",
        "ok": "Ok",
        "alarmDetails": "主机信息",
        "ipModuleDetails": "网络模块信息",
        "disconnectingAlarm": "断开连接中...",
        "backToExit": "再按一次退出",
        "push": "推送",
        "compressedView": "压缩主机控制窗口",
        "helpIssues": "帮助/问题",
        "help": "帮助",
        "serviceAnnouncements": "服务通告",
        "noAnnounce": "当前无公告",
        "gotoGithub": "访问GitHub",
        "enhancements": "增加",
        "bugs": "Bugs",
        "all": "所有",
        "helpWanted": "捐款",
        "question": "问题",
        "unread": "未读取",
        "filterBy": "过滤",
        "appAuthentication": "App认证",
        "pinCreated": "用户密码已生成",
        "pinNoMatch": "设置信息密码不匹配",
        "confirmPin": "确认密码",
        "appPin": "APP密码",
        "cancel": "取消",
        "createNewPin": "创建新密码",
        "requirePinStartup": "启动需要输入用户密码",
        "enterPinProceed": "请输入用户密码",
        "authenticate": "认证",
        "autoConnect": "自动连接",
        "checkSitename": "检查站点，如果不想使用枫叶PHM服务器，请删除站点。",
        "bypassed2": "已旁路",
        "pushHistory": "推送历史",
        "retrievingHistory": "恢复历史...",
        "noHistory": "无历史记录",
        "zone": "防区",
        "errorTTS": "错误信息，可能触发的太快",
        "zoneTesting": "防区测试中",
        "trigZoneTest": "请触发被测试的防区",
        "speakWithTestMode": "触发防区完成测试，每一个防区状态变化将会语音提示",
        "speakOnWithTestMode": "测试中，每个防区只会语音提示一次",
        "testZones": "测试防区",
        "resetTest": "恢复测试",
        "speakZones": "有声提示",
        "untested": "未测试",
        "egSpecialFunc": "例如：旁路/继电器",
        "changePgmName": "修改继电器名称",
        "connectedAlarmDetails": "当前主机信息:",
        "panelDetails": "主机信息",
        "type": "类型",
        "firmwareVersion": "固件版本",
        "serialNumber": "序列号",
        "ipModDetails": "网络模块信息",
        "hardware": "硬件",
        "eco": "ECO",
        "serialBoot": "顺序启动",
        "ipModule": "网络模块",
        "pgm": '继电器',
        "connectingSwp": "连接软件端口...",
        "FORCE": "强制布防",
        "disarmBeforeBypass": "布防后不能执行旁路",
        "forceArmShowArm": "强制布防中 - 完成后系统会显示布防",
        "optional": "可选项",
        "settings2": "设置",
        "nameOnly": "仅名称",
        "genericSettings": "一般设置s",
        "homeWifi": "WiFi",
        "testPushNotif": "您想测试推送功能吗？ <br><br>如果APP打开，会在APP上直接显示推送，如果是最小化推送将会出现在手机的状态栏"

    }
    
    var dictionary = engUK

    return {

        initLangFile : function () {
            //requestLangFile();
        },

        setLanguage: function (language) {
            /*
                            $http({
                method: 'GET',
                url: 'json/lang-en-UK.resjson',
                headers: { 'Content-Type': 'application/json' }, //x-www-form-urlencoded' }
                cache: false
            }).success(function (data, status, headers, config) {
                engUK = data;
               //alert('got it')
           }).error(function (data, status, headers, config) {
           })
           
           */

            if (language == "English")
                dictionary = engUK;
            else if (language == "Catala")
                dictionary = catala;
            else if (language == "Spanish")
                dictionary = spanish;
            else if (language == "Afrikaans")
                dictionary = afrikaans;
            else if (language == "Italian")
                dictionary = italian;
            else if (language == "Czech")
                dictionary = czech;
            else if (language == "Chinese")
                dictionary = chinese;
            else
                dictionary = engUK;

        },

        gt: function (msg) {

            if (msg in dictionary)
                return dictionary[msg];
            else {
                console.log("Error, no translation for: " + msg)
                return engUK[msg]
            }

        }

    }

});