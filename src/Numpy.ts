const fs = require('fs');

export namespace Numpy {
    export declare type Data = Int8Array | Int16Array | Int32Array |
        Uint8Array | Uint16Array | Uint32Array |
        Float32Array | Float64Array | Uint8ClampedArray;

    function string2Uint8Array( s: string): Uint8Array {
        const len = s.length;
        const a = new Uint8Array(len);
        for (let i = 0; i < len; ++i)
            a[i] = s.charCodeAt(i) & 0xff;
        return a;
    }
    export function save(filename: string, data: Data, shape: number[]) {

        const dtypes : { [Key: string] : string } = {
            'Buffer' : 'B',
            'Int8Array' : 'b',
            'Uint8Array': 'B',
            'Int16Array' : 'i2',
            'Uint16Array': 'u2',
            'Int32Array': 'i4',
            'Uint32Array': 'u4',
            'Float32Array': 'f4',
            'Uint8ClampedArray': 'B1',
        }

        const dtype = dtypes[Object.getPrototypeOf(data).constructor.name];
        let shape_str = "(";
        for (const dim of shape)
            shape_str += dim + ", ";
        shape_str += ")";

        const header_len = 128;
        let header_str = `XNUMPYXXXX{'descr': '${dtype}', 'fortran_order': False, 'shape': ${shape_str}, }`;
        const header_str_length = header_str.length;

        header_str += ' '.repeat(header_len-header_str_length);

        const header = string2Uint8Array(header_str);
        header[0] = 0x93;
        header[6] = 1;
        header[7] = 0;
        header[8] = header_len - 10;
        header[9] = 0;

        const fd = fs.openSync(filename, "w");
        fs.writeSync(fd, header);
        fs.writeSync(fd, data);
        fs.closeSync(fd);

    }
}