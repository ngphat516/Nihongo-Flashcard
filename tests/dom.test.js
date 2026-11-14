import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { h } from '../core/dom.js';

/**
 * DOM giả tối giản (Node không có document). <select> làm giống trình duyệt:
 * gán value chỉ chọn được option đã nằm trong nó, không có thì về ''.
 */
class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = {};
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  addEventListener() {}
  append(...nodes) {
    this.children.push(...nodes);
  }
}
class FakeSelect extends FakeElement {
  #value = '';
  get value() {
    return this.#value;
  }
  set value(v) {
    this.#value = this.children.some((option) => option.value === v) ? v : '';
  }
}

beforeEach(() => {
  globalThis.Node = FakeElement;
  globalThis.document = { createElement: (tag) => (tag === 'select' ? new FakeSelect(tag) : new FakeElement(tag)) };
});
afterEach(() => {
  delete globalThis.Node;
  delete globalThis.document;
});

test('B1: h("select", { value }) chọn đúng option truyền vào làm con', () => {
  const select = h('select', { value: 'b' },
    h('option', { value: 'a' }, 'A'),
    h('option', { value: 'b' }, 'B'),
  );
  assert.equal(select.value, 'b');
});

test('B1: checked cũng được gán, các thuộc tính khác vẫn như cũ', () => {
  const input = h('input', { type: 'checkbox', checked: true, class: 'x', 'aria-label': 'Chọn' });
  assert.equal(input.checked, true);
  assert.equal(input.className, 'x');
  assert.equal(input.attributes['aria-label'], 'Chọn');
});
