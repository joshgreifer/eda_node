import {Scope} from "../Scope";

export class ScopeElement extends HTMLElement {

    private scope_: Scope;

    public get Scope() : Scope { return this.scope_; }

    constructor() {
        super();
         const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const el = <HTMLDivElement>document.createElement('div');
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue
        el.className = 'private-style1';
        // noinspection CssInvalidFunction,CssInvalidPropertyValue
        style.textContent = `
        .private-style1 {
        height: 100%;
        width: 100%;
        /*padding: 0;*/
        /*margin :0;*/
        /*    top: 0;*/
        /*    bottom : 0;*/
        /*    left: 0;*/
        /*    right: 0;*/
            
        }
`;
        this.scope_ = new Scope(el);

        shadow.append( style, el);
        window.addEventListener('resize', (ev => { ev.preventDefault(); this.scope_.Resize()}));
        this.scope_.Resize();

    }


}