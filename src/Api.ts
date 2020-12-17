import {BufferData, iDataConnection} from "./DataConnection";


export async function open_hid_device(vid: number, pid:number): Promise<any> {


    const api_response = await fetch(`/open/${vid}/${pid}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    } );
    return await api_response.json();
}

export async function get_server_status(): Promise<{ 'message': string, 'websocket': string, 'device': any }> {
    const api_response = await fetch(`/status`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    } );
    return await api_response.json();
}

export async function save_buffer(conn: iDataConnection, file_name: string) : Promise<any> {

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