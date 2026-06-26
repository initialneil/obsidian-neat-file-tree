'use strict';

const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULTS = {
  sticky: true,
  accentTop: true,
  accentGuides: true,
  rowHeight: 25,
};

class NeatFileTreePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new NeatFileTreeSettingTab(this.app, this));
    this.apply();
  }

  onunload() {
    document.body.classList.remove('nft-sticky', 'nft-accent-top', 'nft-accent-guides');
    document.body.style.removeProperty('--nft-row-h');
  }

  apply() {
    document.body.classList.toggle('nft-sticky', this.settings.sticky);
    document.body.classList.toggle('nft-accent-top', this.settings.accentTop);
    document.body.classList.toggle('nft-accent-guides', this.settings.accentGuides);
    document.body.style.setProperty('--nft-row-h', this.settings.rowHeight + 'px');
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
      .setName('Accent top-level folders')
      .setDesc('Show top-level folders in your accent color, in bold.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.accentTop).onChange(async (v) => {
          this.plugin.settings.accentTop = v;
          await this.plugin.save();
        })
      );

    new Setting(containerEl)
      .setName('Accent indentation guides')
      .setDesc('Tint the tree indentation guide lines with your accent color.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.accentGuides).onChange(async (v) => {
          this.plugin.settings.accentGuides = v;
          await this.plugin.save();
        })
      );

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
