import { effect, reactive } from '../../dist/onekit.esm.js';
import './style.css';

const state = reactive({ count: 0 });
const value = document.querySelector<HTMLParagraphElement>('#value')!;

effect(() => {
  value.textContent = String(state.count);
});

document.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', () => {
  state.count += 1;
});

document.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', () => {
  state.count -= 1;
});
