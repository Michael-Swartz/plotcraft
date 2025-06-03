import Link from 'next/link'

export default function HomePage() {
  const generators = [
    {
      name: 'Wormhole Generator',
      description: 'Create and export 3D wireframe wormhole SVGs.',
      href: '/wormhole-generator',
    },
    {
      name: 'Wireframe Mountain Generator',
      description: 'Generate and export 3D wireframe mountain landscapes.',
      href: '/mountain-generator',
    },
    {
      name: 'Abstract Box Generator',
      description: 'Generate and export 3D arrangements of wireframe boxes.',
      href: '/abstract-boxes',
    },
    {
      name: 'Voronoi Diagram Generator',
      description: 'Generate organic cellular patterns with customizable point distributions for pen plotting.',
      href: '/voronoi-diagram',
    },
    {
      name: 'Maze Generator',
      description: 'Generate and export solvable 2D mazes.',
      href: '/maze-generator',
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8 flex flex-col items-center text-white">
      <div className="w-full max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-3 tracking-tight">
            PlotCraft
          </h1>
          <p className="text-xl md:text-2xl text-slate-300">
            A Collection of Generative Art Tools for Pen Plotters & SVG Exports
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {generators.map((generator) => (
            <Link href={generator.href} key={generator.name} passHref>
              <div className="block p-6 md:p-8 bg-slate-800 hover:bg-slate-700 rounded-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer h-full">
                <h2 className="text-2xl font-bold mb-2 text-sky-400">{generator.name}</h2>
                <p className="text-slate-400 text-sm md:text-base">{generator.description}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
