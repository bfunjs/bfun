export type IContext = object | any[] | undefined;
export type IFunction = (ctx: any, next: () => void) => any;

export interface IMiddleware {
    pre(fn: IFunction): void;

    use(fn: IFunction): void;

    del(fn: IFunction | number): IFunction[] | undefined;

    run(ctx?: IContext): Promise<any>;
}

class Middleware implements IMiddleware {
    private readonly all: IFunction[];
    private idx: number;
    private ctx: IContext;

    constructor() {
        this.idx = -1;
        this.ctx = {};
        this.all = [];
    }

    static parse(all: IFunction[]): Middleware {
        const instance = new Middleware();
        all.map(fn => instance.use(fn));
        return instance;
    }

    pre(fn: IFunction): void {
        if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!');
        this.all.unshift(fn);
    }

    use(fn: IFunction): void {
        if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!');
        this.all.push(fn);
    }

    del(fn: IFunction | number): IFunction[] | undefined {
        if (typeof fn === 'number') return this.all.splice(fn, 1);
        const index = this.all.findIndex(v => v === fn);
        if (index > -1) return this.all.splice(index, 1);
    }

    private dispatch(i: number): Promise<any> {
        if (i <= this.idx) return Promise.reject(new Error('next() called multiple times'));
        const fn = this.all[this.idx = i];
        if (!fn) return Promise.resolve(this.ctx);
        try {
            return Promise.resolve(fn(this.ctx, this.dispatch.bind(this, i + 1)));
        } catch (err) {
            return Promise.reject(err);
        }
    }

    run(ctx?: IContext): Promise<any> {
        this.idx = -1;
        this.ctx = ctx || {};
        return new Promise((resolve, reject) => {
            if (this.all.length < 1) return resolve(this.ctx);
            this.dispatch(0).then(resolve, reject);
        });
    }
}

export default Middleware;
