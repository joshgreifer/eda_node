import {SessionManagerElement} from "./SessionManagerElement";

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
 * @summary Sample custom element tobe used as a template
 * This is part of my Typescript express starter application,  which provides
 * very minimal skeleton code for custom HTML tags, simple paging, and API access.
 *
 * The starter application was designed to be as lean as possible - its only dependencies
 * are express and eventemitter3.
 *
 */
export class ScopeMarkerEditorElement extends HTMLElement {



    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const el = <HTMLDivElement>document.createElement('div');
        const style = document.createElement('style');

        const label = this.hasAttribute('label') ? this.getAttribute('label') as string: '(label)';
        const color = this.hasAttribute('color') ? this.getAttribute('color') as string: '#ffff00';

        style.textContent = `
            div {
                margin-right: 5px;
            }
            label {
                display: inline-block;
                width: 200px;           
            }
            input {
                display: inline-block;
            }
`;
        el.innerHTML = `
            <input type="color" value="${color}"><input type="text" id="label1" value="${label}" style="position: relative; top: -3px;">
        `;

        const label_el = el.querySelector('input[type="text"]') as HTMLInputElement;
        const color_el = el.querySelector('input[type="color"]') as HTMLInputElement;

        label_el.addEventListener('change', (e: Event) => { this.setAttribute('label', label_el.value); this.dispatchEvent(new Event('change')) } );
        color_el.addEventListener('change', (e: Event) => { this.setAttribute('color', color_el.value);  this.dispatchEvent(new Event('change')) } );

        el.className = 'private-style1';

        shadow.append( style, el);


    }


}

