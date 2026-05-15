import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { VitalItem } from './vitals.js';
import { VitalType } from './config.js';
import { CPUSensor } from './sensors/cpu.js';
import { RAMSensor } from './sensors/ram.js';
import { StorageSensor } from './sensors/storage.js';
import { TempSensor } from './sensors/temp.js';
import { GPUSensor } from './sensors/gpu.js';

type VitalItemInstance = InstanceType<typeof VitalItem>;

const VitalsWidget = GObject.registerClass(
  class VitalsWidget extends St.BoxLayout {
    private _vitals: Map<VitalType, VitalItemInstance>;
    private _sensors: Map<VitalType, any>;
    private _settings: any;
    private _intervals: Map<VitalType, number> = new Map();
    private _handlerIds: number[] = [];

    constructor(settings: any) {
      super({
        style_class: 'vitals-widget-container',
        reactive: true,
        can_focus: true,
      });

      this._settings = settings;
      this._vitals = new Map();
      this._sensors = new Map();

      this._buildUI();
      this._initializeSensors();
      this._connectSettings();
      this._updatePosition();
      this._startUpdates();
    }

    private _buildUI(): void {
      this._updateContainerStyle();
    }

    private _initializeSensors(): void {
      this._sensors.set(VitalType.CPU, new CPUSensor());
      this._sensors.set(VitalType.RAM, new RAMSensor());
      this._sensors.set(VitalType.STORAGE, new StorageSensor());
      this._sensors.set(VitalType.TEMP, new TempSensor());
      this._sensors.set(VitalType.GPU, new GPUSensor());

      Object.values(VitalType).forEach((type) => {
        const sensor = this._sensors.get(type); // Get the specific sensor
        const vital = new VitalItem(
          type,
          this._settings,
          sensor,
        ) as VitalItemInstance;
        this._vitals.set(type, vital);
        this.add_child(vital);
      });

      this._updateVitalsVisibility();
    }

    private _connectSettings(): void {
      // Track every handler ID to disconnect them in destroy()
      this._handlerIds.push(
        this._settings.connect('changed::position-x', () =>
          this._updatePosition(),
        ),
      );
      this._handlerIds.push(
        this._settings.connect('changed::position-y', () =>
          this._updatePosition(),
        ),
      );

      const styleKeys = [
        'background-color',
        'border-color',
        'border-radius',
        'vital-spacing',
        'padding-horizontal',
        'padding-vertical',
        'orientation',
      ];
      styleKeys.forEach((key) => {
        this._handlerIds.push(
          this._settings.connect(`changed::${key}`, () => {
            if (this._vitals.size === 0) return;
            this._updateContainerStyle();
            this.vertical =
              this._settings.get_string('orientation') === 'vertical';
          }),
        );
      });

      Object.values(VitalType).forEach((type) => {
        this._handlerIds.push(
          this._settings.connect(`changed::show-${type}`, () =>
            this._updateVitalsVisibility(),
          ),
        );
        this._handlerIds.push(
          this._settings.connect(`changed::${type}-update-interval`, () => {
            this._restartVitalTimer(type);
          }),
        );
      });
    }

    private _updateContainerStyle(): void {
      const bgColor = this._settings.get_string('background-color');
      const borderColor = this._settings.get_string('border-color');
      const borderRadius = this._settings.get_int('border-radius');
      const spacing = this._settings.get_int('vital-spacing');
      const padH = this._settings.get_int('padding-horizontal');
      const padV = this._settings.get_int('padding-vertical');

      this.set_style(`
            background-color: ${bgColor};
            border: 2px solid ${borderColor};
            border-radius: ${borderRadius}px;
            padding: ${padV}px ${padH}px;
            spacing: ${spacing}px;
        `);
    }

    private _updateVitalsVisibility(): void {
      this._vitals.forEach((vital, type) => {
        vital.visible = this._settings.get_boolean(`show-${type}`);
      });
    }

    private _updatePosition(): void {
      const monitor = Main.layoutManager.primaryMonitor;
      if (!monitor) return;
      const x = (monitor.width * this._settings.get_double('position-x')) / 100;
      const y =
        (monitor.height * this._settings.get_double('position-y')) / 100;
      this.set_position(Math.round(x), Math.round(y));
    }

    private _startUpdates(): void {
      this._clearTimers();
      this._sensors.forEach((sensor, type) => {
        this._restartVitalTimer(type);
      });
    }

    private _performSensorUpdate(type: VitalType): void {
      const vital = this._vitals.get(type);
      const sensor = this._sensors.get(type);

      if (this._vitals.size > 0 && vital && vital.visible && sensor) {
        sensor
          .getValue()
          .then((value: number) => {
            vital.update(value);
          })
          .catch((err: any) => {
            console.error(`[VitalsWidget] Error getting ${type} value:`, err);
            vital.update(0);
          });
      }
    }

    private _startRecurringTimer(type: VitalType, interval: number): number {
      const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
          const vital = this._vitals.get(type);
          const sensor = this._sensors.get(type);

          if (this._vitals.size > 0 && vital && vital.visible && sensor) {
            this._performSensorUpdate(type);
            return GLib.SOURCE_CONTINUE;
          }
          return GLib.SOURCE_REMOVE;
        }
      );
      this._intervals.set(type, id);
      return id;
    }

    private _restartVitalTimer(type: VitalType): void {
      const oldId = this._intervals.get(type);
      if (oldId) GLib.source_remove(oldId);

      const interval = this._settings.get_int(`${type}-update-interval`);

      const initialDelay = 500;
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, initialDelay, () => {
        this._performSensorUpdate(type);
        this._startRecurringTimer(type, interval);
        return GLib.SOURCE_REMOVE;
      });
    }

    private _clearTimers(): void {
      this._intervals.forEach((id) => GLib.source_remove(id));
      this._intervals.clear();
    }

    destroy(): void {
      // 1. Kill timers
      this._clearTimers();

      // 2. Disconnect all settings signals
      this._handlerIds.forEach((id) => this._settings.disconnect(id));
      this._handlerIds = [];

      // 3. Destroy children
      this._sensors.forEach((sensor) => sensor.destroy?.());
      this._vitals.forEach((vital) => vital.destroy());
      this._vitals.clear();

      super.destroy();
    }
  },
);

export default class VitalsWidgetExtension extends Extension {
  private _widget: InstanceType<typeof VitalsWidget> | null = null;

  enable(): void {
    const settings = this.getSettings();
    this._widget = new VitalsWidget(settings);
    Main.layoutManager._backgroundGroup.add_child(this._widget);
  }

  disable(): void {
    if (this._widget) {
      Main.layoutManager._backgroundGroup.remove_child(this._widget);
      this._widget.destroy();
      this._widget = null;
    }
  }
}
