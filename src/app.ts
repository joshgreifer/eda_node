// Server
import * as HID from "node-hid";
import * as BodyParser from "body-parser";

import "serialport";

import express, {Express, Request, Response} from "express";
import path from "path";
import {Numpy} from "./Numpy";
import {DeviceConnectionStatusCode, DeviceStatus} from "./DeviceStatus";
import * as fs from "fs";
import SerialPort from "serialport";

import {BufferData} from "./DataConnection";
import ByteLength = SerialPort.parsers.ByteLength;

const WebSocket = require('ws');

// Set limit  https://stackoverflow.com/questions/19917401/error-request-entity-too-large
// Rough calc:  sample rate 1000, time 3600 secs,  num channels: 1, data size 8 (float64)
const rawParser = BodyParser.raw({ type: 'application/octet-stream', limit: '50mb'});
const jsonParser = BodyParser.json({type: 'application/json', limit: '50mb'})
const app: Express = express();
const port = 3050; // default port to listen

enum DeviceId {
    MINDLIFE_HID_EDA,
    MINDLIFE_BT_PPG_EDA
}

let statuses: DeviceStatus[] = [
    {
        code: DeviceConnectionStatusCode.DISCONNECTED,
        message: "No EDA device connected.",
        websocket_port: 1102,
    },
    {
        code: DeviceConnectionStatusCode.DISCONNECTED,
        message: "No EDA/PPG device connected.",
        websocket_port: 1103,
    }

];


//let wss: any  = null;

function parsePPGEDA(data: Buffer) : Uint8Array
{
    return new Uint8Array(data.buffer).subarray(2,6);

}

function parseEDA(data: Buffer) : Uint8Array
{
    return new Uint8Array(data.buffer).subarray(2,4);

}
app.use(express.static(path.join(__dirname, 'public')));

// app.use( (err: any, req: any, res: any) => {
//     res.set('Content-Type', 'application/json');
//     console.error(err.stack);
//     res.status(500).send(JSON.stringify({ "message":  err.toString(), "stacktrace": err.stack }, null, 2));
//
// });


app.get( "/devices", ( req: Request, res: Response ) => {
    const devs =  HID.devices();
    console.log(devs);
    res.set('Content-Type', 'application/json');
    res.write(JSON.stringify(devs, null, 2));
    res.end();
});

app.get('/status', ( req: Request, res: Response ) => {
    res.set('Content-Type', 'application/json');
    res.write(JSON.stringify(statuses, null, 2));
    res.end();
});

app.post('/save/:filename', jsonParser, ( req: Request, res: Response ) => {
    res.set('Content-Type', 'application/json');
    try {
        let filename = req.params.filename;
        if (!filename.endsWith('.json'))
            filename += '.json'
        const obj = req.body;
        const fd = fs.openSync(filename, "w");
        fs.writeSync(fd, JSON.stringify(obj));
        fs.closeSync(fd);
        res.write(JSON.stringify({
            status: 'Success',
            filename: filename
        }, null, 2));
        res.end();
    } catch (e) {
        res.status(500).send(JSON.stringify({ status: 'Error', details: e.toString() }, null, 2));
    }


});

app.get('/load/:filename', ( req: Request, res: Response ) => {
    res.set('Content-Type', 'application/json');
    try {
        let filename = req.params.filename;
        if (!filename.endsWith('.json'))
            filename += '.json'
        const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        res.write(JSON.stringify({
            data: data,
            status: 'Success',
            filename: filename
        }, null, 2));
        res.end();
    } catch (e) {
        res.status(500).send(JSON.stringify({ status: 'Error', details: e.toString() }, null, 2));
    }


});

app.post('/data/:num_channels/:js_dtype/:filename', rawParser, ( req: Request, res: Response ) => {

    const num_channels = Number.parseInt(req.params.num_channels);

    let filename = req.params.filename;
    if (!filename.endsWith('.npy'))
        filename += '.npy'

    const js_dtype = req.params.js_dtype;
    const data = req.body;

    Numpy.save_data_with_type(filename, data, num_channels, js_dtype);



    res.set('Content-Type', 'application/json');
    res.write(JSON.stringify({
        status: 'Success',
        filename: filename,
        num_channels: num_channels
    }, null, 2));
    res.end();
});


app.get('/open/:vid/:pid', ( req: Request, res: Response ) => {

    res.set('Content-Type', 'application/json');

    const vid = Number.parseInt(req.params.vid);
    const pid = Number.parseInt(req.params.pid);
    if (isNaN(vid)) {  // Assume serial port,  Bluetooth PPG/EDA device
        const status = statuses[DeviceId.MINDLIFE_BT_PPG_EDA];
        try {
            const  device_port = new SerialPort(req.params.vid, {
                // baudRate: 19200,
                autoOpen: true
            }, (err) => { if (err) throw err});

            // device_port.open((err) => { if (err) throw err; });
            const device_parser = device_port.pipe(new ByteLength({length: 6}));
            if (status.wss)
                status.wss.close();

            status.wss = new WebSocket.Server({port: status.websocket_port});
            status.wss.on('connection', (ws: WebSocket) => {
                device_port.on('error', (error) => {
                    status.code = DeviceConnectionStatusCode.DISCONNECTED;
                    status.message = error.toString();
                });
                device_parser.on('data', (data) => {
                    const parsed_data = parsePPGEDA(data);
                    ws.send(parsed_data);
                });
            });

            status.websocket_address = "ws://0.0.0.0:" + status.websocket_port;
            status.device = device_port.path;
            status.message = "Connected.";
            status.code = DeviceConnectionStatusCode.CONNECTED;

            res.write(JSON.stringify(status, null, 2));
        } catch (e) {
            status.message = e.toString();
            res.status(400).send(JSON.stringify(statuses, null, 2));
        }
    } else { // Assume HID device with vendor and product  Id
        const status = statuses[DeviceId.MINDLIFE_HID_EDA];
        const devs =  HID.devices();
        const deviceInfo = devs.find( (d: HID.Device) => {
            return d.vendorId===vid && d.productId===pid;

        });
        if ( deviceInfo ) {

            try {
                const device = new HID.HID(deviceInfo.path as string);

                if (status.wss)
                    status.wss.close();
                status.wss = new WebSocket.Server({port: status.websocket_port});
                status.wss.on('connection', (ws: WebSocket) => {
                    device.on('error', (error) => {
                        status.code = DeviceConnectionStatusCode.DISCONNECTED;
                        status.message = error.toString();
                    });
                    device.on('data', (data) => {
                        data = parseEDA(data);
                        ws.send(data);
                    });
                });

                status.websocket_address = "ws://0.0.0.0:" + status.websocket_port;
                status.device = deviceInfo;
                status.message = "Connected.";
                status.code = DeviceConnectionStatusCode.CONNECTED;

                res.write(JSON.stringify(status, null, 2));
            } catch (e) {
                status.message = e.toString();
                res.status(400).send(JSON.stringify(status, null, 2));
            }



        } else {
            status.code = DeviceConnectionStatusCode.DISCONNECTED;
            status.message = `Device with vendor id 0x${vid.toString(16)} and product id 0x${pid.toString(16)} not found`;
            res.status(404).send(JSON.stringify(statuses, null, 2));
        }

    }

    res.end();
});

app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );