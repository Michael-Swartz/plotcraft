'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

// Dynamically import p5 to avoid SSR issues
const Sketch = dynamic(() => import('react-p5'), { ssr: false })

type EffectType = 'size' | 'opacity' | 'both' | 'none'
type WaveFormType = 'radial' | 'spiral' | 'vertical' | 'horizontal'

export default function KineticTextPage() {
  const [inputText, setInputText] = useState('4 8 15 16 23 42')
  const [baseFontSize, setBaseFontSize] = useState(10)
  const [density, setDensity] = useState(0.7)
  const [waveAmplitude, setWaveAmplitude] = useState(0.8)
  const [waveFrequency, setWaveFrequency] = useState(0.05)
  const [wavePhase, setWavePhase] = useState(0)
  const [effectType, setEffectType] = useState<EffectType>('size')
  const [waveForm, setWaveForm] = useState<WaveFormType>('radial')
  const [spiralTightness, setSpiralTightness] = useState(5)
  const [waveAngle, setWaveAngle] = useState(0)

  const p5Instance = useRef<any>(null)

  const setup = (p5: any, canvasParentRef: Element) => {
    p5Instance.current = p5
    p5.createCanvas(800, 600).parent(canvasParentRef)
    p5.textAlign(p5.CENTER, p5.CENTER)
    p5.noLoop() // Static generation
  }

  const calculateWaveValue = (p5: any, x: number, y: number): number => {
    let rawValue = 0
    switch (waveForm) {
      case 'radial':
        const distance = p5.dist(0, 0, x, y)
        rawValue = p5.sin(distance * waveFrequency + wavePhase)
        break
      case 'spiral':
        const angle = p5.atan2(y, x)
        const distSpiral = p5.dist(0, 0, x, y)
        rawValue = p5.sin(distSpiral * waveFrequency * 0.1 + angle * spiralTightness + wavePhase)
        break
      case 'vertical': // Horizontal bands, wave travels vertically
        const rotatedYVertical = x * p5.sin(waveAngle) + y * p5.cos(waveAngle)
        rawValue = p5.sin(rotatedYVertical * waveFrequency + wavePhase)
        break
      case 'horizontal': // Vertical bands, wave travels horizontally
        const rotatedXHorizontal = x * p5.cos(waveAngle) - y * p5.sin(waveAngle)
        rawValue = p5.sin(rotatedXHorizontal * waveFrequency + wavePhase)
        break
    }
    return rawValue // This is -1 to 1
  }
  
  const calculateWaveValueSVG = (x: number, y: number): number => {
    let rawValue = 0
    switch (waveForm) {
      case 'radial':
        const distance = Math.sqrt(x*x + y*y)
        rawValue = Math.sin(distance * waveFrequency + wavePhase)
        break
      case 'spiral':
        const angle = Math.atan2(y, x)
        const distSpiral = Math.sqrt(x*x+y*y)
        rawValue = Math.sin(distSpiral * waveFrequency * 0.1 + angle * spiralTightness + wavePhase)
        break
      case 'vertical':
        const rotatedYVertical = x * Math.sin(waveAngle) + y * Math.cos(waveAngle)
        rawValue = Math.sin(rotatedYVertical * waveFrequency + wavePhase)
        break
      case 'horizontal':
        const rotatedXHorizontal = x * Math.cos(waveAngle) - y * Math.sin(waveAngle)
        rawValue = Math.sin(rotatedXHorizontal * waveFrequency + wavePhase)
        break
    }
    return rawValue
  }

  const draw = (p5: any) => {
    p5.background(255)
    p5.fill(0)
    p5.noStroke()

    const charCellHeight = baseFontSize * density
    const charCellWidth = baseFontSize * 0.6 * density
    if (charCellHeight <= 0 || charCellWidth <= 0) return

    const numRows = Math.ceil(p5.height / charCellHeight)
    const numCols = Math.ceil(p5.width / charCellWidth)
    let textCharacterIndex = 0

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const x = (c - (numCols - 1) / 2) * charCellWidth
        const y = (r - (numRows - 1) / 2) * charCellHeight

        const waveValue = calculateWaveValue(p5, x, y)
        const charToDraw = inputText[textCharacterIndex % inputText.length] || ' '
        textCharacterIndex++

        let currentFontSize = baseFontSize
        let currentOpacity = 255

        if (effectType === 'size' || effectType === 'both') {
          const sizeFactor = 1 + waveValue * waveAmplitude
          currentFontSize = baseFontSize * Math.max(0.1, sizeFactor)
        }
        if (effectType === 'opacity' || effectType === 'both') {
          const opacityFactor = (1 + waveValue) / 2
          currentOpacity = ((opacityFactor * waveAmplitude) + (1 - waveAmplitude)) * 255
          currentOpacity = p5.constrain(currentOpacity, 0, 255)
        }

        p5.push()
        p5.translate(p5.width / 2 + x, p5.height / 2 + y)
        p5.textSize(currentFontSize)
        p5.fill(0, currentOpacity)
        p5.text(charToDraw, 0, 0)
        p5.pop()
      }
    }
  }

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.redraw()
    }
  }, [inputText, baseFontSize, density, waveAmplitude, waveFrequency, wavePhase, effectType, waveForm, spiralTightness, waveAngle])

  const exportSVG = () => {
    if (!p5Instance.current) return
    const p5 = p5Instance.current

    let svgOutput = `<svg width="${p5.width}" height="${p5.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <g text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">`

    const charCellHeight = baseFontSize * density
    const charCellWidth = baseFontSize * 0.6 * density
    if (charCellHeight <= 0 || charCellWidth <= 0) return

    const numRows = Math.ceil(p5.height / charCellHeight)
    const numCols = Math.ceil(p5.width / charCellWidth)
    let textCharacterIndex = 0

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const x = (c - (numCols - 1) / 2) * charCellWidth
        const y = (r - (numRows - 1) / 2) * charCellHeight
        
        const waveValue = calculateWaveValueSVG(x, y) // Use SVG specific calculation
        const charToDraw = inputText[textCharacterIndex % inputText.length] || ' '
        textCharacterIndex++

        let currentFontSize = baseFontSize
        let currentOpacityAlpha = 1

        if (effectType === 'size' || effectType === 'both') {
          const sizeFactor = 1 + waveValue * waveAmplitude
          currentFontSize = baseFontSize * Math.max(0.1, sizeFactor)
        }
        if (effectType === 'opacity' || effectType === 'both') {
          const opacityFactor = (1 + waveValue) / 2
          currentOpacityAlpha = (opacityFactor * waveAmplitude) + (1 - waveAmplitude)
          currentOpacityAlpha = Math.max(0, Math.min(1, currentOpacityAlpha))
        }

        const svgX = p5.width / 2 + x
        const svgY = p5.height / 2 + y
        // Use a simple heuristic for character escaping, might need improvement for full XML safety
        const safeChar = charToDraw.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
        svgOutput += `
    <text x="${svgX.toFixed(2)}" y="${svgY.toFixed(2)}" font-size="${currentFontSize.toFixed(2)}" fill="black" fill-opacity="${currentOpacityAlpha.toFixed(2)}">${safeChar}</text>`
      }
    }
    svgOutput += '\n  </g>\n</svg>'

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kinetic_typography.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-6xl mx-auto bg-white shadow-xl p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-700">Kinetic Typography Generator</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value.toUpperCase())} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" maxLength={20} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Form</label>
              <select value={waveForm} onChange={e => setWaveForm(e.target.value as WaveFormType)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black">
                <option value="radial">Radial</option>
                <option value="spiral">Spiral</option>
                <option value="vertical">Vertical Rolling</option>
                <option value="horizontal">Horizontal Rolling</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effect Type</label>
              <select value={effectType} onChange={e => setEffectType(e.target.value as EffectType)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black">
                <option value="none">None</option>
                <option value="size">Size</option>
                <option value="opacity">Opacity</option>
                <option value="both">Both</option>
              </select>
            </div>
            {waveForm === 'spiral' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spiral Tightness ({spiralTightness.toFixed(1)})</label>
                <Slider value={[spiralTightness]} onValueChange={v => setSpiralTightness(v[0])} min={1} max={20} step={0.5} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Font Size ({baseFontSize}px)</label>
              <Slider value={[baseFontSize]} onValueChange={v => setBaseFontSize(v[0])} min={5} max={30} step={1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Density ({density.toFixed(2)})</label>
              <Slider value={[density]} onValueChange={v => setDensity(v[0])} min={0.3} max={1.5} step={0.05} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Amplitude ({waveAmplitude.toFixed(2)})</label>
              <Slider value={[waveAmplitude]} onValueChange={v => setWaveAmplitude(v[0])} min={0} max={1} step={0.05} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Frequency ({waveFrequency.toFixed(3)})</label>
              <Slider value={[waveFrequency]} onValueChange={v => setWaveFrequency(v[0])} min={0.005} max={0.2} step={0.005} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wave Phase ({wavePhase.toFixed(2)})</label>
              <Slider value={[wavePhase]} onValueChange={v => setWavePhase(v[0])} min={0} max={Math.PI * 2} step={0.05} />
            </div>
            {(waveForm === 'vertical' || waveForm === 'horizontal') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wave Angle ({(waveAngle * 180 / Math.PI).toFixed(0)}°)</label>
                <Slider value={[waveAngle]} onValueChange={v => setWaveAngle(v[0])} min={0} max={Math.PI * 2} step={0.05} />
              </div>
            )}
            <Button onClick={exportSVG} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-md shadow-sm transition duration-150">Export as SVG</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
