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
 * @summary A console, to be used for text logging.
 * This is part of my Typescript express starter application,  which provides
 * very minimal skeleton code for custom HTML tags, simple paging, and API access.
 *
 * The starter application was designed to be as lean as possible - its only dependencies
 * are express and eventemitter3.
 *
 *
 */


export class ConsoleElement extends HTMLElement {

    public log: (text:string, className: string, is_continuation?: boolean, replaceClassName?: string) => void;
    public warn: (text: string) => void;
    public info: (text: string) => void;
    public error: (text: string) => void;

    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const style = document.createElement('style');
        const container_el = document.createElement('div');
        const el = document.createElement('div');
        container_el.appendChild(el);
        container_el.className ='console';
        el.className ='console-output';

        style.textContent = `
        .console {
            font-size: 13px;
            overflow: auto;
            /* height: 50vh; */
            overflow-y: scroll;
            overflow-x: scroll;
            overscroll-behavior-y: contain;
            scroll-snap-type: y mandatory;
            grid-area: console;
        }
        .console-input {
            background-color: black;
            color: #ffffff;
            font-family: 'Lucida Console', Monaco, monospace;
        }
        .console-input input {
            width: 99%;
            border: none;
        }
        .console-output {

            white-space: pre;

            background-color: black;
            color: #BCD631;
            font-family: 'Lucida Console', Monaco, monospace;
            scroll-snap-align: end;

        }
        .console-output .error {
            color: #d60619;
        }
        .console-output .info {
            color: #76fc57;
        }
        .console-output .warn {
            color: #ff8400;
        }
`;
        const log = (text:string, className: string, is_continuation: boolean = false, replaceClassName = className) => {
            let line_el: HTMLDivElement;
            const last_child_el = el.lastChild;
            if (!is_continuation || last_child_el === null || (<HTMLDivElement>last_child_el).className !== replaceClassName) {
                line_el = document.createElement('div');
            } else {
                line_el = <HTMLDivElement>last_child_el;
                line_el.textContent = '';
                line_el.classList.remove(replaceClassName);


            }
            line_el.classList.add(className);
            let textNode = document.createTextNode(text);
            line_el.appendChild(textNode);
            if (line_el !== last_child_el)
                el.appendChild(line_el);
        }


        const warn = (text:string) => { log(text, 'warn', false)}
        const info = (text:string) => { log(text, 'info', false)}
        const error = (text:string) => { log(text, 'error', false)}

        this.log = log;
        this.warn = warn;
        this.info = info;
        this.error = error;

        shadow.append( style, container_el);

    }
}