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
import {get_devices_status, load_json, open_device} from "./Api";
import {SpeechService} from "./SpeechService";
import {SigProc} from "./SigProc";
import {SessionManagerElement} from "./custom-elements/SessionManagerElement";
import {DeviceConnectionStatusCode} from "./DeviceStatus";
import EDAAnalyzer = SigProc.EDAAnalyzer;
import {ScopeMarkerEditorElement} from "./custom-elements/ScopeMarkerEditor";
import {iDataConnection} from "./DataConnection";
import ResponseAnalyserParams = SigProc.ResponseAnalyserParams;
import {GetSettings, Settings} from "./Settings";



AddAlgorithms(Array.prototype);


customElements.define('custom-element', CustomElement);
customElements.define('console-element', ConsoleElement);
customElements.define('scope-element', ScopeElement);
customElements.define('websocket-element', WebSocketDataConnectionElement);
customElements.define('facedetect-element', FaceDetectElement);
customElements.define('session-manager-element', SessionManagerElement);
customElements.define('scope-marker-editor-element', ScopeMarkerEditorElement);


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
switchToPage('page-4');

const c = document.querySelector('console-element') as ConsoleElement;
c.info('App Loaded.');

const scopeEl_SCR = document.querySelector('.scr') as ScopeElement;
const scopeEl_SCL = document.querySelector('.scl') as ScopeElement;
const scopeEl_PPG = document.querySelector('#ppg-scope') as ScopeElement;
const scopeEl_EDA = document.querySelector('#eda-scope') as ScopeElement;

const usbDeviceConnectionEl = document.querySelector('#usb-device-connection') as WebSocketDataConnectionElement;
const serialPortDeviceConnectionEl = document.querySelector('#serial-port-device-connection') as WebSocketDataConnectionElement;

const statusIndicatorUSBDevice = document.querySelector('#usb-device-status-indicator') as HTMLSpanElement;
const statusIndicatorSerialPortDevice = document.querySelector('#serial-port-device-status-indicator') as HTMLSpanElement;


const scopeSCR: Scope = scopeEl_SCR.Scope;
const scopeSCL: Scope = scopeEl_SCL.Scope;
const scopePPG: Scope = scopeEl_PPG.Scope;
const scopeEDA: Scope = scopeEl_EDA.Scope;
const edaAnalyzer: EDAAnalyzer = new EDAAnalyzer(usbDeviceConnectionEl.Connection);

edaAnalyzer.responseAnalyser.on('response', (phase: SigProc.ResponsePhase) => {
    if (!['BaseLevel'].includes(phase)) {
        const conn = scopeSCR.Connection as iDataConnection;
        const t = conn.CurrentTimeSecs;
        const v = conn.ValueAtTime(t);
        const marker = new Marker(t, v, phase);
        scopeEl_SCR.Scope.AddMarker(marker);
    }
});

// TEST TEST
Marker.ColorMap['Cue'] = "#ffffff";
Marker.ColorMap['Test'] = "#ff0000";

// scopeSCR.Title  = "Skin Conductance Response";
// scopeSCL.Title = "Skin Conductance Level";
// scopePPG.Title = "MindHeart PPG";
// scopeEDA.Title = "MindHeart EDA";

scopeSCR.ChannelInfo = [
    {
        Name: 'SCR',
        Color: '#ffffff',
        Visible: true,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    },
    {
        Name: 'LowPass',
        Color: 'rgb(146,252,122)',
        Visible: true,
        RenderStyle: RenderStyle.Line,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    },
    {
        Name: 'Threshold',
        Color: 'rgba(122,150,252, 0.5)',
        Visible: true,
        RenderStyle: RenderStyle.Line,
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


scopePPG.ChannelInfo = [
    {
        Name: 'EDA',
        Color: '#00ff00',
        Visible: false,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    },
    {
        Name: 'PPG',
        Color: '#ffc200',
        Visible: true,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    }
];

scopeEDA.ChannelInfo = [
    {
        Name: 'EDA',
        Color: '#00ff00',
        Visible: true,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    },
    {
        Name: 'PPG',
        Color: '#ffc200',
        Visible: false,
        RenderStyle: RenderStyle.Step,
        DownSampleAlgorithm:  DownSampleAlgorithm.MinMax
    }
];
// set common properties for all scopes
for (const scope of [scopeSCR, scopeSCL, scopePPG, scopeEDA]) {
    scope.SampleUnitMultiplier = 1;
    scope.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;
    scope.SignalFollowBehaviour = SignalFollowBehaviour.Scroll;
    scope.AutoYAxisAdjustChannel = 0;
    scope.DataHeight = 1000;
    scope.DataWidth = 30;
}


scopeSCR.Connection = edaAnalyzer.SCR;
scopeSCR.AddSlave(scopeSCL);

scopeSCL.TimeAxisVisible = false;
scopeSCL.Connection = edaAnalyzer.SCL;
scopeSCL.BackColor = '#001414'

scopeEDA.AutoYAxisAdjustChannel = 0;
scopePPG.AddSlave(scopeEDA);
scopeEDA.TimeAxisVisible = false;
scopePPG.AutoYAxisAdjustChannel = 1;



scopeEDA.Connection = serialPortDeviceConnectionEl.Connection;
scopePPG.Connection = serialPortDeviceConnectionEl.Connection;

console.info('Connected scopes to websocket.');

// const connectButton = document.querySelector('#connect-button') as HTMLButtonElement;
const enableGazeDetectionEl = document.querySelector('#enable-gaze-detection') as HTMLInputElement;
const enableSpeechDetectionEl = document.querySelector('#enable-speech-detection') as HTMLInputElement;
const FaceRecognitionEl = document.querySelector('facedetect-element') as FaceDetectElement;

// const startSpeechRecognitionButton = document.querySelector('#start-speech-recognition-button') as HTMLButtonElement;
const passwordElement = document.querySelector('#speech-sdk-password-input') as HTMLInputElement;
const scopeSignalFollowBehaviourRadioButtons = document.querySelectorAll('input[name="scope-signal-follow-behaviour"]');
const indicatorSpeechDetectionEl = document.querySelector('.speech-detection-active-indicator') as HTMLDivElement;
let speechService: SpeechService | null = null;

const setSpeechRecognition = async (on: boolean) => {

    if (speechService) {
        await speechService.StopContinuousRecognition();
        speechService = null;
    }
    if (on) {
        const password = passwordElement.value;

        speechService = new SpeechService(password, true, false);

        await speechService.StartContinuousRecognition();
        speechService.on('recognized', (text: string) => {
            if (scopeSCR.Connection) {
                let t: number = 0;
                let v: number = 0;
                t = scopeSCR.Connection.CurrentTimeSecs - SpeechService.LatencySeconds;
                if (t < 0)
                    t = 0;
                v = scopeSCR.Connection.ValueAtTime(t);
                const marker = new Marker(t, v, text);
                scopeEl_SCR.Scope.AddMarker(marker);
            }

        });
        speechService.on('recognizing', (text: string) => {
            c.add({text: text, className: 'recognizing', isContinuation: true})
        });
        speechService.on('error', async (text: string) => {
            c.error(text);
            if (speechService) {
                await speechService.StopContinuousRecognition();
                speechService = null;
                enableSpeechDetectionEl.checked = false;
                indicatorSpeechDetectionEl.classList.remove('active');
                window.alert("Speech detection is not working.\n\nPlease check that you have entered the correct password and that Internet connectivity is OK.");

            }
        });

    }
};


passwordElement.addEventListener('input', ()=> {
    enableSpeechDetectionEl.disabled = !passwordElement.value;

});

enableGazeDetectionEl.onchange = () => {
    FaceRecognitionEl.setAttribute('enabled', enableGazeDetectionEl.checked ? 'true' : 'false');
};

enableSpeechDetectionEl.onchange = async () => {
    const enable = enableSpeechDetectionEl.checked;

    if (enable) indicatorSpeechDetectionEl.classList.add('active'); else indicatorSpeechDetectionEl.classList.remove('active');
    await setSpeechRecognition(enable);
};

for (const el of scopeSignalFollowBehaviourRadioButtons) {
    el.addEventListener('change', () => { scopeSCR.SignalFollowBehaviour = Number.parseInt((<HTMLInputElement>el).value)});
}



c.Events.on('console-click', (el: HTMLDivElement) => {
    if (['cue', 'recognized'].includes(el.className)) {
        scopeSCR.FollowSignal = false;
        scopeSCR.DataX = Number.parseFloat(el.getAttribute('time-stamp') as string);
    }
});


scopeEl_SCR.Scope.on('marker-added', (marker: Marker) => {
    const timeToString = (t: number) => new Date(t * 1000).toISOString().substring(14,22);

    const line_el = c.add({text: `${timeToString(marker.time)} ${marker.label}`, className: 'cue', timeStamp: marker.time, isContinuation: true, replaceClassName: 'recognizing' });
    line_el.style.color = marker.color;
    marker.on('label-changed', (new_label: string) => {
        line_el.innerText = `${timeToString(marker.time)} ${new_label}`;
        line_el.style.color = marker.color;
    })
    line_el.addEventListener('dblclick', () => { marker.editLabel()});
});

scopeEl_SCR.Scope.on('reset', () => { c.clear(); });

scopeEl_SCR.Scope.on('size', (size: { width: number, height: number}) => {
    c.style.height = size.height + 'px';
});

function hookupResponseAnalysisEls () {

    const statsBufferDurationSecondsEl = document.querySelector('#stats-buffer-duration-seconds') as HTMLInputElement;
    const minLatencySecondsEl = document.querySelector('#min-latency-seconds') as HTMLInputElement;
    const maxLatencySecondsEl = document.querySelector('#max-latency-seconds') as HTMLInputElement;
    for (const el of [statsBufferDurationSecondsEl, minLatencySecondsEl, maxLatencySecondsEl]) {

        el.onchange = () => {
            const params: ResponseAnalyserParams = {
                statsBufferDurationSeconds: Number.parseInt(statsBufferDurationSecondsEl.value),
                lpFilterCutoffHz: 1,
                minLatencySeconds: Number.parseInt(minLatencySecondsEl.value),
                maxLatencySeconds: Number.parseInt(maxLatencySecondsEl.value),
            };
            edaAnalyzer.responseAnalyser.Params = params;
        }
    }
}
hookupResponseAnalysisEls();

const scopeMarkerEditorEls =  document.querySelectorAll('scope-marker-editor-element');

const onScopeMarkerEditorElsChanged =  () => {
    Marker.ColorMap = {};

    for (const el of scopeMarkerEditorEls) {
        const label = el.getAttribute('label') as string;
        const color = el.getAttribute('color') as string;
        Marker.ColorMap[label] = color;
    }
    // Update all markers in case color has changed
    for (const marker of scopeSCR.Markers)
        marker.emit('label-changed', marker.label);
};

onScopeMarkerEditorElsChanged();

for (const el of scopeMarkerEditorEls)
    el.addEventListener('change', onScopeMarkerEditorElsChanged);


window.addEventListener('keyup', (evt: KeyboardEvent) => {
    const code = evt.code;
    if (scopeSCR.Connection) {
        let label = '';
        if (code === 'Space')
            label = 'Trigger';
        // else if (code.startsWith('Key'))
        //     label = evt.code[3];
        else if (code.startsWith('Digit'))
            label = code[5];
        else if (code.startsWith('Numpad'))
            label = code[6];

        if (label !== '') {
            const t = scopeSCR.Connection.CurrentTimeSecs;
            const v = scopeSCR.Connection.ValueAtTime(t);
            const marker = new Marker(t, v, label);

            // Don't add a marker if space bar trigger,  let the analyser do it
            if (label === 'Trigger')
                edaAnalyzer.responseAnalyser.Trigger();
            else
                scopeEl_SCR.Scope.AddMarker(marker);
        }
    }
});

enum DeviceId {
    MINDLIFE_HID_EDA,
    MINDLIFE_BT_PPG_EDA
}




window.setInterval(() => {
    (async () => {
        const settings = await GetSettings();
        const statuses = await get_devices_status();

        const eda_device_status = statuses[DeviceId.MINDLIFE_HID_EDA];
        const ppg_eda_device_status = statuses[DeviceId.MINDLIFE_BT_PPG_EDA];

        statusIndicatorUSBDevice.innerHTML = eda_device_status.message;
        statusIndicatorSerialPortDevice.innerHTML = ppg_eda_device_status.message;

        if (eda_device_status.code === DeviceConnectionStatusCode.DISCONNECTED) {
            await open_device(1240, 61281)
        }
        if (ppg_eda_device_status.code === DeviceConnectionStatusCode.DISCONNECTED) {
            await open_device(settings.serialport);
        }

    } )();

}, 2000);