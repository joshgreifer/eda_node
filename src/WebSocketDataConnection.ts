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

import {BufferData, BufferDataConstructor, DataConnection, iDataConnection} from "./DataConnection";


export interface iConnectionStatusListener
{
    onConnectionStatus(conn: iDataConnection): void;
}

function parseEDA(data: ArrayBuffer) : BufferData
{
    // ignore first 16 bits
    return new Int16Array(data).subarray(1,2);
}


function parsePPGEDA(data: ArrayBuffer) : BufferData
{
    // ignore first 16 bits of each 6 byte (3 word) packet
    return new Int16Array(data).filter((v:any,i:number) => (i % 3) > 0);
}

export class WebSocketDataConnection extends DataConnection  {

    public AddStatusListener(el: iConnectionStatusListener): void { this.statusListeners.push(el);}

    public RemoveStatusListener(el: iConnectionStatusListener): void {
        const idx = this.statusListeners.indexOf(el);
        if (idx >= 0) this.statusListeners.splice(idx, 1);
    }
    private statusListeners: iConnectionStatusListener[] = [];

    constructor(sample_rate: number, num_channels: number, private array_constructor: BufferDataConstructor, private parser?: (data: ArrayBuffer) => BufferData ) {
        super(sample_rate, num_channels, array_constructor);


        // begin the periodic status updates
        this.informListeners(this);

    }

    informListeners = (conn: WebSocketDataConnection) => {
        this.statusListeners.forEach((el: iConnectionStatusListener) => { el.onConnectionStatus(this)});
        setTimeout(() => { this.informListeners(this) }, 250);

    }

    private url_!: string;
    set Url( url: string) { this.url_ = url; this.init(); }
    get Url(): string { return this.url_; }

    private sock_!: WebSocket;
    get Sock(): WebSocket { return this.sock_; }


    private init() {

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
            setTimeout( () => { this.init() }, 2000)
        };

        // Test test
        // this.parser = parsePPGEDA;

        if (this.parser !== undefined) {
            const parser = this.parser;
            ws.onmessage = (ev: MessageEvent) => {
                //      console.log(ev);
                this.AddData(parser(ev.data)); // TEST TEST - parse
                this.measurePerformance();
            };
        } else {
            ws.onmessage = (ev: MessageEvent) => {
                //      console.log(ev);
                this.AddData(new this.array_constructor(ev.data));
                this.measurePerformance();
            };
        }


        ws.onerror = (ev: Event) => {
            console.error(ev);

        };

        this.sock_ = ws;

    }

}