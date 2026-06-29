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
