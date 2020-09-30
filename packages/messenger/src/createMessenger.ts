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

export function createMessenger(options: IOptions = defaultOptions): IMessenger {
    const $options = Object.assign(defaultOptions, options);
    const $handler: { [key: string]: Middleware } = {};
    const $dispatch = (ev: MessageEvent): Promise<any> | undefined => {
        const { api, data } = ev.data;
        const mw = $handler[api];
        if (mw instanceof Middleware) return mw.run(data);
    }

    const context: IMessenger = {
        on(api: string | { [key: string]: IHandler }, handler: IHandler) {
            const apis = typeof api === 'string' ? { [api]: handler } : api;
            Object.keys(apis).map(key => {
                const fn = apis[key];
                if (typeof fn === 'function') {
                    if (!$handler[key]) $handler[key] = new Middleware();
                    $handler[key].use(fn);
                }
            })
        },
        emit(api: string, data: any, origin: string = '', transfer?: Transferable[]) {
            const message = { api, data };
            const targetOrigin = origin || $options.targetOrigin;
            window.parent.postMessage(message, targetOrigin, transfer);
        },
    };

    const { useCapture } = $options;
    window.addEventListener('message', (e: MessageEvent) => $dispatch(e), useCapture);

    return context;
}
