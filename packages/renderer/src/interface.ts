export interface RendererNode {
    [key: string]: any;
}

export interface RendererOptions {
    created?: () => void;

    mounted?: () => void;

    updated?: () => void;
}

export interface Editor {
    mounted(): void;
}

export interface Renderer {
    mounted(el: string): void;
}
