'use client';

/**
 * Sets values on native <input>, <textarea>, <select> elements within a form
 * by their `name` attribute. Dispatches React-compatible synthetic events so
 * controlled components see the change.
 *
 * Also adds a brief gold flash animation via the `voice-flash` CSS class
 * (defined in globals.css).
 */
export function applyToNativeInputs(
  form: HTMLFormElement | null,
  fields: Record<string, unknown>
) {
  if (!form) return;

  for (const [name, value] of Object.entries(fields)) {
    if (value == null) continue;
    const el = form.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(`[name="${name}"]`);
    if (!el) continue;

    // Use the native setter so React's synthetic event system picks it up
    const proto =
      el.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : el.tagName === 'SELECT'
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(el, String(value));
    } else {
      el.value = String(value);
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // Gold flash
    el.classList.add('voice-flash');
    setTimeout(() => el.classList.remove('voice-flash'), 800);
  }
}
