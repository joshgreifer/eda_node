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
}