// Server
import * as HID from "node-hid";
import * as BodyParser from "body-parser";

import express, {Express, Request, Response} from "express";
import path from "path";
import {Numpy} from "./Numpy";
import {HidDeviceConnectionStatusCode, HidDeviceStatus} from "./HidDeviceStatus";

const WebSocket = require('ws');

// Set limit  https://stackoverflow.com/questions/19917401/error-request-entity-too-large
// Rough calc:  sample rate 1000, time 3600 secs,  num channels: 1, data size 8 (float64)
const rawParser = BodyParser.raw({ type: 'application/octet-stream', limit: '50mb'});

const app: Express = express();
const port = 3050; // default port to listen

let status: HidDeviceStatus = {
    code: HidDeviceConnectionStatusCode.DISCONNECTED,
    message: "No device connected.",
};

const wss_port = 1102;
let wss: any  = null;

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
    res.write(JSON.stringify(status, null, 2));
    res.end();
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

    const devs =  HID.devices();
    const deviceInfo = devs.find( (d: HID.Device) => {
        return d.vendorId===vid && d.productId===pid;

    });
    if ( deviceInfo ) {

        try {
            const device = new HID.HID(deviceInfo.path as string);

            if (wss)
                wss.close();
            wss = new WebSocket.Server({port: wss_port});
            wss.on('connection', (ws: WebSocket) => {
                device.on('error', (error) => {
                    status.code = HidDeviceConnectionStatusCode.DISCONNECTED;
                    status.message = error.toString();
                });
                device.on('data', (data) => {
                    ws.send(data);
                });
            });

            status.websocket = "ws://0.0.0.0:1102";
            status.device = deviceInfo;
            status.message = "Connected.";
            status.code = HidDeviceConnectionStatusCode.CONNECTED;

            res.write(JSON.stringify(status, null, 2));
        } catch (e) {
            status.message = e.toString();
            res.status(400).send(JSON.stringify(status, null, 2));
        }



    } else {
        status.code = HidDeviceConnectionStatusCode.DISCONNECTED;
        status.message = `Device with vendor id 0x${vid.toString(16)} and product id 0x${pid.toString(16)} not found`;
        res.status(404).send(JSON.stringify(status, null, 2));
    }

    res.end();
});

app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );