// Server
import * as HID from "node-hid";
import * as BodyParser from "body-parser";

import express, {Express, Request, Response} from "express";

const WebSocket = require('ws');

const rawParser = BodyParser.raw({ type: 'application/octet-stream'});

import path from "path";
import {Numpy} from "./Numpy";

const app: Express = express();
const port = 3050; // default port to listen

let status: {
    message: string;
    device: any;
    websocket: string;
} = {
    message: "Not connected.",
    device: {},
    websocket: ""
};

const wss_port = 1102;
let wss: any  = null;

app.use(express.static(path.join(__dirname, 'public')));

app.use( (err: any, req: any, res: any) => {
    res.set('Content-Type', 'application/json');
    console.error(err.stack);
    res.status(500).send(JSON.stringify({ "message":  err.toString(), "stacktrace": err.stack }, null, 2));

});


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

app.post('/data/:num_channels/:filename', rawParser, ( req: Request, res: Response ) => {

    const num_channels = Number.parseInt(req.params.num_channels);

    let filename = req.params.filename;
    if (!filename.endsWith('.npy'))
        filename += '.npy'

    const data = req.body;

    Numpy.save(filename, data, [num_channels, Math.floor(data.length / num_channels)]);



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
            status.message = "Connected.";
            status.device = device;

            if (wss)
                wss.close();
            wss = new WebSocket.Server({port: wss_port});
            wss.on('connection', (ws: WebSocket) => {
                device.on('error', (error) => {
                    status.message = error.toString();
                });
                device.on('data', (data) => {
                    ws.send(data);
                });
            });
        } catch (e) {
            status.message = e.toString();
            res.status(400).send(JSON.stringify(status, null, 2));
        }

        res.write(JSON.stringify({
            "websocket" : "ws://0.0.0.0:1102",
            'status' : "opened device.",
            'device' : deviceInfo
        }, null, 2));

    } else {
        status.message = `Device with vendor id 0x${vid.toString(16)} and product id 0x${pid.toString(16)} not found`;
        res.status(404).send(JSON.stringify(status, null, 2));
    }

    res.end();
});

app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );