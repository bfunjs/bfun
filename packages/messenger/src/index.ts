import { Middleware } from '@bfun/runtime';

export interface IOptions {
    targetOrigin: string;
    useCapture?: boolean;
}

export interface IMessenger {
    on: (api: string | { [key: string]: IHandler }, handler: IHandler) => void;
    emit: (api: string, data?: any, origin?: string, transfer?: Transferable[]) => void;
}

export type IHandler = (ctx: object) => any;

const defaultOptions: IOptions = {
    targetOrigin: '*',
};

class Messenger implements IMessenger {
    private readonly options: IOptions;
    private readonly handler: { [key: string]: Middleware };

    constructor(options: IOptions = defaultOptions) {
        this.options = Object.assign(defaultOptions, options);
        this.handler = {};

        const { useCapture } = this.options;
        window.addEventListener('message', (e: MessageEvent) => this.dispatch(e), useCapture);
    }

    private dispatch(event: MessageEvent): Promise<any> | undefined {
        const { api, data } = event.data;
        const mw = this.handler[api];
        if (mw instanceof Middleware) return mw.run(data);
    }

    on(api: string | { [key: string]: IHandler }, handler: IHandler) {
        const apis = typeof api === 'string' ? { [api]: handler } : api;
        Object.keys(apis).map(key => {
            const fn = apis[key];
            if (typeof fn === 'function') {
                if (!this.handler[key]) this.handler[key] = new Middleware();
                this.handler[key].use(fn);
            }
        })
    }

    emit(api: string, data: any, origin: string = '', transfer?: Transferable[]) {
        const message = { api, data };
        const targetOrigin = origin || this.options.targetOrigin;
        window.parent.postMessage(message, targetOrigin, transfer);
    }
}

export default Messenger;
