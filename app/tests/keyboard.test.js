import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseKeyboardShortcut, isInputElement } from '../src/lib/keyboard.ts';

describe('Keyboard Shortcuts Engine', () => {
  describe('isInputElement', () => {
    it('detects input, textarea, and select elements', () => {
      assert.equal(isInputElement({ tagName: 'INPUT' }), true);
      assert.equal(isInputElement({ tagName: 'textarea' }), true);
      assert.equal(isInputElement({ tagName: 'SELECT' }), true);
      assert.equal(isInputElement({ tagName: 'div', isContentEditable: true }), true);
      assert.equal(isInputElement({ tagName: 'DIV' }), false);
      assert.equal(isInputElement(null), false);
    });
  });

  describe('parseKeyboardShortcut', () => {
    it('maps digits 1-4 to primary page navigation when outside input', () => {
      assert.deepEqual(parseKeyboardShortcut({ key: '1' }), { type: 'NAVIGATE', page: 'radar' });
      assert.deepEqual(parseKeyboardShortcut({ key: '2' }), { type: 'NAVIGATE', page: 'explorer' });
      assert.deepEqual(parseKeyboardShortcut({ key: '3' }), { type: 'NAVIGATE', page: 'library' });
      assert.deepEqual(parseKeyboardShortcut({ key: '4' }), { type: 'NAVIGATE', page: 'settings' });
    });

    it('suppresses digit and navigation shortcuts when focused inside an input', () => {
      const inputTarget = { tagName: 'INPUT' };
      assert.equal(parseKeyboardShortcut({ key: '1', target: inputTarget }), null);
      assert.equal(parseKeyboardShortcut({ key: '/', target: inputTarget }), null);
      assert.equal(parseKeyboardShortcut({ key: 'j', target: inputTarget }), null);
    });

    it('parses search focus shortcuts (/ and Ctrl/Cmd+K)', () => {
      assert.deepEqual(parseKeyboardShortcut({ key: '/' }), { type: 'FOCUS_SEARCH' });
      assert.deepEqual(parseKeyboardShortcut({ key: 'k', metaKey: true }), { type: 'FOCUS_SEARCH' });
      assert.deepEqual(parseKeyboardShortcut({ key: 'K', ctrlKey: true }), { type: 'FOCUS_SEARCH' });
    });

    it('parses Escape to blur search even from within an input', () => {
      assert.deepEqual(parseKeyboardShortcut({ key: 'Escape', target: { tagName: 'INPUT' } }), {
        type: 'BLUR_SEARCH',
      });
    });

    it('parses cheatsheet toggle (?)', () => {
      assert.deepEqual(parseKeyboardShortcut({ key: '?' }), { type: 'TOGGLE_SHORTCUTS' });
    });

    it('parses vim-style j/k browsing scroll', () => {
      assert.deepEqual(parseKeyboardShortcut({ key: 'j' }), { type: 'SCROLL_DOWN' });
      assert.deepEqual(parseKeyboardShortcut({ key: 'k' }), { type: 'SCROLL_UP' });
    });
  });
});
