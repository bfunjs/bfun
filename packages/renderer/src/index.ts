import { RendererOptions } from './interface';
import ReactRenderer from './react/renderer';
import VueRenderer from './vue/renderer';

export function createVueRenderer(rendererOptions: RendererOptions): VueRenderer {
    return new VueRenderer(rendererOptions);
}

export function createReactRenderer(rendererOptions: RendererOptions): ReactRenderer {
    return new ReactRenderer(rendererOptions);
}