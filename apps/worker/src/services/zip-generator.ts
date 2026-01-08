import type { Env } from "../env";
import { errorResponse } from "../utils/response";

const MAX_ZIP_SIZE = 25 * 1024 * 1024; // 25MB limit
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIR = 0x06054b50;

interface ZipEntry {
  name: string;
  content: string;
  size: number;
}

/**
 * Streaming ZIP generator for Cloudflare Workers
 * Uses a simple ZIP format without compression for streaming support
 */
export class ZipGenerator {
  private entries: ZipEntry[] = [];
  private totalSize = 0;
  private offset = 0;

  addFile(name: string, content: string): boolean {
    const size = new Blob([content]).size;
    if (this.totalSize + size > MAX_ZIP_SIZE) {
      return false;
    }
    this.entries.push({ name: this.sanitizePath(name), content, size });
    this.totalSize += size;
    return true;
  }

  private sanitizePath(path: string): string {
    // Prevent zip traversal attacks
    const cleaned = path.replace(/\.\./g, "").replace(/\\/g, "/");
    return cleaned.startsWith("/") ? cleaned.slice(1) : cleaned;
  }

  private encodeTimestamp(date: Date): number {
    const dosTime =
      ((date.getSeconds() >> 1) & 0x1f) |
      ((date.getMinutes() & 0x3f) << 5) |
      ((date.getHours() & 0x1f) << 11);
    const dosDate =
      ((date.getDate() & 0x1f) |
        (((date.getMonth() + 1) & 0xf) << 5) |
        ((date.getFullYear() - 1980) << 9)) <<
      16;
    return dosDate | dosTime;
  }

  private writeString(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  private writeUint16LE(value: number): Uint8Array {
    return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
  }

  private writeUint32LE(value: number): Uint8Array {
    return new Uint8Array([
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff,
    ]);
  }

  /**
   * Generate ZIP file as a single blob
   * For true streaming with compression, consider using a streaming approach
   * or Cloudflare Streams in production
   */
  async generate(): Promise<Blob> {
    const chunks: Uint8Array[] = [];
    const centralDirRecords: Uint8Array[] = [];
    const now = new Date();
    const timestamp = this.encodeTimestamp(now);

    // Local file headers and data
    for (const entry of this.entries) {
      const nameBytes = this.writeString(entry.name);
      const contentBytes = this.writeString(entry.content);
      const crc = this.crc32(contentBytes);

      // Local file header
      chunks.push(this.writeUint32LE(ZIP_LOCAL_FILE_HEADER)); // signature
      chunks.push(this.writeUint16LE(20)); // version needed
      chunks.push(this.writeUint16LE(0)); // flags
      chunks.push(this.writeUint16LE(0)); // compression (0 = store)
      chunks.push(this.writeUint16LE(timestamp)); // mod time
      chunks.push(this.writeUint16LE(timestamp >> 16)); // mod date
      chunks.push(this.writeUint32LE(crc)); // crc32
      chunks.push(this.writeUint32LE(entry.size)); // compressed size
      chunks.push(this.writeUint32LE(entry.size)); // uncompressed size
      chunks.push(this.writeUint16LE(nameBytes.length)); // name length
      chunks.push(this.writeUint16LE(0)); // extra length
      chunks.push(nameBytes); // file name
      chunks.push(contentBytes); // file content

      // Central directory record
      const headerOffset = this.offset;
      this.offset += 30 + nameBytes.length + entry.size; // Update offset for next file

      centralDirRecords.push(this.writeUint32LE(ZIP_CENTRAL_DIRECTORY_HEADER));
      centralDirRecords.push(this.writeUint16LE(20)); // version made by
      centralDirRecords.push(this.writeUint16LE(20)); // version needed
      centralDirRecords.push(this.writeUint16LE(0)); // flags
      centralDirRecords.push(this.writeUint16LE(0)); // compression
      centralDirRecords.push(this.writeUint16LE(timestamp)); // mod time
      centralDirRecords.push(this.writeUint16LE(timestamp >> 16)); // mod date
      centralDirRecords.push(this.writeUint32LE(crc)); // crc32
      centralDirRecords.push(this.writeUint32LE(entry.size)); // compressed
      centralDirRecords.push(this.writeUint32LE(entry.size)); // uncompressed
      centralDirRecords.push(this.writeUint16LE(nameBytes.length)); // name len
      centralDirRecords.push(this.writeUint16LE(0)); // extra len
      centralDirRecords.push(this.writeUint16LE(0)); // comment len
      centralDirRecords.push(this.writeUint16LE(0)); // disk number
      centralDirRecords.push(this.writeUint16LE(0)); // internal attrs
      centralDirRecords.push(this.writeUint32LE(0)); // external attrs
      centralDirRecords.push(this.writeUint32LE(headerOffset)); // offset
      centralDirRecords.push(nameBytes);
    }

    // Central directory
    const centralDirStart = this.offset;
    for (const record of centralDirRecords) {
      chunks.push(record);
      this.offset += record.length;
    }
    const centralDirSize = this.offset - centralDirStart;

    // End of central directory record
    chunks.push(this.writeUint32LE(ZIP_END_OF_CENTRAL_DIR));
    chunks.push(this.writeUint16LE(0)); // disk number
    chunks.push(this.writeUint16LE(0)); // disk with central dir
    chunks.push(this.writeUint16LE(this.entries.length)); // entries
    chunks.push(this.writeUint16LE(this.entries.length)); // total entries
    chunks.push(this.writeUint32LE(centralDirSize)); // size of central dir
    chunks.push(this.writeUint32LE(centralDirStart)); // offset of central dir
    chunks.push(this.writeUint16LE(0)); // comment length

    return new Blob(chunks as BlobPart[], { type: "application/zip" });
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
      const byte = data[i] ?? 0;
      crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  getTotalSize(): number {
    return this.totalSize;
  }
}

export type BulkFormat = "zip" | "svg-bundle" | "json-sprite";

export interface BulkOptions {
  format: BulkFormat;
  size?: number;
  color?: string;
  stroke?: number;
  rotate?: number;
  mirror?: boolean;
  class?: string;
  attributes?: Record<string, string>;
}

export async function generateBulkResponse(
  env: Env,
  entries: Array<{ name: string; source: string; svg: string }>,
  options: BulkOptions,
): Promise<Response> {
  const timestamp = new Date().toISOString().slice(0, 10);

  switch (options.format) {
    case "zip": {
      const zip = new ZipGenerator();
      let added = 0;

      for (const entry of entries) {
        const filename = `${entry.source}-${entry.name}.svg`;
        if (!zip.addFile(filename, entry.svg)) {
          break; // Size limit reached
        }
        added++;
      }

      const blob = await zip.generate();
      return new Response(blob, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="icons-${timestamp}.zip"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    case "svg-bundle": {
      // Combine all SVGs into a single SVG with symbols
      const symbols = entries
        .map(
          (entry) =>
            `<symbol id="${entry.source}-${entry.name}" viewBox="0 0 24 24">${entry.svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)?.[1] ?? entry.svg}</symbol>`,
        )
        .join("\n  ");

      const bundle = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${symbols}
  </defs>
</svg>`;

      return new Response(bundle, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    case "json-sprite": {
      const sprite = {
        format: "json-sprite",
        version: "1.0",
        generated: new Date().toISOString(),
        icons: entries.map((e) => ({
          id: `${e.source}:${e.name}`,
          source: e.source,
          name: e.name,
          svg: e.svg,
        })),
      };

      return new Response(JSON.stringify(sprite, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}
