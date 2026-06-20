import { Mail, MessageCircle } from 'lucide-react';

const team = [
  { name: 'Díaz Severich Carlos Emanuel', role: 'Gerente' },
  { name: 'Fernández Nelson Isaías', role: 'Gerente' },
  { name: 'Gianello Ramiro Valentín', role: 'Gerente' },
];

export function AboutPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand/20 via-white to-white p-8 sm:p-12 text-center">
        <img src="/logo.png" alt="GoatPhone" className="mx-auto mb-6 w-32 drop-shadow-lg" />
        <h1 className="text-3xl font-extrabold sm:text-5xl">
          Sobre <span className="text-brand-dark">Nosotros</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          Somos un equipo apasionado por la tecnología. En <strong>GoatPhone</strong> te ayudamos a
          encontrar el mejor celular comparando especificaciones con puntajes objetivos, gráficos
          interactivos y un asistente con inteligencia artificial.
        </p>
      </section>

      {/* Team */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">Nuestro Equipo</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {team.map((m) => (
            <div
              key={m.name}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:shadow-lg hover:border-brand/40"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-2xl font-bold text-white shadow-md">
                {m.name.charAt(0)}
              </div>
              <p className="font-semibold text-slate-900">{m.name}</p>
              <p className="mt-1 text-sm text-brand-dark font-medium">{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">Contacto</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Email */}
          <a
            href="mailto:info.goatphone@gmail.com"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-lg hover:border-brand/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Correo electrónico</p>
              <p className="text-sm text-slate-500">info.goatphone@gmail.com</p>
            </div>
          </a>

          {/* Instagram */}
          <a
            href="https://instagram.com/goat.phone1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-lg hover:border-brand/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Instagram</p>
              <p className="text-sm text-slate-500">@goat.phone1</p>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/5493804319249"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-lg hover:border-brand/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
              <MessageCircle size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">WhatsApp</p>
              <p className="text-sm text-slate-500">+54 9 380 431-9249</p>
            </div>
          </a>
        </div>
      </section>

      {/* Location */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">Ubicación</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            title="Ubicación GoatPhone"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3480.123!2d-66.856!3d-29.413!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9425f8a!2sUniversidad+Nacional+de+La+Rioja!5e0!3m2!1ses-419!2sar!4v1"
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Universidad Nacional de La Rioja</p>
              <p className="text-sm text-slate-500">
                Av. Luis M. de la Fuente S/N, Ciudad Universitaria de la Ciencia y de la Técnica, F5300 La Rioja
              </p>
            </div>
            <a
              href="https://maps.app.goo.gl/XJNf9rAWWehh71Q89"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Abrir en Maps
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
