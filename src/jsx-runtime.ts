import { createElement, type VNode } from './modules/vdom';
import { Fragment, h } from './modules/jsx';

export { Fragment };

export type JSXRuntimeProps = Record<string, unknown> & {
  children?: unknown;
};

function createJSXElement(type: string | Function, props: JSXRuntimeProps | null, key?: unknown): VNode {
  const { children, ...rest } = props ?? {};
  if (key !== undefined) rest.key = key;
  const childList = children === undefined ? [] : Array.isArray(children) ? children : [children];
  return createElement(type, rest, ...childList as Array<unknown>);
}

export function jsx(type: string | Function, props: JSXRuntimeProps | null, key?: unknown): VNode {
  return createJSXElement(type, props, key);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export { h };

export default jsx;
