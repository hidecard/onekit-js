import { defineStore, effect } from '../../dist/onekit.esm.js';
import './style.css';

type Todo = { id: number; title: string; done: boolean };

const todos = defineStore('todo-example', () => ({
  state: () => ({
    items: [] as Todo[]
  }),
  actions: {
    add(title: unknown) {
      const text = String(title).trim();
      if (!text) return;
      (this.$state.items as Todo[]).push({ id: Date.now(), title: text, done: false });
    },
    toggle(id: unknown) {
      const item = (this.$state.items as Todo[]).find(todo => todo.id === Number(id));
      if (item) item.done = !item.done;
    },
    remove(id: unknown) {
      this.$state.items = (this.$state.items as Todo[]).filter(todo => todo.id !== Number(id));
    }
  }
}));

const list = document.querySelector<HTMLUListElement>('#todo-list')!;
const summary = document.querySelector<HTMLParagraphElement>('#summary')!;
const form = document.querySelector<HTMLFormElement>('#todo-form')!;
const input = document.querySelector<HTMLInputElement>('#todo-input')!;

function render() {
  const items = todos.$state.items as Todo[];
  const remaining = items.filter(item => !item.done).length;
  summary.textContent = `${remaining} remaining · ${items.length} total`;
  list.innerHTML = items.length ? items.map(item => `
    <li class="todo ${item.done ? 'done' : ''}">
      <label><input type="checkbox" data-toggle="${item.id}" ${item.done ? 'checked' : ''} /> <span>${escapeHtml(item.title)}</span></label>
      <button class="remove" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.title)}">×</button>
    </li>`).join('') : '<li class="empty">Your list is clear.</li>';
}

effect(render);

form.addEventListener('submit', event => {
  event.preventDefault();
  todos.add(input.value);
  input.value = '';
  input.focus();
});

list.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  if (target.dataset.toggle) todos.toggle(target.dataset.toggle);
});

list.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const remove = target.closest<HTMLButtonElement>('[data-remove]');
  if (remove?.dataset.remove) todos.remove(remove.dataset.remove);
});

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!));
}
