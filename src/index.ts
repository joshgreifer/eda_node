import {AddAlgorithms} from "./ArrayPlus";
import {CustomElement} from "./custom-elements/CustomElement";
import {ConsoleElement} from "./custom-elements/ConsoleElement";
import {ScopeElement} from "./custom-elements/ScopeElement";
import {WebSocketDataConnectionElement} from "./custom-elements/WebSocketDataConnectionElement";
import {AutoYAxisAdjustBehaviour, DownSampleAlgorithm, RenderStyle, Scope} from "./Scope";
import {get_server_status, open_hid_device} from "./Api";


AddAlgorithms(Array.prototype);


customElements.define('custom-element', CustomElement);
customElements.define('console-element', ConsoleElement);
customElements.define('scope-element', ScopeElement);
customElements.define('websocket-element', WebSocketDataConnectionElement);

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


c.info('Connected scope to websocket.');

const connectButton = document.querySelector('#connect-button') as HTMLButtonElement;
const statusIndicator = document.querySelector('#status-indicator') as HTMLSpanElement;

connectButton.addEventListener('click', async () => {

    const response = await open_hid_device(1240, 61281);
    c.info(JSON.stringify(response, null, 1));

});

window.setInterval(() => {
    (async () => {
        const status = await get_server_status();
        statusIndicator.innerText = status.status;
    } )();

}, 2000);