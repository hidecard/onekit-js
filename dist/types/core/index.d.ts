export interface OneKitConfig {
    enableSanitization?: boolean;
    enableValidation?: boolean;
}
export declare class OneKit {
    elements: Element[];
    static _cache: Map<string, any>;
    constructor(selector?: string | Element | NodeList | OneKit | Element[]);
    first(): OneKit;
    last(): OneKit;
    each(callback: (this: Element, index: number, element: Element) => void): OneKit;
    find(selector: string): OneKit;
    class(className: string): OneKit;
    unclass(className: string): OneKit;
    toggleClass(className: string): OneKit;
    html(content?: string): string | null | OneKit;
    text(content?: string): string | null | OneKit;
    attr(name: string | Record<string, string>, value?: string): string | OneKit;
    unattr(name: string): OneKit;
    css(prop: string | object, value?: string | number): string | null | OneKit;
    show(): OneKit;
    hide(): OneKit;
    toggle(): OneKit;
    clone(): OneKit;
    parent(): OneKit;
    kids(selector?: string): OneKit;
    sibs(selector?: string): OneKit;
    append(content: string | Element | OneKit): OneKit;
    prepend(content: string | Element | OneKit): OneKit;
    remove(): OneKit;
    on(event: string, selector?: string | Function, handler?: Function): OneKit;
    off(event: string, handler: Function): OneKit;
    click(handler: Function): OneKit;
    hover(enterHandler: Function, leaveHandler: Function): OneKit;
    focus(handler: Function): OneKit;
    fade_in(duration?: number): Promise<Element>;
    fade_out(duration?: number): Promise<Element>;
    slide_up(duration?: number): Promise<Element>;
    slide_down(duration?: number): Promise<Element>;
    animate(props: Record<string, string | number>, duration?: number): Promise<Element>;
    move(x: number, y: number, duration?: number): Promise<Element>;
    form_data(): object;
    reset(): OneKit;
    isVisible(): boolean;
    inViewport(threshold?: number): boolean;
    getDimensions(): {
        width: number;
        height: number;
        innerWidth: number;
        innerHeight: number;
        top: number;
        left: number;
    };
    log(): OneKit;
    info(): OneKit;
}
export declare function ok(selector?: string | Element | NodeList | OneKit | Element[]): OneKit;
export declare namespace ok {
    var module: (name: string, factory: Function) => void;
}
