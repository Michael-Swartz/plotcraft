import Link from 'next/link'

export default function Home() {
  const sketches = [
    {
      title: "Abstract Box Generator",
      description: "Create mesmerizing 3D box arrangements with customizable parameters",
      href: "/abstract-boxes",
      disabled: false
    },
    {
      title: "Kinetic Typography",
      description: "Create dynamic animated text with wave effects and color transitions",
      href: "/kinetic-text",
      disabled: false
    },
    {
      title: "3D Ocean Wave Simulation",
      description: "Experience realistic 3D ocean waves from a beach perspective with full camera control",
      href: "/wireframe-waves",
      disabled: false
    },
    {
      title: "Coming Soon",
      description: "More SVG generators are being crafted...",
      href: "#",
      disabled: true
    }
  ]

  return (
    <main className="min-h-screen p-8 md:p-24">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">PlotCraft</h1>
        <p className="text-xl text-gray-800 mb-12">A collection of abstract SVG generators for pen plotting</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sketches.map((sketch, index) => (
            <Link
              key={index}
              href={sketch.href}
              className={`block p-6 rounded-lg border ${
                sketch.disabled 
                  ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all'
              }`}
            >
              <h2 className="text-xl font-semibold mb-2 text-gray-900">{sketch.title}</h2>
              <p className="text-gray-800">{sketch.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
