


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