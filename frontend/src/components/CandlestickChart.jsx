import { useMemo, useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

/**
 * Pro candlestick chart with:
 * - SMA 20 / 50 overlays
 * - AI levels (entry, stop, TP1, TP2) as horizontal dashed lines
 * - Volume pane below
 * - Crosshair + hover tooltip showing OHLCV + date
 * - Mouse wheel zoom + drag to pan + zoom buttons
 */
export default function CandlestickChart({ data = [], height = 420, levels = null, showOverlays = true, fibonacci = null }) {
  const [hover, setHover] = useState(null);
  const [range, setRange] = useState(null); // [startIdx, endIdx]
  const dragRef = useRef(null);
  const svgRef = useRef(null);

  const total = data.length;
  const startIdx = range ? range[0] : 0;
  const endIdx = range ? range[1] : total;
  const visibleData = data.slice(startIdx, endIdx);
  const minCandles = 10;

  const handleZoom = useCallback((direction, centerRatio = 0.5) => {
    const curStart = range ? range[0] : 0;
    const curEnd = range ? range[1] : total;
    const curLen = curEnd - curStart;

    let newLen;
    if (direction === "in") {
      newLen = Math.max(minCandles, Math.floor(curLen * 0.7));
    } else if (direction === "out") {
      newLen = Math.min(total, Math.ceil(curLen * 1.4));
    } else {
      setRange(null);
      return;
    }

    const center = curStart + curLen * centerRatio;
    let newStart = Math.round(center - newLen * centerRatio);
    let newEnd = newStart + newLen;

    if (newStart < 0) { newStart = 0; newEnd = newLen; }
    if (newEnd > total) { newEnd = total; newStart = Math.max(0, total - newLen); }

    if (newStart === 0 && newEnd === total) {
      setRange(null);
    } else {
      setRange([newStart, newEnd]);
    }
  }, [range, total]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    handleZoom(e.deltaY > 0 ? "out" : "in", ratio);
  }, [handleZoom]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, rect, range: range ? [...range] : [0, total] };
  }, [range, total]);

  const handleMouseMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Crosshair
    const width = 1000;
    const padding = { left: 8, right: 64 };
    const innerW = width - padding.left - padding.right;
    const stepX = innerW / visibleData.length;
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.max(0, Math.min(visibleData.length - 1, Math.floor((x - padding.left) / stepX)));

    if (dragRef.current) {
      // Pan
      const dx = e.clientX - dragRef.current.startX;
      const pxPerCandle = rect.width / (dragRef.current.range[1] - dragRef.current.range[0]);
      const shift = Math.round(-dx / pxPerCandle);
      const origLen = dragRef.current.range[1] - dragRef.current.range[0];
      let newStart = dragRef.current.range[0] + shift;
      let newEnd = newStart + origLen;
      if (newStart < 0) { newStart = 0; newEnd = origLen; }
      if (newEnd > total) { newEnd = total; newStart = total - origLen; }
      setRange([newStart, newEnd]);
      setHover(null);
    } else {
      // Hover
      if (visibleData[idx]) {
        const cx = padding.left + idx * stepX + stepX / 2;
        setHover({ ...visibleData[idx], cx });
      }
    }
  }, [visibleData, total]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const layout = useMemo(() => {
    if (!visibleData || visibleData.length === 0) return null;
    const width = 1000;
    const padding = { top: 16, right: 64, bottom: 28, left: 8 };
    const priceH = height * 0.72;
    const volH = height * 0.18;
    const gap = height - priceH - volH - padding.top - padding.bottom;
    const innerW = width - padding.left - padding.right;

    const lows = visibleData.map((d) => d.low);
    const highs = visibleData.map((d) => d.high);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    if (levels && showOverlays) {
      [levels.entry, levels.stop, levels.tp1, levels.tp2].forEach((v) => {
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    }
    const rangeVal = max - min || 1;
    const pad = rangeVal * 0.05;
    const yMin = min - pad;
    const yMax = max + pad;

    const yScale = (v) => padding.top + ((yMax - v) / (yMax - yMin)) * priceH;
    const stepX = innerW / visibleData.length;
    const candleW = Math.max(2, Math.min(12, stepX * 0.7));

    // SMAs computed on full data, then sliced
    const smaSeries = (period) => {
      const out = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { out.push(null); continue; }
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
        out.push(sum / period);
      }
      return out.slice(startIdx, endIdx);
    };
    const sma20 = smaSeries(20);
    const sma50 = smaSeries(50);

    const candles = visibleData.map((d, i) => {
      const cx = padding.left + i * stepX + stepX / 2;
      const yOpen = yScale(d.open);
      const yClose = yScale(d.close);
      const yHigh = yScale(d.high);
      const yLow = yScale(d.low);
      const isUp = d.close >= d.open;
      return { ...d, idx: i, cx, yOpen, yClose, yHigh, yLow, isUp };
    });

    const ticks = 5;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = yMin + ((yMax - yMin) * i) / ticks;
      return { v, y: yScale(v) };
    });

    const xCount = Math.min(6, visibleData.length);
    const xTicks = Array.from({ length: xCount }, (_, i) => {
      const idx = Math.floor((i * (visibleData.length - 1)) / Math.max(1, xCount - 1));
      const c = candles[idx];
      return { x: c.cx, label: c.date };
    });

    const volTop = padding.top + priceH + gap;
    const maxVol = Math.max(...visibleData.map((d) => d.volume));
    const volScale = (v) => (maxVol ? (v / maxVol) * volH : 0);

    const smaPath = (series) => {
      const pts = [];
      series.forEach((v, i) => {
        if (v == null) return;
        pts.push(`${candles[i].cx},${yScale(v)}`);
      });
      return pts.length > 1 ? `M ${pts.join(" L ")}` : "";
    };

    return {
      width, padding, innerW, priceH, volH, stepX, candleW,
      yMin, yMax, yScale, candles, yTicks, xTicks, volTop, maxVol, volScale,
      sma20Path: smaPath(sma20),
      sma50Path: smaPath(sma50),
    };
  }, [data, visibleData, startIdx, endIdx, height, levels, showOverlays]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center text-[var(--text-muted)] font-mono text-xs" style={{ height }} data-testid="chart-empty">
        No chart data
      </div>
    );
  }

  const { width, padding, innerW, priceH, candles, yTicks, xTicks, volTop, volScale, candleW, yScale, stepX } = layout;

  const aiLevels = levels && showOverlays ? [
    { key: "entry", value: levels.entry, color: "#2E90FA", label: "Entry" },
    { key: "stop", value: levels.stop, color: "#F04438", label: "Stop" },
    { key: "tp1", value: levels.tp1, color: "#17B26A", label: "TP1" },
    { key: "tp2", value: levels.tp2, color: "#17B26A", label: "TP2" },
  ].filter((l) => typeof l.value === "number") : [];

  const isZoomed = range !== null;

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={() => handleZoom("in")}
          className="p-1.5 bg-[var(--surface-alt)] hover:bg-[var(--border)] rounded-sm border border-[var(--border)] transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={12} className="text-[var(--text-muted)]" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-1.5 bg-[var(--surface-alt)] hover:bg-[var(--border)] rounded-sm border border-[var(--border)] transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={12} className="text-[var(--text-muted)]" />
        </button>
        {isZoomed && (
          <button
            onClick={() => handleZoom("reset")}
            className="p-1.5 bg-[var(--surface-alt)] hover:bg-[var(--border)] rounded-sm border border-[var(--border)] transition-colors"
            title="Reset zoom"
          >
            <Maximize2 size={12} className="text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        data-testid="candlestick-chart"
        preserveAspectRatio="none"
        style={{ display: "block", cursor: dragRef.current ? "grabbing" : "crosshair" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHover(null); dragRef.current = null; }}
      >
        {/* y grid */}
        {yTicks.map((t, i) => (
          <g key={`y-${i}`}>
            <line x1={padding.left} x2={padding.left + innerW} y1={t.y} y2={t.y} stroke="#20242a" strokeWidth="1" />
            <text x={padding.left + innerW + 6} y={t.y + 3} fontSize="10" fill="#8b949e" fontFamily="'IBM Plex Mono', monospace">
              {t.v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Fibonacci retracement lines */}
        {fibonacci && showOverlays && (() => {
          const fibs = [
            { key: "0", label: "0%", pct: 0 },
            { key: "236", label: "23.6%", pct: 0.236 },
            { key: "382", label: "38.2%", pct: 0.382 },
            { key: "500", label: "50%", pct: 0.5 },
            { key: "618", label: "61.8%", pct: 0.618 },
            { key: "786", label: "78.6%", pct: 0.786 },
            { key: "100", label: "100%", pct: 1 },
          ];
          return fibs.map((f) => {
            const val = fibonacci[f.key];
            if (typeof val !== "number") return null;
            const y = yScale(val);
            if (y < padding.top - 5 || y > padding.top + priceH + 5) return null;
            return (
              <g key={`fib-${f.key}`}>
                <line x1={padding.left} x2={padding.left + innerW} y1={y} y2={y} stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />
                <text x={padding.left + 4} y={y - 3} fontSize="8" fill="#6366f1" opacity="0.6" fontFamily="'IBM Plex Mono', monospace">
                  {f.label}
                </text>
              </g>
            );
          });
        })()}

        {/* AI level lines */}
        {aiLevels.map((l) => {
          const y = yScale(l.value);
          return (
            <g key={l.key}>
              <line x1={padding.left} x2={padding.left + innerW} y1={y} y2={y} stroke={l.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.85" />
              <rect x={padding.left + innerW + 2} y={y - 8} width={60} height={16} fill={l.color} opacity="0.95" rx="2" />
              <text x={padding.left + innerW + 32} y={y + 4} fontSize="9" fill="#fff" fontFamily="'IBM Plex Mono', monospace" textAnchor="middle" fontWeight="600">
                {l.label} {l.value.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* SMA lines */}
        {layout.sma20Path && (
          <path d={layout.sma20Path} fill="none" stroke="#F79009" strokeWidth="1.2" opacity="0.85" />
        )}
        {layout.sma50Path && (
          <path d={layout.sma50Path} fill="none" stroke="#A855F7" strokeWidth="1.2" opacity="0.85" />
        )}

        {/* candles */}
        {candles.map((c, i) => (
          <g key={`c-${i}`}>
            <line x1={c.cx} x2={c.cx} y1={c.yHigh} y2={c.yLow} stroke={c.isUp ? "#17B26A" : "#F04438"} strokeWidth="1" />
            <rect
              x={c.cx - candleW / 2}
              y={Math.min(c.yOpen, c.yClose)}
              width={candleW}
              height={Math.max(1, Math.abs(c.yClose - c.yOpen))}
              fill={c.isUp ? "#17B26A" : "#F04438"}
              rx="0.5"
            />
          </g>
        ))}

        {/* volume bars */}
        {candles.map((c, i) => {
          const vh = volScale(c.volume);
          return (
            <rect
              key={`v-${i}`}
              x={c.cx - candleW / 2}
              y={volTop + (layout.volH - vh)}
              width={candleW}
              height={vh}
              fill={c.isUp ? "#17B26A" : "#F04438"}
              opacity="0.3"
              rx="0.5"
            />
          );
        })}

        {/* x labels */}
        {xTicks.map((t, i) => (
          <text key={`x-${i}`} x={t.x} y={height - 8} fontSize="10" fill="#8b949e" fontFamily="'IBM Plex Mono', monospace" textAnchor="middle">
            {t.label}
          </text>
        ))}

        {/* crosshair */}
        {hover && !dragRef.current && (
          <g>
            <line x1={hover.cx} x2={hover.cx} y1={padding.top} y2={padding.top + priceH + layout.volH + 24} stroke="#8b949e" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1={padding.left} x2={padding.left + innerW} y1={yScale(hover.close)} y2={yScale(hover.close)} stroke="#8b949e" strokeWidth="0.5" strokeDasharray="2 2" />
          </g>
        )}
      </svg>

      {/* legend */}
      <div className="absolute top-2 left-2 flex gap-3 text-[10px] font-mono text-[var(--text-muted)] pointer-events-none">
        <span><span className="inline-block w-2.5 h-0.5 align-middle mr-1" style={{ background: "#F79009" }}></span>SMA20</span>
        <span><span className="inline-block w-2.5 h-0.5 align-middle mr-1" style={{ background: "#A855F7" }}></span>SMA50</span>
        {aiLevels.length > 0 && (
          <>
            <span className="text-[var(--accent)]">— Entry</span>
            <span className="text-[var(--bear)]">— Stop</span>
            <span className="text-[var(--bull)]">— TP</span>
          </>
        )}
      </div>

      {/* Zoom indicator */}
      {isZoomed && (
        <div className="absolute bottom-1 left-2 text-[9px] font-mono text-[var(--text-muted)] pointer-events-none">
          Showing {visibleData.length} of {total} candles · Scroll to zoom · Drag to pan
        </div>
      )}

      {/* tooltip */}
      {hover && !dragRef.current && (
        <div className="absolute top-10 right-2 bg-[var(--bg)] border border-[var(--border)] px-3 py-2 rounded-sm text-[10px] font-mono pointer-events-none" data-testid="chart-tooltip">
          <div className="text-[var(--text-muted)] mb-1">{hover.date}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-[var(--text-muted)]">O</span><span>{hover.open.toFixed(2)}</span>
            <span className="text-[var(--text-muted)]">H</span><span className="text-[var(--bull)]">{hover.high.toFixed(2)}</span>
            <span className="text-[var(--text-muted)]">L</span><span className="text-[var(--bear)]">{hover.low.toFixed(2)}</span>
            <span className="text-[var(--text-muted)]">C</span><span>{hover.close.toFixed(2)}</span>
            <span className="text-[var(--text-muted)]">Vol</span><span>{(hover.volume / 1e6).toFixed(2)}M</span>
          </div>
        </div>
      )}
    </div>
  );
}
