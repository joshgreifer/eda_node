import {
    AudioConfig, IPlayer,
    PropertyId,
    ResultReason,
    SpeakerAudioDestination,
    SpeechConfig,
    SpeechRecognizer, SpeechSynthesisEventArgs, SpeechSynthesisOutputFormat, SpeechSynthesisWordBoundaryEventArgs,
    SpeechSynthesizer
} from 'microsoft-cognitiveservices-speech-sdk'

import {EventEmitter} from "eventemitter3"


const SpeechSDK = require('microsoft-cognitiveservices-speech-sdk');


export class SpeechService extends EventEmitter
{
    private synthesizer!: SpeechSynthesizer;
    private recognizer!: SpeechRecognizer;
    private player! : SpeakerAudioDestination;


    private get subscriptionKey(): string {
        let subs_key_encrypted =  [13, 90, 82, 1, 12, 12, 95, 1, 12, 90, 0, 11, 4, 13, 12, 13, 82, 9, 1, 12, 88, 15, 4, 6, 9, 14, 89, 2, 7, 93, 14, 83];
        // @ts-ignore
        return String.fromCharCode(...subs_key_encrypted.crypt(new TextEncoder().encode(this.subscription_decrypt_key)));
    }

    constructor(private subscription_decrypt_key: string, private create_recognizer: boolean = true, private create_synthesizer: boolean = true) {
        super();
        this.Initialize(create_recognizer, create_synthesizer);
    }

    Initialize(recognizer: boolean, synthesizer: boolean): void  {
//        const subscriptionKey = '70499f6c9f0a4998ae6db6822b79c2fd';  // SEL

//        const subscriptionKey = '40b4d551929a48d4894dae43a7322579'; // Harmonica cs-speech



        const serviceRegion = 'eastus';
        const speechConfig = SpeechConfig.fromSubscription(this.subscriptionKey, serviceRegion);
        console.log(this.subscriptionKey);
        //speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;
        if (synthesizer) {
            let audioOutputConfig;

            this.player = new SpeakerAudioDestination();
            this.player.onAudioEnd = (player: IPlayer) => {
                console.log(typeof this.player.internalAudio.srcObject);
                console.log(this.player.internalAudio.src);
                console.log(this.player.internalAudio.currentSrc);
            }

            audioOutputConfig = AudioConfig.fromSpeakerOutput(this.player);

            this.synthesizer = new SpeechSynthesizer(speechConfig, audioOutputConfig);
            this.synthesizer.wordBoundary = (s: SpeechSynthesizer, e: SpeechSynthesisWordBoundaryEventArgs) => {
                console.log("(wordBoundary), Text: " + e.text + ", Audio offset: " + e.audioOffset / 10000 + "ms.");
            };

            this.synthesizer.synthesisCompleted =  (s: SpeechSynthesizer, e: SpeechSynthesisEventArgs) => {
                console.log( "(synthesisCompleted) Audio length: " + e.result.audioData.byteLength / 16.0 + "ms");
            };
        }
        if (recognizer) {
            const audioInputConfig = AudioConfig.fromDefaultMicrophoneInput();
            this.recognizer = new SpeechRecognizer(speechConfig, audioInputConfig);
            this.recognizer.properties.setProperty(PropertyId.SpeechServiceResponse_ProfanityOption, 'raw');
        }
    }

    async StartContinuousRecognition(): Promise<void>
    {
        const this_ =  this;
        this.recognizer.canceled = (sender, event) => {
            console.log('canceled', event);
            this_.emit('error',  'Speech Recognition Error: ' + event.errorDetails);
        };

        this.recognizer.recognized = (sender, event) => {
            console.log('recognized', event);
            if (event.result.reason !== ResultReason.NoMatch)
                this_.emit('recognized', event.result.text );
        };
        this.recognizer.recognizing = (sender, event) => {
            console.log('recognizing', event);
            this_.emit('recognizing', event.result.text);
        };
        this.recognizer.speechStartDetected = (sender, event) => {
            console.log('speechStartDetected', event);
        };
        this.recognizer.speechEndDetected = (sender, event) => {
            console.log('speechEndDetected', event);
        };
        this.recognizer.startContinuousRecognitionAsync();

    }
    async StopContinuousRecognition(): Promise<void> {
        this.recognizer.stopContinuousRecognitionAsync();
    }

    Recognize(): Promise<string>
    {
        const this_ =  this;
        return new Promise<string>((resolve, reject) => {
            this.recognizer.recognizeOnceAsync(result => {
                const reason: ResultReason = result.reason;
                if (reason == ResultReason.RecognizedSpeech) {
                    this_.emit('SubjectSpoke', result);
                    resolve(result.text);
                } else if (reason == ResultReason.NoMatch) {
                    this.emit('SubjectSilent', reason);
                    resolve('$SILENCE # (probably). recognizeOnceAsync returned ResultReason.NoMatch');
                } else
                    resolve('$ERROR # (probably). recognizeOnceAsync returned code ' + reason);

            }, e => {
                resolve('$ERROR # recognizeOnceAsync raised error  ' + e);
            })
        });
    }

    async waitForAudioOutputToFinish(): Promise<void> {
        const sleep =  (ms:number): Promise<void> => {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        let last_audio_time = this.player.currentTime;
        do {
            this.emit('WaitingForAudioOutputToFinish');
            await sleep(50);
            const new_audio_time = this.player.currentTime;
            if (new_audio_time != last_audio_time)
                last_audio_time = new_audio_time;
            else
                break;

        } while (true);
        this.emit('AudioOutputFinished');
        this.Initialize(false, true);
    }

    sendSSMLToTTSEngine(ssml: string) : Promise<void> {

        return new Promise<void>((resolve, reject) => {
            this.synthesizer.speakSsmlAsync(ssml, () => {
                resolve();
            }, () => {
                reject();
            })
        });
    }

    sendTextToTTSEngine(text: string) : Promise<void> {

        return new Promise<void>((resolve, reject) => {
            this.synthesizer.speakTextAsync(text, () => {
                resolve();
            }, () => {
                reject();
            })
        });
    }


}

