declare module 'raven' {
    export interface RavenClient;
    export var Client: ClientConstructor;
}

interface RavenClient {
    captureException(e:Error):void;
    patchGlobal():void;
}

interface ClientConstructor {
    new (dsn:string): RavenClient;
}