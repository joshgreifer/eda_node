export function string2Uint8Array( s: string): Uint8Array {
    const len = s.length;
    const a = new Uint8Array(len);
    for (let i = 0; i < len; ++i)
        a[i] = s.charCodeAt(i) & 0xff;
    return a;
}

export function hexStringToArray(key:string): number[] {
    const a: number[] = [];
    for (let i = 0; i <  key.length; i+=2)
        a.push(parseInt(key.substr(i,2), 16));
    return a;
}

export function arrayToHexString(a: number[]) : string {
    let key = "";
    for (let i = 0; i <  a.length; ++i) {
        const s = a[i].toString(16);
        if (s.length === 1)
            key += '0';
        key += s;
    }
    return key;
}

export function bufferToBase64(arrayBuffer: ArrayBufferLike) {
    return btoa(
        new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

}


// http://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
function base64ToBuffer(base64:string) :ArrayBufferLike {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++)        {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}


export function safeEval(js: string, scope: any = undefined) : any {
    const saved_scope = (<any>window).scope;
    (<any>window).scope = scope;
    let ret: any = undefined;
    try {
        ret =  Function(`"use strict"; try { return (typeof(${js}) !== 'undefined') ? (${js}) : '${js}'} catch(e) { return 'safeEval: ' + e.toString() }`)();
    } catch(e) {
        ret = 'safeEval: Invalid Javascript expression: ' + js;
    }
    (<any>window).scope = saved_scope;
    return ret;
}

