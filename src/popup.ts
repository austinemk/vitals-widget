import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

export interface DetailItem {
  label: string;
  value: string;
}

export const VitalPopup = GObject.registerClass(
  class VitalPopup extends St.BoxLayout {
    private _background: St.Bin | null = null;

    constructor() {
      super({
        vertical: true,
        style_class: 'vital-popup',
        reactive: true,
      });

      this._buildUI();
    }

    private _buildUI(): void {
      this._background = new St.Bin({
        style_class: 'vital-popup-background',
        style: `
          background-color: rgba(0, 0, 0, 0.9);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
        `,
      });

      const container = new St.BoxLayout({
        vertical: true,
        style: 'spacing: 8px;',
      });

      this._background.set_child(container);
      this.add_child(this._background);
    }

    setDetails(title: string, details: DetailItem[]): void {
      if (!this._background) return;

      const container = new St.BoxLayout({
        vertical: true,
        style: 'spacing: 8px;',
      });

      // Add title
      const titleLabel = new St.Label({
        text: title.toUpperCase(),
        style_class: 'vital-popup-title',
        style: `
          font-weight: bold;
          font-size: 14px;
          color: #ffffff;
          margin-bottom: 4px;
        `,
      });
      container.add_child(titleLabel);

      // Add separator
      const separator = new St.Widget({
        style: `
          height: 1px;
          background-color: rgba(255, 255, 255, 0.3);
          margin: 4px 0;
        `,
      });
      container.add_child(separator);

      // Add details
      details.forEach((detail) => {
        const row = new St.BoxLayout({
          style: 'spacing: 8px;',
        });

        const labelWidget = new St.Label({
          text: detail.label + ':',
          style: `
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            min-width: 100px;
          `,
        });

        const valueWidget = new St.Label({
          text: detail.value,
          style: `
            color: #ffffff;
            font-size: 12px;
            font-weight: bold;
          `,
        });

        row.add_child(labelWidget);
        row.add_child(valueWidget);
        container.add_child(row);
      });

      this._background.set_child(container);
    }

    showAt(x: number, y: number): void {
      this.set_position(x, y);
      this.show();
      this.opacity = 0;
      this.ease({
        opacity: 255,
        duration: 200,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      });
    }

    hidePopup(): void {
      this.ease({
        opacity: 0,
        duration: 150,
        mode: Clutter.AnimationMode.EASE_IN_QUAD,
        onComplete: () => {
          this.hide();
        },
      });
    }

    destroy(): void {
      if (this._background) {
        this._background.destroy();
        this._background = null;
      }
      super.destroy();
    }
  },
);
