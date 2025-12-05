interface AriaAttributes {
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-expanded'?: boolean;
    'aria-hidden'?: boolean;
    'aria-live'?: 'off' | 'polite' | 'assertive';
    'aria-atomic'?: boolean;
    'aria-relevant'?: string;
    'aria-busy'?: boolean;
    'aria-disabled'?: boolean;
    'aria-required'?: boolean;
    'aria-invalid'?: boolean;
    'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-controls'?: string;
    'aria-activedescendant'?: string;
    'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
    'aria-readonly'?: boolean;
    'aria-multiselectable'?: boolean;
    'aria-valuemin'?: number;
    'aria-valuemax'?: number;
    'aria-valuenow'?: number;
    'aria-valuetext'?: string;
    'aria-orientation'?: 'horizontal' | 'vertical';
    'aria-level'?: number;
    'aria-posinset'?: number;
    'aria-setsize'?: number;
    'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
    'aria-pressed'?: boolean | 'mixed';
    'aria-checked'?: boolean | 'mixed';
    'aria-selected'?: boolean | 'mixed';
    'role'?: string;
    tabindex?: number;
}
interface AccessibilityValidationResult {
    errors: string[];
    warnings: string[];
}
export declare function setAriaAttributes(element: Element, attributes: AriaAttributes): void;
export declare function announce(message: string, priority?: 'polite' | 'assertive'): void;
export declare function trapFocus(container: Element): () => void;
export declare function makeFocusable(element: Element): void;
export declare function makeUnfocusable(element: Element): void;
export declare function skipToContent(targetId: string): void;
export declare function createSkipLink(href: string, text?: string): HTMLAnchorElement;
export declare function manageTabOrder(container: Element, enabled?: boolean): void;
export declare function createLandmarks(): void;
export declare function validateAccessibility(element: Element): AccessibilityValidationResult;
export {};
