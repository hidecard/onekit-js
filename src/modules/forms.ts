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

export function createForm<T extends Record<string, unknown>>(
  initialValues: T,
  validator?: FormValidator<T>,
): Form<T> {
  let initial = { ...initialValues };
  const listeners = new Set<(state: FormState<T>) => void>();
  const state: FormState<T> = {
    values: { ...initialValues },
    errors: {},
    touched: {},
    submitting: false,
    valid: true,
  };

  const notify = (): void => {
    for (const listener of listeners) listener(state);
  };

  const validate = async (): Promise<boolean> => {
    const errors = validator ? await validator(state.values) : {};
    state.errors = errors;
    state.valid = Object.keys(errors).length === 0;
    notify();
    return state.valid;
  };

  return {
    state,
    setField(field, value) {
      state.values = { ...state.values, [field]: value };
      notify();
    },
    touch(field) {
      state.touched = { ...state.touched, [field]: true };
      notify();
    },
    validate,
    async submit(handler) {
      if (!(await validate())) return false;
      state.submitting = true;
      notify();
      try {
        await handler(state.values);
        return true;
      } finally {
        state.submitting = false;
        notify();
      }
    },
    reset(values = initial) {
      initial = { ...values };
      state.values = { ...values };
      state.errors = {};
      state.touched = {};
      state.submitting = false;
      state.valid = true;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
