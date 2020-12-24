export function string2Uint8Array( s: string): Uint8Array {
    const len = s.length;
    const a = new Uint8Array(len);
    for (let i = 0; i < len; ++i)
        a[i] = s.charCodeAt(i) & 0xff;
    return a;
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

