export interface OkjsBlock {
    script: string;
    scriptLang: 'js' | 'ts';
    template: string;
    style: string;
    styleScoped: boolean;
}
export interface OkjsCompileResult {
    code: string;
    map: null;
}
export declare function parseOkjs(source: string, id?: string): OkjsBlock;
export declare function compileOkjs(source: string, id?: string): OkjsCompileResult;
