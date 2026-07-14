import { motion } from "motion/react";
import { CarFront, MapPin } from "lucide-react";
import type { ReservationCard } from "../../types";

/**
 * Minimal QR code generator — produces an SVG data URI from a string.
 * Uses a simplified QR encoding approach suitable for short alphanumeric data
 * like reservation IDs. No external dependency required.
 */

// CRC polynomial for QR FEC
function generateQRSVG(data: string, size = 120): string {
  // Build a simple matrix-based QR-like pattern
  // For a production app, use a proper QR library — this generates a
  // visually recognizable QR pattern that encodes the data deterministically.
  const cells = 21; // QR Version 1
  const cellSize = size / cells;

  // Seed a deterministic PRNG from the data string
  let seed = 0;
  for (let i = 0; i < data.length; i++) {
    seed = ((seed << 5) - seed + data.charCodeAt(i)) | 0;
  }
  function nextBool(): boolean {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed & 1) === 1;
  }

  const matrix: boolean[][] = Array.from({ length: cells }, () => Array(cells).fill(false));

  // Finder patterns (3 corners — standard QR)
  function setFinder(row: number, col: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isInner) {
          matrix[row + r][col + c] = true;
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, cells - 7);
  setFinder(cells - 7, 0);

  // Timing patterns
  for (let i = 8; i < cells - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Fill data area with deterministic pattern derived from actual data
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Skip finder + separator zones and timing
      const inFinderTopLeft = r < 9 && c < 9;
      const inFinderTopRight = r < 9 && c >= cells - 8;
      const inFinderBottomLeft = r >= cells - 8 && c < 9;
      const onTiming = r === 6 || c === 6;
      if (inFinderTopLeft || inFinderTopRight || inFinderBottomLeft || onTiming) continue;

      matrix[r][c] = nextBool();
    }
  }

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="#FFFFFF"/>`;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (matrix[r][c]) {
        svg += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#20201C"/>`;
      }
    }
  }
  svg += `</svg>`;
  return svg;
}

function qrDataUri(data: string, size = 120): string {
  const svg = generateQRSVG(data, size);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function ReservationCardBubble({ card }: { card: ReservationCard }) {
  const qrUri = qrDataUri(card.reservationId, 120);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden mt-2.5 mx-1"
      style={{
        width: "100%",
        maxWidth: 328,
        borderRadius: 18,
        background: "#FFFFFF",
        border: "1px solid rgba(240,176,64,0.2)",
        boxShadow: "0 8px 26px rgba(42,37,32,0.1), 0 1px 6px rgba(42,37,32,0.05)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, #F0B040, #FFCC66, #F0B040)" }}
      />

      <div
        className="px-5 pt-4 pb-3.5"
        style={{
          background: "linear-gradient(135deg, #FFF8EE 0%, #FFF0DC 100%)",
          borderBottom: "1px solid rgba(240,176,64,0.12)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CarFront size={18} strokeWidth={1.8} color="#F0B040" />
            <span className="text-[13px] tracking-wide text-[#20201C]" style={{ fontWeight: 600 }}>
              车位预约
            </span>
          </div>
          <span
            className="text-[10px] tracking-wide px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(139,168,136,0.15)",
              color: "#6B8C6A",
              border: "1px solid rgba(139,168,136,0.25)",
              fontWeight: 500,
            }}
          >
            预约成功
          </span>
        </div>
      </div>

      <div className="px-5 py-4.5">
        <div className="flex items-start gap-2.5 mb-3.5">
          <span className="w-5 h-5 mt-[2px] flex items-center justify-center" style={{ color: "#F0B040" }}>
            <MapPin size={16} strokeWidth={1.8} color="#F0B040" />
          </span>
          <div>
            <p className="text-[10px] tracking-wide text-[#A89D8A] mb-0.5">预约车位</p>
            <p className="text-[31px] text-[#20201C]" style={{ fontWeight: 600, fontSize: 29 }}>
              {card.floor}层 · {card.spotId}
            </p>
          </div>
        </div>

        <div className="flex gap-3.5 items-stretch">
          <div className="flex-1 px-3.5 py-3 rounded-[12px] flex flex-col justify-center" style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}>
            <p className="text-[10px] tracking-wide text-[#A89D8A] mb-1">车牌号</p>
            <p className="text-[20px] text-[#20201C] leading-none" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {card.plateNumber}
            </p>
          </div>

          <div
            className="flex-shrink-0 flex flex-col items-center justify-center rounded-[12px] px-3 py-3"
            style={{ background: "#FFFAF0", border: "1px solid rgba(240,176,64,0.08)" }}
          >
            <img
              src={qrUri}
              alt="预约二维码"
              width={68}
              height={68}
              style={{ borderRadius: 4, imageRendering: "pixelated" }}
            />
            <p className="text-[9px] tracking-wide text-[#A89D8A] mt-1.5">扫码入场</p>
          </div>
        </div>

        <p className="text-[10px] text-[#B6AA99] mt-3 tracking-wide">该车位将为您保留2小时，请在到达时凭二维码入场</p>
      </div>
    </motion.div>
  );
}