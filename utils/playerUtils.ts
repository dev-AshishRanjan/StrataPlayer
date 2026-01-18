
export const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const fetchVttWithRetry = async (url: string, retries = 3, timeout = 20000): Promise<string> => {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e: any) {
      clearTimeout(id);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Failed');
}

export interface ThumbnailCue {
  start: number;
  end: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const parseVTT = async (url: string, notify: (msg: any) => void): Promise<ThumbnailCue[]> => {
  try {
    const text = await fetchVttWithRetry(url);
    const lines = text.split('\n');
    const cues: ThumbnailCue[] = [];
    let start: number | null = null;
    let end: number | null = null;
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    const parseTime = (t: string) => {
      const parts = t.split(':');
      let s = 0;
      if (parts.length === 3) {
        s += parseFloat(parts[0]) * 3600;
        s += parseFloat(parts[1]) * 60;
        s += parseFloat(parts[2]);
      } else {
        s += parseFloat(parts[0]) * 60;
        s += parseFloat(parts[1]);
      }
      return s;
    };
    for (let line of lines) {
      line = line.trim();
      if (line.includes('-->')) {
        const times = line.split('-->');
        start = parseTime(times[0].trim());
        end = parseTime(times[1].trim());
      } else if (start !== null && end !== null && line.length > 0) {
        let [urlPart, hash] = line.split('#');
        if (!urlPart.match(/^https?:\/\//) && !urlPart.startsWith('data:')) urlPart = baseUrl + urlPart;
        let x = 0, y = 0, w = 0, h = 0;
        if (hash && hash.startsWith('xywh=')) {
          const coords = hash.replace('xywh=', '').split(',');
          if (coords.length === 4) {
            x = parseInt(coords[0]); y = parseInt(coords[1]); w = parseInt(coords[2]); h = parseInt(coords[3]);
          }
        }
        if (w > 0 && h > 0) cues.push({ start, end, url: urlPart, x, y, w, h });
        start = null; end = null;
      }
    }
    return cues;
  } catch (e: any) {
    notify({ type: 'warning', message: `Failed to load thumbnails`, duration: 4000 });
    return [];
  }
};
