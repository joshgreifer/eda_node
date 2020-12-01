/**
 * @file index.ts
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
 * @summary index file for the main application.
 * I created this from my own Typescript express starter application,  which provides
 * very minimal skeleton code for custom HTML tags, simple paging, and API access.
 *
 * The starter application was designed to be as lean as possible - its only dependencies
 * are express and eventemitter3.
 *
 */

import {AddAlgorithms} from "./ArrayPlus";
import {CustomElement} from "./custom-elements/CustomElement";
import {ConsoleElement} from "./custom-elements/ConsoleElement";
import {ScopeElement} from "./custom-elements/ScopeElement";
import {FaceDetectElement} from "./custom-elements/FaceDetectElement";
import {WebSocketDataConnectionElement} from "./custom-elements/WebSocketDataConnectionElement";
import {AutoYAxisAdjustBehaviour, DownSampleAlgorithm, RenderStyle, Scope, SignalFollowBehaviour} from "./Scope";
import {get_server_status, open_hid_device} from "./Api";
import {SpeechService} from "./SpeechService";


AddAlgorithms(Array.prototype);


customElements.define('custom-element', CustomElement);
customElements.define('console-element', ConsoleElement);
customElements.define('scope-element', ScopeElement);
customElements.define('websocket-element', WebSocketDataConnectionElement);
customElements.define('facedetect-element', FaceDetectElement);


// Disable MS Edge (and probably Chrome) context menus in OSX
document.addEventListener('contextmenu', event => { event.preventDefault() })

document.querySelectorAll('.page-switcher').forEach((button) => {
    (<HTMLButtonElement>button).addEventListener('click', () => {switchToPage(button.getAttribute('page') || '') })
})

function switchToPage(page_id: string) {
    const pages = document.querySelectorAll('.page');
    for (const page of pages) {
        if (page.id === page_id)
            page.classList.remove('hidden');
        else
            page.classList.add('hidden');
    }
    const page_buttons = document.querySelectorAll('.page-switcher');
    for (const page_button of page_buttons)
        (<HTMLButtonElement>page_button).disabled = (page_button.getAttribute('page') === page_id);

}
switchToPage('page-1');

const c = document.querySelector('console-element') as ConsoleElement;
c.info('App Loaded.');

const scopeEl = document.querySelector('scope-element') as ScopeElement;
const websocketEl = document.querySelector('websocket-element') as WebSocketDataConnectionElement;
const scope: Scope = scopeEl.Scope;


scope.ChannelInfo = [{
    Name: 'EDA',
    Color: '#ffffff',
    Visible: true,
    RenderStyle: RenderStyle.Step,
    DownSampleAlgorithm:  DownSampleAlgorithm.MinMax  }
    ];
scope.Fs = websocketEl.Connection.Fs;
scope.Connection = websocketEl.Connection;
scope.SampleUnitMultiplier = 1;
scope.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;
scope.AutoYAxisAdjustChannel = 0;

// TEST TEST
// scope.SignalFollowBehaviour = SignalFollowBehaviour.None;

console.info('Connected scope to websocket.');

const connectButton = document.querySelector('#connect-button') as HTMLButtonElement;
const statusIndicator = document.querySelector('#status-indicator') as HTMLSpanElement;

const passwordElement = document.querySelector('#password-input') as HTMLInputElement;

passwordElement.addEventListener('input', ()=> {
    connectButton.disabled = !passwordElement.value;

});

connectButton.addEventListener('click', async () => {
    const password = passwordElement.value;
    const speechService = new SpeechService(password, true, false);
    await speechService.StartContinuousRecognition();
    speechService.on('recognized', (text: string)=> {
        const timeStamp: number = scope.Connection ? scope.Connection.CurrentTimeSecs : 0;
        c.add({ text: text, className: 'recognized', replaceClassName: 'recognizing', isContinuation: true, timeStamp: timeStamp});
    });
    speechService.on('recognizing', (text: string)=>{ c.add({ text: text, className: 'recognizing', isContinuation: true})});
    const response = await open_hid_device(1240, 61281);
    console.info(JSON.stringify(response, null, 1));

    scopeEl.AddCue('test 5s', 5.0);
    c.add({ text: 'test 5s', className: 'cue', timeStamp: 5.0});

    c.Events.on('console-click', (el: HTMLDivElement) => {
        if (['cue', 'recognized'].includes(el.className)) {
            scope.SignalFollowBehaviour = SignalFollowBehaviour.None;
            scope.DataX = Number.parseFloat(el.getAttribute('time-stamp') as string);
        }
    });

    window.addEventListener('keyup', (evt: KeyboardEvent) => {
        const code = evt.code;
        if (scope.Connection) {
            let label = '';
            if (code.startsWith('Key'))
                label = evt.code[3];
            else if (code.startsWith('Digit'))
                label = code[5];
            else if (code.startsWith('Numpad'))
                label = code[6];

            if (label !== '') {
                scopeEl.AddCue(label, scope.Connection.CurrentTimeSecs);
                c.add({text: label, className: 'cue', timeStamp: scope.Connection.CurrentTimeSecs});
            }
        }
    })

});

window.setInterval(() => {
    (async () => {
        const status = await get_server_status();
        statusIndicator.innerText = status.message;
    } )();

}, 2000);