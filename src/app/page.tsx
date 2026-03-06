import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-green-400 font-mono text-3xl font-bold tracking-wider">
          WarehousePro
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-2">
          GEODIS Picker Training Platform
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/sim"
          className="
            bg-green-800 hover:bg-green-700 active:bg-green-600
            text-green-100 font-mono text-center font-bold
            px-6 py-4 rounded-xl border border-green-700
            transition-colors text-sm tracking-wide
          "
        >
          RF Device Simulator &rarr;
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 opacity-50 cursor-not-allowed">
          <p className="text-zinc-500 font-mono text-sm text-center">
            Labs &mdash; Coming Soon
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 opacity-50 cursor-not-allowed">
          <p className="text-zinc-500 font-mono text-sm text-center">
            Quiz Bank &mdash; Coming Soon
          </p>
        </div>
      </div>

      <p className="text-zinc-700 text-xs font-mono">
        v0.1.0 &middot; BBWD-WI-030
      </p>
    </main>
  )
}
