import { Middleware } from '../src';

describe('file://src/core/middleware.ts', () => {
    const instance = new Middleware();
    instance.use(async (ctx, next) => {
        ctx.value = 2;
        await next();
    });
    instance.pre(async (ctx, next) => {
        ctx.value = 1;
        await next();
    });
    const ctx: any = {};

    it('run pre first', async () => {
        await instance.run(ctx);
        expect(ctx.value).toBe(2);
    })

    it('remove 0', async () => {
        instance.del(0);
        await instance.run(ctx);
        expect(ctx.value).toBe(2);
    })
});

it('parse', async () => {
    const ctx: any = {};
    const instance = Middleware.parse([
        async (ctx, next) => {
            ctx.a = 1;
            await next();
        },
        async (ctx, next) => {
            ctx.b = 2;
            await next();
        }
    ])
    await instance.run(ctx);
    expect(ctx.a + ctx.b).toBe(3);
})
