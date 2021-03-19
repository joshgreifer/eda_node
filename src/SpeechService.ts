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
import {arrayToHexString, hexStringToArray} from "./StringUtils";


const SpeechSDK = require('microsoft-cognitiveservices-speech-sdk');


export class SpeechService extends EventEmitter
{
    private synthesizer!: SpeechSynthesizer;
    private recognizer!: SpeechRecognizer;
    private player! : SpeakerAudioDestination;
    static LatencySeconds: number = 3.500;




    private get subscriptionKey(): string {

        // To generate, run subscriptionKey(<my real key>), and enter returned value in line below (encrypting encrypted key gives original key, as crypt is just xor)
        const subs_key_encrypted =  hexStringToArray('5b9226d15a412444bfe92c450a01bfa7');
        // @ts-ignore
        const subs_key_decrypted = subs_key_encrypted.crypt(new TextEncoder().encode(this.subscription_decrypt_key));

        console.log(arrayToHexString(subs_key_decrypted));
        return arrayToHexString(subs_key_decrypted);

    }

    constructor(private subscription_decrypt_key: string, private create_recognizer: boolean = true, private create_synthesizer: boolean = true) {
        super();
        this.Initialize(create_recognizer, create_synthesizer);
    }

    Initialize(recognizer: boolean, synthesizer: boolean): void  {

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

