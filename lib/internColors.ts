export const PRESET_HEX = ["#00CCFF", "#7C3AED", "#FFD400", "#EC4899", "#DC2626", "#FF7A00", "#1A2D6E", "#00B4A6", "#FFB6C8"];
export const PRESET_RGBA = [
  "rgba(0,204,255,0.12)", "rgba(124,58,237,0.12)", "rgba(255,212,0,0.12)",
  "rgba(236,72,153,0.12)", "rgba(220,38,38,0.12)", "rgba(255,122,0,0.12)",
  "rgba(26,45,110,0.12)", "rgba(0,180,166,0.12)", "rgba(255,182,200,0.12)",
];

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function getInternColor(index: number): string {
  if (index < PRESET_HEX.length) return PRESET_HEX[index];
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 0.65, 0.52);
}

export function getInternBgRgba(index: number): string {
  if (index < PRESET_RGBA.length) return PRESET_RGBA[index];
  const hue = (index * 137.508) % 360;
  return `hsla(${hue.toFixed(1)}, 65%, 52%, 0.12)`;
}

// user ID 기준 정렬 후 인덱스 맵 생성 → 모든 탭에서 동일한 색상 보장
export function buildColorMap(users: { id: string }[]): Map<string, number> {
  const sorted = [...users].sort((a, b) => a.id.localeCompare(b.id));
  const map = new Map<string, number>();
  sorted.forEach((u, i) => map.set(u.id, i));
  return map;
}
