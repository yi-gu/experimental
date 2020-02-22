import './chunk-1b0393c2.js';
import { B as BaseElement, h as html } from './chunk-6a298af6.js';

/**
 * @return {boolean} whether Web Share is supported on this browser
 */
function isWebShareSupported() {
  if (!("share" in navigator)) {
    return false;
  }

  // Ensure that the user would be able to share a reference URL.
  // This is part of Web Share Level 2, so feature-detect it:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=903010
  if ("canShare" in navigator) {
    const url = `https://${window.location.hostname}`;
    return navigator.canShare({url});
  }

  return true;
}

/**
 * @fileoverview Element that renders configurable per-page actions.
 */

/**
 * Renders configurable per-page actions. This is expected to be created by
 * page content.
 *
 * @extends {BaseElement}
 * @final
 */
class Actions extends BaseElement {
  static get properties() {
    return {
      // Pipe-separated list of actions to support
      actions: {type: String},
      // Pipe-seperated handles of authors of this page, including "@" if e.g. a Twitter user
      authors: {type: String},
      // Whether the Web Share API is supported
      webShareSupported: {type: Boolean},
    };
  }

  constructor() {
    super();
    this.webShareSupported = isWebShareSupported();
  }

  onWebShare() {
    navigator.share({
      url: this.shareUrl,
      text: this.shareText,
    });
  }

  onTwitterShare(e) {
    e.preventDefault();
    window.open(e.target.href, "share-twitter", "width=550,height=235");
  }

  get shareUrl() {
    return window.location.href;
  }

  get shareText() {
    let authorText = "";

    const authors = this._splitPipes(this.authors);
    if (authors.length) {
      // ListFormat isn't widely supported; feature-detect it first
      if ("ListFormat" in Intl) {
        const il = new Intl.ListFormat("en");
        authorText = ` by ${il.format(authors)}`;
      } else {
        authorText = ` by ${authors.join(", ")}`;
      }
    }

    return document.title + authorText;
  }

  get shareTemplate() {
    if (this.webShareSupported) {
      return html`
        <button
          class="w-actions__fab w-actions__fab--share gc-analytics-event"
          data-category="web.dev"
          data-label="share, web"
          data-action="click"
          @click=${this.onWebShare}
        >
          <span>Share</span>
        </button>
      `;
    }

    // Otherwise, fall back to a Twitter popup.
    const url = new URL("https://twitter.com/share");
    url.searchParams.set("url", this.shareUrl);
    url.searchParams.set("text", this.shareText);
    return html`
      <a
        class="w-actions__fab w-actions__fab--share gc-analytics-event"
        data-category="web.dev"
        data-label="share, twitter"
        data-action="click"
        href="${url}"
        target="_blank"
        @click=${this.onTwitterShare}
      >
        <span>Share</span>
      </a>
    `;
  }

  get subscribeTemplate() {
    return html`
      <a
        class="w-actions__fab w-actions__fab--subscribe gc-analytics-event"
        data-category="web.dev"
        data-label="subscribe, newsletter"
        data-action="click"
        href="https://web.dev/subscribe"
        target="_blank"
      >
        <span>Subscribe</span>
      </a>
    `;
  }

  render() {
    const actions = this._splitPipes(this.actions);
    const parts = [];

    if (actions.indexOf("share") !== -1) {
      parts.push(this.shareTemplate);
    }

    if (actions.indexOf("subscribe") !== -1) {
      parts.push(this.subscribeTemplate);
    }

    return html`
      <div class="w-actions">
        ${parts}
      </div>
    `;
  }

  /**
   * @param {string} raw string separated by "|" symbols
   * @return {!Array<string>}
   */
  _splitPipes(raw) {
    return raw
      .split(/\|/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

customElements.define("web-actions", Actions);

/**
 * @fileoverview Element that renders codelab expandable/collapsible codelab
 * instructions and an embedded Glitch iframe.
 */

/**
 * Render codelab instructions and Glitch
 * @extends {BaseElement}
 * @final
 */
class Codelab extends BaseElement {
  static get properties() {
    return {
      // Name of the glitch to render in the iframe.
      glitch: {type: String},
      // The file to show when the Glitch renders.
      path: {type: String},
    };
  }

  constructor() {
    super();

    this.glitch = "";
    this.path = "index.html";
  }

  createRenderRoot() {
    // Normally LitElement will remove any light DOM children that are not
    // slotted when we call render().
    // Because we don't use slots, and we _do_ want to preserve this element's
    // light DOM children (they hold the codelab instructions) we create a new
    // renderRoot for LitElement.
    // https://lit-element.polymer-project.org/guide/templates#renderroot
    // This will render the glitch element as a sibling to the existing light
    // DOM children.
    const container = document.createElement("div");
    container.className = "web-codelab__glitch";
    this.appendChild(container);
    return container;
  }

  get src() {
    if (!this.glitch) {
      return;
    }

    let url = `https://glitch.com/embed/?attributionHidden=true`;

    if (this.path) {
      url += `&path=${encodeURI(this.path)}`;
    }

    url += `#!/embed/${encodeURI(this.glitch)}`;

    return url;
  }

  render() {
    return html`
      <div style="height: 100%; width: 100%;">
        <iframe
          allow="geolocation; microphone; camera; midi; encrypted-media"
          src="${this.src}"
          alt="Embedded glitch ${this.glitch}"
          style="height: 100%; width: 100%; border: 0;"
        >
        </iframe>
      </div>
    `;
  }
}

customElements.define("web-codelab", Codelab);
//# sourceMappingURL=default-755b562c.js.map
