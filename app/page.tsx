import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────
   Scrapper — Landing Page
   Server Component · No interactivity · Tailwind CSS only
───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans antialiased">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}

/* ── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#0f172a] border-b border-slate-700/60 shadow-lg">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Scrapper inicio"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold tracking-tight shadow-md group-hover:bg-blue-400 transition-colors"
          >
            Sc
          </span>
          <span className="text-white text-lg font-semibold tracking-tight">
            Scrapper
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth?tab=login"
            className="text-slate-300 text-sm font-medium px-4 py-2 rounded-lg hover:text-white hover:bg-slate-700/60 transition-all"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth?tab=register"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-400 transition-all shadow-sm"
          >
            Registrarse
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative bg-[#0f172a] overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Soft glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 flex flex-col lg:flex-row items-center gap-16">
        {/* Copy */}
        <div className="flex-1 text-center lg:text-left">
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-widest uppercase">
            Monitoreo Web Inteligente
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Vigila cualquier
            <br />
            <span className="text-blue-400">elemento web</span>
            <br />
            sin escribir código
          </h1>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
            Señala el contenido que quieres monitorear, define la frecuencia y recibe
            una alerta por correo en el momento en que algo cambia.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center lg:justify-start">
            <Link
              href="/auth?tab=register"
              className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm shadow-lg transition-all"
            >
              Registrarse gratis
            </Link>
            <Link
              href="#demo"
              className="px-6 py-3 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-all"
            >
              Ver demo →
            </Link>
          </div>
        </div>

        {/* Terminal-style mock */}
        <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md">
          <MockSelector />
        </div>
      </div>
    </section>
  );
}

/* Terminal / selector mock — decorative, no JS */
function MockSelector() {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-2xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-800/80 border-b border-slate-700/60">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 flex-1 bg-slate-700/60 rounded text-slate-400 text-xs px-2 py-0.5 font-mono truncate">
          tienda.ejemplo.com/producto/laptop-pro
        </span>
      </div>

      {/* Fake page content */}
      <div className="p-5 space-y-3 text-xs font-mono">
        <div className="text-slate-500">{'<div class="product-info">'}</div>
        <div className="pl-4 text-slate-400">{'<h1>Laptop Pro 16"</h1>'}</div>

        {/* Highlighted / selected element */}
        <div className="pl-4 relative">
          <div className="rounded border-2 border-blue-500 bg-blue-500/10 px-2 py-1.5">
            <span className="text-blue-300">
              {'<span class="price">'}
              <span className="text-white font-bold">$18,999.00</span>
              {'</span>'}
            </span>
          </div>
          {/* Selector tooltip */}
          <div className="absolute -top-7 left-0 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-sans font-medium whitespace-nowrap shadow-lg">
            ✓ Elemento seleccionado
          </div>
        </div>

        <div className="pl-4 text-slate-500">{'<p class="stock">En existencia</p>'}</div>
        <div className="text-slate-500">{'</div>'}</div>
      </div>

      {/* Status bar */}
      <div className="px-5 py-3 bg-slate-800/60 border-t border-slate-700/60 flex items-center justify-between">
        <span className="text-slate-400 text-[11px] font-mono">.price · XPath activo</span>
        <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Monitoreando
        </span>
      </div>
    </div>
  );
}

/* ── Features ───────────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: <CursorIcon />,
      title: 'Selector visual punto a punto',
      description:
        'Abre cualquier página, haz clic sobre el elemento que te interesa y Scrapper genera el selector automáticamente. Sin código, sin extensiones adicionales.',
      tag: 'Sin código',
    },
    {
      icon: <RegexIcon />,
      title: 'Auto-reparación con regex',
      description:
        'Cuando el sitio rediseña su HTML, el motor de auto-healing ajusta los selectores usando patrones regex para que tus monitores nunca fallen en silencio.',
      tag: 'Robusto',
    },
    {
      icon: <MailIcon />,
      title: 'Alertas instantáneas por email',
      description:
        'Recibe un correo en el momento exacto en que se detecta un cambio. Incluye el valor anterior, el nuevo valor y el enlace directo a la página.',
      tag: 'Tiempo real',
    },
  ];

  return (
    <section className="bg-slate-50 py-24 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Todo lo que necesitas para monitorear la web
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
            Tres capacidades clave diseñadas para que no pierdas ningún cambio importante.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <article
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                {f.icon}
              </div>
              <span className="inline-block mb-3 text-[11px] font-bold tracking-widest uppercase text-blue-500">
                {f.tag}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug">
                {f.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA Banner ─────────────────────────────────────────────── */
function CtaBanner() {
  return (
    <section
      id="demo"
      className="relative bg-[#0f172a] py-24 overflow-hidden border-t border-slate-700/40"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] rounded-full opacity-15"
        style={{
          background:
            'radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          Empieza a monitorear hoy,
          <br />
          <span className="text-blue-400">gratis y sin tarjeta de crédito</span>
        </h2>
        <p className="mt-5 text-slate-400 text-lg leading-relaxed">
          Configura tu primer monitor en menos de 2 minutos. Sin instalaciones, sin APIs,
          sin configuración de servidor.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/auth?tab=register"
            className="px-8 py-3.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-xl transition-all"
          >
            Crear cuenta gratuita
          </Link>
          <Link
            href="/auth?tab=login"
            className="px-8 py-3.5 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-all"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#0f172a] border-t border-slate-700/50 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <span className="font-semibold text-slate-400">Scrapper</span>
        <span>© {new Date().getFullYear()} · Monitor de cambios en páginas web</span>
        <nav className="flex gap-5" aria-label="Footer">
          <Link href="/auth?tab=login" className="hover:text-slate-300 transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/auth?tab=register" className="hover:text-slate-300 transition-colors">
            Registrarse
          </Link>
        </nav>
      </div>
    </footer>
  );
}

/* ── Icons (inline SVG, no dependency) ─────────────────────── */
function CursorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  );
}

function RegexIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
