export type FormErrors<T> = Partial<Record<keyof T, string>>;
export type FormValidator<T> = (values: Readonly<T>) => FormErrors<T> | Promise<FormErrors<T>>;
export interface FormState<T> {
    values: T;
    errors: FormErrors<T>;
    touched: Partial<Record<keyof T, boolean>>;
    submitting: boolean;
    valid: boolean;
}
export interface Form<T> {
    readonly state: FormState<T>;
    setField<K extends keyof T>(field: K, value: T[K]): void;
    touch<K extends keyof T>(field: K): void;
    validate(): Promise<boolean>;
    submit(handler: (values: Readonly<T>) => void | Promise<void>): Promise<boolean>;
    reset(values?: T): void;
    subscribe(listener: (state: FormState<T>) => void): () => void;
}
export declare function createForm<T extends Record<string, unknown>>(initialValues: T, validator?: FormValidator<T>): Form<T>;
