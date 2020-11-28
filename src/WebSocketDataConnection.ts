/**
 * @file WebSocketDataConnection.ts
 * @author Josh Greifer <joshgreifer@gmail.com>
 * @copyright © 2020 Josh Greifer
 * @licence
 * Copyright © 2020 Josh Greifer
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:

 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @summary Subclass of DataConnection.  Data is added to its internal
 * buffer from a websocket.
 *
 */

import {DataConnection, iDataConnection} from "./DataConnection";


export interface iConnectionStatusListener
{
    onConnectionStatus(conn: iDataConnection): void;
}

export class WebSocketDataConnection extends DataConnection  {

    public AddStatusListener(el: iConnectionStatusListener): void { this.statusListeners.push(el);}

    public RemoveStatusListener(el: iConnectionStatusListener): void {
        const idx = this.statusListeners.indexOf(el);
        if (idx >= 0) this.statusListeners.splice(idx, 1);
    }
    private statusListeners: iConnectionStatusListener[] = [];

    constructor(sample_rate: number, num_channels: number, protected bits_per_sample: number = 16, array_constructor= Int16Array ) {
        super(sample_rate, num_channels, bits_per_sample, array_constructor);


        // begin the periodic status updates
        this.informListeners(this);

    }

    informListeners = (conn: WebSocketDataConnection) => {
        this.statusListeners.forEach((el: iConnectionStatusListener) => { el.onConnectionStatus(this)});
        setTimeout(() => { this.informListeners(this) }, 250);

    }

    private url_!: string;
    set Url( url: string) { this.url_ = url; this.init(this.bits_per_sample); }
    get Url(): string { return this.url_; }

    private sock_!: WebSocket;
    get Sock(): WebSocket { return this.sock_; }


    private init( bits_per_sample: number) {

        if (this.sock_)
            delete this.sock_;
        const ws = new WebSocket(this.url_);
        ws.binaryType = 'arraybuffer';


        ws.onopen = (ev: Event) => {
            // console.log(ev);
            this.startPerformanceMeasurement();
        };

        ws.onclose = (ev: CloseEvent) => {
            // console.log(ev);
            // try again later
            setTimeout( () => { this.init(bits_per_sample) }, 2000)
        };

        switch (bits_per_sample) {
            case 16: ws.onmessage = (ev: MessageEvent) => {
                //      console.log(ev);
                this.AddData(new Int16Array(ev.data).subarray(1,2)); // TEST TEST
                this.measurePerformance();
            };
                break;
            case 32: ws.onmessage = (ev: MessageEvent) => {
                //      console.log(ev);
                this.AddData(new Float32Array(ev.data));
                this.measurePerformance();
            };
                break;
            case 64: ws.onmessage = (ev: MessageEvent) => {
                //      console.log(ev);
                this.AddData(new Float64Array(ev.data));
                this.measurePerformance();
            };
            break;
            default:
                throw 'Invalid bits per sample for websocket connection';
        }


        ws.onerror = (ev: Event) => {
            console.error(ev);

        };

        this.sock_ = ws;

    }

}