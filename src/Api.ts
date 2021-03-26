import {BufferData, iDataConnection} from "./DataConnection";
import {DeviceStatus} from "./DeviceStatus";


export async function open_hid_device(vid: number | string, pid?:number): Promise<DeviceStatus> {

    if (pid === undefined)
        pid = 0;
    const api_response = await fetch(`/open/hid/${vid}/${pid}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    } );
    return await api_response.json();
}

export async function open_serial_device(path: string): Promise<DeviceStatus> {


    path = path.replace('/dev/', '');
    // Express treats path seps in parameters as url paths
    // Remove the /dev/ here and add it back in the server api method
    const api_response = await fetch(`/open/dev/${path}/`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    } );
    return await api_response.json();
}
export async function get_devices_status(): Promise<DeviceStatus []> {
    const api_response = await fetch(`/status`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    } );
    const statuses: DeviceStatus[] = await api_response.json();
    return statuses;
}

export async function save_numpy(conn: iDataConnection, file_name: string) : Promise<any> {

    const data = conn.DataRaw();
    const dtype = Object.getPrototypeOf(data).constructor.name;
    const api_response = await fetch(`/data/${conn.NumChannels}/${dtype}/${file_name}`, {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/octet-stream'
        },
        body: data
    } );
    return await api_response.json();

}
export async function load_json(file_name: string) : Promise<any>
{
    const api_response = await fetch(`/load/${file_name}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    } );
   const response = await api_response.json();
   return response.data;

}

export async function save_json(obj: any, file_name: string) : Promise<any> {

    const api_response = await fetch(`/save/${file_name}`, {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(obj)
    } );
    return await api_response.json();
}