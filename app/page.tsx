'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type NType = 'web' | 'api' | 'db' | 'hub';

interface GNode {
  x: number; y: number; z: number;
  type: NType;
  r: number;
  pulse: number;
  ps: number;
}

interface GEdge {
  a: number; b: number;
  pts: { t: number; spd: number; r: number }[];
}

// ── Color palette ─────────────────────────────────────────────────────────────

const CLR: Record<NType, [number, number, number]> = {
  web: [96,  165, 250],
  api: [167, 139, 250],
  db:  [52,  211, 153],
  hub: [129, 140, 248],
};

// ── 3D Network Canvas ─────────────────────────────────────────────────────────

function NetworkCanvas() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const net = useRef({ nodes: [] as GNode[], edges: [] as GEdge[], rotY: 0, raf: 0 });

  const build = useCallback(() => {
    const nodes: GNode[] = [];

    const zone = (x0: number, x1: number, types: NType[], n: number) => {
      for (let i = 0; i < n; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        nodes.push({
          x: x0 + Math.random() * (x1 - x0),
          y: (Math.random() - 0.5) * 0.68,
          z: (Math.random() - 0.5) * 0.52,
          type, r: 0.0038 + Math.random() * 0.004,
          pulse: Math.random() * Math.PI * 2,
          ps: 0.018 + Math.random() * 0.026,
        });
      }
    };

    zone(-0.94, -0.34, ['web', 'api'], 20);
    zone(-0.28,  0.28, ['hub', 'web', 'api'], 26);
    zone( 0.34,  0.94, ['db', 'hub'], 18);

    const edges: GEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const dists = nodes
        .flatMap((n, j) => j === i ? [] : [{
          j,
          d: Math.sqrt(
            (n.x - nodes[i].x) ** 2 +
            (n.y - nodes[i].y) ** 2 +
            (n.z - nodes[i].z) ** 2
          ),
        }])
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);

      for (const nb of dists) {
        if (nb.d > 0.6) continue;
        if (edges.some(e => (e.a === i && e.b === nb.j) || (e.a === nb.j && e.b === i))) continue;
        edges.push({
          a: i, b: nb.j,
          pts: Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
            t: Math.random(),
            spd: 0.003 + Math.random() * 0.004,
            r: 0.0022 + Math.random() * 0.0018,
          })),
        });
      }
    }

    net.current.nodes = nodes;
    net.current.edges = edges;
  }, []);

  const tick = useCallback(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const W = cv.width;
    const H = cv.height;

    net.current.rotY += 0.00042;
    const cosY = Math.cos(net.current.rotY);
    const sinY = Math.sin(net.current.rotY);
    const TX = -0.16;
    const cosX = Math.cos(TX);
    const sinX = Math.sin(TX);

    const proj = (x: number, y: number, z: number) => {
      const rx = x * cosY + z * sinY;
      const rz = -x * sinY + z * cosY;
      const ry = y * cosX - rz * sinX;
      const rz2 = y * sinX + rz * cosX;
      const fov = 1.55;
      const d = fov / (fov + rz2 + 1.25);
      return { sx: rx * d * W * 0.5 + W / 2, sy: ry * d * H * 0.56 + H / 2, d, rz2 };
    };

    ctx.fillStyle = '#020817';
    ctx.fillRect(0, 0, W, H);

    const cg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.38);
    cg.addColorStop(0, 'rgba(79,70,229,0.09)');
    cg.addColorStop(0.6, 'rgba(67,56,202,0.04)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);

    const pp = net.current.nodes.map(n => proj(n.x, n.y, n.z));

    for (const e of net.current.edges) {
      const pa = pp[e.a], pb = pp[e.b];
      const na = net.current.nodes[e.a], nb = net.current.nodes[e.b];
      const [ra, ga, ba] = CLR[na.type];
      const [rb, gb, bb] = CLR[nb.type];
      const avgD = (pa.d + pb.d) / 2;
      const op = avgD * 0.36;

      const gr = ctx.createLinearGradient(pa.sx, pa.sy, pb.sx, pb.sy);
      gr.addColorStop(0, `rgba(${ra},${ga},${ba},${op})`);
      gr.addColorStop(1, `rgba(${rb},${gb},${bb},${op})`);
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.strokeStyle = gr;
      ctx.lineWidth = avgD * 0.75;
      ctx.stroke();

      for (const p of e.pts) {
        p.t += p.spd;
        if (p.t > 1) p.t = 0;
        const px = pa.sx + (pb.sx - pa.sx) * p.t;
        const py = pa.sy + (pb.sy - pa.sy) * p.t;
        const pd = pa.d + (pb.d - pa.d) * p.t;
        const [r, g, b] = p.t < 0.5 ? CLR[na.type] : CLR[nb.type];
        const ps = p.r * W * pd;
        ctx.save();
        ctx.shadowBlur = 10 * pd;
        ctx.shadowColor = `rgba(${r},${g},${b},1)`;
        ctx.beginPath();
        ctx.arc(px, py, ps, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.92)`;
        ctx.fill();
        ctx.restore();
      }
    }

    pp.map((p, i) => ({ i, rz: p.rz2 }))
      .sort((a, b) => a.rz - b.rz)
      .forEach(({ i }) => {
        const n = net.current.nodes[i], p = pp[i];
        n.pulse += n.ps;
        const pf = 0.87 + 0.13 * Math.sin(n.pulse);
        const [r, g, b] = CLR[n.type];
        const sz = n.r * W * p.d * pf;

        const halo = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, sz * 3.8);
        halo.addColorStop(0, `rgba(${r},${g},${b},0.22)`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, sz * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.save();
        ctx.shadowBlur = 14 * p.d;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.88)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.sx - sz * 0.27, p.sy - sz * 0.27, sz * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.52 * p.d})`;
        ctx.fill();
        ctx.restore();
      });

    net.current.raf = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cv.width = cv.offsetWidth * dpr;
      cv.height = cv.offsetHeight * dpr;
    };
    build(); resize(); tick();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    return () => { cancelAnimationFrame(net.current.raf); ro.disconnect(); };
  }, [build, tick]);

  return <canvas ref={cvRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />;
}

// ── Static data ───────────────────────────────────────────────────────────────

const SOURCES = [
  { label: 'shopify.com/products', color: '#60a5fa' },
  { label: 'api.stripe.com/v1',   color: '#a78bfa' },
  { label: 'amazon.com/catalog',  color: '#60a5fa' },
  { label: 'REST API · OAuth 2.0', color: '#a78bfa' },
  { label: 'news.ycombinator.com', color: '#60a5fa' },
  { label: 'MongoDB Atlas',        color: '#34d399' },
];

const OUTPUTS = [
  { field: 'precio',  value: '$299.99',  change: '+2.1%', up: true  },
  { field: 'stock',   value: '47 uds.',  change: '−12',   up: false },
  { field: 'rating',  value: '4.8 / 5', change: '+0.2',  up: true  },
  { field: 'reseñas', value: '2,341',   change: '+89',   up: true  },
];

const BARS = [3, 7, 4, 9, 5, 13, 8];

const STEPS = [
  { n: '01', title: 'Apunta y selecciona', desc: 'Carga cualquier URL. Haz clic en el elemento. El sistema genera el selector automáticamente, sin código.' },
  { n: '02', title: 'Extracción inteligente', desc: 'CSS selectors + regex auto-generado. Si el sitio cambia su estructura, el sistema se adapta solo.' },
  { n: '03', title: 'Alertas y análisis', desc: 'Email inmediato cuando algo cambia. Historial completo, diferencias visuales y tendencias.' },
];

const FEATURES = [
  { icon: '◎', title: 'Selector Visual',       desc: 'Apunta, haz clic, extrae. Sin CSS ni XPath. La forma más rápida de configurar un monitor.' },
  { icon: '⟳', title: 'Auto-reparación',       desc: 'Regex generado automáticamente detecta valores aunque el HTML cambie entre deploys.' },
  { icon: '⚡', title: 'Playwright + Axios',    desc: 'Soporte nativo para SPAs, lazy-loading y JavaScript dinámico. Donde otros fallan, Scrapper extrae.' },
  { icon: '◈', title: 'Alertas en tiempo real', desc: 'Email inmediato cuando algo cambia. Filtra ruido, captura lo importante.' },
  { icon: '⊞', title: 'Historial estructurado', desc: 'PostgreSQL + MongoDB. Cada extracción guardada con diferencias, timestamps y tendencias.' },
  { icon: '◷', title: 'A escala',               desc: 'Desde 15 min hasta 24 h. BullMQ + Redis maneja miles de monitores en paralelo.' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800;900&display=swap');
        *, body { font-family: 'Onest', sans-serif; }

        .glass {
          background: rgba(255,255,255,0.035);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .glass-nav {
          background: rgba(2,8,23,0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .btn-glow {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          box-shadow: 0 0 22px rgba(99,102,241,0.38);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .btn-glow:hover { box-shadow: 0 0 38px rgba(99,102,241,0.6); transform: translateY(-1px); }
        .btn-ghost { transition: color 0.2s, background 0.2s; }
        .btn-ghost:hover { background: rgba(255,255,255,0.07); color: #f1f5f9; }

        .fcard { transition: border-color 0.25s, transform 0.25s, background 0.25s; }
        .fcard:hover { border-color: rgba(99,102,241,0.3) !important; transform: translateY(-3px); background: rgba(255,255,255,0.055) !important; }

        @keyframes float {
          0%,100% { transform: translateY(0); opacity: 0.78; }
          50%      { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes ping-ring {
          0%   { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes bar-rise {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }

        .anim-up    { animation: fade-in-up    0.65s ease both; }
        .anim-left  { animation: fade-in-left  0.65s ease both; }
        .anim-right { animation: fade-in-right 0.65s ease both; }
      `}</style>

      <div style={{ background: '#020817', color: '#f1f5f9', minHeight: '100vh' }}>

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="glass-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, boxShadow: '0 0 14px rgba(99,102,241,0.45)' }}>Sc</div>
              <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em' }}>Scrapper</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link href="/auth?tab=login" className="btn-ghost" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', padding: '7px 14px', borderRadius: 8 }}>
                Iniciar sesión
              </Link>
              <Link href="/auth?tab=register" className="btn-glow" style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '7px 18px', borderRadius: 10 }}>
                Comenzar gratis
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
          <NetworkCanvas />

          {/* Edge depth gradients */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(2,8,23,0.85) 0%, transparent 25%, transparent 75%, rgba(2,8,23,0.85) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to top, #020817, transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, rgba(2,8,23,0.6), transparent)', pointerEvents: 'none' }} />

          {/* Three-column overlay */}
          <div style={{ position: 'absolute', inset: 0, paddingTop: 56, display: 'grid', gridTemplateColumns: '255px 1fr 255px', maxWidth: 1280, margin: '0 auto', padding: '56px 20px 0', gap: 24, alignItems: 'center', pointerEvents: 'none' }}>

            {/* Left — Sources */}
            <div className="anim-left" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <p style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 2 }}>Fuentes detectadas</p>
              {SOURCES.map((s, i) => (
                <div
                  key={i}
                  className="glass"
                  style={{ borderRadius: 10, padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 9, animation: `float ${3.4 + i * 0.38}s ease-in-out infinite`, animationDelay: `${i * 0.52}s` }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 7px ${s.color}` }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <div style={{ marginLeft: 'auto', position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399', animation: 'ping-ring 1.7s ease-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Center — Headline */}
            <div className="anim-up" style={{ animationDelay: '0.25s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, pointerEvents: 'auto' }}>
              <div className="glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 100, padding: '5px 14px', border: '1px solid rgba(99,102,241,0.28)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 8px rgba(129,140,248,0.9)' }} />
                <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, letterSpacing: '0.03em' }}>Monitoreo inteligente · Automatización a escala</span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.2rem, 4.8vw, 3.5rem)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.04em', margin: 0 }}>
                Convierte internet<br />
                <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  en conocimiento
                </span>
              </h1>

              <p style={{ fontSize: 15, color: '#64748b', maxWidth: 370, lineHeight: 1.72, fontWeight: 300, margin: 0 }}>
                Extrae, monitorea y analiza datos de cualquier sitio web con un clic. Sin código. Con alertas automáticas cuando algo cambia.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/auth?tab=register" className="btn-glow" style={{ fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '12px 24px', borderRadius: 12 }}>
                  Empezar gratis →
                </Link>
                <Link href="/auth?tab=login" className="glass btn-ghost" style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', textDecoration: 'none', padding: '11px 18px', borderRadius: 12 }}>
                  Iniciar sesión
                </Link>
              </div>
            </div>

            {/* Right — Output */}
            <div className="anim-right" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <p style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 2 }}>Datos extraídos</p>

              <div className="glass" style={{ borderRadius: 14, padding: '13px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
                  <div style={{ position: 'relative', width: 7, height: 7 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 7px rgba(52,211,153,0.9)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399', animation: 'ping-ring 2s ease-out infinite' }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>shopify.com/products/42</span>
                </div>
                {OUTPUTS.map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < OUTPUTS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ fontSize: 11, color: '#475569' }}>{o.field}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{o.value}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: o.up ? '#34d399' : '#f87171' }}>{o.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass" style={{ borderRadius: 14, padding: '11px 13px' }}>
                <p style={{ fontSize: 10, color: '#334155', marginBottom: 9, fontWeight: 600 }}>Cambios · últimos 7 días</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
                  {BARS.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: `${(v / 13) * 100}%`,
                        background: 'linear-gradient(to top, rgba(99,102,241,0.85), rgba(129,140,248,0.5))',
                        borderRadius: '3px 3px 0 0',
                        transformOrigin: 'bottom',
                        animation: `bar-rise 0.55s ease ${i * 0.07 + 0.4}s both`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section style={{ padding: '100px 24px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Proceso</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>Tres pasos hacia la automatización</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} className="glass" style={{ borderRadius: 20, padding: '26px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 50, fontWeight: 900, color: 'rgba(99,102,241,0.11)', lineHeight: 1, marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 9, letterSpacing: '-0.02em' }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section style={{ padding: '40px 24px 100px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Capacidades</p>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>Todo lo que necesitas para escalar</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="glass fcard" style={{ borderRadius: 18, padding: '22px', cursor: 'default' }}>
                <div style={{ fontSize: 21, color: '#818cf8', marginBottom: 13 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 7, letterSpacing: '-0.02em' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section style={{ padding: '40px 24px 100px', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div className="glass" style={{ borderRadius: 28, padding: '56px 36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 380, height: 180, background: 'radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, position: 'relative' }}>
              Empieza a monitorear hoy.{' '}
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Gratis.</span>
            </h2>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 28, fontWeight: 300, position: 'relative' }}>Sin tarjeta de crédito. Sin configuraciones complicadas. En 2 minutos.</p>
            <Link href="/auth?tab=register" className="btn-glow" style={{ display: 'inline-block', fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '14px 30px', borderRadius: 14, position: 'relative' }}>
              Crear cuenta gratuita →
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '28px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>Sc</div>
              <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>Scrapper</span>
            </div>
            <p style={{ fontSize: 11, color: '#1e293b', margin: 0 }}>© 2026 Scrapper. Todos los derechos reservados.</p>
            <div style={{ display: 'flex', gap: 20 }}>
              {[['Iniciar sesión', '/auth?tab=login'], ['Registrarse', '/auth?tab=register']].map(([label, href]) => (
                <Link key={href} href={href} style={{ fontSize: 12, color: '#334155', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
                >{label}</Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
