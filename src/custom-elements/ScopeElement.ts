/**
 * @file CustomElement.ts
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
 * @summary HTML Custom element wrapping a Scope.  It hooks window Resize() events
 * and delegates them to the Scope, so it can resize its internal canvases and data buffers.
 *
 */

import {Scope} from "../Scope";

export class ScopeElement extends HTMLElement {

    private scope_: Scope;


    public get Scope() : Scope { return this.scope_; }

    public AddCue: (cue: any, dataTime?: number) => void;

    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const el = <HTMLDivElement>document.createElement('div');
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue
        el.className = 'private-style1';
        // noinspection CssInvalidFunction,CssInvalidPropertyValue
        style.textContent = `
        .cue {
            position: relative;
            top: -10%;
            width: 50px;
            background-color: rgba(255,0,128, 0.5);
        }
        
        .private-style1 {
        height: 100%;
        width: 100%;
        /*padding: 0;*/
        /*margin :0;*/
        /*    top: 0;*/
        /*    bottom : 0;*/
        /*    left: 0;*/
        /*    right: 0;*/
            
        }
`;
        const scope = new Scope(el);
        this.scope_ = scope;

        const t2x = (t: number) => {
            return scope.d2gX(t) + scope.GraphBounds.x;
        };

        const d2w = (d: number) => {
            return scope.duration2pixels(d);
        }

        this.AddCue = (cue: any, dataTime?: number) => {
            if (scope.Connection) {
                const cue_el = <HTMLDivElement>document.createElement('div');
                cue_el.dataset.time = '' + (dataTime ? dataTime: scope.Connection.CurrentTimeSecs);
                cue_el.classList.add('cue');
                cue_el.innerHTML = cue;
                cue_el.style.left = t2x(Number.parseFloat(cue_el.dataset.time)) + 'px';
                el.appendChild(cue_el);
            }

        }
        // Update the position of the cues when time axis changes
        scope.on('TIME-AXIS', () => {
            const cue_els = el.querySelectorAll('.cue');
            for (const el of cue_els) {
                const cue_el = el as HTMLDivElement;
                cue_el.style.left = t2x(Number.parseFloat(cue_el.dataset.time as string)) + 'px';
            }

        });

        shadow.append( style, el);
        window.addEventListener('resize', (ev => { ev.preventDefault(); this.scope_.Resize()}));
        this.scope_.Resize();

    }


}