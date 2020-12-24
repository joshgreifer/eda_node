// Core of this code comes from https://github.com/niklasvh/base64-arraybuffer/blob/master/lib/base64-arraybuffer.js




export declare type BufferData = Int8Array | Int16Array | Int32Array |
    Uint8Array | Uint16Array | Uint32Array |
    Float32Array | Float64Array | Uint8ClampedArray;

export declare type BufferDataConstructor = Int8ArrayConstructor | Int16ArrayConstructor | Int32ArrayConstructor |
    Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor |
    Float32ArrayConstructor | Float64ArrayConstructor | Uint8ClampedArrayConstructor;

export declare type BufferTypeName = 'Int8Array' | 'Int16Array' | 'Int32Array' |
    'Uint8Array' | 'Uint16Array' | 'Uint32Array' |
    'Float32Array' | 'Float64Array' | 'Uint8ClampedArray';

export interface BufferDataStringified {
    dtype: BufferTypeName

    base64: string;
}
class _BufferUtils {

    public encode: (bufferData: BufferData) => BufferDataStringified;
    public decode: (stringified: BufferDataStringified) => BufferData;


    constructor() {

        const factories : { [Key: string] : BufferDataConstructor } = {
            'Buffer' : Uint8Array,
            'Int8Array' : Int8Array,
            'Uint8Array': Uint8Array,
            'Int16Array' : Int16Array,
            'Uint16Array': Uint16Array,
            'Int32Array': Int32Array,
            'Uint32Array': Uint32Array,
            'Float32Array': Float32Array,
            'Float64Array': Float64Array,
            'Uint8ClampedArray': Uint8ClampedArray,
        }

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const lookup = new Uint8Array(256);


        for (let i = 0; i < chars.length; i++) {
            lookup[chars.charCodeAt(i)] = i;
        }

        this.encode = (bufferData: BufferData): BufferDataStringified => {
            const arrayBuffer = bufferData.buffer;
            const dtype =  Object.getPrototypeOf(bufferData).constructor.name;
            const len = bufferData.byteLength;

            let bytes = new Uint8Array(arrayBuffer),
                i,  base64 = "";

            for (i = 0; i < len; i+=3) {
                base64 += chars[bytes[i] >> 2];
                base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
                base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
                base64 += chars[bytes[i + 2] & 63];
            }

            if ((len % 3) === 2) {
                base64 = base64.substring(0, base64.length - 1) + "=";
            } else if (len % 3 === 1) {
                base64 = base64.substring(0, base64.length - 2) + "==";
            }

            return { dtype: dtype, base64: base64 };
        }

        this.decode = (stringified: BufferDataStringified): BufferData => {

            const base64 = stringified.base64;
            let bufferLength = base64.length * 0.75,
                len = base64.length, i, p = 0,
                encoded1, encoded2, encoded3, encoded4;

            if (base64[base64.length - 1] === "=") {
                bufferLength--;
                if (base64[base64.length - 2] === "=") {
                    bufferLength--;
                }
            }

            let arraybuffer = new ArrayBuffer(bufferLength),
                bytes = new Uint8Array(arraybuffer);

            for (i = 0; i < len; i+=4) {
                encoded1 = lookup[base64.charCodeAt(i)];
                encoded2 = lookup[base64.charCodeAt(i+1)];
                encoded3 = lookup[base64.charCodeAt(i+2)];
                encoded4 = lookup[base64.charCodeAt(i+3)];

                bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
                bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
                bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
            }

            const factory = factories[stringified.dtype];

            return new factory(arraybuffer);
        }
    }

}

export let BufferUtils = new _BufferUtils();