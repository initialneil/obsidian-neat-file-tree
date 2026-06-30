'use strict';

const { Plugin, PluginSettingTab, Setting } = require('obsidian');

// Depth 0..LEVELS-1 get distinct colors; deeper folders cycle the palette.
const LEVELS = 7;

// Each scheme: colors[i] is any CSS color for depth i (arrays shorter than LEVELS
// cycle). `var(--text-accent)` anchors a level to the theme's live accent color.
const SCHEMES = {
  aurora:  { name: 'Aurora (default)', colors: ['var(--text-accent)', '#8a7bf0', '#6a8bef', '#4f9fe6', '#33b1c9', '#2bbf9e'] },
  rainbow: { name: 'Rainbow',          colors: ['#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444'] },
  ocean:   { name: 'Ocean',            colors: ['#0ea5e9', '#2563eb', '#0891b2', '#14b8a6', '#3b82f6', '#0d9488'] },
  sunset:  { name: 'Sunset',           colors: ['#f43f5e', '#fb7185', '#f97316', '#f59e0b', '#eab308', '#ec4899'] },
  forest:  { name: 'Forest',           colors: ['#15803d', '#22c55e', '#65a30d', '#0d9488', '#84cc16', '#16a34a'] },
  mono:    { name: 'Mono (accent)',    colors: ['var(--text-accent)'] },
};

const DEFAULTS = {
  sticky: true,
  accentTop: true,
  accentGuides: true,
  scrollToActive: true,
  scheme: 'aurora',
  rowHeight: 25,
};

class NeatFileTreePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new NeatFileTreeSettingTab(this.app, this));
    this.apply();
    // Click a pinned sticky header -> scroll its real row into view instead of
    // toggling collapse. window + capture so we run before Obsidian's title
    // handler AND other plugins' capture handlers (e.g. Folder Note, which
    // stopImmediatePropagation's clicks on folder-note folders).
    this.registerDomEvent(window, 'click', this.onStickyClick.bind(this), true);
    // Opening / switching to a file -> scroll the tree to reveal it.
    this.registerEvent(this.app.workspace.on('file-open', this.onActiveFile.bind(this)));
    // Note when a tree row that opens a file is pressed — a file row, or a folder
    // bar that IS a folder note — so the resulting file-open doesn't auto-scroll a
    // target that's already right where the user clicked. mousedown + capture fires
    // before any open; a timestamp (not a path) so it also covers folder notes,
    // whose folder data-path differs from the backing file's path. 1s window so a
    // slow click (button held) still counts.
    this._treePressAt = 0;
    this.registerDomEvent(window, 'mousedown', (e) => {
      if (e.target.closest && e.target.closest(
        '.nav-files-container .nav-file-title, .nav-files-container .nav-folder-title.has-folder-note')) {
        this._treePressAt = Date.now();
      }
    }, true);
  }

  // Opening / switching to a file -> reveal it in the file tree, then re-seat it
  // just below its pinned ancestor stack (root on top, each level down, then the
  // file). The explorer is VIRTUALIZED (off-screen rows are unmounted), so we let
  // Obsidian's own reveal do the hard part — expand the file's parents and scroll
  // its row into view — then nudge for the sticky headers it doesn't know about.
  onActiveFile(file) {
    if (!this.settings.scrollToActive || !file) return;
    // Opened from a click in the tree -> already in view; flash it but don't scroll
    // (a tree click means the user is already looking right at it).
    const fromTreePress = Date.now() - this._treePressAt < 1000;
    if (!fromTreePress) {
      const leaf = this.app.workspace.getLeavesOfType('file-explorer')[0];
      // revealInFolder expands the file's parents and scrolls its row into view,
      // SYNCHRONOUSLY rendering it (unlike the reveal-active-file command, which
      // depends on the explorer's active-file having updated). Doesn't steal focus.
      if (leaf && leaf.view && leaf.view.revealInFolder) leaf.view.revealInFolder(file);
    }
    // Seat (only on a real reveal) + flash, on the NEXT frame: the virtualized row
    // renders asynchronously after a reveal, and (for folder notes) the Folder Note
    // plugin needs a tick to hide the backing-file row + mark the folder fn-is-active.
    requestAnimationFrame(() => this.actOnTarget(file.path, !fromTreePress, 8));
  }

  actOnTarget(path, doSeat, tries) {
    const el = this.resolveTarget(path);
    if (!el) {
      if (tries > 1) requestAnimationFrame(() => this.actOnTarget(path, doSeat, tries - 1));
      return;
    }
    // Seat file rows AND folder-note bars: a folder bar is itself sticky, so without
    // seating it lands at the very top, hidden under its own pinned ancestors.
    if (doSeat) this.seatBelowStack(el);
    this.flashAttention(el);
  }

  // The VISIBLE tree element representing the active file: its file row, or — when
  // that row is hidden/absent because the file is a folder note — the folder bar
  // (the Folder Note plugin marks the open note's folder with .fn-is-active).
  resolveTarget(path) {
    const explorer = document.querySelector('.workspace-leaf-content[data-type="file-explorer"]');
    if (!explorer) return null;
    const fileRow = [...explorer.querySelectorAll('.nav-file-title')].find((el) => el.dataset.path === path);
    if (fileRow && fileRow.offsetParent !== null) return fileRow; // visible file row
    return explorer.querySelector('.nav-folder-title.fn-is-active') || null; // folder note
  }

  // Seat a row (file row OR folder-note bar) right below its pinned ancestor stack.
  // We set scrollTop directly from the row's SCROLL-INVARIANT content position rather
  // than nudging relative to the measured bars — the virtual list re-renders
  // asynchronously after a reveal, so measured bar positions are transient and racing
  // them is non-deterministic.
  seatBelowStack(titleEl) {
    const scroller = titleEl.closest('.nav-files-container');
    if (!scroller) return;
    const path = titleEl.dataset.path || '';
    const padTop = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
    const contentTop = scroller.getBoundingClientRect().top + scroller.clientTop + padTop;
    // Measure the TREE-ITEM, not the title: a folder title is position:sticky, so once
    // pinned its own rect reads the stuck position, not its real place in the content.
    // The tree-item stays in normal flow, so its top is the true content position.
    const item = titleEl.closest('.tree-item') || titleEl;
    const rowInContent = item.getBoundingClientRect().top - contentTop + scroller.scrollTop;
    // Height of the pinned ancestor stack = bottom edge of the deepest pinned bar.
    // depth = ancestor folders = slashes in the path; each bar steps (rowH-1) and
    // the whole stack lifts by --nft-pad, so deepest bar bottom = (d-1)*(rowH-1) -
    // pad + rowH. 0 when sticky is off or the file is at the root.
    let offset = 0;
    if (this.settings.sticky) {
      const d = (path.match(/\//g) || []).length;
      if (d > 0) {
        const anyTitle = scroller.querySelector('.nav-folder-title');
        const pad = (anyTitle && parseFloat(getComputedStyle(anyTitle).getPropertyValue('--nft-pad'))) || 6;
        const rowH = this.settings.rowHeight;
        offset = (d - 1) * (rowH - 1) - pad + rowH;
      }
    }
    scroller.scrollTop = Math.max(0, rowInContent - offset);
  }

  // Brief accent pulse to draw the eye to a target the tree just scrolled to.
  // Used for both the revealed file (above) and the clicked folder bar (below).
  flashAttention(el) {
    if (!el) return;
    el.classList.remove('nft-attention');
    void el.offsetWidth; // restart the animation if it's already playing
    el.classList.add('nft-attention');
    const done = () => { el.classList.remove('nft-attention'); el.removeEventListener('animationend', done); };
    el.addEventListener('animationend', done);
  }

  // A sticky folder title that's scrolled past floats away from its tree-item's
  // top edge (delta > 0 = pinned, at any depth). Clicking it then reveals the
  // folder's real position (children below it) instead of folding it; scrolling
  // up by exactly delta lands it at the bottom of its remaining ancestor stack.
  onStickyClick(e) {
    if (!this.settings.sticky) return;
    const title = e.target.closest && e.target.closest('.nav-folder-title');
    if (!title) return;
    const item = title.closest('.tree-item');
    const scroller = title.closest('.nav-files-container');
    if (!item || !scroller) return;
    const delta = title.getBoundingClientRect().top - item.getBoundingClientRect().top;
    if (delta <= 1) return; // not pinned — let the normal click (fold / folder-note) happen
    e.preventDefault();
    e.stopImmediatePropagation();
    scroller.scrollBy({ top: -delta, behavior: 'smooth' });
    this.flashAttention(title);
  }

  onunload() {
    document.body.classList.remove('nft-sticky', 'nft-accent-top', 'nft-accent-guides');
    document.body.style.removeProperty('--nft-row-h');
    for (let i = 0; i < LEVELS; i++) document.body.style.removeProperty('--nft-c' + i);
  }

  apply() {
    const b = document.body;
    b.classList.toggle('nft-sticky', this.settings.sticky);
    b.classList.toggle('nft-accent-top', this.settings.accentTop);
    b.classList.toggle('nft-accent-guides', this.settings.accentGuides);
    b.style.setProperty('--nft-row-h', this.settings.rowHeight + 'px');
    const scheme = SCHEMES[this.settings.scheme] || SCHEMES.aurora;
    for (let i = 0; i < LEVELS; i++) {
      b.style.setProperty('--nft-c' + i, scheme.colors[i % scheme.colors.length]);
    }
  }

  async save() {
    await this.saveData(this.settings);
    this.apply();
  }
}

class NeatFileTreeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Sticky folder headers')
      .setDesc('Pin parent folders to the top as you scroll, stacked by depth (VSCode-style sticky scroll).')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.sticky).onChange(async (v) => {
          this.plugin.settings.sticky = v;
          await this.plugin.save();
        })
      );

    new Setting(containerEl)
      .setName('Scroll to active file')
      .setDesc('When you open, switch to, or jump to a file, reveal it in the file tree — expanding its parent folders and scrolling so they stack as sticky headers above (root first), the file just below.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.scrollToActive).onChange(async (v) => {
          this.plugin.settings.scrollToActive = v;
          await this.plugin.save();
        })
      );

    new Setting(containerEl)
      .setName('Color folder names')
      .setDesc('Color folder names by depth using the scheme below. The top level stays bold.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.accentTop).onChange(async (v) => {
          this.plugin.settings.accentTop = v;
          await this.plugin.save();
        })
      );

    new Setting(containerEl)
      .setName('Color indentation guides')
      .setDesc('Tint the tree indentation guide lines with the scheme color of the folder they descend from.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.accentGuides).onChange(async (v) => {
          this.plugin.settings.accentGuides = v;
          await this.plugin.save();
        })
      );

    new Setting(containerEl)
      .setName('Color scheme')
      .setDesc('Each level (folder name + its guide line) gets a color by depth. Pick one — the file tree updates live.');

    const picker = containerEl.createDiv();
    picker.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:-6px 0 18px;';

    const renderPicker = () => {
      picker.empty();
      for (const [key, scheme] of Object.entries(SCHEMES)) {
        const selected = this.plugin.settings.scheme === key;
        const row = picker.createDiv();
        row.style.cssText =
          'display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:8px;cursor:pointer;min-width:148px;' +
          'border:1px solid ' + (selected ? 'var(--interactive-accent)' : 'var(--background-modifier-border)') + ';' +
          'background:' + (selected ? 'var(--background-modifier-hover)' : 'transparent') + ';';
        const label = row.createDiv({ text: (selected ? '✓ ' : '') + scheme.name });
        label.style.cssText = 'font-size:var(--font-ui-smaller);font-weight:' + (selected ? '600' : '400') + ';';
        const strip = row.createDiv();
        strip.style.cssText = 'display:flex;gap:3px;';
        for (let i = 0; i < LEVELS; i++) {
          const sw = strip.createDiv();
          sw.style.cssText = 'width:16px;height:16px;border-radius:3px;background:' + scheme.colors[i % scheme.colors.length] + ';';
        }
        row.onclick = async () => {
          this.plugin.settings.scheme = key;
          await this.plugin.save();
          renderPicker();
        };
      }
    };
    renderPicker();

    new Setting(containerEl)
      .setName('Row height (px)')
      .setDesc('Match your file list row height so sticky headers stack without gaps or overlap. Default 25. Increase if you use a larger interface font.')
      .addText((txt) =>
        txt
          .setPlaceholder('25')
          .setValue(String(this.plugin.settings.rowHeight))
          .onChange(async (v) => {
            const n = parseFloat(v);
            if (!isNaN(n) && n > 0) {
              this.plugin.settings.rowHeight = n;
              await this.plugin.save();
            }
          })
      );
  }
}

module.exports = NeatFileTreePlugin;
