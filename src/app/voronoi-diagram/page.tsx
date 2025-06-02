'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Delaunay } from 'd3-delaunay'

const Sketch = dynamic(() => import('react-p5'), { ssr: false })
import type P5Instance from 'p5'

type Point = [number, number]

interface VoronoiParameters {
  numPoints: number
  boundaryMargin: number
  minDistance: number
  distributionType: 'random' | 'uniform' | 'clustered'
  clusterFactor: number
}

export default function VoronoiDiagramPage() {
  const [params, setParams] = useState<VoronoiParameters>({
    numPoints: 30,
    boundaryMargin: 20,
    minDistance: 0,
    distributionType: 'random',
    clusterFactor: 0.5
  })
  
  const [seed, setSeed] = useState(1234) // Fixed initial seed for SSR
  
  const p5Instance = useRef<P5Instance | null>(null)
  const canvasSize = { width: 800, height: 600 }
  const sites = useRef<Point[]>([])
  const delaunay = useRef<Delaunay<Point> | null>(null)
  const voronoi = useRef<any>(null)

  // Set random seed after hydration
  useEffect(() => {
    setSeed(Math.floor(Math.random() * 10000))
  }, [])

  const handleParamChange = useCallback((paramName: keyof VoronoiParameters, value: number | string) => {
    setParams(prev => ({ ...prev, [paramName]: value }))
  }, [])

  const generatePoints = useCallback((p5: P5Instance, currentParams: VoronoiParameters): Point[] => {
    const points: Point[] = []
    const margin = currentParams.boundaryMargin
    const width = canvasSize.width - 2 * margin
    const height = canvasSize.height - 2 * margin
    
    if (currentParams.distributionType === 'uniform') {
      // Grid-based with some randomness
      const cols = Math.ceil(Math.sqrt(currentParams.numPoints * (width / height)))
      const rows = Math.ceil(currentParams.numPoints / cols)
      const cellWidth = width / cols
      const cellHeight = height / rows
      
      for (let i = 0; i < currentParams.numPoints; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        const centerX = margin + col * cellWidth + cellWidth / 2
        const centerY = margin + row * cellHeight + cellHeight / 2
        const offsetX = p5.random(-cellWidth * 0.3, cellWidth * 0.3)
        const offsetY = p5.random(-cellHeight * 0.3, cellHeight * 0.3)
        points.push([centerX + offsetX, centerY + offsetY])
      }
    } else if (currentParams.distributionType === 'clustered') {
      // Generate cluster centers first
      const numClusters = Math.max(1, Math.floor(2 + currentParams.clusterFactor * 8)) // 2-10 clusters
      const clusterCenters: Point[] = []
      
      for (let i = 0; i < numClusters; i++) {
        clusterCenters.push([
          p5.random(margin + 50, canvasSize.width - margin - 50),
          p5.random(margin + 50, canvasSize.height - margin - 50)
        ])
      }
      
      // Distribute points around clusters
      for (let i = 0; i < currentParams.numPoints; i++) {
        const cluster = clusterCenters[i % numClusters]
        const maxRadius = 20 + (1 - currentParams.clusterFactor) * 100 // tighter clusters when factor is lower
        const radius = p5.random(0, maxRadius)
        const angle = p5.random(0, p5.TWO_PI)
        const x = cluster[0] + Math.cos(angle) * radius
        const y = cluster[1] + Math.sin(angle) * radius
        points.push([
          p5.constrain(x, margin, canvasSize.width - margin),
          p5.constrain(y, margin, canvasSize.height - margin)
        ])
      }
    } else {
      // Random distribution
      for (let i = 0; i < currentParams.numPoints; i++) {
        points.push([
          p5.random(margin, canvasSize.width - margin),
          p5.random(margin, canvasSize.height - margin)
        ])
      }
    }
    
    // Apply minimum distance constraint if specified
    if (currentParams.minDistance > 0) {
      const filteredPoints: Point[] = []
      
      for (const point of points) {
        let tooClose = false
        for (const existing of filteredPoints) {
          const dist = Math.sqrt(
            Math.pow(point[0] - existing[0], 2) + Math.pow(point[1] - existing[1], 2)
          )
          if (dist < currentParams.minDistance) {
            tooClose = true
            break
          }
        }
        if (!tooClose) {
          filteredPoints.push(point)
        }
      }
      
      return filteredPoints
    }
    
    return points
  }, [canvasSize])

  const generateVoronoiDiagram = useCallback((p5: P5Instance, currentParams: VoronoiParameters, currentSeed: number) => {
    p5.randomSeed(currentSeed)
    
    // Generate points based on distribution type
    const newSites = generatePoints(p5, currentParams)
    sites.current = newSites
    
    // Create Delaunay triangulation and Voronoi diagram
    if (sites.current.length >= 3) {
      delaunay.current = Delaunay.from(sites.current)
      voronoi.current = delaunay.current.voronoi([0, 0, canvasSize.width, canvasSize.height])
    } else {
      delaunay.current = null
      voronoi.current = null
    }
  }, [canvasSize, generatePoints])

  const drawVoronoiCells = useCallback((p5: P5Instance) => {
    if (!voronoi.current || !sites.current.length) return
    
    p5.strokeWeight(1)
    p5.stroke(0)
    p5.noFill()
    
    for (let i = 0; i < sites.current.length; i++) {
      const cell = voronoi.current.cellPolygon(i)
      if (!cell) continue
      
      p5.beginShape()
      for (const point of cell as Point[]) {
        p5.vertex(point[0], point[1])
      }
      p5.endShape(p5.CLOSE)
    }
  }, [])

  const setup = (p5Setup: P5Instance, canvasParentRef: Element) => {
    p5Instance.current = p5Setup
    p5Setup.createCanvas(canvasSize.width, canvasSize.height).parent(canvasParentRef)
    p5Setup.pixelDensity(1)
    p5Setup.noLoop()
    generateVoronoiDiagram(p5Setup, params, seed)
  }

  const draw = useCallback((p5: P5Instance) => {
    if (!p5) return
    
    p5.background(255)
    drawVoronoiCells(p5)
  }, [drawVoronoiCells])

  useEffect(() => {
    if (p5Instance.current) {
      generateVoronoiDiagram(p5Instance.current, params, seed)
      p5Instance.current.redraw()
    }
  }, [params, seed, generateVoronoiDiagram])

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 10000))
  }

  const exportSVG = () => {
    if (!voronoi.current || !sites.current.length) {
      console.error("Voronoi data not available for SVG export")
      return
    }

    let svgOutput = `<svg width="${canvasSize.width}" height="${canvasSize.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">\n`
    
    // Draw Voronoi cells
    svgOutput += `  <g stroke="black" stroke-width="1" fill="none">\n`
    for (let i = 0; i < sites.current.length; i++) {
      const cell = voronoi.current.cellPolygon(i)
      if (!cell) continue
      
      const points = (cell as Point[]).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
      svgOutput += `    <polygon points="${points}"/>\n`
    }
    svgOutput += `  </g>\n`
    
    svgOutput += `</svg>`

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `voronoi-diagram-${seed}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-6xl bg-white shadow-xl p-4 md:p-8 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-700 flex-grow">
            Voronoi Diagram Generator
          </h1>
          <Link href="/" passHref>
            <Button asChild variant="outline" className="ml-4">
              Back to Home
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <div className="flex-1 min-w-0">
            <div className="border border-gray-300 rounded-md overflow-hidden shadow-inner bg-white w-full max-w-[800px] mx-auto lg:mx-0" 
                 style={{ aspectRatio: '4/3' }}>
              {/* @ts-expect-error p5 types can be tricky */}
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>

          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 p-6 border border-gray-200 rounded-lg shadow-sm bg-slate-50">
            <div className="space-y-4">
              <p className="text-lg font-semibold text-gray-700">Controls</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Points ({params.numPoints})
                </label>
                <Slider 
                  value={[params.numPoints]} 
                  onValueChange={v => handleParamChange('numPoints', v[0])} 
                  min={3} 
                  max={1000} 
                  step={1} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Boundary Margin ({params.boundaryMargin})
                </label>
                <Slider 
                  value={[params.boundaryMargin]} 
                  onValueChange={v => handleParamChange('boundaryMargin', v[0])} 
                  min={0} 
                  max={100} 
                  step={1} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Distance ({params.minDistance})
                </label>
                <Slider 
                  value={[params.minDistance]} 
                  onValueChange={v => handleParamChange('minDistance', v[0])} 
                  min={0} 
                  max={100} 
                  step={1} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Type
                </label>
                <select 
                  value={params.distributionType} 
                  onChange={(e) => handleParamChange('distributionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base bg-white text-gray-900"
                >
                  <option value="random">Random - Scattered points</option>
                  <option value="uniform">Uniform - Grid-based layout</option>
                  <option value="clustered">Clustered - Grouped patterns</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cluster Factor ({params.clusterFactor.toFixed(2)})
                </label>
                <Slider 
                  value={[params.clusterFactor]} 
                  onValueChange={v => handleParamChange('clusterFactor', v[0])} 
                  min={0} 
                  max={1} 
                  step={0.01} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seed Value
                </label>
                <input 
                  type="number" 
                  value={seed} 
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base bg-white text-gray-900"
                  placeholder="Enter seed number"
                />
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <Button 
                onClick={regenerate} 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-md shadow-sm transition duration-150"
              >
                Regenerate
              </Button>
              <Button 
                onClick={exportSVG} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-md shadow-sm transition duration-150"
              >
                Export as SVG
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 