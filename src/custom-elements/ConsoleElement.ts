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

    public message: (text:string, className: string, is_continuation?: boolean, replaceClassName?: string) => void;
    public log: (text: string) => void;
    public warn: (text: string) => void;
    public info: (text: string) => void;
    public error: (text: string) => void;

    private old_console_log_func = window.console.log;
    private old_console_error_func = window.console.error;
    private old_console_warn_func = window.console.warn;
    private old_console_info_func = window.console.info;

    private static make_msg(...args: any) : string {
        let msg = '';
        if (args && args.length) {
            for (const arg of args) {
                if (typeof (arg) === 'object')
                    msg += JSON.stringify(arg, null, 2) + ' ';
                else
                    msg += arg + ' ';

            }
        }
        return msg;
    }

    private developer_mode: boolean = false;
    public get DeveloperMode(): boolean { return this.developer_mode; }
    public set DeveloperMode( mode) { this.developer_mode = mode; }

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
        .console-output .recognized {
            color: #90c8ff;
        }
        .console-output .recognizing {
            font-style: italic;
            color: #46688d;
        }
`;
        const message = (text:string, className: string, is_continuation: boolean = false, replaceClassName = className) => {
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


        const log = (...args: any) => { if (this.developer_mode) message(ConsoleElement.make_msg(...args), 'info', false); this.old_console_log_func.apply(console, args);}
        const warn = (...args: any) => { if (this.developer_mode)  message(ConsoleElement.make_msg(...args), 'warn', false); this.old_console_warn_func.apply(console, args);}
        const info = (...args: any) => { if (this.developer_mode)  message(ConsoleElement.make_msg(...args), 'info', false); this.old_console_info_func.apply(console, args);}
        const error = (...args: any) => { if (this.developer_mode) message(ConsoleElement.make_msg(...args), 'error', false); this.old_console_error_func.apply(console, args);}

        window.console.log = log;
        window.console.info = info;
        window.console.warn = warn;
        window.console.error = error;

        window.onerror = (message, file, line, col, err) => {
            if (err)
                error(err.stack);
            return false;
        };

        window.addEventListener('unhandledrejection',  (e: PromiseRejectionEvent) => {
            error("Promise Rejection: " + e.reason);
            return false;
        });

        window.addEventListener("error", (e) => {
            error(e.error.stack);
            return false;
        });

        this.message = message;
        this.log = log;
        this.warn = warn;
        this.info = info;
        this.error = error;

        shadow.append( style, container_el);

    }
}