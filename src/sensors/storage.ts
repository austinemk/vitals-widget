import Gio from 'gi://Gio';

Gio._promisify(
  Gio.Subprocess.prototype,
  'communicate_utf8_async',
  'communicate_utf8_finish',
);

export interface DetailItem {
  label: string;
  value: string;
}

export class StorageSensor {
  private _currentUsage: number = 0;
  private _total: string = '0';
  private _used: string = '0';
  private _available: string = '0';

  async getValue(): Promise<number> {
    try {
      const path = '/';
      const proc = Gio.Subprocess.new(
        ['df', '-h', path],
        Gio.SubprocessFlags.STDOUT_PIPE,
      );
      const [stdout] = await proc.communicate_utf8_async(null, null);

      if (!stdout) return 0;
      const lines = stdout.split('\n');
      if (lines.length < 2) return 0;

      const columns = lines[1].split(/\s+/);

      // Extract values: Filesystem Size Used Avail Use% Mounted
      if (columns.length >= 5) {
        this._total = columns[1];
        this._used = columns[2];
        this._available = columns[3];

        const usageStr = columns[4];
        this._currentUsage = usageStr ? parseInt(usageStr) : 0;
      }

      return this._currentUsage;
    } catch (e) {
      return 0;
    }
  }

  async getDetails(): Promise<DetailItem[]> {
    const details: DetailItem[] = [
      { label: 'Usage', value: `${Math.round(this._currentUsage)}%` },
      { label: 'Total', value: this._total },
      { label: 'Used', value: this._used },
      { label: 'Available', value: this._available },
    ];

    // Get additional disk info
    try {
      const proc = Gio.Subprocess.new(
        ['df', '-h', '-T', '/'],
        Gio.SubprocessFlags.STDOUT_PIPE,
      );
      const [stdout] = await proc.communicate_utf8_async(null, null);

      if (stdout) {
        const lines = stdout.split('\n');
        if (lines.length >= 2) {
          const columns = lines[1].split(/\s+/);
          // Filesystem Type Size Used Avail Use% Mounted
          if (columns.length >= 2) {
            details.push({ label: 'Filesystem', value: columns[0] });
            details.push({ label: 'Type', value: columns[1] });
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return details;
  }
}
