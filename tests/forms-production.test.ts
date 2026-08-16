import { createForm } from '../src/modules/forms';

describe('forms production contracts', () => {
  it('tracks values, touched fields, validation errors, and reset', async () => {
    const form = createForm({ email: '' }, values => values.email.includes('@') ? {} : { email: 'Invalid email' });
    const states: boolean[] = [];
    form.subscribe(state => states.push(state.valid));

    form.setField('email', 'invalid');
    form.touch('email');
    await expect(form.validate()).resolves.toBe(false);
    expect(form.state.errors.email).toBe('Invalid email');
    expect(form.state.touched.email).toBe(true);

    form.reset({ email: 'user@example.com' });
    await expect(form.validate()).resolves.toBe(true);
    expect(states.length).toBeGreaterThan(0);
  });

  it('validates before submit and clears submitting state afterward', async () => {
    const form = createForm({ name: 'OneKit' });
    const submit = jest.fn(async () => undefined);

    await expect(form.submit(submit)).resolves.toBe(true);
    expect(submit).toHaveBeenCalledWith({ name: 'OneKit' });
    expect(form.state.submitting).toBe(false);
  });
});
