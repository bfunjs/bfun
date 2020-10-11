import { Renderer, RendererOptions } from '../interface';

class VueRenderer implements Renderer {

    constructor(rendererOptions: RendererOptions) {
    }

    mounted(el: string): void {
        return;
    }
}

export default VueRenderer;
