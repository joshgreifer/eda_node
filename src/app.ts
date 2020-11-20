// Server
import * as HID from "node-hid";
import express, {Express, Request, Response} from "express";

const WebSocket = require('ws');

import path from "path";

const app: Express = express();
const port = 3050; // default port to listen

let status = "Not connected.";

app.use(express.static(path.join(__dirname, 'public')));

app.use( (err: any, req: any, res: any, next: any) => {
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
    res.write(JSON.stringify({
        'status' : status,
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
        status = "Connected.";

        const device = new HID.HID( deviceInfo.path as string );


        const wss = new WebSocket.Server({ port: 1102 });
        wss.on('connection', (ws: WebSocket) => {
            device.on('error', (error)=> {
                status = error.toString();
            });
            device.on('data', (data)=> {
                ws.send(data);
            });
        });


        res.write(JSON.stringify({
            "websocket" : "ws://0.0.0.0:1102",
            'status' : "opened device.",
            'device' : deviceInfo
        }, null, 2));

    } else {
        res.status(404).send('{ "status" : Device not connected }');
    }

    res.end();
});

app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );