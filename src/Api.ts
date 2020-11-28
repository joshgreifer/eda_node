

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