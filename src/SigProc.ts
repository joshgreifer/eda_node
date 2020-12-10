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

            const ewma : SigProc.Ewma = new SigProc.Ewma(conn.Fs);


            const SCRConnection: DataConnection = new DataConnection(conn.Fs, 1, Float64Array);
            const SCLConnection: DataConnection = new DataConnection(conn.Fs, 1, Float64Array);

            conn.on('data', (data: any) => {
                let f1 = Float64Array.from(data);
                let f2 = Float64Array.from(data);
                for (let i = 0; i < f1.length; ++i) {
                    const v = ewma.process(f1[i]);
                    f1[i] = v;
                    f2[i] -= v;
                }
                SCLConnection.AddData(f1);
                SCRConnection.AddData(f2);

            });

            this.EDA = conn;
            this.SCL = SCLConnection;
            this.SCR = SCRConnection;

        }

    }
}