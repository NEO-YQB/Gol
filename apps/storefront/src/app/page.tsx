export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070A] text-white flex items-center justify-center px-6">

      {/* Background Glow */}
      <div className="absolute top-[-150px] left-[-100px] w-[400px] h-[400px] bg-pink-500/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-fuchsia-500/20 blur-[120px] rounded-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)]" />

      {/* Card */}
      <div className="relative z-10 max-w-3xl w-full backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-14 shadow-[0_0_80px_rgba(236,72,153,0.15)]">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="px-5 py-2 rounded-full border border-pink-400/30 bg-pink-400/10 text-pink-300 text-sm tracking-[0.2em] uppercase shadow-lg shadow-pink-500/10">
            Golino — گلینو
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-4xl md:text-7xl font-black leading-tight mb-6">
          دنیای گل‌ها
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-400 to-purple-400 drop-shadow-[0_0_25px_rgba(236,72,153,0.5)]">
            در حال شکوفه زدنه
          </span>
        </h1>

        {/* Description */}
        <p className="text-center text-zinc-300 text-lg md:text-xl leading-9 max-w-2xl mx-auto mb-12">
          ما داریم روی تجربه‌ای متفاوت برای سفارش گل، دسته گل و باکس‌های خاص کار می‌کنیم.
          <br />
          پنل فروشنده، مدیریت حرفه‌ای و زیرساخت گلینو در حال آماده‌سازیه تا خیلی زود با بهترین تجربه کنارتون باشیم 🌸
        </p>

        {/* Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-5">

          <a
            href="tel:+989127654598"
            className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-8 py-4 text-white transition duration-300 hover:scale-105 hover:bg-white/15 shadow-[0_0_30px_rgba(255,255,255,0.08)]"
          >
            <span className="relative z-10 flex items-center gap-3">
              📞 تماس با سازنده
            </span>

            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 opacity-0 transition group-hover:opacity-100" />
          </a>

          <a
            href="https://instagram.com/"
            target="_blank"
            className="rounded-2xl border border-pink-400/20 bg-pink-500/10 px-8 py-4 text-pink-200 transition duration-300 hover:scale-105 hover:bg-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.15)]"
          >
            اینستاگرام گلینو
          </a>
        </div>

        {/* Footer */}
        <div className="mt-14 text-center text-zinc-500 text-sm">
          Crafted with passion for flowers, beauty & technology ✨
        </div>
      </div>
    </main>
  );
}
