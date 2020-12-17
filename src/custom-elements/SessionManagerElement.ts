import {BufferData, iDataConnection} from "../DataConnection";
import {iSessionDataSource, Marker, Scope} from "../Scope";
import {ScopeElement} from "./ScopeElement";
import {save_buffer} from "../Api";

class Session {
    private name_: string;

    private source_: iSessionDataSource;

    public get Name(): string { return this.name_; }

   async Save() {
        if (this.source_.Connection)
        await save_buffer(this.source_.Connection, this.name_);
    }

    Load() {}

    Start() {}
    Stop() {}
    Reset() {
        this.source_.Reset();
    }
    Restart() {}

    constructor(name: string, source: iSessionDataSource ) {
        this.source_ = source;
        this.name_ = name;

    }
}

export class SessionManagerElement extends HTMLElement {

    private session_: Session | null = null;

    private scope_element_: ScopeElement | null = null;
    private static generate_name(): string {
        return "New Session";
    }

    // Create a new session
    public NewSession(session_name: string) {
         const source_element_id = this.hasAttribute('data-source') ? this.getAttribute('data-source') as string : undefined;

        if (this.session_) {
            this.session_.Save();
            this.session_ = null;
        }

        if (source_element_id) {
            this.scope_element_ = document.querySelector(`#${source_element_id}`);
            if (this.scope_element_) {
                const scope = this.scope_element_.Scope;
                if (!scope.Connection)
                    scope.on('connection', (conn: iDataConnection) => {
                        this.session_ = new Session(session_name, scope);
                    });
                else {
                    this.session_ = new Session(session_name, scope);
                }
            }
        }

    }

    constructor() {
        super();


        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const el = <HTMLDivElement>document.createElement('div');
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue
        const my_height = 100;   // example of how to interpolate value in style
        const n_cols = 4;
        const n_rows = 4;


        el.innerHTML = `
            <p>Session:</p>
            <div class="section"><label for="session-name">Name</label><input id="session-name" type="text"></div>
            <div class="section"><label for="btn-session-start-stop">Recording</label><button id="btn-session-start-stop">Start</button></div>       
            <div class="section"><label for="btn-session-save">Save</label><button id="btn-session-save">Save</button></div>       
        `;
        el.className = 'private-style1';
        // noinspection CssInvalidFunction,CssInvalidPropertyValue
        style.textContent = `
        .private-style1 {
            background-image: linear-gradient(#529610, #2f5609);
        }
         
        
        label {
            display: inline-block;
            width: 100px;
        }
        .section {
            /*background-color: #151515;*/
            margin: 5px;
            border-bottom: 1px solid rgba(0,0,0,0.2);
        }

`;
        shadow.append( style, el);

        // Hook up element listeners
        const btn_save_el = el.querySelector('#btn-session-save') as HTMLButtonElement;
        btn_save_el.addEventListener('click', async () => {
            if (this.session_)
                await this.session_.Save();
        });

        const session_name_el = el.querySelector('#session-name') as HTMLInputElement;
        session_name_el.value = SessionManagerElement.generate_name();
        const session_name = session_name_el.value;
        this.NewSession(session_name);

    }


}