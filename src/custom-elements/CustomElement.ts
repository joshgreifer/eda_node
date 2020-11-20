
export class CustomElement extends HTMLElement {

    constructor() {
        super();
        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const el = <HTMLDivElement>document.createElement('div');
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue
        const my_height = 100;   // example of how to interpolate value in style
        const n_cols = 4;
        const n_rows = 4;

        el.innerText = this.hasAttribute('value') ? this.getAttribute('value') as string: '(value)';
        el.className = 'private-style1';
        // noinspection CssInvalidFunction,CssInvalidPropertyValue
        style.textContent = `
        .private-style1 {
            height: ${my_height + 20}px;
            background-image: linear-gradient(#529610, #2f5609);
            display: grid;
            margin: 10px;
        }
         
        .grid {
            background-image: linear-gradient(#529610, #2f5609);
            display: grid;
            row-gap: 0;
            column-gap: 0;
            gap: 0;
            grid-template-columns: repeat(${n_cols}, auto);
            grid-template-rows: repeat(${n_rows}, auto);
        }

`;
         shadow.append( style, el);


    }


}