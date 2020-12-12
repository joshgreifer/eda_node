import {DataConnection, iDataConnection} from "./DataConnection";

export namespace SigProc {

    export interface Processor {
        process: (v: number) => number;
    }


// https://books.google.co.uk/books?id=Zle0_-zk1nsC&pg=PA797&lpg=PA797
// https://pandas.pydata.org/pandas-docs/version/0.17.0/generated/pandas.ewma.html
    export class Ewma implements Processor {

        public process: (v: number) => number;
        public Val: () => number;

        constructor(half_life_samples: number) {
            const alpha = 1.0 - Math.exp(Math.log(0.5) / (half_life_samples));
            let s = NaN;
            this.process = (v: number) => {
                if (isNaN(s))  // first time
                    s = v;
                else
                    s = v * alpha + s * (1.0 - alpha);

                return s;

            };
            this.Val = (): number => {
                return s;
            }
        }

    }

    // Analyse an EDA signal (see file: doc/Guide to electrodermal activity.pdf)
    export class EDAAnalyzer {

        // EDA from sensor
        public EDA: iDataConnection;

        // Skin Conductance level
        public SCL: iDataConnection;

        // Skin conductance response
        public SCR: iDataConnection;

        constructor(conn: iDataConnection) {

            const ewma : SigProc.Ewma = new SigProc.Ewma(5 * conn.Fs);


            const SCRConnection: DataConnection = new DataConnection(conn.Fs, 1, Float64Array);
            const SCLConnection: DataConnection = new DataConnection(conn.Fs, 2, Float64Array);

            conn.on('data', (data: any) => {
                let data_SCR = new Float64Array(data.length);
                let data_EDA_and_SCL = new Float64Array(2 * data.length);
                for (let i = 0; i < data.length; ++i) {
                    const v = data[i];
                    const v_ewma = ewma.process(v);
                    data_SCR[i] = v - v_ewma;
                    data_EDA_and_SCL[2 * i] = v;
                    data_EDA_and_SCL[2 * i + 1] = v_ewma;
                }
                SCRConnection.AddData(data_SCR);
                SCLConnection.AddData(data_EDA_and_SCL);


            });

            this.EDA = conn;
            this.SCL = SCLConnection;
            this.SCR = SCRConnection;

        }

    }
}