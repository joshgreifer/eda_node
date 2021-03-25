/**
 * @file WebSocketDataConnectionElement.ts
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
 * @summary A custom element which wraps a websocket connection and listener.
 *
 *
 */
import * as GDIPlus from "../GDIPlus";
import {iConnectionStatusListener, WebSocketDataConnection} from "../WebSocketDataConnection";
import {BufferData, BufferDataConstructor} from "../DataConnection";


export class WebSocketDataConnectionElement extends HTMLElement implements iConnectionStatusListener {

    private static drawLed(ctx: CanvasRenderingContext2D, center_x: number, center_y: number, radius: number, color: CanvasGradient | string ) {
        const top_y = center_y - radius;

        const gradient_shine = ctx.createLinearGradient(0, top_y+ radius / 5, 0, top_y + 4 * radius / 5);
        gradient_shine.addColorStop(0, "#ffffff");
        gradient_shine.addColorStop(1,<string>color);
        const gradient_bezel = ctx.createLinearGradient(0,top_y,0, top_y + 2 * radius);
        gradient_bezel.addColorStop(1,"#ffffff");
        gradient_bezel.addColorStop(0,"#222222");

        // bezel
        ctx.lineWidth = radius / 4;
        GDIPlus.GCH.DrawCircle(ctx, gradient_bezel, center_x, center_y, radius);

        // bulb
        GDIPlus.GCH.FillCircle(ctx, color, center_x, center_y, radius);

        // shine
        GDIPlus.GCH.FillEllipse(ctx, gradient_shine, center_x, center_y - radius / 2, radius * 3 / 5, radius * 2 / 5);


    }
    public onConnectionStatus: (conn: WebSocketDataConnection) =>  void

    public set Url(url: string) {
        this.conn_.Url = url;
        this.setAttribute('url', url);
    }
    public get Url() : string {
        return this.conn_.Url;
    }

    public get Connection() : WebSocketDataConnection { return this.conn_; }

    private conn_: WebSocketDataConnection;


    private setConnection(): void  {


        const num_channels: number  = this.hasAttribute('channels') ? Number.parseInt(this.getAttribute('channels') as string): 1;
        const bits_per_sample: number  = this.hasAttribute('bits') ? Number.parseInt(this.getAttribute('bits') as string): 16;
        const sample_rate: number  = this.hasAttribute('sample-rate') ? Number.parseInt(this.getAttribute('sample-rate') as string): 1;

        let array_constructor: BufferDataConstructor;

        switch (bits_per_sample) {
            case 16: array_constructor = Int16Array; break;
            case 32: array_constructor = Float32Array; break;
            case 8: array_constructor = Uint8Array; break;
            case 64: array_constructor = Float64Array; break;
            default:
                throw "Unknown bits per sample";
        }

        this.conn_ = new WebSocketDataConnection(sample_rate, num_channels, array_constructor)

        if (this.hasAttribute('url')) {
            this.conn_.Url = this.getAttribute('url') as string;
        }

        this.conn_.AddStatusListener(this);
    }

    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const el = <HTMLCanvasElement>document.createElement('canvas');

        const num_channels: number  = this.hasAttribute('channels') ? Number.parseInt(this.getAttribute('channels') as string): 1;
        const bits_per_sample: number  = this.hasAttribute('bits') ? Number.parseInt(this.getAttribute('bits') as string): 16;
        const sample_rate: number  = this.hasAttribute('sample-rate') ? Number.parseInt(this.getAttribute('sample-rate') as string): 1;

        let array_constructor: BufferDataConstructor;

        switch (bits_per_sample) {
            case 16: array_constructor = Int16Array; break;
            case 32: array_constructor = Float32Array; break;
            case 8: array_constructor = Uint8Array; break;
            case 64: array_constructor = Float64Array; break;
            default:
                throw "Unknown bits per sample";
        }

        this.conn_ = new WebSocketDataConnection(sample_rate, num_channels, array_constructor)

        if (this.hasAttribute('url')) {
            this.conn_.Url = this.getAttribute('url') as string;
        }

        this.conn_.AddStatusListener(this);

        this.onConnectionStatus = (conn: WebSocketDataConnection): void => {

            el.setAttribute('width', window.getComputedStyle(el, null).getPropertyValue("width"));
            el.setAttribute('height', window.getComputedStyle(el, null).getPropertyValue("height"));
            el.height = 18;

            let msg = '';
            let led_color = '#444444' // not connected
            let socket_state;
            if (conn.Sock) {
                switch (conn.Sock.readyState) {
                    case 3: socket_state = 'closed    '; led_color = '#444444'; break;
                    case 2: socket_state = 'closing   '; led_color = '#104700'; break;
                    case 1: socket_state = 'open      '; led_color = '#03ac00'; break;
                    case 0: socket_state = 'connecting'; led_color = '#d4d400'; break;
                    default:socket_state = 'unknown   '; led_color = '#be0000'; break;
                }
                msg += 'Websocket Connection: ' + socket_state + ' ';
                if (conn.Sock.readyState === 1) {
                    const rate = conn.MeasuredFs.toFixed(0);
                   msg += 'Fs=' + rate + ' ';

                }
            } else {
                msg += 'Not connected, press [Connect] button.'
            }
            const ctx: CanvasRenderingContext2D = el.getContext('2d') as CanvasRenderingContext2D;
            //       ctx.fillStyle = 'red';
            ctx.clearRect(0, 0, el.width, el.height);
            ctx.font = '14px Arial';
            //       msg = 'TEST';
            ctx.fillStyle = '#000000';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            const led_radius =  6;
            ctx.fillText(msg, el.width - 2 * led_radius - 4, el.height / 2);

            WebSocketDataConnectionElement.drawLed(ctx, el.width - led_radius - 1, el.height / 2, led_radius, led_color);

        }


        shadow.append(el);


    }


}