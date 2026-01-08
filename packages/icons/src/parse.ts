export interface SvgMeta {
  width: number;
  height: number;
  viewBox: string;
}

const parseNumber = (value?: string) => {
  if (!value) return null;
  const match = value.match(/[0-9.]+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseSvgMeta = (svg: string): SvgMeta => {
  const tagMatch = svg.match(/<svg\b[^>]*>/i);
  if (!tagMatch) {
    return { width: 24, height: 24, viewBox: "0 0 24 24" };
  }

  const tag = tagMatch[0];
  const width = parseNumber(tag.match(/width="([^"]+)"/i)?.[1]) ?? 24;
  const height = parseNumber(tag.match(/height="([^"]+)"/i)?.[1]) ?? 24;
  const viewBox =
    tag.match(/viewBox="([^"]+)"/i)?.[1] ?? `0 0 ${width} ${height}`;

  return { width, height, viewBox };
};
