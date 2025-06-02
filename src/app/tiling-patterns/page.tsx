'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

// Dynamically import p5 to avoid SSR issues
const Sketch = dynamic(() => import('react-p5'), { ssr: false })

type TileShape = 'square' | 'triangle' | 'hexagon' | 'diamond' | 'circle'

export default function TilingPatternsPage() {
  const [tileShape, setTileShape] = useState<TileShape>('square')
  const [baseTileSize, setBaseTileSize] = useState(30)
  const [sizeRandomness, setSizeRandomness] = useState(0.3)
  const [fillProbability, setFillProbability] = useState(0.7)
  const [strokeWeight, setStrokeWeight] = useState(1)
  const [tileSpacing, setTileSpacing] = useState(2)
  const [randomSeed, setRandomSeed] = useState(42)

  const p5Instance = useRef<any>(null)

  const setup = (p5: any, canvasParentRef: Element) => {
    p5Instance.current = p5
    p5.createCanvas(800, 600).parent(canvasParentRef)
    p5.noLoop() // Static generation
  }

  const drawSquare = (p5: any, x: number, y: number, size: number, filled: boolean) => {
    if (filled) {
      p5.fill(0)
    } else {
      p5.noFill()
    }
    p5.square(x, y, size)
  }

  const drawTriangle = (p5: any, x: number, y: number, size: number, filled: boolean) => {
    if (filled) {
      p5.fill(0)
    } else {
      p5.noFill()
    }
    const h = size * 0.866 // Height of equilateral triangle
    p5.triangle(x + size/2, y, x, y + h, x + size, y + h)
  }

  const drawHexagon = (p5: any, x: number, y: number, size: number, filled: boolean) => {
    if (filled) {
      p5.fill(0)
    } else {
      p5.noFill()
    }
    const radius = size / 2
    p5.push()
    p5.translate(x + radius, y + radius)
    p5.beginShape()
    for (let i = 0; i < 6; i++) {
      const angle = (i * p5.TWO_PI) / 6
      const px = radius * p5.cos(angle)
      const py = radius * p5.sin(angle)
      p5.vertex(px, py)
    }
    p5.endShape(p5.CLOSE)
    p5.pop()
  }

  const drawDiamond = (p5: any, x: number, y: number, size: number, filled: boolean) => {
    if (filled) {
      p5.fill(0)
    } else {
      p5.noFill()
    }
    const half = size / 2
    p5.quad(x + half, y, x + size, y + half, x + half, y + size, x, y + half)
  }

  const drawCircle = (p5: any, x: number, y: number, size: number, filled: boolean) => {
    if (filled) {
      p5.fill(0)
    } else {
      p5.noFill()
    }
    p5.circle(x + size/2, y + size/2, size)
  }

  const drawTile = (p5: any, x: number, y: number, size: number, filled: boolean) => {
    switch (tileShape) {
      case 'square':
        drawSquare(p5, x, y, size, filled)
        break
      case 'triangle':
        drawTriangle(p5, x, y, size, filled)
        break
      case 'hexagon':
        drawHexagon(p5, x, y, size, filled)
        break
      case 'diamond':
        drawDiamond(p5, x, y, size, filled)
        break
      case 'circle':
        drawCircle(p5, x, y, size, filled)
        break
    }
  }

  const draw = (p5: any) => {
    p5.background(255)
    p5.stroke(0)
    p5.strokeWeight(strokeWeight)
    
    // Set random seed for consistent results
    p5.randomSeed(randomSeed)

    const effectiveTileSize = baseTileSize + tileSpacing
    const numCols = Math.ceil(p5.width / effectiveTileSize) + 1
    const numRows = Math.ceil(p5.height / effectiveTileSize) + 1

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const baseX = col * effectiveTileSize
        const baseY = row * effectiveTileSize
        
        // Add size randomness
        const sizeVariation = p5.random(-sizeRandomness, sizeRandomness)
        const currentSize = baseTileSize * (1 + sizeVariation)
        
        // Random offset for more organic feel
        const offsetX = p5.random(-tileSpacing, tileSpacing)
        const offsetY = p5.random(-tileSpacing, tileSpacing)
        
        const x = baseX + offsetX
        const y = baseY + offsetY
        
        // Determine if tile should be filled
        const filled = p5.random() < fillProbability
        
        // Only draw if tile is within canvas bounds
        if (x < p5.width && y < p5.height && x + currentSize > 0 && y + currentSize > 0) {
          drawTile(p5, x, y, currentSize, filled)
        }
      }
    }
  }

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.redraw()
    }
  }, [tileShape, baseTileSize, sizeRandomness, fillProbability, strokeWeight, tileSpacing, randomSeed])

  const exportSVG = () => {
    if (!p5Instance.current) return
    const p5 = p5Instance.current

    let svgOutput = `<svg width="${p5.width}" height="${p5.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${p5.width}" height="${p5.height}" fill="white"/>
  <g stroke="black" stroke-width="${strokeWeight}" fill="none">`

    // Set random seed for consistent results
    p5.randomSeed(randomSeed)

    const effectiveTileSize = baseTileSize + tileSpacing
    const numCols = Math.ceil(p5.width / effectiveTileSize) + 1
    const numRows = Math.ceil(p5.height / effectiveTileSize) + 1

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const baseX = col * effectiveTileSize
        const baseY = row * effectiveTileSize
        
        const sizeVariation = p5.random(-sizeRandomness, sizeRandomness)
        const currentSize = baseTileSize * (1 + sizeVariation)
        
        const offsetX = p5.random(-tileSpacing, tileSpacing)
        const offsetY = p5.random(-tileSpacing, tileSpacing)
        
        const x = baseX + offsetX
        const y = baseY + offsetY
        
        const filled = p5.random() < fillProbability
        
        if (x < p5.width && y < p5.height && x + currentSize > 0 && y + currentSize > 0) {
          const fillAttr = filled ? ' fill="black"' : ''
          
          switch (tileShape) {
            case 'square':
              svgOutput += `\n    <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${currentSize.toFixed(2)}" height="${currentSize.toFixed(2)}"${fillAttr}/>`
              break
            case 'triangle':
              const h = currentSize * 0.866
              const x1 = x + currentSize/2
              const y1 = y
              const x2 = x
              const y2 = y + h
              const x3 = x + currentSize
              const y3 = y + h
              svgOutput += `\n    <polygon points="${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} ${x3.toFixed(2)},${y3.toFixed(2)}"${fillAttr}/>`
              break
            case 'hexagon':
              const radius = currentSize / 2
              const cx = x + radius
              const cy = y + radius
              let points = ''
              for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6
                const px = cx + radius * Math.cos(angle)
                const py = cy + radius * Math.sin(angle)
                points += `${px.toFixed(2)},${py.toFixed(2)} `
              }
              svgOutput += `\n    <polygon points="${points.trim()}"${fillAttr}/>`
              break
            case 'diamond':
              const half = currentSize / 2
              const dx1 = x + half
              const dy1 = y
              const dx2 = x + currentSize
              const dy2 = y + half
              const dx3 = x + half
              const dy3 = y + currentSize
              const dx4 = x
              const dy4 = y + half
              svgOutput += `\n    <polygon points="${dx1.toFixed(2)},${dy1.toFixed(2)} ${dx2.toFixed(2)},${dy2.toFixed(2)} ${dx3.toFixed(2)},${dy3.toFixed(2)} ${dx4.toFixed(2)},${dy4.toFixed(2)}"${fillAttr}/>`
              break
            case 'circle':
              const cr = currentSize / 2
              const ccx = x + cr
              const ccy = y + cr
              svgOutput += `\n    <circle cx="${ccx.toFixed(2)}" cy="${ccy.toFixed(2)}" r="${cr.toFixed(2)}"${fillAttr}/>`
              break
          }
        }
      }
    }
    
    svgOutput += '\n  </g>\n</svg>'

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tiling_pattern.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto bg-white shadow-xl p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-700">Tiling Pattern Generator</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <div 
              ref={el => {
                // Attach the p5.js canvas to this div
                if (el && p5Instance.current && p5Instance.current.canvas) {
                  el.innerHTML = '' // Clear previous canvas if any
                  el.appendChild(p5Instance.current.canvas)
                }
              }}
              className="border border-gray-300 rounded-md overflow-hidden aspect-[4/3]"
            >
              {/* Sketch component is rendered here but its output canvas is moved by the ref above */}
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tile Shape</label>
              <select 
                value={tileShape} 
                onChange={e => setTileShape(e.target.value as TileShape)} 
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
              >
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="hexagon">Hexagon</option>
                <option value="diamond">Diamond</option>
                <option value="circle">Circle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Tile Size ({baseTileSize}px)</label>
              <Slider 
                value={[baseTileSize]} 
                onValueChange={v => setBaseTileSize(v[0])} 
                min={10} 
                max={80} 
                step={2} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size Randomness ({(sizeRandomness * 100).toFixed(0)}%)</label>
              <Slider 
                value={[sizeRandomness]} 
                onValueChange={v => setSizeRandomness(v[0])} 
                min={0} 
                max={0.8} 
                step={0.05} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fill Probability ({(fillProbability * 100).toFixed(0)}%)</label>
              <Slider 
                value={[fillProbability]} 
                onValueChange={v => setFillProbability(v[0])} 
                min={0} 
                max={1} 
                step={0.05} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stroke Weight ({strokeWeight}px)</label>
              <Slider 
                value={[strokeWeight]} 
                onValueChange={v => setStrokeWeight(v[0])} 
                min={0.5} 
                max={4} 
                step={0.5} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tile Spacing ({tileSpacing}px)</label>
              <Slider 
                value={[tileSpacing]} 
                onValueChange={v => setTileSpacing(v[0])} 
                min={0} 
                max={10} 
                step={1} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Random Seed ({randomSeed})</label>
              <Slider 
                value={[randomSeed]} 
                onValueChange={v => setRandomSeed(v[0])} 
                min={1} 
                max={1000} 
                step={1} 
              />
            </div>
            <Button 
              onClick={exportSVG} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-md shadow-sm transition duration-150"
            >
              Export as SVG
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
} 