import { isDesktop } from '@lobechat/const';
import { useEffect } from 'react';

// Protocols that must never be hijacked into an in-app navigation.
const IGNORED_PROTOCOLS = ['javascript:', 'mailto:', 'tel:', 'blob:', 'data:'];

// Guard against double registration when the provider tree mounts more than
// once (e.g. StrictMode in dev). The listener is global on `document`, so a
// single instance is enough to cover every route tree.
let registered = false;

/**
 * Forces every link click to navigate inside the current window instead of
 * opening a new tab. Required because citation / reference markers in
 * `@lobehub/ui` render `<a target="_blank">` (and the citation hover card calls
 * `window.open(url, "_blank")`) that we cannot patch at the source.
 *
 * Implemented as a bubble-phase `document` click listener that yields to any
 * handler which already called `preventDefault` (react-router `Link`s, the
 * `InternalEntityLink` portal openers, the archive anchor positioning, …), so
 * existing SPA navigation and the business archive / anchor positioning logic
 * keep working untouched. The only thing that changes is *where* the page
 * opens: the current window instead of a new one.
 */
export const useSameWindowLinkNavigation = () => {
  useEffect(() => {
    // Desktop opens links through its own preload capture; leave it alone.
    if (isDesktop || registered) return;
    registered = true;

    const originalOpen = window.open;

    // Intercept bare `_blank` popups (no sizing features) and route them to the
    // current window. OAuth / connector popups pass `width=*`/`height=*` and
    // must stay real popups — and they'd be missed by the click listener below
    // anyway since they are not `<a>` elements.
    window.open = function (
      this: Window,
      url?: string | URL,
      target?: string,
      features?: string,
    ): Window | null {
      if (target === '_blank' && !features) {
        const href = typeof url === 'string' ? url : url?.toString();
        if (href) {
          window.location.assign(href);
          return null;
        }
      }
      return originalOpen.call(window, url, target, features);
    } as typeof window.open;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      // Let the user open a new tab on purpose (Cmd/Ctrl/Shift/Alt + click).
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const targetEl = event.target as Node | null;
      if (!targetEl || !(targetEl instanceof HTMLElement)) return;

      const anchor = targetEl.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const lower = href.toLowerCase();
      if (IGNORED_PROTOCOLS.some((protocol) => lower.startsWith(protocol))) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      // External references also navigate in the current window (option A).
      if (url.origin !== window.location.origin) {
        event.preventDefault();
        window.location.assign(url.toString());
        return;
      }

      // Internal reference on the same page: only the hash differs, so just
      // update the hash and let the existing hashchange listener do its anchor
      // / page positioning instead of forcing a full reload.
      const { pathname, search, hash } = window.location;
      if (url.pathname === pathname && url.search === search) {
        if (hash !== url.hash) {
          event.preventDefault();
          window.location.hash = url.hash;
        }
        return;
      }

      event.preventDefault();
      window.location.assign(url.pathname + url.search + url.hash);
    };

    document.addEventListener('click', onClick, false);

    return () => {
      registered = false;
      document.removeEventListener('click', onClick, false);
      window.open = originalOpen;
    };
  }, []);
};
