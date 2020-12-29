import {DataConnection, iDataConnection} from "./DataConnection";
import EventEmitter from "eventemitter3";

export namespace SigProc {

    export interface Processor {
        process: (v: number) => number;
    }

    class IIRFilter  implements Processor {

        process: (v: number) => number;

        constructor(b: number[], a: number[]) {

            if (b.length != a.length)
                throw "IIR Filter: numerator (b) and denominator (a) coefficient vectors differ in size.";
            if (a[0] == 0.0)
                throw "IIR Filter: first denominator (a) coefficient cannot be zero.";

            const w = new Array(b.length);
            for (let i = 0; i < w.length; ++i)  w[i] = 0;

            this.process = (v: number ): number => {
                let i: number;
                let y:number = 0;

                const sz = w.length;

                w[0] = v;				// current input sample

                for ( i = 1; i < sz; ++i )	// input adder
                    w[0] -= a[i] * w[i];

                for ( i = 0; i < sz ; ++i )	// output adder
                    y += b[i] * w[i];

                // now i == sz
                for (--i; i != 0; --i )		// shift buf backwards
                    w[i] = w[i-1];

                return  y / a[0];		// current output sample
            };
        }

    }


    class LowPass6dBFilter extends IIRFilter
    {

        static  k(Fc: number, Fs: number): number
        {
            return 1.0 - Math.exp(-2.0 * Math.PI * Fc / Fs );
        }

        constructor(Fc: number, Fs: number) {
            super([LowPass6dBFilter.k(Fc, Fs) / 2.0, LowPass6dBFilter.k(Fc, Fs) / 2.0], [1.0, LowPass6dBFilter.k(Fc, Fs) - 1.0 ] );

        }

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

    export enum ResponsePhase {
        BaseLevel = "BaseLevel",
        Latency = "Triggered",
        Rising = "Rising",
        Peak = "Peak",
        Recovered = "Recovered"
    }
    class RunningStats implements Processor {

        Mean: number = 0;
        Max: number = 0;
        Min: number = 0;
        Var: number = 0;
        ZC: number = 0;  // zero crossings (as a fraction of buffer size , i,e, between 0 and 1)
        get StdDev(): number { return Math.sqrt(this.Var); }
        Energy: number = 0;
        get Power(): number { return this.Energy / this.Sz; }

        private idx_: number = 0;
        private buf_: Float32Array;
        private sum_: number = 0.0;
        // private sum_sqrs_: number  = 0.0; // Sum of squared values (for energy/power calc)
        private buffer_primed_: boolean = false;
        private recalc_counter_: number = 0;

        // recalculate running sum from scratch to prevent f.p. accuracy loss
        private static readonly recalc_sum_iters = 10000;

        public static readonly CALC_VAR_AND_ZERO_CROSSING = true;
        constructor(private Sz: number) {
            Sz = Math.floor(Sz);
            this.buf_ = new Float32Array(Sz);

        }


        process( v: number ) : number {
            const Sz = this.Sz;
            const buf_ = this.buf_;
            let idx_ = this.idx_;
            let sum_ = this.sum_;
            let sum_sqrs_ = this.Energy;

            const oldest_v = buf_[idx_];
            sum_ -= oldest_v;
            sum_sqrs_ -= oldest_v * oldest_v;
            buf_[idx_] = v;

            // update sum
            if (++this.recalc_counter_ >= RunningStats.recalc_sum_iters) {
                this.recalc_counter_ = 0;
                sum_ = sum_sqrs_ = 0.0;
                for (let i = 0; i < Sz; ++i) {
                    const v2 = buf_[i];
                    sum_ += v2;
                    sum_sqrs_ += v2 * v2;
                }
            } else {
                sum_ += v;
                sum_sqrs_ += v * v;
            }
            const  n = this.buffer_primed_ ? Sz : idx_+1;
            const mean = sum_ / n;

            let max = -Number.MAX_VALUE, min = Number.MAX_VALUE;
            let variance = 0.0;
            let zc = 0;
            if (RunningStats.CALC_VAR_AND_ZERO_CROSSING)
                for (let i = 0; i < n; ++i) {

                    const  vv = buf_[i];
                    // zero crossing
                    if (i > 0)
                        if ((vv > 0.0) != (buf_[i - 1] > 0.0))
                            ++zc;

                    const  diff_mean = vv - mean;
                    const  diff_mean_squared = diff_mean * diff_mean;
                    variance += diff_mean_squared;

                    // min, max
                    if (vv > max)
                        max = vv;
                    if (vv < min)
                        min  =vv;
                }
            // normalize var
            variance /= (n);

            // bump index
            if (++idx_ == Sz) {
                idx_ = 0;
                this.buffer_primed_ = true;
            }

            // Save local vars to state vars
            this.idx_ = idx_;
            this.sum_ = sum_;
            this.Energy = sum_sqrs_;

            this.Mean = mean;
            this.Max = max;
            this.Min = min;
            this.Var = variance;
            this.ZC = zc / Sz;

            return v;

        }
    }

    export class ResponseAnalyser extends EventEmitter implements Processor  {

        private baseLevel: number = 0;
        private baseLevelRange: number = 0;
        private stimulusReceived: boolean = false;

        public get Threshold() : number { return this.baseLevel + this.baseLevelRange / 2; }

        public Trigger(): void { this.stimulusReceived = true; }
        private current_phase: ResponsePhase = ResponsePhase.BaseLevel;
        private get currentPhase(): ResponsePhase { return  this.current_phase; }
        private set currentPhase(phase: ResponsePhase) {
            this.current_phase = phase;
            this.emit('response', phase);
        }
        private prevV: number = 0;
        private amplitude: number = 0;
        private counter: number = 0;
        private stimulusTimePoint: number = 0;
        private risingStartTimePoint = 0;
        private peakTimePoint = 0;
        private HalfRecoveryEndTimePoint = 0;

        private lpFilter = new LowPass6dBFilter(1, 100);
        private runningStats = new RunningStats(500);
        private maxLatency: number = 300;
        process(v: number): number {

            this.runningStats.process(v);
            // low pass filter first
            v = this.lpFilter.process(v);

            switch (this.currentPhase) {
                case ResponsePhase.BaseLevel:
                    if (this.stimulusReceived) {
                        this.stimulusReceived = false;
                        this.currentPhase = ResponsePhase.Latency;
                        this.stimulusTimePoint = this.counter;
                    } else {
                        this.baseLevel = this.runningStats.Mean;
                        this.baseLevelRange = this.runningStats.Max - this.runningStats.Min;
                    }
                    break;
                case ResponsePhase.Latency:
                    if (v > this.Threshold) {
                        this.currentPhase = ResponsePhase.Rising;
                        this.risingStartTimePoint = this.counter;
                    } else if (this.counter - this.stimulusTimePoint > this.maxLatency)
                        this.currentPhase = ResponsePhase.BaseLevel;
                    break;
                case ResponsePhase.Rising:
                    if (v < this.prevV) {
                        this.currentPhase = ResponsePhase.Peak;
                        this.amplitude = this.prevV - this.baseLevel;
                        this.peakTimePoint = this.counter;
                    }
                    break;
                case ResponsePhase.Peak:
                    if (v < this.baseLevel + this.amplitude / 2) {
                        this.currentPhase = ResponsePhase.Recovered;
                        this.HalfRecoveryEndTimePoint = this.counter;
                    }
                    break;
                case ResponsePhase.Recovered:
                    this.currentPhase = ResponsePhase.BaseLevel;
                    break;

            }

            ++this.counter;
            return this.prevV = v;

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

        public responseAnalyser: ResponseAnalyser = new ResponseAnalyser();

        constructor(conn: iDataConnection) {


            let ewma : SigProc.Ewma = new SigProc.Ewma(5 * conn.Fs);


            const SCRConnection: DataConnection = new DataConnection(conn.Fs, 3, Float64Array);
            const SCLConnection: DataConnection = new DataConnection(conn.Fs, 2, Float64Array);

            conn.on('reset', () => {
                ewma =  new SigProc.Ewma(5 * conn.Fs);
            });

            conn.on('data', (data: any) => {
                let data_SCR = new Float64Array(SCRConnection.NumChannels * data.length);
                let data_EDA_and_SCL = new Float64Array(SCLConnection.NumChannels * data.length);
                for (let i = 0; i < data.length; ++i) {
                    const v = data[i];
                    const v_ewma = ewma.process(v);

                    const scr = v - v_ewma;
                    const v_lowpass = this.responseAnalyser.process(scr);
                    data_SCR[2 * i] = scr;
                    data_SCR[2 * i + 1] =  v_lowpass;
                    data_SCR[2 * i + 2] =  this.responseAnalyser.Threshold;
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