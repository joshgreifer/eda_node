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
import {
    AutoYAxisAdjustBehaviour,
    DownSampleAlgorithm,
    Marker,
    RenderStyle,
    Scope,
    SignalFollowBehaviour
} from "./Scope";
import {get_server_status, open_hid_device, save_buffer} from "./Api";
import {SpeechService} from "./SpeechService";
import {DataConnection} from "./DataConnection";
import {SigProc} from "./SigProc";
import EDAAnalyzer = SigProc.EDAAnalyzer;
import {SessionManagerElement} from "./custom-elements/SessionManagerElement";



AddAlgorithms(Array.prototype);


customElements.define('custom-element', CustomElement);
customElements.define('console-element', ConsoleElement);
customElements.define('scope-element', ScopeElement);
customElements.define('websocket-element', WebSocketDataConnectionElement);
customElements.define('facedetect-element', FaceDetectElement);
customElements.define('session-manager-element', SessionManagerElement);

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
switchToPage('page-2');

const c = document.querySelector('console-element') as ConsoleElement;
c.info('App Loaded.');

const scopeEl_SCR = document.querySelector('.scr') as ScopeElement;
const scopeEl_SCL = document.querySelector('.scl') as ScopeElement;

const websocketEl = document.querySelector('websocket-element') as WebSocketDataConnectionElement;

const scopeSCR: Scope = scopeEl_SCR.Scope;
const scopeSCL: Scope = scopeEl_SCL.Scope;

const edaAnalyzer: EDAAnalyzer = new EDAAnalyzer(websocketEl.Connection);

// TEST TEST
Marker.ColorMap['Cue'] = "#fff";
Marker.ColorMap['Test'] = "#ff0000";

scopeSCR.ChannelInfo = [
    {
        Name: 'SCR',
        Color: '#ffffff',
        Visible: true,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    }
];

scopeSCL.ChannelInfo = [
    {
        Name: 'EDA',
        Color: '#00ff00',
        Visible: true,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    },
    {
        Name: 'SCL',
        Color: '#ffc200',
        Visible: true,
        RenderStyle: RenderStyle.Line,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    }
];

// set common properties for all scopes
for (const scope of [scopeSCR, scopeSCL]) {
    scope.SampleUnitMultiplier = 1;
    scope.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;
    scope.SignalFollowBehaviour = SignalFollowBehaviour.Scroll;
    scope.AutoYAxisAdjustChannel = 0;
    scope.DataHeight = 1000;
}

scopeSCR.Connection = edaAnalyzer.SCR;
scopeSCR.AddSlave(scopeSCL);

scopeSCL.TimeAxisVisible = false;
scopeSCL.Connection = edaAnalyzer.SCL;
scopeSCL.BackColor = '#001414'


console.info('Connected scope to websocket.');

const connectButton = document.querySelector('#connect-button') as HTMLButtonElement;
const startSpeechRecognitionButton = document.querySelector('#start-speech-recognition-button') as HTMLButtonElement;
const statusIndicator = document.querySelector('#status-indicator') as HTMLSpanElement;

const passwordElement = document.querySelector('#speech-sdk-password-input') as HTMLInputElement;

passwordElement.addEventListener('input', ()=> {
    connectButton.disabled = !passwordElement.value;

});

startSpeechRecognitionButton.addEventListener('click', async () => {
    const password = passwordElement.value;
    if (password !== "") {
        const speechService = new SpeechService(password, true, false);
        await speechService.StartContinuousRecognition();
        speechService.on('recognized', (text: string) => {
            const timeStamp: number = scopeSCR.Connection ? scopeSCR.Connection.CurrentTimeSecs : 0;
            c.add({
                text: text,
                className: 'recognized',
                replaceClassName: 'recognizing',
                isContinuation: true,
                timeStamp: timeStamp
            });
        });
        speechService.on('recognizing', (text: string) => {
            c.add({text: text, className: 'recognizing', isContinuation: true})
        });
        speechService.on('error', async (text: string) => {
            c.error(text);
            await speechService.StopContinuousRecognition();
        });
    }
});

connectButton.addEventListener('click', async () => {
    // TEST TEST
    // const data = new Uint8Array(6);
    // for (let i = 0; i < 6; ++i)
    //     data[i] = i;
    // await save_buffer(data);

    const response = await open_hid_device(1240, 61281);
    console.info(JSON.stringify(response, null, 1));
});

// scopeEl_SCR.AddCue('test 5s', 5.0);
// c.add({ text: 'test 5s', className: 'cue', timeStamp: 5.0});

c.Events.on('console-click', (el: HTMLDivElement) => {
    if (['cue', 'recognized'].includes(el.className)) {
        scopeSCR.FollowSignal = false;
        scopeSCR.DataX = Number.parseFloat(el.getAttribute('time-stamp') as string);
    }
});


scopeEl_SCR.Scope.on('marker-added', (marker: Marker) => {
    const timeToString = (t: number) => new Date(t * 1000).toISOString().substring(14,22);

    const line_el = c.add({text: `${timeToString(marker.time)} ${marker.label}`, className: 'cue', timeStamp: marker.time });
    line_el.style.color = marker.color;
    marker.on('label-changed', (new_label: string) => {
        line_el.innerText = `${timeToString(marker.time)} ${new_label}`;
        line_el.style.color = marker.color;
    })
    line_el.addEventListener('dblclick', () => { marker.editLabel()});
});


window.addEventListener('keyup', (evt: KeyboardEvent) => {
    const code = evt.code;
    if (evt.altKey && scopeSCR.Connection) {
        let label = '';
        if (code.startsWith('Key'))
            label = evt.code[3];
        else if (code.startsWith('Digit'))
            label = code[5];
        else if (code.startsWith('Numpad'))
            label = code[6];

        if (label !== '') {
            const t = scopeSCR.Connection.CurrentTimeSecs;
            const v = scopeSCR.Connection.ValueAtTime(t);
            const marker = new Marker(t, v, label);
            scopeEl_SCR.Scope.AddMarker(marker);
        }
    }
});

window.setInterval(() => {
    (async () => {
        const status = await get_server_status();
        statusIndicator.innerText = status.message;
    } )();

}, 2000);