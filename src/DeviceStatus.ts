import {Device as HidDevice} from "node-hid";


// export interface HidDevice  {
//     "vendorId": number,
//     "productId": number,
//     "path": string,
//     "serialNumber": string,
//     "manufacturer": string,
//     "product": string,
//     "release": number,
//     "interface": number,
//     "usagePage": number,
//     "usage": number
// };

export enum DeviceConnectionStatusCode {
    DISCONNECTED,
    CONNECTED,
}
export interface DeviceStatus {
    code: DeviceConnectionStatusCode,
    message: string;
    device?: HidDevice | string;
    websocket_address?: string;
    websocket_port: number;
    wss?: any
}