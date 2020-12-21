import {Device} from "node-hid";

export interface HidDevice  {
    "vendorId": number,
    "productId": number,
    "path": string,
    "serialNumber": string,
    "manufacturer": string,
    "product": string,
    "release": number,
    "interface": number,
    "usagePage": number,
    "usage": number
};

export enum HidDeviceConnectionStatusCode {
    DISCONNECTED,
    CONNECTED,
}
export interface HidDeviceStatus {
    code: HidDeviceConnectionStatusCode,
    message: string;
    device?: Device;
    websocket?: string;
}