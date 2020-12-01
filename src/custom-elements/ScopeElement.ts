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
        const scope_el = <HTMLDivElement>document.createElement('div');
        const labels_el = <HTMLDivElement>document.createElement('div');
        el.appendChild(scope_el);
        el.appendChild(labels_el);
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue
        el.className = 'container';
        scope_el.className = 'plot';
        labels_el.className = 'labels';
        // noinspection CssInvalidFunction,CssInvalidPropertyValue
        style.textContent = `

        .container {
            width: 70vw;
            height: 80vh;
            display: grid;
            grid-template-rows: 1fr 24px;
            grid-template-columns: 1fr;
            grid-template-areas:
                "plot"
                "labels"
        }
        
        .labels {
            grid-area: labels;
            position: relative;
        }
        

        .cue {
            font-family: monospace;
            font-size: 12px;
            border-radius: 0 3px 3px 0;
            border-left: solid red;
            position: absolute;
            display: inline;
            top: 0px;
            padding: 5px;
            /*width: 100px;*/
            color: white;
            background-color: rgb(40,90,16);
        }
        
        .plot {
            grid-area: plot;
         }
            
`;
        const scope = new Scope(scope_el);
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
                cue_el.addEventListener('click', () => {
                    const label = window.prompt("Enter new cue label:", cue);
                    if (label)
                        cue_el.innerHTML = cue = label;

                })
                labels_el.appendChild(cue_el);
            }

        }
        // Update the position of the cues when time axis changes
        scope.on('TimeAxisChanged', () => {
            const cue_els = el.querySelectorAll('.cue');
            for (const el of cue_els) {
                const cue_el = el as HTMLDivElement;
                cue_el.style.left = t2x(Number.parseFloat(cue_el.dataset.time as string)) + 'px';
            }

        });

        shadow.append( style, el);
        window.addEventListener('resize', (ev => { this.scope_.Resize(el.clientWidth, el.clientHeight-24)}));
        this.scope_.Resize(el.clientWidth, el.clientHeight-24);

    }


}