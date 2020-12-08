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
import {DataConnection} from "./DataConnection";
import {SigProc} from "./SigProc";



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

const scopeEl_EDA = document.querySelector('#eda') as ScopeElement;
const scopeEl_SCL = document.querySelector('#scl') as ScopeElement;
const websocketEl = document.querySelector('websocket-element') as WebSocketDataConnectionElement;
const scopeEDA: Scope = scopeEl_EDA.Scope;
const scopeSCL: Scope = scopeEl_SCL.Scope;

const ewma : SigProc.Ewma = new SigProc.Ewma(websocketEl.Connection.Fs);

const ExtractSCL = (data:ArrayLike<any>) : Float64Array => {
    let f = Float64Array.from(data);
    for (let i = 0; i < f.length; ++i)
        f[i] = ewma.process(f[i]);
    return f;

};

const EDAConnection: DataConnection = new DataConnection(websocketEl.Connection.Fs, 1, Float64Array);
const SCLConnection: DataConnection = new DataConnection(websocketEl.Connection.Fs, 1, Float64Array);
websocketEl.Connection.on('data', (data: any) => {
    let f1 = Float64Array.from(data);
    let f2 = Float64Array.from(data);
    for (let i = 0; i < f1.length; ++i) {
        const v = ewma.process(f1[i]);
        f1[i] = v;
        f2[i] -= v;
    }
    SCLConnection.AddData(f1);
    EDAConnection.AddData(f2);

});


scopeEDA.ChannelInfo = [{
    Name: 'EDA',
    Color: '#ffffff',
    Visible: true,
    RenderStyle: RenderStyle.Step,
    DownSampleAlgorithm:  DownSampleAlgorithm.MinMax  }
    ];

scopeSCL.ChannelInfo = [ {
    Name: 'SCL',
    Color: '#ffc200',
    Visible: true,
    RenderStyle: RenderStyle.Line,
    DownSampleAlgorithm:  DownSampleAlgorithm.MinMax  }
];

scopeEDA.Fs = websocketEl.Connection.Fs;
scopeEDA.Connection = EDAConnection;
scopeEDA.SampleUnitMultiplier = 1;
scopeEDA.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;
scopeEDA.SignalFollowBehaviour = SignalFollowBehaviour.Scroll;
scopeEDA.AutoYAxisAdjustChannel = 0;
scopeEDA.DataHeight = 1000;

scopeEDA.AddSlave(scopeSCL);

scopeSCL.TimeAxisVisible = false;




scopeSCL.Connection = SCLConnection;
scopeSCL.Fs = websocketEl.Connection.Fs;
scopeSCL.SampleUnitMultiplier = 1;
scopeSCL.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;
scopeSCL.SignalFollowBehaviour = SignalFollowBehaviour.Scroll;
scopeSCL.AutoYAxisAdjustChannel = 0;
scopeSCL.DataHeight = 1000;
scopeSCL.BackColor = '#001414'
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
        const timeStamp: number = scopeEDA.Connection ? scopeEDA.Connection.CurrentTimeSecs : 0;
        c.add({ text: text, className: 'recognized', replaceClassName: 'recognizing', isContinuation: true, timeStamp: timeStamp});
    });
    speechService.on('recognizing', (text: string)=>{ c.add({ text: text, className: 'recognizing', isContinuation: true})});
    const response = await open_hid_device(1240, 61281);
    console.info(JSON.stringify(response, null, 1));

    // scopeEl_EDA.AddCue('test 5s', 5.0);
    // c.add({ text: 'test 5s', className: 'cue', timeStamp: 5.0});

    c.Events.on('console-click', (el: HTMLDivElement) => {
        if (['cue', 'recognized'].includes(el.className)) {
            scopeEDA.FollowSignal = false;
            scopeEDA.DataX = Number.parseFloat(el.getAttribute('time-stamp') as string);
        }
    });

    window.addEventListener('keyup', (evt: KeyboardEvent) => {
        const code = evt.code;
        if (scopeEDA.Connection) {
            let label = '';
            if (code.startsWith('Key'))
                label = evt.code[3];
            else if (code.startsWith('Digit'))
                label = code[5];
            else if (code.startsWith('Numpad'))
                label = code[6];

            if (label !== '') {
                scopeEl_EDA.AddCue(label, scopeEDA.Connection.CurrentTimeSecs);
                c.add({text: label, className: 'cue', timeStamp: scopeEDA.Connection.CurrentTimeSecs});
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