export interface HeadMetadata {
    title?: string;
    description?: string;
    keywords?: string | readonly string[];
    robots?: string;
    canonical?: string;
    openGraph?: Record<string, string>;
    twitter?: Record<string, string>;
}
export interface HeadManager {
    get(): HeadMetadata;
    set(metadata: HeadMetadata): void;
    update(metadata: HeadMetadata): void;
    render(): string;
    mount(target?: Document): void;
    clear(): void;
    dispose(): void;
}
/** Render metadata into deterministic, escaped HTML suitable for an SSR head slot. */
export declare function renderHead(metadata: HeadMetadata): string;
/** Apply metadata to a browser document, replacing only nodes owned by this manager. */
export declare function applyHead(metadata: HeadMetadata, target?: Document): void;
export declare function createHeadManager(initial?: HeadMetadata): HeadManager;
