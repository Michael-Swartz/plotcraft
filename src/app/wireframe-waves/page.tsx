'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

// Dynamically import p5 to avoid SSR issues
const Sketch = dynamic(() => import('react-p5'), { ssr: false })

type WaveType = 'sine' | 'triangle' | 'square' | 'sawtooth'

export default function WireframeWavesPage() {
  const [gridResolution, setGridResolution] = useState(25)
  const [waveAmplitude, setWaveAmplitude] = useState(40)
  const [waveFrequency, setWaveFrequency] = useState(0.015)
  const [wavePhase, setWavePhase] = useState(0)
  const [waveType, setWaveType] = useState<WaveType>('sine')
  const [strokeWeight, setStrokeWeight] = useState(1)
  const [timeOffset, setTimeOffset] = useState(0)
  const [cameraHeight, setCameraHeight] = useState(50)
  const [viewingAngle, setViewingAngle] = useState(0.3) // Looking slightly down
  const [perspectiveDistance, setPerspectiveDistance] = useState(300)
  const [oceanDepth, setOceanDepth] = useState(400) // How far the ocean extends
  const [waveDensity, setWaveDensity] = useState(1) // Controls spacing between wave lines
  const [crossWaveDensity, setCrossWaveDensity] = useState(1) // Controls cross-wave line density
  const [depthResolution, setDepthResolution] = useState(20) // Controls detail along depth

  const p5Instance = useRef<any>(null)

  const setup = (p5: any, canvasParentRef: Element) => {
    p5Instance.current = p5
    p5.createCanvas(800, 600).parent(canvasParentRef)
    p5.noFill()
    p5.stroke(0)
    p5.strokeWeight(strokeWeight)
    p5.noLoop() // Static generation
  }

  const calculateWaveValue = (p5: any, x: number, z: number, time: number = 0): number => {
    // Waves primarily move towards the viewer (negative z direction)
    const waveInput = z * waveFrequency + x * 0.003 + wavePhase + time
    
    let waveValue = 0
    switch (waveType) {
      case 'sine':
        waveValue = p5.sin(waveInput)
        break
      case 'triangle':
        waveValue = (2 / p5.PI) * p5.asin(p5.sin(waveInput))
        break
      case 'square':
        waveValue = p5.sin(waveInput) > 0 ? 1 : -1
        break
      case 'sawtooth':
        waveValue = (2 / p5.PI) * (waveInput % (2 * p5.PI) - p5.PI)
        break
    }
    
    // Add some cross-waves for realism
    const crossWave = p5.sin(x * 0.01 + time * 0.5) * 0.3
    return waveValue + crossWave
  }

  const calculateWaveValueSVG = (x: number, z: number, time: number = 0): number => {
    const waveInput = z * waveFrequency + x * 0.003 + wavePhase + time
    
    let waveValue = 0
    switch (waveType) {
      case 'sine':
        waveValue = Math.sin(waveInput)
        break
      case 'triangle':
        waveValue = (2 / Math.PI) * Math.asin(Math.sin(waveInput))
        break
      case 'square':
        waveValue = Math.sin(waveInput) > 0 ? 1 : -1
        break
      case 'sawtooth':
        waveValue = (2 / Math.PI) * (waveInput % (2 * Math.PI) - Math.PI)
        break
    }
    
    const crossWave = Math.sin(x * 0.01 + time * 0.5) * 0.3
    return waveValue + crossWave
  }

  const project3DTo2D = (p5: any, x: number, y: number, z: number) => {
    // Camera position (looking from the beach towards the ocean)
    const camX = 0
    const camY = cameraHeight
    const camZ = -50

    // Translate relative to camera
    const relX = x - camX
    const relY = y - camY
    const relZ = z - camZ

    // Apply viewing angle rotation (pitch)
    const cosAngle = p5.cos(viewingAngle)
    const sinAngle = p5.sin(viewingAngle)
    const rotY = relY * cosAngle - relZ * sinAngle
    const rotZ = relY * sinAngle + relZ * cosAngle

    // Perspective projection
    if (rotZ <= 0) return null // Behind camera
    
    const scale = perspectiveDistance / rotZ
    const screenX = p5.width / 2 + relX * scale
    const screenY = p5.height / 2 - rotY * scale

    return { x: screenX, y: screenY, scale: scale }
  }

  const draw = (p5: any) => {
    p5.background(255)
    p5.stroke(0)
    p5.strokeWeight(strokeWeight)
    p5.noFill()

    const spacing = Math.max(5, depthResolution / waveDensity) // Minimum spacing of 5
    const xStep = Math.max(1, Math.round(2 / waveDensity)) // How many units to step in x direction
    const crossWaveSpacing = Math.max(spacing, spacing * 2 / crossWaveDensity)

    // Draw waves flowing towards viewer (z-direction lines)
    for (let x = -gridResolution; x <= gridResolution; x += xStep) {
      const points = []
      for (let z = 0; z < oceanDepth; z += spacing) {
        const waveValue = calculateWaveValue(p5, x * spacing, z, timeOffset)
        const y = waveValue * waveAmplitude
        
        const projected = project3DTo2D(p5, x * spacing, y, z)
        if (projected) {
          points.push(projected)
        }
      }
      
      if (points.length > 1) {
        p5.beginShape()
        p5.noFill()
        // Vary stroke weight based on distance for depth effect
        const avgScale = points.reduce((sum, p) => sum + p.scale, 0) / points.length
        p5.strokeWeight(strokeWeight * Math.max(0.3, Math.min(1, avgScale * 0.01)))
        
        for (const point of points) {
          p5.vertex(point.x, point.y)
        }
        p5.endShape()
      }
    }

    // Draw cross-wave lines (x-direction lines)
    for (let z = 0; z < oceanDepth; z += crossWaveSpacing) {
      const points = []
      const xDetailStep = Math.max(0.5, 1 / waveDensity) // More detail in x direction for denser waves
      for (let x = -gridResolution; x <= gridResolution; x += xDetailStep) {
        const waveValue = calculateWaveValue(p5, x * spacing, z, timeOffset)
        const y = waveValue * waveAmplitude
        
        const projected = project3DTo2D(p5, x * spacing, y, z)
        if (projected) {
          points.push(projected)
        }
      }
      
      if (points.length > 1) {
        p5.beginShape()
        p5.noFill()
        // Vary stroke weight based on distance for depth effect
        const avgScale = points.reduce((sum, p) => sum + p.scale, 0) / points.length
        p5.strokeWeight(strokeWeight * Math.max(0.2, Math.min(1, avgScale * 0.01)))
        
        for (const point of points) {
          p5.vertex(point.x, point.y)
        }
        p5.endShape()
      }
    }
    
    // Reset stroke weight
    p5.strokeWeight(strokeWeight)
  }

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.redraw()
    }
  }, [gridResolution, waveAmplitude, waveFrequency, wavePhase, waveType, strokeWeight, timeOffset, cameraHeight, viewingAngle, perspectiveDistance, oceanDepth, waveDensity, crossWaveDensity, depthResolution])

  const exportSVG = () => {
    if (!p5Instance.current) return
    const p5 = p5Instance.current

    let svgOutput = `<svg width="${p5.width}" height="${p5.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${p5.width}" height="${p5.height}" fill="white"/>
  <g stroke="black" fill="none">`

    const spacing = Math.max(5, depthResolution / waveDensity)
    const xStep = Math.max(1, Math.round(2 / waveDensity))
    const crossWaveSpacing = Math.max(spacing, spacing * 2 / crossWaveDensity)

    // Generate z-direction wave lines
    for (let x = -gridResolution; x <= gridResolution; x += xStep) {
      const points = []
      for (let z = 0; z < oceanDepth; z += spacing) {
        const waveValue = calculateWaveValueSVG(x * spacing, z, timeOffset)
        const y = waveValue * waveAmplitude
        
        // Apply same 3D projection logic
        const camX = 0, camY = cameraHeight, camZ = -50
        const relX = x * spacing - camX
        const relY = y - camY
        const relZ = z - camZ

        const cosAngle = Math.cos(viewingAngle)
        const sinAngle = Math.sin(viewingAngle)
        const rotY = relY * cosAngle - relZ * sinAngle
        const rotZ = relY * sinAngle + relZ * cosAngle

        if (rotZ > 0) {
          const scale = perspectiveDistance / rotZ
          const screenX = p5.width / 2 + relX * scale
          const screenY = p5.height / 2 - rotY * scale
          points.push({ x: screenX, y: screenY, scale: scale })
        }
      }
      
      if (points.length > 1) {
        const avgScale = points.reduce((sum, p) => sum + p.scale, 0) / points.length
        const weight = strokeWeight * Math.max(0.3, Math.min(1, avgScale * 0.01))
        
        let pathData = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
        for (let i = 1; i < points.length; i++) {
          pathData += ` L ${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`
        }
        svgOutput += `\n    <path d="${pathData}" stroke-width="${weight.toFixed(1)}"/>`
      }
    }

    // Generate x-direction cross lines
    for (let z = 0; z < oceanDepth; z += crossWaveSpacing) {
      const points = []
      const xDetailStep = Math.max(0.5, 1 / waveDensity)
      for (let x = -gridResolution; x <= gridResolution; x += xDetailStep) {
        const waveValue = calculateWaveValueSVG(x * spacing, z, timeOffset)
        const y = waveValue * waveAmplitude
        
        const camX = 0, camY = cameraHeight, camZ = -50
        const relX = x * spacing - camX
        const relY = y - camY
        const relZ = z - camZ

        const cosAngle = Math.cos(viewingAngle)
        const sinAngle = Math.sin(viewingAngle)
        const rotY = relY * cosAngle - relZ * sinAngle
        const rotZ = relY * sinAngle + relZ * cosAngle

        if (rotZ > 0) {
          const scale = perspectiveDistance / rotZ
          const screenX = p5.width / 2 + relX * scale
          const screenY = p5.height / 2 - rotY * scale
          points.push({ x: screenX, y: screenY, scale: scale })
        }
      }
      
      if (points.length > 1) {
        const avgScale = points.reduce((sum, p) => sum + p.scale, 0) / points.length
        const weight = strokeWeight * Math.max(0.2, Math.min(1, avgScale * 0.01))
        
        let pathData = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
        for (let i = 1; i < points.length; i++) {
          pathData += ` L ${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`
        }
        svgOutput += `\n    <path d="${pathData}" stroke-width="${weight.toFixed(1)}"/>`
      }
    }

    svgOutput += '\n  </g>\n</svg>'

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ocean_waves_3d.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto bg-white shadow-xl p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-700">3D Ocean Wave Simulation</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Type</label>
              <select value={waveType} onChange={e => setWaveType(e.target.value as WaveType)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black">
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Amplitude ({waveAmplitude})</label>
              <Slider value={[waveAmplitude]} onValueChange={v => setWaveAmplitude(v[0])} min={0} max={100} step={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Frequency ({waveFrequency.toFixed(3)})</label>
              <Slider value={[waveFrequency]} onValueChange={v => setWaveFrequency(v[0])} min={0.005} max={0.05} step={0.001} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Phase ({wavePhase.toFixed(2)})</label>
              <Slider value={[wavePhase]} onValueChange={v => setWavePhase(v[0])} min={0} max={Math.PI * 2} step={0.1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Offset ({timeOffset.toFixed(2)})</label>
              <Slider value={[timeOffset]} onValueChange={v => setTimeOffset(v[0])} min={0} max={Math.PI * 4} step={0.1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Camera Height ({cameraHeight})</label>
              <Slider value={[cameraHeight]} onValueChange={v => setCameraHeight(v[0])} min={0} max={150} step={5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Viewing Angle ({(viewingAngle * 180 / Math.PI).toFixed(0)}°)</label>
              <Slider value={[viewingAngle]} onValueChange={v => setViewingAngle(v[0])} min={-0.5} max={1.5} step={0.05} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perspective ({perspectiveDistance})</label>
              <Slider value={[perspectiveDistance]} onValueChange={v => setPerspectiveDistance(v[0])} min={100} max={600} step={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ocean Depth ({oceanDepth})</label>
              <Slider value={[oceanDepth]} onValueChange={v => setOceanDepth(v[0])} min={200} max={800} step={20} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Density ({waveDensity})</label>
              <Slider value={[waveDensity]} onValueChange={v => setWaveDensity(v[0])} min={0.5} max={5} step={0.1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cross Wave Density ({crossWaveDensity})</label>
              <Slider value={[crossWaveDensity]} onValueChange={v => setCrossWaveDensity(v[0])} min={0.5} max={5} step={0.1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depth Resolution ({depthResolution})</label>
              <Slider value={[depthResolution]} onValueChange={v => setDepthResolution(v[0])} min={10} max={50} step={1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stroke Weight ({strokeWeight})</label>
              <Slider value={[strokeWeight]} onValueChange={v => setStrokeWeight(v[0])} min={0.5} max={3} step={0.1} />
            </div>
            <Button onClick={exportSVG} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-md shadow-sm transition duration-150">Export as SVG</Button>
          </div>
        </div>
      </div>
    </main>
  )
} 