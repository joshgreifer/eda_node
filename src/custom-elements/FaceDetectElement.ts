declare let cv: any;

namespace cvUtils {

    export function cvError(err: any) {
        if (typeof err === 'undefined') {
            err = '';
        } else if (typeof err === 'number') {
            if (!isNaN(err)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
                }
            }
        } else if (typeof err === 'string') {
            let ptr = Number(err.split(' ')[0]);
            if (!isNaN(ptr)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
                }
            }
        } else if (err instanceof Error) {
            err = err.stack!.replace(/\n/g, '<br>');
        }
        console.error(err);
    };

    async function cvCreateFileFromUrl(filename: string, url : string) : Promise<void> {
        const resp = await fetch(url);
        let data = new Uint8Array(await resp.arrayBuffer());
        cv.FS_createDataFile('/', filename, data, true, false, false);
    };

    export async function cvCreateCascadeClassifier(xml_file_name: string) : Promise<any> {
        const  classifier = new cv.CascadeClassifier();
        const url = `${__webpack_public_path__}assets/haarcascades/${xml_file_name}`;
        await cvCreateFileFromUrl(xml_file_name, url);
        classifier.load(xml_file_name);
        return classifier;
    }
}

export class FaceDetectElement extends HTMLElement {

    private face_count_: number = 0;
    private eyes_count_: number = 0;

    private cv_ready: Promise<void> | undefined;
    private enabled_: Promise<void> | undefined;

    public get FaceCount() { return this.face_count_; }
    public get EyesCount() { return this.eyes_count_; }

    private get OpenCVReady() : Promise<void> {

        if (this.cv_ready === undefined) {
            this.cv_ready = new Promise<void>((resolve) => {
                cv['onRuntimeInitialized'] = resolve;
            });

        }
        return this.cv_ready;
    }

    private get Enabled() : boolean {
        return  this.hasAttribute('enabled') ? (this.getAttribute('enabled') as string).toLocaleLowerCase() === 'true': false;
    }

    async init(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
        const self = this;
        let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        let dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        let gray = new cv.Mat();
        let cap = new cv.VideoCapture(video);
        let faces = new cv.RectVector();
        let eyes = new cv.RectVector();
        let face_classifier = new cv.CascadeClassifier();
        let eye_classifier = new cv.CascadeClassifier();
        const FPS = 5;


        const constraints = {
            audio: false,
            video: {
                width: {min: 320, ideal: 320, max: 320},
                height: {min: 240, ideal: 240, max: 240}
            }
        };


        navigator.mediaDevices.getUserMedia(constraints)
            .then( async (stream) => {
                video.srcObject = stream;
                const processVideo = async () => {
                    if (!self.Enabled)
                        setTimeout(processVideo, 500);
                    else {
                        try {
                            // if (!stream) {
                            //     // clean and stop.
                            //     src.delete();
                            //     dst.delete();
                            //     gray.delete();
                            //     faces.delete();
                            //     face_classifier.delete();
                            //     return;
                            // }
                            const begin = Date.now();
                            // start processing.
                            cap.read(src);
                            src.copyTo(dst);
                            cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
                            // detect faces.
                            face_classifier.detectMultiScale(gray, faces, 1.1, 3, 0);
                            self.face_count_ = faces.size();
                            // draw faces.
                            for (let i = 0; i < self.face_count_; ++i) {
                                let face = faces.get(i);
                                let point1 = new cv.Point(face.x, face.y);
                                let point2 = new cv.Point(face.x + face.width, face.y + face.height);
                                cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
                            }
                            eye_classifier.detectMultiScale(gray, eyes, 1.1, 3, 0);
                            self.eyes_count_ = eyes.size();
                            for (let i = 0; i < self.eyes_count_; ++i) {
                                let eye = eyes.get(i);
                                let point1 = new cv.Point(eye.x, eye.y);
                                let point2 = new cv.Point(eye.x + eye.width, eye.y + eye.height);
                                cv.rectangle(dst, point1, point2, [255, 255, 0, 255]);
                            }

                            cv.imshow(canvas, dst);
                            // schedule the next one.
                            const delay = 1000 / FPS - (Date.now() - begin);
                            setTimeout(processVideo, delay);

                        } catch (err) {
                            cvUtils.cvError(err);
                        }
                    }
                };

                // Create haar cascade classifiers
                face_classifier = await cvUtils.cvCreateCascadeClassifier('haarcascade_frontalface_default.xml');
                eye_classifier = await cvUtils.cvCreateCascadeClassifier('haarcascade_eye_tree_eyeglasses.xml');

                // schedule the first one.
                video.play().then( () => { setTimeout(processVideo, 0); });



            });
    }
    constructor() {
        super();
        const self = this;

        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const video = <HTMLVideoElement>document.createElement('video');
        const canvas = <HTMLCanvasElement>document.createElement('canvas');
        video.width = canvas.width = 320;
        video.height = canvas.height = 240;
        canvas.id = 'canvasOutput';
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue



        // el.innerText = this.hasAttribute('value') ? this.getAttribute('value') as string: '(value)';
        // el.className = 'private-style1';
        // noinspection CssInvalidFunction,CssInvalidPropertyValue
        style.textContent = `
            canvas {
                width: 320px;
                height: 240px;
            }
            video {
                 width: 320px;
                height: 240px;           
            }
        `;

        shadow.append( style, video, canvas );

        (async  () => {
            await self.OpenCVReady;
            await self.init(video, canvas);
        })();



    }



}