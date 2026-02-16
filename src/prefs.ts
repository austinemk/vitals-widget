import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { VitalType, getVitalDisplayName } from './config.js';

export default class VitalsWidgetPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = this.getSettings();

    // --- GENERAL PAGE ---
    const generalPage = new Adw.PreferencesPage({
      title: 'General',
      icon_name: 'preferences-system-symbolic',
    });

    window.add(generalPage);

    // Position Group
    const positionGroup = new Adw.PreferencesGroup({
      title: 'Widget Position',
      description:
        'Position on screen (drag widget to reposition or use sliders)',
    });

    generalPage.add(positionGroup);

    this._addSpinRow(
      positionGroup,
      settings,
      'position-x',
      'Horizontal Position (%)',
      0,
      100,
    );

    this._addSpinRow(
      positionGroup,
      settings,
      'position-y',
      'Vertical Position (%)',
      0,
      100,
    );

    // visibility group
    // Find the Layout & Container Group and modify it
    const visibilityGroup = new Adw.PreferencesGroup({
      title: 'Visibility & Interaction',
      description:
        'Control what elements are visible. At least one must be active.',
    });
    generalPage.add(visibilityGroup);

    const showRingsRow = new Adw.SwitchRow({ title: 'Show Rings' });
    const showLabelsRow = new Adw.SwitchRow({ title: 'Show Text Labels' });
    const popupRow = new Adw.SwitchRow({
      title: 'Enable Details Popup',
      subtitle: 'Show details when clicking a sensor',
    });

    // Bind settings
    settings.bind(
      'show-rings',
      showRingsRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT,
    );
    settings.bind(
      'show-labels',
      showLabelsRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT,
    );
    settings.bind(
      'enable-popups',
      popupRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT,
    );

    // Logic: Prevent both being disabled
    showRingsRow.connect('notify::active', () => {
      if (!showRingsRow.active && !showLabelsRow.active) {
        showLabelsRow.active = true;
      }
    });

    showLabelsRow.connect('notify::active', () => {
      if (!showLabelsRow.active && !showRingsRow.active) {
        showRingsRow.active = true;
      }
    });

    visibilityGroup.add(showRingsRow);
    visibilityGroup.add(showLabelsRow);
    visibilityGroup.add(popupRow);

    // Layout & Container Group
    const layoutGroup = new Adw.PreferencesGroup({
      title: 'Layout & Container',
      description: 'Main widget container and spacing settings',
    });
    generalPage.add(layoutGroup);

    // orientation row
    const orientationRow = new Adw.ComboRow({
      title: 'Layout Orientation',
      model: new Gtk.StringList({ strings: ['Horizontal', 'Vertical'] }),
    });

    // Load initial state
    orientationRow.selected =
      settings.get_string('orientation') === 'vertical' ? 1 : 0;

    // Connect signal to save changes
    orientationRow.connect('notify::selected', () => {
      const value = orientationRow.selected === 1 ? 'vertical' : 'horizontal';
      settings.set_string('orientation', value);
    });

    layoutGroup.add(orientationRow);

    const fontSizeRow = new Adw.SpinRow({
      title: 'Label Font Size',
      adjustment: new Gtk.Adjustment({
        lower: 6,
        upper: 24,
        step_increment: 1,
      }),
    });

    settings.bind(
      'label-font-size',
      fontSizeRow,
      'value',
      Gio.SettingsBindFlags.DEFAULT,
    );
    layoutGroup.add(fontSizeRow);

    this._addSpinRow(
      layoutGroup,
      settings,
      'vital-spacing',
      'Spacing Between Vitals',
      0,
      100,
    );

    this._addSpinRow(
      layoutGroup,
      settings,
      'padding-horizontal',
      'Horizontal Padding',
      0,
      100,
    );

    this._addSpinRow(
      layoutGroup,
      settings,
      'padding-vertical',
      'Vertical Padding',
      0,
      100,
    );

    this._addSpinRow(
      layoutGroup,
      settings,
      'border-radius',
      'Border Radius',
      0,
      50,
    );

    this._addColorRow(
      layoutGroup,
      settings,
      'background-color',
      'Background Color',
    );
    this._addColorRow(layoutGroup, settings, 'border-color', 'Border Color');

    // vitals Orientation row
    const vitalOrientRow = new Adw.ComboRow({
      title: 'Vital Content Orientation',
      subtitle: 'Stacking of icon and label inside each vital',
      model: new Gtk.StringList({ strings: ['Horizontal', 'Vertical'] }),
    });

    // Load initial state
    vitalOrientRow.selected =
      settings.get_string('vital-orientation') === 'vertical' ? 1 : 0;

    // Connect signal to save changes
    vitalOrientRow.connect('notify::selected', () => {
      const value = vitalOrientRow.selected === 1 ? 'vertical' : 'horizontal';
      settings.set_string('vital-orientation', value);
    });

    layoutGroup.add(vitalOrientRow);

    // Rings & Icons Group
    const ringsGroup = new Adw.PreferencesGroup({
      title: 'Rings & Icons',
      description: 'Global settings for circular indicators',
    });

    generalPage.add(ringsGroup);

    this._addSpinRow(
      ringsGroup,
      settings,
      'ring-diameter',
      'Ring Diameter',
      20,
      200,
    );

    this._addSpinRow(
      ringsGroup,
      settings,
      'ring-width',
      'Ring Thickness',
      1,
      20,
    );

    this._addColorRow(
      ringsGroup,
      settings,
      'inactive-ring-color',
      'Inactive Ring Color',
    );

    this._addColorRow(
      ringsGroup,
      settings,
      'icon-color',
      'Icon and Label Color',
    );

    // --- DONATION GROUP ---
    const supportGroup = new Adw.PreferencesGroup({
      title: 'Support Development',
    });

    generalPage.add(supportGroup);

    const donateRow = new Adw.ActionRow({
      title: 'Support vitals Widgets',
      subtitle: '♥︎ Support the maintenance of this extension via Ko-fi',
      activatable: true,
    });

    const donateIcon = new Gtk.Image({
      icon_name: 'external-link-symbolic',
    });

    donateRow.add_suffix(donateIcon);

    donateRow.connect('activated', () => {
      Gio.AppInfo.launch_default_for_uri('https://ko-fi.com/ctrln3rd', null);
    });
    supportGroup.add(donateRow);
    // ---------------------------

    // --- VITALS PAGE ---
    const vitalsPage = new Adw.PreferencesPage({
      title: 'Vitals',
      icon_name: 'applications-system-symbolic',
    });
    window.add(vitalsPage);

    Object.values(VitalType).forEach((type) => {
      this._createVitalGroup(vitalsPage, settings, type);
    });
  }

  //Helper to create a setting group for a specific vital type
  private _createVitalGroup(
    page: Adw.PreferencesPage,
    settings: Gio.Settings,
    type: VitalType,
  ): void {
    const group = new Adw.PreferencesGroup({
      title: getVitalDisplayName(type),
    });
    page.add(group);

    const enableRow = new Adw.SwitchRow({
      title: 'Show',
      subtitle: `Display ${getVitalDisplayName(type)} indicator`,
    });

    settings.bind(
      `show-${type}`,
      enableRow,
      'active',
      Gio.SettingsBindFlags.DEFAULT,
    );
    group.add(enableRow);

    this._addColorRow(group, settings, `${type}-color`, 'Ring Color');

    // Temperature Unit selection specifically for the temp group
    if (type === 'temp') {
      const tempUnitRow = new Adw.ComboRow({
        title: 'Temperature Unit',
        model: new Gtk.StringList({
          strings: ['Percentage', 'Celsius', 'Fahrenheit'],
        }),
      });

      // Map gschema enum values to row indices
      const unitValue = settings.get_string('temp-unit');
      tempUnitRow.selected =
        unitValue === 'fahrenheit' ? 2 : unitValue === 'celcius' ? 1 : 0;

      tempUnitRow.connect('notify::selected', () => {
        const values = ['percentage', 'celcius', 'fahrenheit'];
        settings.set_string('temp-unit', values[tempUnitRow.selected]);
      });

      group.add(tempUnitRow);
    }

    this._addSpinRow(
      group,
      settings,
      `${type}-update-interval`,
      'Update Interval (ms)',
      500,
      300000,
      500,
    );
  }

  //Helper to add a SpinRow for numeric settings
  private _addSpinRow(
    group: Adw.PreferencesGroup,
    settings: Gio.Settings,
    key: string,
    title: string,
    lower: number,
    upper: number,
    step = 1,
  ): void {
    const row = new Adw.SpinRow({
      title,
      adjustment: new Gtk.Adjustment({ lower, upper, step_increment: step }),
    });

    settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
    group.add(row);
  }

  //Helper to add a color picker row
  private _addColorRow(
    group: Adw.PreferencesGroup,
    settings: Gio.Settings,
    key: string,
    title: string,
  ): void {
    const row = new Adw.ActionRow({ title });
    const colorButton = new Gtk.ColorButton();
    colorButton.set_use_alpha(true);

    const colorStr = settings.get_string(key);
    const rgba = new Gdk.RGBA();
    rgba.parse(colorStr);
    colorButton.set_rgba(rgba);

    colorButton.connect('color-set', () => {
      const color = colorButton.get_rgba();
      const colorString = `rgba(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)}, ${color.alpha})`;
      settings.set_string(key, colorString);
    });

    row.add_suffix(colorButton);
    row.set_activatable_widget(colorButton);
    group.add(row);
  }
}
