export interface DirectiveContext {
    element: Element;
    expression: string;
    modifiers: string[];
    value?: any;
    oldValue?: any;
    rootContext?: any;
}
export interface DirectiveHandler {
    bind?: (ctx: DirectiveContext) => void;
    update?: (ctx: DirectiveContext) => void;
    unbind?: (ctx: DirectiveContext) => void;
}
export declare function registerDirective(name: string, handler: DirectiveHandler): void;
export declare function compileTemplate(template: string, context: any): Element;
export declare function initTemplateEngine(): void;
