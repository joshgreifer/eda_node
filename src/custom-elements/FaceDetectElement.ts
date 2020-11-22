declare let cv: any;


let video = document.getElementById('videoInput');



export class FaceDetectElement extends HTMLElement {

    constructor() {
        super();
        const self = this;

        const printError = function(err: any) {
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

        const createFileFromUrl = function(path: string, url : string, callback: () => any) {
            let request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.onload = function(ev) {
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        let data = new Uint8Array(request.response);
                        cv.FS_createDataFile('/', path, data, true, false, false);
                        callback();
                    } else {
                        printError('Failed to load ' + url + ' status: ' + request.status);
                    }
                }
            };
            request.send();
        };

        const constraints = {
            audio: false,
            video: {
                width: {min: 320, ideal: 320, max: 320},
                height: {min: 240, ideal: 240, max: 240}
            }
        };

        const shadow = this.attachShadow({mode: 'open'}); // sets and returns 'this.shadowRoot'
        const video = <HTMLVideoElement>document.createElement('video');
        const canvas = <HTMLCanvasElement>document.createElement('canvas');
        video.width = canvas.width = 320;
        video.height = canvas.height = 240;
        canvas.id = 'canvasOutput';
        const style = document.createElement('style');
        // noinspection CssInvalidPropertyValue
        const FPS = 30;


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




        cv['onRuntimeInitialized'] = () => {

            let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
            let dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
            let gray = new cv.Mat();
            let cap = new cv.VideoCapture(video);
            let faces = new cv.RectVector();
            let classifier = new cv.CascadeClassifier();

            // let faceCascadeFile = 'assets/haarcascades/haarcascade_frontalface_default.xml'; // path to xml
            let faceCascadeFile = 'haarcascade_frontalface_default.xml'; // path to xml

            navigator.mediaDevices.getUserMedia(constraints)
                .then( stream => {
                    video.srcObject = stream;
                    const processVideo = () => {
                        try {
                            if (!stream) {
                                // clean and stop.
                                src.delete();
                                dst.delete();
                                gray.delete();
                                faces.delete();
                                classifier.delete();
                                return;
                            }
                            let begin = Date.now();
                            // start processing.
                            cap.read(src);
                            src.copyTo(dst);
                            cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
                            // detect faces.
                            classifier.detectMultiScale(gray, faces, 1.1, 3, 0);
                            // draw faces.
                            for (let i = 0; i < faces.size(); ++i) {
                                let face = faces.get(i);
                                let point1 = new cv.Point(face.x, face.y);
                                let point2 = new cv.Point(face.x + face.width, face.y + face.height);
                                cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
                            }
                            cv.imshow(canvas, dst);
                            // schedule the next one.
                            let delay = 1000 / FPS - (Date.now() - begin);
                            setTimeout(processVideo, delay);
                        } catch (err) {
                           printError(err);
                        }
                    };

// schedule the first one.
                    createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
                        classifier.load(faceCascadeFile);

                        video.play().then( () => { setTimeout(processVideo, 0); });

                    });

                });
        };


        shadow.append( style, video, canvas );


    }


}