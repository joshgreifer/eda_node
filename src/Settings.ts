import {load_json} from "./Api";

export interface Settings
{
    serialport: string;
}


let settings: Settings | undefined = undefined;

export async function GetSettings(): Promise<Settings> {
    if (settings === undefined) {
        settings = await load_json("settings.json");
    }
    return settings as Settings;
}