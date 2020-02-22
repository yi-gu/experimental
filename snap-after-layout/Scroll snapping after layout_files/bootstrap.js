import { s as store, g as getMeta, c as config, l as listen, r as reload } from './chunk-1b0393c2.js';

/**
 * @fileoverview Configures the WebComponents polyfill path.
 *
 * This needs to occur in its own file that is included _before_ the loader itself, because ES6
 * modules are all hoisted in the order in which they are found.
 */

// Set the production path for the Web Components polyfills. Must have leading and trailing slash.
// This actually looks inside the root PLUS "bundles/<filename>".
// This isn't configurable as we don't need the polyfill in dev.
window.WebComponents = {root: "/lib/webcomponents/"};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function() {

  /**
   * Basic flow of the loader process
   *
   * There are 4 flows the loader can take when booting up
   *
   * - Synchronous script, no polyfills needed
   *   - wait for `DOMContentLoaded`
   *   - fire WCR event, as there could not be any callbacks passed to `waitFor`
   *
   * - Synchronous script, polyfills needed
   *   - document.write the polyfill bundle
   *   - wait on the `load` event of the bundle to batch Custom Element upgrades
   *   - wait for `DOMContentLoaded`
   *   - run callbacks passed to `waitFor`
   *   - fire WCR event
   *
   * - Asynchronous script, no polyfills needed
   *   - wait for `DOMContentLoaded`
   *   - run callbacks passed to `waitFor`
   *   - fire WCR event
   *
   * - Asynchronous script, polyfills needed
   *   - Append the polyfill bundle script
   *   - wait for `load` event of the bundle
   *   - batch Custom Element Upgrades
   *   - run callbacks pass to `waitFor`
   *   - fire WCR event
   */

  var polyfillsLoaded = false;
  var whenLoadedFns = [];
  var allowUpgrades = false;
  var flushFn;

  function fireEvent() {
    window.WebComponents.ready = true;
    document.dispatchEvent(new CustomEvent('WebComponentsReady', { bubbles: true }));
  }

  function batchCustomElements() {
    if (window.customElements && customElements.polyfillWrapFlushCallback) {
      customElements.polyfillWrapFlushCallback(function (flushCallback) {
        flushFn = flushCallback;
        if (allowUpgrades) {
          flushFn();
        }
      });
    }
  }

  function asyncReady() {
    batchCustomElements();
    ready();
  }

  function ready() {
    // bootstrap <template> elements before custom elements
    if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
      HTMLTemplateElement.bootstrap(window.document);
    }
    polyfillsLoaded = true;
    runWhenLoadedFns().then(fireEvent);
  }

  function runWhenLoadedFns() {
    allowUpgrades = false;
    var fnsMap = whenLoadedFns.map(function(fn) {
      return fn instanceof Function ? fn() : fn;
    });
    whenLoadedFns = [];
    return Promise.all(fnsMap).then(function() {
      allowUpgrades = true;
      flushFn && flushFn();
    }).catch(function(err) {
      console.error(err);
    });
  }

  window.WebComponents = window.WebComponents || {};
  window.WebComponents.ready = window.WebComponents.ready || false;
  window.WebComponents.waitFor = window.WebComponents.waitFor || function(waitFn) {
    if (!waitFn) {
      return;
    }
    whenLoadedFns.push(waitFn);
    if (polyfillsLoaded) {
      runWhenLoadedFns();
    }
  };
  window.WebComponents._batchCustomElements = batchCustomElements;

  var name = 'webcomponents-loader.js';
  // Feature detect which polyfill needs to be imported.
  var polyfills = [];
  if (!('attachShadow' in Element.prototype && 'getRootNode' in Element.prototype) ||
    (window.ShadyDOM && window.ShadyDOM.force)) {
    polyfills.push('sd');
  }
  if (!window.customElements || window.customElements.forcePolyfill) {
    polyfills.push('ce');
  }

  var needsTemplate = (function() {
    // no real <template> because no `content` property (IE and older browsers)
    var t = document.createElement('template');
    if (!('content' in t)) {
      return true;
    }
    // broken doc fragment (older Edge)
    if (!(t.content.cloneNode() instanceof DocumentFragment)) {
      return true;
    }
    // broken <template> cloning (Edge up to at least version 17)
    var t2 = document.createElement('template');
    t2.content.appendChild(document.createElement('div'));
    t.content.appendChild(t2);
    var clone = t.cloneNode(true);
    return (clone.content.childNodes.length === 0 ||
        clone.content.firstChild.content.childNodes.length === 0);
  })();

  // NOTE: any browser that does not have template or ES6 features
  // must load the full suite of polyfills.
  if (!window.Promise || !Array.from || !window.URL || !window.Symbol || needsTemplate) {
    polyfills = ['sd-ce-pf'];
  }

  if (polyfills.length) {
    var url;
    var polyfillFile = 'bundles/webcomponents-' + polyfills.join('-') + '.js';

    // Load it from the right place.
    if (window.WebComponents.root) {
      url = window.WebComponents.root + polyfillFile;
    } else {
      var script = document.querySelector('script[src*="' + name +'"]');
      // Load it from the right place.
      url = script.src.replace(name, polyfillFile);
    }

    var newScript = document.createElement('script');
    newScript.src = url;
    // if readyState is 'loading', this script is synchronous
    if (document.readyState === 'loading') {
      // make sure custom elements are batched whenever parser gets to the injected script
      newScript.setAttribute('onload', 'window.WebComponents._batchCustomElements()');
      document.write(newScript.outerHTML);
      document.addEventListener('DOMContentLoaded', ready);
    } else {
      newScript.addEventListener('load', function () {
        asyncReady();
      });
      newScript.addEventListener('error', function () {
        throw new Error('Could not load polyfill bundle' + url);
      });
      document.head.appendChild(newScript);
    }
  } else {
    // if readyState is 'complete', script is loaded imperatively on a spec-compliant browser, so just fire WCR
    if (document.readyState === 'complete') {
      polyfillsLoaded = true;
      fireEvent();
    } else {
      // this script may come between DCL and load, so listen for both, and cancel load listener if DCL fires
      window.addEventListener('load', ready);
      window.addEventListener('DOMContentLoaded', function() {
        window.removeEventListener('load', ready);
        ready();
      });
    }
  }
})();

const seen = {};

/**
 * Provides a simple dynamic `import()` polyfill on `window._import`.
 *
 * Does not return the exports from the module: web.dev doesn't use import this way.
 *
 * @param {string} src
 * @return {!Promise<?>}
 */
window._import = (src) => {
  // Rollup generates relative paths, but they're all relative to top level.
  if (src.startsWith("./")) {
    src = src.substr(2);
  }

  // We only need this cache for Edge, as it doesn't fire onload for module
  // scripts that have already loaded, unlike every other browser. When Edge
  // support is dropped, we can just include the Promise below.
  const previous = seen[src];
  if (previous !== undefined) {
    return previous;
  }

  const p = new Promise((resolve, reject) => {
    const n = Object.assign(document.createElement("script"), {
      src: `/${src}`, // Rollup generates sources only in top-level
      type: "module",
      onload: () => resolve(),
      onerror: reject,
    });
    document.head.append(n);
  });

  seen[src] = p;
  return p;
};

const domparser = new DOMParser();

/**
 * Dynamically loads code required for the passed URL entrypoint.
 *
 * @param {string} url of the page to load modules for.
 * @return {!Promise<?>}
 */
async function loadEntrypoint(url) {
  // Catch "/measure/" but also the trailing-slash-less "/measure" for safety.
  if (url.match(/^\/measure($|\/)/)) {
    return window._import('./measure-aadb5297.js');
  }
  return window._import('./default-755b562c.js');
}

/**
 * Fetch a page as an html string.
 * @param {string} url url of the page to fetch.
 * @return {!HTMLDocument}
 */
async function getPage(url) {
  // Pass a custom header so that the Service Worker knows this request is
  // actually for a document, this is used to reply with an offline page
  const headers = new Headers();
  headers.set("X-Document", "1");

  const res = await fetch(url, {headers});
  if (!res.ok && res.status !== 404) {
    throw res.status;
  }

  const text = await res.text();
  return domparser.parseFromString(text, "text/html");
}

function normalizeUrl(url) {
  const u = new URL(url, window.location);
  let pathname = u.pathname;

  if (pathname.endsWith("/index.html")) {
    // If an internal link refers to "/foo/index.html", strip "index.html" and load.
    pathname = pathname.slice(0, -"index.html".length);
  } else if (!pathname.endsWith("/")) {
    // All web.dev pages end with "/".
    pathname = `${url}/`;
  }

  return pathname + u.search;
}

/**
 * Force the user's cursor to the target element, making it focusable if needed.
 * After the user blurs from the target, it will restore to its initial state.
 *
 * @param {?Element} el
 */
function forceFocus(el) {
  if (!el) ; else if (el.hasAttribute("tabindex")) {
    el.focus();
  } else {
    // nb. This will also operate on elements that implicitly allow focus, but
    // it should be harmless there (aside hiding the focus ring with
    // w-force-focus).
    el.tabIndex = -1;
    el.focus();
    el.classList.add("w-force-focus");

    el.addEventListener(
      "blur",
      (e) => {
        el.removeAttribute("tabindex");
        el.classList.remove("w-force-focus");
      },
      {once: true},
    );
  }
}

/**
 * Swap the current page for a new one. Assumes the current URL is the target.
 * @param {boolean} isFirstRun whether this is the first run
 * @return {!Promise<void>}
 */
async function swapContent(isFirstRun) {
  let url = window.location.pathname + window.location.search;
  const entrypointPromise = loadEntrypoint(url);

  // If we disagree with the URL we're loaded at, then replace it inline
  const normalized = normalizeUrl(url);
  if (normalized) {
    window.history.replaceState(null, null, normalized + window.location.hash);
    url = window.location.pathname + window.location.search;
  }

  // When the router boots it will always try to run a handler for the current
  // route. We don't need this for the HTML of the initial page load so we
  // cancel it, but wait for the page's JS to load.
  if (isFirstRun) {
    await entrypointPromise;
    return;
  }

  store.setState({isPageLoading: true});

  const main = document.querySelector("main");

  // Grab the new page content
  let page;
  let content;
  try {
    page = await getPage(url);
    content = page.querySelector("#content");
    if (content === null) {
      throw new Error(`no #content found: ${url}`);
    }
    await entrypointPromise;
  } finally {
    // We set the currentUrl in global state _after_ the page has loaded. This
    // is different than the History API itself which transitions immediately.
    store.setState({
      isPageLoading: false,
      currentUrl: url,
    });
  }

  ga("set", "page", window.location.pathname);
  ga("send", "pageview");

  // Remove the current #content element
  main.querySelector("#content").remove();
  main.appendChild(page.querySelector("#content"));

  // Update the page title
  document.title = page.title;
  // Update the page description
  const description = page.querySelector("meta[name=description]");
  const updatedContent = description ? description.content : "";
  document.querySelector("meta[name=description]").content = updatedContent;

  // Focus on the first title (or fallback to content itself)
  forceFocus(content.querySelector("h1, h2, h3, h4, h5, h6") || content);

  // Determine if this was the offline page
  const isOffline = Boolean(getMeta("offline", page));

  store.setState({
    isPageLoading: false,
    isOffline,
  });
}

/**
 * @fileoverview Site bootstrap code.
 *
 * This should import minimal site code, as it exists to load relevant polyfills and then the
 * correct entrypoint via our router.
 */

console.info("web.dev", config.version);

WebComponents.waitFor(async () => {
  // TODO(samthor): This isn't quite the right class name because not all Web Components are ready
  // at this point due to code-splitting.
  document.body.classList.remove("unresolved");

  // Run as long-lived router w/ history & "<a>" bindings
  // Also immediately calls `swapContent()` handler for current location,
  // loading its required JS entrypoint
  listen(swapContent);

  // If the site becomes online again, and the special offline page was shown,
  // then trigger a reload
  window.addEventListener("online", () => {
    const {isOffline} = store.getState();
    if (isOffline) {
      reload();
    }
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
//# sourceMappingURL=bootstrap.js.map
