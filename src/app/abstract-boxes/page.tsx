'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

// Dynamically import p5 to avoid SSR issues
const Sketch = dynamic(() => import('react-p5'), { ssr: false })

type PatternType = 'circular' | 'grid' | 'spiral'

export default function AbstractBoxes() {
  const [boxCount, setBoxCount] = useState(10)
  const [boxSize, setBoxSize] = useState(50)
  const [boxHeight, setBoxHeight] = useState(50)
  const [spacing, setSpacing] = useState(200)
  const [tiltAngle, setTiltAngle] = useState(0)
  const [patternType, setPatternType] = useState<PatternType>('circular')
  const canvasRef = useRef<HTMLDivElement>(null)
  const p5Instance = useRef<any>(null)

  const setup = (p5: any, canvasParentRef: Element) => {
    p5Instance.current = p5
    p5.createCanvas(800, 600).parent(canvasParentRef)
    p5.angleMode(p5.DEGREES)
  }

  // Project 3D points to 2D with improved perspective
  const projectPoint = (p5: any, x: number, y: number, z: number) => {
    const scale = 300
    const perspective = 0.5
    const projectedX = (x / (z * perspective + scale)) * scale + p5.width / 2
    const projectedY = (y / (z * perspective + scale)) * scale + p5.height / 2
    return { x: projectedX, y: projectedY }
  }

  const getBoxPositions = (p5: any) => {
    const positions = []
    
    switch (patternType) {
      case 'circular':
        for (let i = 0; i < boxCount; i++) {
          const angle = (360 / boxCount) * i
          positions.push({
            x: p5.cos(angle) * spacing,
            z: p5.sin(angle) * spacing
          })
        }
        break
        
      case 'grid':
        const gridSize = Math.ceil(Math.sqrt(boxCount))
        const gridSpacing = spacing * 0.8
        const startX = -(gridSize - 1) * gridSpacing / 2
        const startZ = -(gridSize - 1) * gridSpacing / 2
        
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            if (positions.length < boxCount) {
              positions.push({
                x: startX + i * gridSpacing,
                z: startZ + j * gridSpacing
              })
            }
          }
        }
        break
        
      case 'spiral':
        const spiralTightness = 0.5
        for (let i = 0; i < boxCount; i++) {
          const angle = i * 45 * spiralTightness
          const radius = (i / boxCount) * spacing
          positions.push({
            x: p5.cos(angle) * radius,
            z: p5.sin(angle) * radius
          })
        }
        break
    }
    
    return positions
  }

  const draw = (p5: any) => {
    p5.background(255)
    p5.stroke(0)
    p5.strokeWeight(1)
    p5.noFill()
    
    const positions = getBoxPositions(p5)
    
    positions.forEach(({ x, z }) => {
      // Calculate box corners in 3D
      const corners = [
        { x: x - boxSize/2, y: -boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: -boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: -boxHeight/2, z: z + boxSize/2 },
        { x: x - boxSize/2, y: -boxHeight/2, z: z + boxSize/2 },
        { x: x - boxSize/2, y: boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: boxHeight/2, z: z + boxSize/2 },
        { x: x - boxSize/2, y: boxHeight/2, z: z + boxSize/2 }
      ]
      
      // Apply tilt
      if (tiltAngle !== 0) {
        corners.forEach(corner => {
          const rad = p5.radians(tiltAngle)
          const newX = corner.x * p5.cos(rad) - corner.z * p5.sin(rad)
          const newZ = corner.x * p5.sin(rad) + corner.z * p5.cos(rad)
          corner.x = newX
          corner.z = newZ
        })
      }
      
      // Project corners to 2D
      const projectedCorners = corners.map(corner => projectPoint(p5, corner.x, corner.y, corner.z))
      
      // Draw bottom face
      p5.beginShape()
      for (let j = 0; j < 4; j++) {
        p5.vertex(projectedCorners[j].x, projectedCorners[j].y)
      }
      p5.endShape(p5.CLOSE)
      
      // Draw top face
      p5.beginShape()
      for (let j = 4; j < 8; j++) {
        p5.vertex(projectedCorners[j].x, projectedCorners[j].y)
      }
      p5.endShape(p5.CLOSE)
      
      // Draw connecting edges
      for (let j = 0; j < 4; j++) {
        p5.line(
          projectedCorners[j].x, projectedCorners[j].y,
          projectedCorners[j + 4].x, projectedCorners[j + 4].y
        )
      }
    })
  }

  const exportSVG = () => {
    if (!p5Instance.current) return

    const p5 = p5Instance.current
    
    // Create SVG string manually
    let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <g stroke="black" stroke-width="1" fill="none">`
    
    const positions = getBoxPositions(p5)
    
    positions.forEach(({ x, z }) => {
      // Calculate box corners in 3D
      const corners = [
        { x: x - boxSize/2, y: -boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: -boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: -boxHeight/2, z: z + boxSize/2 },
        { x: x - boxSize/2, y: -boxHeight/2, z: z + boxSize/2 },
        { x: x - boxSize/2, y: boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: boxHeight/2, z: z - boxSize/2 },
        { x: x + boxSize/2, y: boxHeight/2, z: z + boxSize/2 },
        { x: x - boxSize/2, y: boxHeight/2, z: z + boxSize/2 }
      ]
      
      // Apply tilt
      if (tiltAngle !== 0) {
        corners.forEach(corner => {
          const rad = p5.radians(tiltAngle)
          const newX = corner.x * p5.cos(rad) - corner.z * p5.sin(rad)
          const newZ = corner.x * p5.sin(rad) + corner.z * p5.cos(rad)
          corner.x = newX
          corner.z = newZ
        })
      }
      
      // Project corners to 2D
      const projectedCorners = corners.map(corner => projectPoint(p5, corner.x, corner.y, corner.z))
      
      // Draw bottom face
      svgContent += `\n    <path d="M ${projectedCorners[0].x} ${projectedCorners[0].y} L ${projectedCorners[1].x} ${projectedCorners[1].y} L ${projectedCorners[2].x} ${projectedCorners[2].y} L ${projectedCorners[3].x} ${projectedCorners[3].y} Z" />`
      
      // Draw top face
      svgContent += `\n    <path d="M ${projectedCorners[4].x} ${projectedCorners[4].y} L ${projectedCorners[5].x} ${projectedCorners[5].y} L ${projectedCorners[6].x} ${projectedCorners[6].y} L ${projectedCorners[7].x} ${projectedCorners[7].y} Z" />`
      
      // Draw connecting edges
      for (let j = 0; j < 4; j++) {
        svgContent += `\n    <line x1="${projectedCorners[j].x}" y1="${projectedCorners[j].y}" x2="${projectedCorners[j + 4].x}" y2="${projectedCorners[j + 4].y}" />`
      }
    })
    
    // Close SVG tags
    svgContent += '\n  </g>\n</svg>'
    
    // Create and trigger download
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'abstract-boxes.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Abstract Box Generator</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-3">
            <div ref={canvasRef} className="border rounded-lg overflow-hidden">
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Pattern Type</label>
              <select 
                value={patternType}
                onChange={(e) => setPatternType(e.target.value as PatternType)}
                className="w-full p-2 border rounded-md"
              >
                <option value="circular">Circular</option>
                <option value="grid">Grid</option>
                <option value="spiral">Spiral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of Boxes</label>
              <Slider
                value={[boxCount]}
                min={3}
                max={20}
                step={1}
                onValueChange={(value: number[]) => setBoxCount(value[0])}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Box Width/Depth</label>
              <Slider
                value={[boxSize]}
                min={20}
                max={100}
                step={1}
                onValueChange={(value: number[]) => setBoxSize(value[0])}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Box Height</label>
              <Slider
                value={[boxHeight]}
                min={20}
                max={200}
                step={1}
                onValueChange={(value: number[]) => setBoxHeight(value[0])}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Spacing</label>
              <Slider
                value={[spacing]}
                min={100}
                max={400}
                step={10}
                onValueChange={(value: number[]) => setSpacing(value[0])}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tilt Angle</label>
              <Slider
                value={[tiltAngle]}
                min={-45}
                max={45}
                step={1}
                onValueChange={(value: number[]) => setTiltAngle(value[0])}
              />
            </div>
            
            <Button 
              onClick={exportSVG}
              className="w-full"
            >
              Export as SVG
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
} 