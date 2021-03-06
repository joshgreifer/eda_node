/**
 * @file Scope.ts
 * @author Josh Greifer <joshgreifer@gmail.com>
 * @copyright © 2020 Josh Greifer
 * @licence
 * Copyright © 2020 Josh Greifer
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:

 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @summary A real-time audio signal and spectrogram display,  optimised for speed.
 *
 */

import * as NDArray from 'ndarray';
import * as GDIPlus from './GDIPlus';
import {Pen, TextVerticalAlign, TransformMatrix} from './GDIPlus';
import * as Clut from './Clut';

import {iDataConnection} from './DataConnection';
import EventEmitter from "eventemitter3";

// class StatsBuf {
//     private data_: number[];
//     private idx_: number  = 0;
//     Min: number = Number.MAX_VALUE;
//     Max: number = -Number.MAX_VALUE;
//
//     get Avg() { return this.sum_ / this.data_.length; }
//
//     private sum_ = 0;
//
//     constructor(sz: number) {
//         if (sz >= 1)
//             this.data_ = new Array<number>(Math.floor(sz));
//     }
//
//     public Put(v: number) {
//         const SZ = this.data_.length;
//         const oldest_data =  this.data_[this.idx_] || 0;
//         this.sum_ += v - oldest_data;
//         // save new data in circular buffer, bump index
//         this.data_[this.idx_++] = v;
//         if (this.idx_ >= SZ) this.idx_ = 0;
//
//         // check if oldest value (which we're about to overwrite) is current min or max.
//         // If it is, rescan the buffer to recalculate min max
//         const do_rescan: boolean =  oldest_data === this.Min || oldest_data === this.Max;
//
//         if (do_rescan) {
//
//             this.Min = Number.MAX_VALUE;
//             this.Max = -Number.MAX_VALUE;
//             this.sum_ = 0;
//             for (let i = 0; i < SZ; ++i) {
//                 const vv = this.data_[i] || 0;
//                 this.sum_ +=  vv;
//                 if (vv < this.Min) this.Min = vv;
//                 else if (vv > this.Max) this.Max = vv;
//             }
//         } else {
//             if (v < this.Min) this.Min = v;
//             else if (v > this.Max) this.Max = v;
//
//         }
//
//
//
//
//     }
//
// }

/*
* Safari and Edge polyfill for createImageBitmap
* https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap
*
* Support source image types Blob and ImageData.
*
* From: https://dev.to/nektro/createimagebitmap-polyfill-for-safari-and-edge-228
* Updated by Yoan Tournade <yoan@ytotech.com>
// https://gist.github.com/MonsieurV/fb640c29084c171b4444184858a91bc7
* Converted to TypeScript , wrapped in a function, simplified  and optimised by Josh Greifer <joshgreifer@gmail.com>
*  The canvas cache is only useful if the majority of calls to this function use only a small number of bitmap dimensions
*
*/
const createImageBitmapPolyFill = (canvas: HTMLCanvasElement | undefined = undefined) => {

// eslint-disable-next-line no-constant-condition
    if (true)
        // if ((!('createImageBitmap' in window)))
        if (canvas === undefined)
            canvas = document.createElement('canvas');

    // @ts-ignore
    window.createImageBitmap = async (data: ImageData) => {

        return new Promise<CanvasImageSource>((resolve, reject) => {
            try {
                canvas = canvas as HTMLCanvasElement;
                const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
                ctx.imageSmoothingEnabled = false;
                canvas.width = data.width;
                canvas.height = data.height;
                ctx.putImageData(data,0,0);
                resolve(canvas);
            } catch (e) {
                reject(e);
            }
        });
    };
};

createImageBitmapPolyFill();



export enum RenderStyle {
    None,
    Line,
    Bar,
    Segment,
    Step,
}

export enum DownSampleAlgorithm {
    None,
    Decimate,
    Avg,
    MinMax,
}
export enum SignalFollowBehaviour {
    None,
    Scroll,
    Paginate,
    Fit,
}

export enum AutoYAxisAdjustBehaviour {
    None,
    EnsureAllSamplesVisible,
    EnsureMostRecentSampleVisible
}

export class Channel {
    Color? = '#446666';
    Name? = '(unnamed signal)';
    Visible?  = false;
    RenderStyle: RenderStyle = RenderStyle.Line;
    DownSampleAlgorithm? : DownSampleAlgorithm = DownSampleAlgorithm.Decimate;
}
/*
The Scope object depends on a
 */
export class Scope extends EventEmitter {


    private onScreenCanvas!: HTMLCanvasElement;

    private onScreenContext!: CanvasRenderingContext2D;

    private offScreenContexts: CanvasRenderingContext2D[] = [];
    private currentOffScreenContextsIndex = 0; // toggles between 1 and 2 on each Render

    public clut: Clut.Clut;

    // private gc_OnScreen: GDIPlus.GCH;
    // private gc_OffScreen: GDIPlus.GCH;
    // private gc_graphData1: GDIPlus.GCH;
    // private gc_graphData2: GDIPlus.GCH;
    // private gc_graphDataNew: GDIPlus.GCH;
    // private gc_graphDataOld: GDIPlus.GCH;

    private canvases: HTMLCanvasElement[] = [];

    private MIN_GRID_X = 10;
    private MIN_GRID_Y = 10;
    private gridMinorX = 1;
    private gridMajorX = 10;
    private gridMinorY = 100;
    private gridMajorY = 1000;

    public AxisFont = '12px Arial';
    public AxisFontHeight = 12;
    private ButtonFont = '16px Arial';


    public BackColor = 'black';
    public ForeColor = 'white';
    public AxesBackColor = '#1a2630';
    public BorderColor = 'red';


    public IS_SPECTROGRAM: boolean = false;


    public get GridMinorColor() : string | CanvasGradient { return this.penGridMinor.Color; }
    public set GridMinorColor(color: string | CanvasGradient ) { this.penGridMinor.Color = color; }
    public get GridMajorColor() : string | CanvasGradient  { return this.penGridMajor.Color; }
    public set GridMajorColor(color: string | CanvasGradient ) { this.penGridMajor.Color = color; }

    public GridMinorTextColor = '#88c5ff';
    public GridMajorTextColor = '#1c95ff';

    public ButtonBackColor = this.AxesBackColor;
    public ButtonForeColor = '#5ff800';
    public ButtonDisabledColor = '#6d7a65';
    // Y values are multiplied by this
    public SampleUnitMultiplier = 1.0; //32767.0;

    private fs_ = 16000.0;
    private sampleDuration = 1 / 16000.0;

    private dragPoint : GDIPlus.Point = { x: 0, y: 0 };
    private dragStartPoint : GDIPlus.Point = { x: 0, y: 0 };

    public get Fs(): number { return this.fs_; }
    public set Fs(fs: number) { this.fs_ = fs; this.sampleDuration = 1 / fs; }

    private _nchans: number = 0;

    public get NumChannels(): number { return this.ChannelInfo ? this.ChannelInfo.length : this._nchans; }
    public set NumChannels( n: number ) { if (this.ChannelInfo) throw "Can't set number of channels on a scope when its ChannelInfo array is set."; this._nchans = n; }


    public AddSlave(slave: Scope) : void {
        this.slaves.push(slave);
        slave.master = this;
        //       slave.conn_ = this.conn_;
        slave.SignalFollowBehaviour = this.SignalFollowBehaviour;
        slave.DataWidth = this.DataWidth;
    }

    private slaves: Scope[] = new Array<Scope>();

    master: Scope | null;

    public ChannelInfo?: Channel[];

    _lineWidth = 0.1;

    penGridMajor: GDIPlus.Pen;
    penGridMinor: GDIPlus.Pen;
    penBorder: GDIPlus.Pen;

    brushGridMajor: GDIPlus.SolidBrush;
    brushGridMinor: GDIPlus.SolidBrush;

    // the boundary rectangle of the current data window, in data coordinates
    private dBounds: GDIPlus.Rect;
    // the the boundary rectangle of the previously rendered data window, in data coordinates
    private dBoundsOld: GDIPlus.Rect;
    // The data time when data was last rendered.  dataTime - dataTimeOld  == data needed to draw in RenderData
    private dataTimeOld: number = -1;
    // the boundary rectangle of the graph area, in pixels
    private gBounds!: GDIPlus.Rect;

    // The boundary rectangle of the X and Y axes.
    // They're both fixed width, and always at the left/bottom respectively.
    // But they can be hidden
    private timeAxisBounds!: GDIPlus.Rect;
    private yAxisBounds!: GDIPlus.Rect;
    public TimeAxisVisible = true;
    public YAxisVisible = true;
    private ButtonsBounds!: GDIPlus.Rect;

    public SignalFollowBehaviour: SignalFollowBehaviour = SignalFollowBehaviour.Paginate;
    public AutoYAxisAdjustBehaviour : AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;

    public AutoYAxisAdjustChannel = -1; // no channel

    private _autoYTrack = true;
    // max, min visible values
    // Used for autoYScale
    private maxY!: number;
    private minY!: number;

    private _YAxisFormat = '0.00';

    //private subpixel_stats: StatsBuf;

    private captureArea: Area = Area.None;

    private dataTime: number = 0;

    //   public get Url(): string { return this.conn_.Url; }
    //   public set Url(url: string) { this.conn_.Url = url; }

    public onData(): void {
        if (this.conn_ && !this.master) // Don't update if this is slaved
            this.dataTime = this.conn_.CurrentTimeSecs;
        for (const slave of this.slaves)
            slave.dataTime = this.dataTime;

        switch (this.SignalFollowBehaviour) {
            case SignalFollowBehaviour.None:
            default:
                break;
            case SignalFollowBehaviour.Scroll:
                this.DataX = this.dataTime - this.dBounds.width;
                break;
            case SignalFollowBehaviour.Paginate:
                if (this.dataTime > this.dBounds.right)
                    this.DataX = this.dBounds.right;
        }

    }
    public get Connection(): iDataConnection | undefined { return this.conn_; }

    public set Connection(conn: iDataConnection | undefined) {
        const this_ = this;

        const lambda = () => {
            this_.onData()
        };

        // if (conn !== this.conn_ && this.conn_ !== undefined)
        //     this.conn_.off('data', lambda);

        if (conn !== undefined)
            conn.on('data', lambda);

        this.conn_ = conn;

    }
    private conn_?: iDataConnection;


    constructor(container: HTMLElement, private gch = GDIPlus.GCH) {
        super();

        this.clut = Clut.Presets.GRAYSCALE;


        for (let i = 0; i < 3; ++i) {
            const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.createElement('canvas');
            this.canvases.push(canvas);

        }

        // first canvas is onscreen
        this.onScreenCanvas = this.canvases[0];

        // Make sure container is empty
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(this.onScreenCanvas);

        this.onScreenContext = this.onScreenCanvas.getContext('2d') as CanvasRenderingContext2D;
//        this.onScreenContext.imageSmoothingEnabled = false;

        // offscreen buffers for graph data
        this.offScreenContexts.push(this.canvases[1].getContext('2d') as CanvasRenderingContext2D);
        this.offScreenContexts.push(this.canvases[2].getContext('2d') as CanvasRenderingContext2D);
        //       this.offScreenContexts[0].imageSmoothingEnabled = false;
        //       this.offScreenContexts[1].imageSmoothingEnabled = false;


        this.currentOffScreenContextsIndex = 0;

        this.master = null;

        this.penGridMajor = new GDIPlus.Pen({ Color: 'rgba(25,89,250,0.57)'});
        this.penGridMinor = new GDIPlus.Pen({ Color: 'rgba(68,118,251,0.5)'});
        this.penBorder = new GDIPlus.Pen({ Color: 'Gray'});

        /*
         * Can't set dash style on gridlines, because dashes scale to data coordinates!
       */
        this.penGridMinor.DashPattern = [1.0, 3.0];


        this.brushGridMajor = { Color: 'Black'};
        this.brushGridMinor =  { Color: 'LightGray'};

        this.penGridMajor.Width = 1.0;
        this.penGridMinor.Width = 1.0;
        this.penBorder.Width = 1.0;


        this.dBounds = new GDIPlus.Rect(0.0,-1.0, 10.0, 2.0);
        this.dBoundsOld = new GDIPlus.Rect(this.dBounds.x,this.dBounds.y, this.dBounds.width, this.dBounds.height);


        this.captureArea = Area.None;

        const getCoords = (e: TouchEvent | MouseEvent): number[] => {
            const r  = this.onScreenCanvas.getBoundingClientRect();
            return ("touches" in e) ?
                    [e.touches[0].clientX - r.left, e.touches[0].clientY - r.top] :
                    [e.clientX - r.left, e.clientY - r.top]
        }

        // Set mouse handlers
        this.onScreenCanvas.ontouchstart =  this.onScreenCanvas.onmousedown =  (e: TouchEvent | MouseEvent) => {
            //           debugLog("voice-feature-detector","mousedown" );
            e.preventDefault();

            const [x, y]  = getCoords(e);

            this.captureArea = this.GetArea(x, y);
            this.dragPoint.x = this.dragStartPoint.x = x - this.gBounds.x;
            this.dragPoint.y = this.dragStartPoint.y = y;

        };
// https://stackoverflow.com/questions/17613710/mouse-events-to-touch-event-for-ipad-compatibility
        this.onScreenCanvas.ontouchmove =  this.onScreenCanvas.onmousemove =  (e: TouchEvent | MouseEvent) => {
            e.preventDefault();
//            debugLog("voice-feature-detector","mousemove" );
            const [x, y]  = getCoords(e);
            switch(this.captureArea)  {
                case Area.Graph: this.graph_Zoom(x-this.gBounds.x, y); break;
                case Area.YAxis: this.yAxis_Scroll(y); break;
                case Area.TimeAxis: this.timeAxis_Scroll(x-this.gBounds.x); break;
                case Area.None:
                default:
                    switch (this.GetArea(x, y)) {
                        case Area.TimeAxis: this.onScreenCanvas.style.cursor = 'ew-resize'; break;
                        case Area.YAxis: this.onScreenCanvas.style.cursor = 'ns-resize'; break;
                        case Area.Graph: this.onScreenCanvas.style.cursor = 'zoom-in';break;
                        case Area.BottomLeft: this.onScreenCanvas.style.cursor = 'pointer';break;
                        default: this.onScreenCanvas.style.cursor = 'default';break;

                    }

            }

        };


        this.onScreenCanvas.ontouchend = this.onScreenCanvas.onmouseup = (e: TouchEvent | MouseEvent) => {
            e.preventDefault();
            if (this.captureArea == Area.BottomLeft) {
                switch (this.AutoYAxisAdjustBehaviour) {
                    case AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible:
                        this.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.None;
                        break;
                    case AutoYAxisAdjustBehaviour.None:
                    default:
                        this.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible;
                        break;
                }

            }
            this.captureArea = Area.None;
        };

        this.Resize();
        // start drawing


        window.requestAnimationFrame(this.RenderFrame);
    }

    public get DataX() {
        return this.dBounds.x;
    }

    public set DataX(value: number) {
        if (this.master != null) {
            this.master.DataX = value;
            return;
        }
        const current_time =  this.conn_ ? this.conn_.CurrentTimeSecs : 3600;

        if (value < 0)
            value = 0;

        else if (value > current_time)
            value = current_time;

        this.dBounds.x = value;
        for (let slave of this.slaves)
            slave.dBounds.x = value;

        this.timeAxis_Recalc();
        this.emit('TIME-AXIS', { left: value, width: this.dBounds.width });
    }

    public get DataY() {
        return this.dBounds.y;
    }

    public set DataY(value: number) {
        this.dBounds.y = value;
    }

    public get DataWidth() {
        return this.dBounds.width;
    }

    public set DataWidth(value: number) {
        if (this.master !== null) {
            this.master.DataWidth = value;
            return;
        }
        this.dBounds.width = value;
        //this.subpixel_stats = new StatsBuf(this.samples_per_pixel());
        for (let slave of this.slaves)
            slave.dBounds.width = value;
        this.timeAxis_Recalc();
        this.emit('TIME-AXIS', { left: this.dBounds.x, width: value });
    }

    public get DataHeight() {
        return this.dBounds.height;
    }

    public set DataHeight(value: number) {
        this.dBounds.height = value;
        this.yAxis_Recalc();
    }

    public Reset(): void {
        this.DataX = 0;
        if (this.conn_)
            this.conn_.Reset();
    }

    public Resize(): void {
        const  Y_AXIS_WIDTH = 48;
        const  X_AXIS_HEIGHT = 32;

        const W = (this.onScreenCanvas.parentElement as HTMLDivElement).clientWidth;
        const H = (this.onScreenCanvas.parentElement as HTMLDivElement).clientHeight;
        // const r = this.onScreenCanvas.parentElement!.getBoundingClientRect();
        // const W = r.width;
        // const H = r.height;
        const y_axis_width = this.YAxisVisible ? Y_AXIS_WIDTH : 0;
        const x_axis_height = this.TimeAxisVisible ? X_AXIS_HEIGHT : 0;

        for (let canvas of this.canvases) {
            canvas.width = W;
            canvas.height = H;
        }

        this.yAxisBounds = new GDIPlus.Rect(0, 0, y_axis_width, H - x_axis_height);
        this.timeAxisBounds = new GDIPlus.Rect(y_axis_width, H - x_axis_height, W - y_axis_width, x_axis_height);
        this.ButtonsBounds = new GDIPlus.Rect(0, H - x_axis_height, y_axis_width, x_axis_height);

        this.gBounds = new GDIPlus.Rect(y_axis_width, 0, W-y_axis_width, H - x_axis_height);

        this.dataTimeOld = -1;  // Force dirty

    }

    RenderFrame = async () =>  {


        const dataTime = this.dataTime;
        if (this.dataTimeOld !== dataTime || !this.dBoundsOld.Equals(this.dBounds)) {
            const ctx = this.onScreenContext;
            const ctx_off_prev = this.offScreenContexts[this.currentOffScreenContextsIndex];
            // swap buffers
            if (++this.currentOffScreenContextsIndex >= 1)
                this.currentOffScreenContextsIndex = 0;
            const ctx_off_curr = this.offScreenContexts[this.currentOffScreenContextsIndex];

            if (this.TimeAxisVisible || this.YAxisVisible) {

                GDIPlus.GCH.FillRectangleCoords(ctx, {Color: this.AxesBackColor}, 0, this.yAxisBounds.height, this.timeAxisBounds.x, ctx.canvas.height);

            }

            if (this.TimeAxisVisible)
                this.RenderTimeAxis(ctx);
            this.RenderYAxis(ctx);

            this.RenderButtons(ctx);

            // Let's assume we need to render everything
            let dirtyRect: GDIPlus.Rect = this.dBounds.Clone();


            if (dataTime < dirtyRect.right) {//  we haven't received a whole screenful of data yet
                dirtyRect.right = dataTime;  // shrink dirty rect, don't need to draw to right of data
            }
            // render any overlapped region from onscreen to offscreen buffer

            if (dirtyRect.width > 0 || dataTime === 0) {


                // Background

                const new_data_overlap_pixels =  this.pixels2duration(2);

                // eslint-disable-next-line no-constant-condition
                // if (false) {
                if (this.dBoundsOld.Equals(this.dBounds)) {
                    this.BlitGraph(ctx_off_prev, ctx_off_curr);
                    await this.RenderGraph(ctx_off_curr, this.dataTimeOld - new_data_overlap_pixels, dataTime - this.dataTimeOld + new_data_overlap_pixels);
                } else {
                    // this.dBoundsOld.AssignFrom(this.dBounds);
                    this.RenderGraphBackground(ctx_off_curr);
                    await this.RenderGraph(ctx_off_curr, dirtyRect.x, dirtyRect.width);
                }
                // Ok, we've rendered current data bounds to offscreen, blit to main context and update offscreen data rect
                this.BlitGraph(ctx_off_curr, ctx);

                this.dataTimeOld = dataTime;

                // grid
                this.RenderGraphGrid(ctx);

//                this.BlitAll(ctx, ctx_on);



            } else {
                //debugLog("scope", dirtyRect.width, this.dataTime);
            }


        }
        window.requestAnimationFrame(this.RenderFrame);
        //       window.setTimeout(this.RenderFrame, 250);

    }

    // copy one render buffer to another offset by x and y in data coordinates

    private BlitGraph(src_ctx:  CanvasRenderingContext2D, dest_ctx:  CanvasRenderingContext2D) {

        if (this.gBounds.width > 0)
            try {
                const img = src_ctx.getImageData(this.gBounds.x, this.gBounds.y,this.gBounds.width,this.gBounds.height);
                dest_ctx.putImageData(img, this.gBounds.x, this.gBounds.y);
            } catch (ex) {
                console.log(ex);
            }

    }

    private BlitAll(src_ctx:  CanvasRenderingContext2D, dest_ctx:  CanvasRenderingContext2D) {

        const img = src_ctx.getImageData(0, 0, this.onScreenCanvas.width, this.onScreenCanvas.height);
//        dest_ctx.putImageData(img, 0, 0);
        dest_ctx.putImageData(img, 0, 0);
    }

    private RenderButtons(ctx: CanvasRenderingContext2D): void {
        ctx.font = this.ButtonFont;
        GDIPlus.GCH.FillRectangle(ctx, { Color: this.ButtonBackColor} , this.ButtonsBounds);
        const align: GDIPlus.TextAlign = { H:GDIPlus.TextHorizontalAlign.Center, V:GDIPlus.TextVerticalAlign.Middle};
        const textColor = (this.AutoYAxisAdjustBehaviour === AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible) ? this.ButtonForeColor : this.ButtonDisabledColor;
        GDIPlus.GCH.DrawString(ctx,"↕" , textColor, this.ButtonsBounds.x + this.ButtonsBounds.width/2 , this.ButtonsBounds.y + this.ButtonsBounds.height/2, align);
    }

    private RenderTimeAxis(ctx: CanvasRenderingContext2D): void  {

        const start_offset_time = this.conn_ ? this.conn_.StartTimeSecs : 0;

        ctx.save();
        ctx.font = this.AxisFont;
        GDIPlus.GCH.setClip(ctx, this.timeAxisBounds);

        GDIPlus.GCH.FillRectangle(ctx, { Color: this.AxesBackColor} , this.timeAxisBounds);
        GDIPlus.GCH.SetOrigin(ctx, this.timeAxisBounds.x, this.timeAxisBounds.y);

        // find first grid minor point
        const firstGridMinorX = this.gridMinorX * Math.floor(this.dBounds.x / this.gridMinorX);

        const add_numbers_to_grid_minor: boolean = (25 < this.duration2pixels(this.gridMinorX));

        for (let x = firstGridMinorX; x < this.dBounds.x + this.dBounds.width; x += this.gridMinorX) {
            let gx = this.time2pixels(x);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMinor, gx, 0, gx, 3);
            if (add_numbers_to_grid_minor) {
                const align: GDIPlus.TextAlign = { H:GDIPlus.TextHorizontalAlign.Center, V:GDIPlus.TextVerticalAlign.Top};
                GDIPlus.GCH.DrawString(ctx, (start_offset_time + x).toFixed(2), this.GridMajorTextColor, gx+1, 4, align);
            }

        }

        // find first grid major point
        const firstGridMajorX = this.gridMajorX * Math.floor(this.dBounds.x / this.gridMajorX);

        for (let x = firstGridMajorX; x < this.dBounds.x + this.dBounds.width; x += this.gridMajorX) {
            let gx = this.time2pixels(x);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMajor, gx, 0, gx, 4);
            const align: GDIPlus.TextAlign = { H:GDIPlus.TextHorizontalAlign.Center, V:GDIPlus.TextVerticalAlign.Top};
            GDIPlus.GCH.DrawString(ctx, (start_offset_time + x).toFixed(1), this.GridMajorTextColor, gx+1, 4, align);


        }

        ctx.restore();
        //g.ResetClip();
        // g.DrawRectangle(this.penBorder, this.timeAxisBounds);
    }

    private RenderYAxis(ctx: CanvasRenderingContext2D): void  {
        ctx.save();
        ctx.font = this.AxisFont;
        GDIPlus.GCH.setClip(ctx, this.yAxisBounds);

        GDIPlus.GCH.FillRectangle(ctx, { Color: this.AxesBackColor} , this.yAxisBounds);


//        this.yAxis_Recalc();


        // find first grid minor point
        const firstGridMinorY = this.gridMinorY * Math.floor(this.dBounds.y / this.gridMinorY);
        const add_numbers_to_grid_minor: boolean = (this.AxisFontHeight < this.d2gHeight(this.gridMinorY));

        for (let y = firstGridMinorY; y < this.dBounds.y + this.dBounds.height; y += this.gridMinorY) {
            let gy = this.d2gY(y);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMinor, this.yAxisBounds.width - 3, gy, this.yAxisBounds.width, gy);
            if (add_numbers_to_grid_minor) {
                const align: GDIPlus.TextAlign = { H:GDIPlus.TextHorizontalAlign.Right, V:GDIPlus.TextVerticalAlign.Middle};
                GDIPlus.GCH.DrawString(ctx, y.toFixed(0), this.GridMinorTextColor, this.yAxisBounds.width - 5, gy, align);
            }

        }

        // find first grid major point
        const firstGridMajorY = this.gridMajorY * Math.floor(this.dBounds.y / this.gridMajorY);

        for (let y = firstGridMajorY; y < this.dBounds.y + this.dBounds.height; y += this.gridMajorY) {
            let gy = this.d2gY(y);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMajor, this.yAxisBounds.width - 3, gy, this.yAxisBounds.width, gy);
            const align: GDIPlus.TextAlign = { H:GDIPlus.TextHorizontalAlign.Right, V:GDIPlus.TextVerticalAlign.Middle};
            GDIPlus.GCH.DrawString(ctx, y.toFixed(0), this.GridMajorTextColor, this.yAxisBounds.width - 5, gy, align);


        }

        ctx.restore();

        //g.ResetClip();
        //g.DrawRectangle(penBorder, yAxisBounds);
    }

    private RenderGraphBackground(ctx: CanvasRenderingContext2D) {

        GDIPlus.GCH.FillRectangle(ctx, { Color: this.BackColor }, this.gBounds);

    }

    private async RenderGraph(ctx: CanvasRenderingContext2D, start_time: number, duration: number) {

        if (this.conn_ && this.conn_.HasData)  {
            const YExtentChanged = await this.RenderData(ctx, start_time, duration);
            if (YExtentChanged) this.AdjustYAxis();

        } else { // no data

            GDIPlus.GCH.DrawString(ctx, "(No signal)", this.ForeColor, this.gBounds.x + this.gBounds.width / 2, this.gBounds.y + this.gBounds.height / 2, { H: GDIPlus.TextHorizontalAlign.Center, V: TextVerticalAlign.Middle });

        }
    }

    /*
    * Render the data with multiple calls to Graphics.DrawLine().
    * The number of DrawLine calls is ~ 3 X the width of the graph (in pixels).
    * If one pixel represents more than one data point (i.e. if the time axis resolution
    * is coarser than 1 sample), the data points are represented by a
    * vertical line of pixels, from the min to the max value in the range of points being rendered.
    *
    * If the time axis resolution is greater than one sample,  this function renders the data using
    * splines.
    *
    * return true if graph got clipped; it always sets maxY and minY to the y limits of the displayed signal
    */
    async RenderData(ctx: CanvasRenderingContext2D, start_time: number, duration: number): Promise<boolean> {

        //
        // data
        // flip data values horizontally, zero at bottom
        const time_and_sample_values_rect: GDIPlus.Rect = new GDIPlus.Rect(
            this.dBounds.x,
            this.SampleUnitMultiplier * (this.dBounds.y + this.dBounds.height),
            this.dBounds.width,
            -this.SampleUnitMultiplier * this.dBounds.height);
        // g.SetTransformRect(this.gBounds, time_and_sample_values_rect);
        /*
         *
         * X (Horizontal) units are now seconds.
         * Y (Vertical) units are now in sample values.
         * To convert X coordinates to sample buffer offsets, divide by this.samples_per_pixel.
         * To convert sample buffer offsets to X coordinates, multiply by this.samples_per_pixel.
         */


        const pixel_and_sample_values_rect: GDIPlus.Rect = new GDIPlus.Rect(
            0,
            this.SampleUnitMultiplier * (this.dBounds.y + this.dBounds.height),
            this.gBounds.width,
            -this.SampleUnitMultiplier * this.dBounds.height
        );
        // g.SetTransformRect(this.gBounds, pixel_and_sample_values_rect);
        /*
         *
         * X (Horizontal) units are now pixels.
         * Y (Vertical) units are now in sample values.
         * To convert X coordinates to sample buffer offsets, multiply by sampleRate.
         * To convert sample buffer offsets to X coordinates, divide by sampleRate.
         */




        ctx.save();

        // Set maxY and minY for autoscaling/autotrack
        let nMaxY = -Number.MAX_VALUE;
        let nMinY = Number.MAX_VALUE;
        // find the index into the sample buffer of the leftmost visible sample
        const first_idx = this.conn_ ? this.conn_.TimeToIndex(start_time) : 0;
        let num_frames_to_display = Math.floor(duration * this.fs_);
        let num_frames_available = this.conn_ ? this.conn_.NumFramesRead : 0;
        if (num_frames_to_display > num_frames_available) {
            num_frames_to_display = num_frames_available;
            duration = num_frames_to_display / this.fs_;
        }




        if (num_frames_to_display < 1) {
            ctx.restore();

            return Promise.resolve(false);
        }

        const SUBPIXELS_PER_PIXEL = 5;
        //      const stride_t = this.pixels2duration(1/SUBPIXELS_PER_PIXEL);

        const samples_per_pixel = this.samples_per_pixel();


        // get the windowed data from the connection
        const data:NDArray | null = this.conn_ ? this.conn_.Data(start_time, duration) : null;
        //       const dataraw = this.conn_.DataRaw(start_time, duration);

        if (data === null) {
            ctx.restore();
            return false;
        }
        let last_y = 0;
        /*
        Spectrogram:   Basically treat the data as a pixel array and blit it with scaling.
            We use a clut to map the data values to pixel color
            1.   The data value range should be between 0.0 and 1.0
            2.   Multiply each value by this.SampleUnitMultiplier
         */
        if (this.IS_SPECTROGRAM) {
            const sample_rate_and_sample_values_rect: GDIPlus.Rect = new GDIPlus.Rect(
                /* this.dBounds.x */ 0 * this.fs_,
                this.SampleUnitMultiplier * (this.dBounds.y + this.dBounds.height),
                this.dBounds.width * this.fs_,
                -this.SampleUnitMultiplier * this.dBounds.height
            );

            // work with horizontal pixel coords, vertical data coords
            // GDIPlus.GCH.SetTransformRect(ctx, this.gBounds, pixel_and_sample_values_rect);
            const data_as_image = new ImageData(this.NumChannels, num_frames_to_display);
            const data_pixels: Uint32Array = new Uint32Array(data_as_image.data.buffer);
            const nvals = num_frames_to_display * this.NumChannels;
            const start_val = first_idx;
            // TODO: If this is too slow,  move the following clut lookup to the engine,
            // TODO: which will require implementing CLUT there (see AFDetector for source)
            for (let i = 0; i < nvals; ++i) {

                const data_val =  data.data[i+start_val];
                // clamp
                // if (data_val < 0) data_val = 0; else if (data_val > 1.0) data_val = 1.0;
                data_pixels[i] = this.clut.rgba[Math.floor(data_val * this.clut.SZ)];
            }

            const img = await createImageBitmap(data_as_image /* , { imageOrientation: "flipY" } FlipY is done by xform matrix */ ).catch(reason => {
                // debugLog("scope", reason);
            });
            if (!img)
                return false;

            let xform: TransformMatrix = GDIPlus.GCH.GetWorldToGraphicTransform(this.gBounds, sample_rate_and_sample_values_rect);
            GDIPlus.GCH.ApplyTransform(ctx, xform);
            ctx.scale(1,-1);
            ctx.rotate(-Math.PI / 2);
            // note, after above transform, x and y are swapped, so the below line offsets the image horizontally!
            ctx.translate(0, (start_time - this.dBounds.x) * this.Fs );


            ctx.drawImage(img, 0, 0 /* img.width */);
            ctx.setTransform(1,0,0,1,0,0);
            ctx.restore();
            return false;


        }
        else { // Not spectrogram

            if (this.ChannelInfo)
                for (let chan = 0; chan < this.NumChannels ; ++chan) {


                    // if color is set to invisible, don't display channel
                    if (this.ChannelInfo[chan].Visible === false)
                        continue;

                    const scale_y_axis_to_this_channel: boolean = (chan === this.AutoYAxisAdjustChannel);

                    const render_style: RenderStyle = this.ChannelInfo[chan].RenderStyle;
                    const downsample_algorithm: DownSampleAlgorithm | undefined = this.ChannelInfo[chan].DownSampleAlgorithm;

                    const downSample: boolean = downsample_algorithm !== DownSampleAlgorithm.None && samples_per_pixel > SUBPIXELS_PER_PIXEL;
                    ctx.globalCompositeOperation = (render_style === RenderStyle.Segment) ? 'source-xor' : 'source-over';
                    const chan_data: NDArray = data.pick(null, chan);

                    let pixel_x: number = this.d2gX(start_time);
                    let last_rendered_idx = 0;
                    let last_rendered_t = start_time;
                    let t = last_rendered_t;
                    let y;

                    let pen: GDIPlus.Pen  = { Color: this.ChannelInfo[chan].Color || 'black', Width: 0.1 };

                    // for downsampling
                    let subpixel_min_y;
                    let subpixel_max_y;
                    let subpixel_sum_y;

                    //           ctx.lineWidth = stride_t * 1.1;
                    ctx.strokeStyle = pen.Color;
                    ctx.fillStyle = pen.Color;
                    ctx.lineWidth = pen.Width;
                    let segment_start_t: number = chan_data.get(0) !== 0 ? t : -1;
                    switch (render_style) {
                        case RenderStyle.Line:
                        case RenderStyle.Step:
                            if (downSample) {
                                // work with horizontal pixel coords, vertical data coords for downsampling
                                GDIPlus.GCH.SetTransformRect(ctx, this.gBounds, pixel_and_sample_values_rect);

                                subpixel_max_y = -Number.MAX_VALUE;
                                subpixel_min_y = Number.MAX_VALUE;
                                subpixel_sum_y = 0.0;


                                // collect sub-pixel points
                                ctx.beginPath();
                                ctx.moveTo(pixel_x, chan_data.get(0));
                                for (let idx = 0; idx < num_frames_to_display; ++idx) {
                                    y = chan_data.get(idx);
                                    // update maxY, minY (for auto-scale)
                                    if (scale_y_axis_to_this_channel) {
                                        if (this.AutoYAxisAdjustBehaviour === AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible) {
                                            if (y > nMaxY) nMaxY = y;
                                            else if (y < nMinY) nMinY = y;
                                        } else  //
                                            nMinY = nMaxY = y;
                                        if (idx == num_frames_to_display-1)
                                            last_y = y;
                                    }


                                    if (y > subpixel_max_y) subpixel_max_y = y;
                                    else if (y < subpixel_min_y) subpixel_min_y = y;
                                    subpixel_sum_y += y;

                                    // this.subpixel_stats.Put(y);

                                    if (idx - last_rendered_idx >= samples_per_pixel) {
                                        switch (downsample_algorithm) {
                                            case DownSampleAlgorithm.MinMax:
                                                ctx.lineTo(pixel_x, subpixel_min_y);
                                                ctx.lineTo(pixel_x, subpixel_max_y);
                                                ctx.lineTo(pixel_x+1, subpixel_max_y);
                                                break;
                                            case DownSampleAlgorithm.Avg:
                                                ctx.lineTo(pixel_x, subpixel_sum_y / samples_per_pixel);
                                                break;
                                            case DownSampleAlgorithm.Decimate:
                                            default:
                                                ctx.lineTo(pixel_x, y);
                                        }

                                        ++pixel_x;

                                        // reset subpixel min, max and sum
                                        subpixel_max_y = -Number.MAX_VALUE;
                                        subpixel_min_y = Number.MAX_VALUE;
                                        subpixel_sum_y = 0.0;


                                        last_rendered_idx = idx;

                                    }


                                }

                                ctx.setTransform(1, 0, 0, 1, this.gBounds.x, this.gBounds.y);
                                ctx.lineWidth  = 1.0;
                                ctx.lineJoin = 'miter';
                                ctx.stroke();




                            } else {
                                GDIPlus.GCH.SetTransformRect(ctx, this.gBounds, time_and_sample_values_rect);
                                ctx.beginPath();
                                let y_old = chan_data.get(0);
                                if (render_style === RenderStyle.Step)
                                    ctx.lineTo(t, y_old);
                                else
                                    ctx.moveTo(t, y_old);
                                const dt = this.sampleDuration;
                                for (let idx = 0; idx < num_frames_to_display; ++idx) {

                                    const y = chan_data.get(idx);
                                    if (render_style === RenderStyle.Step)
                                        ctx.lineTo(t, y);

                                    t += dt;
                                    // update maxY, minY
                                    if (scale_y_axis_to_this_channel) {
                                        if (this.AutoYAxisAdjustBehaviour === AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible) {
                                            if (y > nMaxY) nMaxY = y;
                                            else if (y < nMinY) nMinY = y;
                                        } else  //
                                            nMinY = nMaxY = y;
                                        if (idx == num_frames_to_display-1)
                                            last_y = y;

                                    }

// https://stackoverflow.com/questions/7054272/how-to-draw-smooth-curve-through-n-points-using-javascript-html5-canvas

                                    if (render_style === RenderStyle.Step)
                                        ctx.lineTo(t, y);
                                    else {
                                        ctx.quadraticCurveTo(t + dt / 4, y_old, t + dt / 2, (y_old + y) / 2);
                                        ctx.quadraticCurveTo(t + 3 * dt / 4, y, t + dt, y);
                                    }
                                    y_old = y;
                                    //


                                }
                                ctx.setTransform(1, 0, 0, 1, this.gBounds.x, this.gBounds.y);
                                ctx.lineWidth  = 1;
                                ctx.stroke();

                            }
                            break;
                        case RenderStyle.Segment:
                            GDIPlus.GCH.SetTransformRect(ctx, this.gBounds, time_and_sample_values_rect);

                            for (let idx = 1; idx < num_frames_to_display; ++idx) {
                                t += this.sampleDuration;
                                const next_sample_is_in_segment = chan_data.get(idx) !== 0;
                                if (segment_start_t >= 0) { // in segment
                                    if (!next_sample_is_in_segment) {
                                        // segment end, fill it
                                        ctx.fillRect(segment_start_t, time_and_sample_values_rect.y, t - segment_start_t, time_and_sample_values_rect.height);
                                        segment_start_t = -1;
                                    }
                                } else  { // not in segment
                                    if (next_sample_is_in_segment) { // new segment start
                                        segment_start_t = t;
                                    }
                                }


                            }
                            // close final segment if we're in one
                            if (segment_start_t >= 0) {
                                ctx.fillRect(segment_start_t, time_and_sample_values_rect.y, t - segment_start_t, time_and_sample_values_rect.height);
                            }

                            break;
                    }


                }

        }
        ctx.restore();

        if (this.AutoYAxisAdjustBehaviour === AutoYAxisAdjustBehaviour.EnsureMostRecentSampleVisible) {
            last_y /= this.SampleUnitMultiplier;
            if (last_y > this.maxY) {
                nMaxY = last_y;
                nMinY = last_y - (this.maxY - this.minY);
            } else if (last_y < this.minY) {
                nMinY = last_y;
                nMaxY = last_y + (this.maxY - this.minY);

            }
        } else {
            nMaxY /= this.SampleUnitMultiplier;
            nMinY /= this.SampleUnitMultiplier;
        }
        const YExtentChanged: boolean  = this.maxY != nMaxY || this.minY != nMinY;

        this.maxY = nMaxY;
        this.minY = nMinY;
        return YExtentChanged;  // true means Y extent has changed
    }

    pixels2duration(gx: number): number {
        return this.dBounds.width * gx / this.gBounds.width;
    }

    samples_per_pixel(): number {
        return this.dBounds.width  / this.gBounds.width * this.Fs;
    }

    time2pixels(dx: number): number {
        return this.d2gX(dx);
    }

    d2gX(dx: number): number {
        return Math.round( (this.gBounds.width * dx / this.dBounds.width) - (this.dBounds.x * this.gBounds.width / this.dBounds.width));
    }

    g2dY(gy: number): number {
        return this.dBounds.height * gy / this.gBounds.height;
    }

    d2gY(dy: number): number {
        return this.gBounds.height - (this.gBounds.height * (dy - this.dBounds.y) / this.dBounds.height);
    }

    d2gHeight(dHeight: number): number {
        return Math.round(dHeight / this.dBounds.height * this.gBounds.height);
    }

    d2gWidth(dWidth: number): number {
        return Math.round(dWidth / this.dBounds.width * this.gBounds.width);
    }

    duration2pixels(dWidth: number): number {
        return this.d2gWidth(dWidth);
    }

    private yAxis_Recalc(): void {
        // noinspection JSSuspiciousNameCombination
        const pow10: number = Math.floor(Math.log(Math.LN10));

        this.gridMajorY = Math.pow(10, pow10 - 1);
        while (this.d2gHeight(this.gridMajorY) > (this.gBounds.height)) {
            this.gridMajorY /= 10;

        }
        while (this.d2gHeight(this.gridMajorY) < (this.MIN_GRID_Y * 10)) {
            this.gridMajorY *= 10;

        }
        this.gridMinorY = this.gridMajorY / 10;
        if (this.d2gHeight(this.gridMinorY) < this.MIN_GRID_Y)
            this.gridMinorY *= 2;
    }

    private timeAxis_Recalc(): void {
        const pow10 = Math.floor(Math.log(this.dBounds.width) / Math.LN10);
        this.gridMajorX = Math.pow(10, pow10 - 1);
        if (this.gBounds.width > 0) {
            while (this.duration2pixels(this.gridMajorX) < this.MIN_GRID_X * 10) {
                this.gridMajorX *= 10;
            }
        }
        this.gridMinorX = this.gridMajorX / 10;
        if (this.gBounds.width > 0) {
            if (this.duration2pixels(this.gridMinorX) < this.MIN_GRID_X) {
                this.gridMinorX *= 2;
            }
        }
    }

    RenderGraphGrid(ctx: CanvasRenderingContext2D): void {

        const gRect: GDIPlus.Rect = this.gBounds;
        const dRect: GDIPlus.Rect = this.dBounds;

        ctx.save();
        GDIPlus.GCH.setClip(ctx, gRect);
        GDIPlus.GCH.SetOrigin(ctx, gRect.x, gRect.y);

        let firstGridX, firstGridY;
        let x, y;
        firstGridY = this.gridMinorY * Math.floor(dRect.y / this.gridMinorY);

        for (y = firstGridY; y < dRect.y + dRect.height; y += this.gridMinorY) {
            const gy = this.d2gY(y);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMinor, 0, gy, gRect.width, gy);
        }
// find first grid major point
        firstGridY = this.gridMajorY * Math.floor(dRect.y / this.gridMajorY);

        for (y = firstGridY; y < dRect.y + dRect.height; y += this.gridMajorY) {
            const gy = this.d2gY(y);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMajor, 0, gy, gRect.width, gy);
        }


        firstGridX = this.gridMinorX * Math.floor(dRect.x / this.gridMinorX);

        for (x = firstGridX; x < dRect.x + dRect.width; x += this.gridMinorX) {
            const gx = this.d2gX(x);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMinor, gx, 0, gx, gRect.height);
        }
        // find first grid major point
        firstGridX = this.gridMajorX * Math.floor(dRect.x / this.gridMajorX);

        for (x = firstGridX; x < dRect.x + dRect.width; x += this.gridMajorX) {
            const gx = this.d2gX(x);
            GDIPlus.GCH.DrawLine(ctx, this.penGridMajor, gx, 0, gx, gRect.height);
        }

        ctx.restore();


    }

    // Moved to App.ts
    // RenderConnectionLed(ctx: CanvasRenderingContext2D): void {
    //     let led_color = '#444444' // not connected
    //     const conn = this.conn_;
    //     if (conn.Sock) {
    //         led_color = conn.Sock.readyState === 3 ? '#444444' : // closed
    //             conn.Sock.readyState === 2 ? '#104700' : // closing
    //                 conn.Sock.readyState === 1 ? '#03ac00' : // open
    //                     conn.Sock.readyState === 0 ? '#c3c300' : // connecting
    //                         '#be0000'; // error/unknown
    //     }
    //         const led_radius =  8;
    //     Scope.drawLed(ctx, this.gBounds.right - led_radius - 2, this.gBounds.bottom - led_radius -2, led_radius, led_color);
    // }

    // return true if y scale needed to be adjusted
    // Adjust the YAxis to honour the scope_audio's AutoYAxisAdjustBehaviour
    private AdjustYAxis(): boolean {

        const max = this.maxY;
        const min = this.minY;
        if ((max != -Number.MAX_VALUE) && (min <= max)) {
            const oh = this.dBounds.height;
            const oy = this.dBounds.y;
            // update Yscale to fit maxY, minY
            const range = max - min;
            // Fit all data if data range is < 1/4 or > data window height
            if (this.AutoYAxisAdjustBehaviour === AutoYAxisAdjustBehaviour.EnsureAllSamplesVisible) {
                if (range > 0) {
                    // fit data window height to data range
                    // range less than 1/4 of window, too small
                    if (range < oh / 4) {
                        this.DataHeight = this.DataHeight; // * 99 / 100; // range / 4;
                        //                       this.dBounds.y = this.dBounds.y - this.DataHeight / (99 / 100) / 2;
                    }
                    // range more than window, too big
                    else if (range > oh) {
                        this.DataHeight = range + range / 4;
                        this.dBounds.y = min - range / 8;
                    }
                }
            }


            // range is ok, but data offset might be too low or high
            if ((min < this.dBounds.y) || (max > this.dBounds.y + this.dBounds.height))
                this.dBounds.y = min - (this.dBounds.height - range) / 2;

            return ((oh != this.dBounds.height) || (oy != this.dBounds.y));


        }
        return false;
    }

    GetArea(X:number, Y:number): Area {

        if (this.gBounds.Contains(X,Y))
            return Area.Graph;
        if (this.timeAxisBounds.Contains(X, Y))
            return Area.TimeAxis;
        if (this.yAxisBounds.Contains(X, Y))
            return Area.YAxis;
        return Area.BottomLeft;

    }


    graph_Zoom(x: number, y: number) {
        const SLOP = 1; // cursor can move 1 pixel between button down and button up before considered to be dragging
        const GRAPH_ZOOM_RATIO = 20.0;

        this.AutoYAxisAdjustBehaviour = AutoYAxisAdjustBehaviour.None;  // Stop automatically adjusting Y axis
        const delta_x = this.dragPoint.x - x;
        const delta_y = this.dragPoint.y - y;

        if (!(delta_x <= SLOP && delta_x >= -SLOP && delta_y <= SLOP && delta_y >= -SLOP)) {
            this.dragPoint.x = x;
            this.dragPoint.y = y;

            const mag_dx = delta_x < 0 ? -delta_x : delta_x;
            const mag_dy = delta_y < 0 ? -delta_y : delta_y;
            const sgn_dx = delta_x < 0 ? 1 : -1;
            const sgn_dy = delta_y < 0 ? -1 : 1;
            if (mag_dx > mag_dy) {
                const fact = (GRAPH_ZOOM_RATIO - sgn_dx) / GRAPH_ZOOM_RATIO;
                this.onScreenCanvas.style.cursor = 'col-resize';

                this.DataWidth *= fact;
                this.DataX += this.DataWidth * (1 / fact - 1) * this.dragStartPoint.x / this.gBounds.width;

            }
            else {
                const fact = (GRAPH_ZOOM_RATIO - sgn_dy) / GRAPH_ZOOM_RATIO;
                this.onScreenCanvas.style.cursor = 'row-resize';
                this.DataHeight *= fact;
                this.DataY += this.DataHeight * (1 / fact - 1) * 0.5 /* (1 - dragStartPoint.Y / gBounds.Height) */;

            }

        }

    }

    yAxis_Scroll(y: number) {

        const delta_y = this.dragPoint.y - y;

        this.DataY -= this.g2dY(delta_y);
        this.dragPoint.y = y;
        if (delta_y > 0)
            this.onScreenCanvas.style.cursor = 'n-resize';
        else if (delta_y < 0)
            this.onScreenCanvas.style.cursor = 's-resize';

    }

    timeAxis_Scroll(x: number) {
        const delta_x = x - this.dragPoint.x;

        this.DataX -= this.pixels2duration(delta_x);
        this.dragPoint.x = x;

        if (this.DataX === 0)
            this.onScreenCanvas.style.cursor = 'not-allowed';
        else if (delta_x > 0)
            this.onScreenCanvas.style.cursor = 'e-resize';
        else if (delta_x < 0)
            this.onScreenCanvas.style.cursor = 'w-resize';

    }


}

enum Area {
    None,
    Graph,
    TimeAxis,
    YAxis,
    BottomLeft,

}


