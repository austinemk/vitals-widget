import Gio from 'gi://Gio';

Gio._promisify(
  Gio.File.prototype,
  'load_contents_async',
  'load_contents_finish',
);

export interface DetailItem {
  label: string;
  value: string;
}

export class CPUSensor {
  private _lastTotal: number = 0;
  private _lastIdle: number = 0;
  private _currentUsage: number = 0;
  private _cores: number = 0;
  private _modelName: string = 'Unknown';

  constructor() {
    this._updateStats();
    this._getCPUInfo();
  }

  async getValue(): Promise<number> {
    this._currentUsage = await this._updateStats();
    return this._currentUsage;
  }

  // Reads a single integer value from a sysfs path
  private async _readFreqFile(path: string): Promise<string> {
    try {
      const file = Gio.File.new_for_path(path);
      const [contents] = await file.load_contents_async(null);
      if (!contents) return 'N/A';

      const freqKHz = parseInt(
        new TextDecoder().decode(contents as unknown as Uint8Array).trim(),
      );
      if (isNaN(freqKHz)) return 'N/A';

      if (freqKHz >= 1000000) {
        return `${(freqKHz / 1000000).toFixed(2)} GHz`;
      }
      return `${Math.round(freqKHz / 1000)} MHz`;
    } catch (e) {
      return 'N/A';
    }
  }

  async getDetails(): Promise<DetailItem[]> {
    const details: DetailItem[] = [
      { label: 'Usage', value: `${Math.round(this._currentUsage)}%` },
      { label: 'Model', value: this._modelName },
      { label: 'Cores', value: this._cores.toString() },
    ];

    // Fetch Frequency Details
    const basePath = '/sys/devices/system/cpu/cpu0/cpufreq';
    const currentFreq = await this._readFreqFile(
      `${basePath}/scaling_cur_freq`,
    );
    const minFreq = await this._readFreqFile(`${basePath}/scaling_min_freq`);
    const maxFreq = await this._readFreqFile(`${basePath}/scaling_max_freq`);

    details.push(
      { label: 'Frequency', value: currentFreq },
      { label: 'Min Freq', value: minFreq },
      { label: 'Max Freq', value: maxFreq },
    );

    // Get per-core usage
    /*try {
      const file = Gio.File.new_for_path('/proc/stat');
      const [contents] = await file.load_contents_async(null);
      if (contents) {
        const data = new TextDecoder().decode(
          contents as unknown as Uint8Array,
        );
        const lines = data.split('\n');
        //per core usage
        for (let i = 1; i <= this._cores; i++) {
          
        }
      }
    } catch (e) {
      // Ignore errors
    }*/

    return details;
  }

  private async _getCPUInfo(): Promise<void> {
    try {
      const file = Gio.File.new_for_path('/proc/cpuinfo');
      const [contents] = await file.load_contents_async(null);
      if (!contents) return;
      const data = new TextDecoder().decode(contents as unknown as Uint8Array);
      const lines = data.split('\n');

      let coreCount = 0;
      for (const line of lines) {
        if (line.startsWith('model name')) {
          const match = line.match(/:\s*(.+)/);
          if (match && this._modelName === 'Unknown') {
            this._modelName = match[1].trim();
          }
        } else if (line.startsWith('processor')) {
          coreCount++;
        }
      }
      this._cores = coreCount;
    } catch (e) {
      // Ignore errors
    }
  }

  private async _updateStats(): Promise<number> {
    try {
      const file = Gio.File.new_for_path('/proc/stat');
      const [contents] = await file.load_contents_async(null);
      if (!contents) return 0;
      const data = new TextDecoder().decode(contents as unknown as Uint8Array);
      const lines = data.split('\n');
      const cpuLine = lines[0];

      if (!cpuLine.startsWith('cpu ')) return 0;

      const times = cpuLine
        .split(/\s+/)
        .slice(1)
        .map((x) => parseInt(x))
        .filter((x) => !isNaN(x));

      if (times.length < 4) return 0;

      const idle = times[3];
      const total = times.reduce((acc, val) => acc + val, 0);

      const totalDelta = total - this._lastTotal;
      const idleDelta = idle - this._lastIdle;

      this._lastTotal = total;
      this._lastIdle = idle;

      if (totalDelta === 0) return 0;
      return (1 - idleDelta / totalDelta) * 100;
    } catch (e) {
      return 0;
    }
  }
}
