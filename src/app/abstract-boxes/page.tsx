'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const Sketch = dynamic(() => import('react-p5'), { ssr: false })
import type P5Instance from 'p5'

interface AbstractBoxParameters {
  numBoxes: number;
  minBoxWidth: number;
  maxBoxWidth: number;
  minBoxHeight: number;
  maxBoxHeight: number;
  minBoxDepth: number;
  maxBoxDepth: number;
  placementVolumeWidth: number;
  placementVolumeHeight: number;
  placementVolumeDepth: number;
  maxRotationX: number; // Max random rotation for individual boxes (degrees)
  maxRotationY: number;
  maxRotationZ: number;
  strokeWeight: number;
  initialRotationX: number; // Initial camera/scene rotation (degrees)
  initialRotationY: number;
  initialRotationZ: number;
}

interface Box3D {
  position: P5Instance.Vector;
  width: number;
  height: number;
  depth: number;
  rotation: P5Instance.Vector; // Euler angles for rotation
  lines: LineSegment3D[];
}

interface LineSegment3D {
  v1: P5Instance.Vector;
  v2: P5Instance.Vector;
}

export default function AbstractBoxesPage() {
  const [params, setParams] = useState<AbstractBoxParameters>({
    numBoxes: 50,
    minBoxWidth: 20,
    maxBoxWidth: 80,
    minBoxHeight: 20,
    maxBoxHeight: 150,
    minBoxDepth: 20,
    maxBoxDepth: 80,
    placementVolumeWidth: 500,
    placementVolumeHeight: 400,
    placementVolumeDepth: 500,
    maxRotationX: 45,
    maxRotationY: 45,
    maxRotationZ: 45,
    strokeWeight: 1,
    initialRotationX: 20,
    initialRotationY: -30,
    initialRotationZ: 0,
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10000));

  const p5Instance = useRef<P5Instance | null>(null);
  const generatedBoxesCache = useRef<Box3D[]>([]);
  const canvasSize = { width: 800, height: 600 };

  const handleParamChange = (paramName: keyof AbstractBoxParameters, value: number) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  // Specific handler for dual-value sliders (HTML input range doesn't directly support this)
  // For now, we use separate inputs for min/max if using standard HTML range
  // const handleMinMaxChange = (paramNameMin: keyof AbstractBoxParameters, paramNameMax: keyof AbstractBoxParameters, minValue: number, maxValue: number) => {
  //   setParams(prev => ({
  //     ...prev,
  //     [paramNameMin]: Math.min(minValue, maxValue), // Ensure min is not greater than max
  //     [paramNameMax]: Math.max(minValue, maxValue),
  //   }));
  // };

  // Simplified handler for HTML input range
  // const handleRangeInputChange = (e: ChangeEvent<HTMLInputElement>, paramName: keyof AbstractBoxParameters) => {
  //   handleParamChange(paramName, parseFloat(e.target.value));
  // };

  const setup = (p5Setup: P5Instance, canvasParentRef: Element) => {
    p5Instance.current = p5Setup;
    p5Setup.createCanvas(canvasSize.width, canvasSize.height, p5Setup.WEBGL).parent(canvasParentRef);
    p5Setup.randomSeed(seed);
    p5Setup.noiseSeed(seed); // In case we use noise later
    p5Setup.angleMode(p5Setup.DEGREES); // Use degrees for rotations
    p5Setup.noLoop();
  };

  const generateIndividualBoxLines = (p5: P5Instance, box: Omit<Box3D, 'lines'>): LineSegment3D[] => {
    const lines: LineSegment3D[] = [];
    const w = box.width / 2;
    const h = box.height / 2;
    const d = box.depth / 2;

    const localCorners = [
      p5.createVector(-w, -h, -d), p5.createVector( w, -h, -d),
      p5.createVector( w, -h,  d), p5.createVector(-w, -h,  d),
      p5.createVector(-w,  h, -d), p5.createVector( w,  h, -d),
      p5.createVector( w,  h,  d), p5.createVector(-w,  h,  d),
    ];

    const rx = p5.radians(box.rotation.x);
    const ry = p5.radians(box.rotation.y);
    const rz = p5.radians(box.rotation.z);

    const cosX = p5.cos(rx); const sinX = p5.sin(rx);
    const cosY = p5.cos(ry); const sinY = p5.sin(ry);
    const cosZ = p5.cos(rz); const sinZ = p5.sin(rz);

    const transformedCorners = localCorners.map(lc => {
      const c = lc.copy();
      
      // Apply ZYX Euler rotation order
      // Z rotation
      const x1 = c.x * cosZ - c.y * sinZ;
      const y1 = c.x * sinZ + c.y * cosZ;
      c.x = x1; c.y = y1;

      // Y rotation
      const x2 = c.x * cosY + c.z * sinY;
      const z2 = -c.x * sinY + c.z * cosY;
      c.x = x2; c.z = z2;

      // X rotation
      const y3 = c.y * cosX - c.z * sinX;
      const z3 = c.y * sinX + c.z * cosX;
      c.y = y3; c.z = z3;
      
      c.add(box.position); // Translate to final position
      return c;
    });

    lines.push({ v1: transformedCorners[0], v2: transformedCorners[1] });
    lines.push({ v1: transformedCorners[1], v2: transformedCorners[2] });
    lines.push({ v1: transformedCorners[2], v2: transformedCorners[3] });
    lines.push({ v1: transformedCorners[3], v2: transformedCorners[0] });
    lines.push({ v1: transformedCorners[4], v2: transformedCorners[5] });
    lines.push({ v1: transformedCorners[5], v2: transformedCorners[6] });
    lines.push({ v1: transformedCorners[6], v2: transformedCorners[7] });
    lines.push({ v1: transformedCorners[7], v2: transformedCorners[4] });
    lines.push({ v1: transformedCorners[0], v2: transformedCorners[4] });
    lines.push({ v1: transformedCorners[1], v2: transformedCorners[5] });
    lines.push({ v1: transformedCorners[2], v2: transformedCorners[6] });
    lines.push({ v1: transformedCorners[3], v2: transformedCorners[7] });

    return lines;
  };

  const generateBoxes = useCallback((p5: P5Instance, currentParams: AbstractBoxParameters, currentSeed: number): Box3D[] => {
    p5.randomSeed(currentSeed); // Ensure generation is based on the current seed
    const boxes: Box3D[] = [];
    const {
      numBoxes,
      minBoxWidth, maxBoxWidth, minBoxHeight, maxBoxHeight, minBoxDepth, maxBoxDepth,
      placementVolumeWidth, placementVolumeHeight, placementVolumeDepth,
      maxRotationX, maxRotationY, maxRotationZ
    } = currentParams;

    for (let i = 0; i < numBoxes; i++) {
      const boxWidth = p5.random(minBoxWidth, maxBoxWidth);
      const boxHeight = p5.random(minBoxHeight, maxBoxHeight);
      const boxDepth = p5.random(minBoxDepth, maxBoxDepth);

      const posX = p5.random(-placementVolumeWidth / 2, placementVolumeWidth / 2);
      const posY = p5.random(-placementVolumeHeight / 2, placementVolumeHeight / 2);
      const posZ = p5.random(-placementVolumeDepth / 2, placementVolumeDepth / 2);

      const rotX = p5.random(-maxRotationX, maxRotationX);
      const rotY = p5.random(-maxRotationY, maxRotationY);
      const rotZ = p5.random(-maxRotationZ, maxRotationZ);

      const boxData: Omit<Box3D, 'lines'> = {
        position: p5.createVector(posX, posY, posZ),
        width: boxWidth,
        height: boxHeight,
        depth: boxDepth,
        rotation: p5.createVector(rotX, rotY, rotZ),
      };
      const lines = generateIndividualBoxLines(p5, boxData);
      boxes.push({ ...boxData, lines });
    }
    return boxes;
  }, []);

  const draw = useCallback((p5: P5Instance) => {
    if (!p5) return;
    p5.background(255);
    p5.stroke(0);
    p5.strokeWeight(params.strokeWeight);
    p5.noFill();

    p5.push(); // Save global state
    p5.rotateX(params.initialRotationX);
    p5.rotateY(params.initialRotationY);
    p5.rotateZ(params.initialRotationZ);

    p5.orbitControl(2, 2, 0.1); // Enable orbit controls

    generatedBoxesCache.current = generateBoxes(p5, params, seed);

    for (const box of generatedBoxesCache.current) {
      for (const seg of box.lines) {
        if (seg.v1 && seg.v2) {
          p5.line(seg.v1.x, seg.v1.y, seg.v1.z, seg.v2.x, seg.v2.y, seg.v2.z);
        }
      }
    }
    p5.pop(); // Restore global state
  }, [params, seed, generateBoxes]);

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.randomSeed(seed);
      p5Instance.current.noiseSeed(seed);
      p5Instance.current.redraw();
    }
  }, [params, seed]);

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 10000));
  };

  const project3DTo2D = (p5_main: P5Instance, point3D: P5Instance.Vector): { x: number, y: number, z: number } | null => {
    // @ts-expect-error Accessing internal _renderer property and its sub-properties
    if (!p5_main._renderer || !p5_main._renderer.uPMatrix || !p5_main._renderer.uMVMatrix) {
      console.error("P5.js WebGL renderer internal matrices (uPMatrix or uMVMatrix) not found.");
      return null;
    }
    // @ts-expect-error Accessing internal _renderer.uPMatrix property
    const projMatrix = p5_main._renderer.uPMatrix;
    // @ts-expect-error Accessing internal _renderer.uMVMatrix property
    const mvMatrix = p5_main._renderer.uMVMatrix;

    const pointVec4 = [point3D.x, point3D.y, point3D.z, 1.0];
    const eyePos = new Array(4);
    const clipPos = new Array(4);

    // Simplified matrix multiplication
    for (let i = 0; i < 4; i++) {
      eyePos[i] = 0;
      for (let j = 0; j < 4; j++) {
        eyePos[i] += mvMatrix.mat4[j * 4 + i] * pointVec4[j];
      }
    }
    for (let i = 0; i < 4; i++) {
      clipPos[i] = 0;
      for (let j = 0; j < 4; j++) {
        clipPos[i] += projMatrix.mat4[j * 4 + i] * eyePos[j];
      }
    }
    if (clipPos[3] === 0) return null;
    const ndcX = clipPos[0] / clipPos[3];
    const ndcY = clipPos[1] / clipPos[3];
    const ndcZ = clipPos[2] / clipPos[3];
    const screenX = (ndcX + 1) / 2 * canvasSize.width;
    const screenY = (1 - ndcY) / 2 * canvasSize.height;
    return { x: screenX, y: screenY, z: ndcZ };
  };

  const exportSVG = () => {
    const mainP5Instance = p5Instance.current;
    if (!mainP5Instance || generatedBoxesCache.current.length === 0) {
      console.error("P5 instance or box data not available for SVG export.");
      return;
    }
    if (mainP5Instance.isLooping()) mainP5Instance.noLoop();
    mainP5Instance.redraw(); 

    let svgOutput = `<svg width="${canvasSize.width}" height="${canvasSize.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">
  <g stroke="black" stroke-width="${params.strokeWeight.toFixed(2)}" fill="none">`;
    let linesDrawn = 0;

    for (const box of generatedBoxesCache.current) {
      for (const seg of box.lines) {
        if (seg.v1 && seg.v2) {
          const p1_2D = project3DTo2D(mainP5Instance, seg.v1);
          const p2_2D = project3DTo2D(mainP5Instance, seg.v2);
          if (p1_2D && p2_2D) {
            const nearClipBuffer = Math.max(canvasSize.width, canvasSize.height) * 0.5;
            const isP1Visible = p1_2D.x >= -nearClipBuffer && p1_2D.x <= canvasSize.width + nearClipBuffer && p1_2D.y >= -nearClipBuffer && p1_2D.y <= canvasSize.height + nearClipBuffer;
            const isP2Visible = p2_2D.x >= -nearClipBuffer && p2_2D.x <= canvasSize.width + nearClipBuffer && p2_2D.y >= -nearClipBuffer && p2_2D.y <= canvasSize.height + nearClipBuffer;
            if (p1_2D.z < 1 && p2_2D.z < 1 && (isP1Visible || isP2Visible)) {
              svgOutput += `\n    <line x1="${p1_2D.x.toFixed(2)}" y1="${p1_2D.y.toFixed(2)}" x2="${p2_2D.x.toFixed(2)}" y2="${p2_2D.y.toFixed(2)}"/>`;
              linesDrawn++;
            }
          }
        }
      }
    }
    console.log("SVG Export: Total boxes:", generatedBoxesCache.current.length, "Lines drawn:", linesDrawn);
    if (linesDrawn === 0 && generatedBoxesCache.current.length > 0) {
      console.warn("SVG Export Warning: No lines were drawn. Check projection, camera, or clipping.")
    }
    svgOutput += '\n  </g>\n</svg>';
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abstract-boxes-${seed}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const labelStyle = "block text-sm font-medium text-gray-700 mb-1";

 return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-6xl bg-white shadow-xl p-4 md:p-8 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-700 flex-grow">Abstract Box Generator</h1>
          <Link href="/" legacyBehavior passHref>
            <Button asChild variant="outline" className="ml-4">
              <a>Back to Home</a>
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col gap-6 mb-6">
          <div className="w-full">
            <div className="border border-gray-300 rounded-md overflow-hidden aspect-[4/3] shadow-inner bg-white mx-auto" style={{ maxWidth: canvasSize.width }}>
              {/* @ts-expect-error p5 types can be tricky */}
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>

          <div className="w-full space-y-6 p-4 border border-gray-200 rounded-lg shadow-sm bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">

                {/* Box Properties Section */}
                <div className="col-span-full"><p className="text-lg font-semibold text-gray-700">Box Properties</p></div>
                <div className="col-span-1">
                  <label htmlFor="numBoxes" className={labelStyle}>Number of Boxes ({params.numBoxes})</label>
                  <Slider value={[params.numBoxes]} onValueChange={v => handleParamChange('numBoxes', v[0])} min={1} max={200} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="minBoxWidth" className={labelStyle}>Min Width ({params.minBoxWidth})</label>
                  <Slider value={[params.minBoxWidth]} onValueChange={v => handleParamChange('minBoxWidth', v[0])} min={5} max={200} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="maxBoxWidth" className={labelStyle}>Max Width ({params.maxBoxWidth})</label>
                  <Slider value={[params.maxBoxWidth]} onValueChange={v => handleParamChange('maxBoxWidth', v[0])} min={5} max={200} step={1} />
                </div>
                
                <div className="col-span-1">
                  <label htmlFor="minBoxHeight" className={labelStyle}>Min Height ({params.minBoxHeight})</label>
                  <Slider value={[params.minBoxHeight]} onValueChange={v => handleParamChange('minBoxHeight', v[0])} min={5} max={300} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="maxBoxHeight" className={labelStyle}>Max Height ({params.maxBoxHeight})</label>
                  <Slider value={[params.maxBoxHeight]} onValueChange={v => handleParamChange('maxBoxHeight', v[0])} min={5} max={300} step={1} />
                </div>
                <div className="col-span-1"> {/* Spacer or next item */} </div> 

                <div className="col-span-1">
                  <label htmlFor="minBoxDepth" className={labelStyle}>Min Depth ({params.minBoxDepth})</label>
                  <Slider value={[params.minBoxDepth]} onValueChange={v => handleParamChange('minBoxDepth', v[0])} min={5} max={200} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="maxBoxDepth" className={labelStyle}>Max Depth ({params.maxBoxDepth})</label>
                  <Slider value={[params.maxBoxDepth]} onValueChange={v => handleParamChange('maxBoxDepth', v[0])} min={5} max={200} step={1} />
                </div>
                 <div className="col-span-1"> {/* Spacer or next item */} </div> 
                
                {/* Placement Volume Section */}
                <div className="col-span-full mt-4"><p className="text-lg font-semibold text-gray-700">Placement Volume</p></div>
                <div className="col-span-1">
                  <label htmlFor="placementVolumeWidth" className={labelStyle}>Width ({params.placementVolumeWidth})</label>
                  <Slider value={[params.placementVolumeWidth]} onValueChange={v => handleParamChange('placementVolumeWidth', v[0])} min={100} max={1000} step={10} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="placementVolumeHeight" className={labelStyle}>Height ({params.placementVolumeHeight})</label>
                  <Slider value={[params.placementVolumeHeight]} onValueChange={v => handleParamChange('placementVolumeHeight', v[0])} min={100} max={1000} step={10} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="placementVolumeDepth" className={labelStyle}>Depth ({params.placementVolumeDepth})</label>
                  <Slider value={[params.placementVolumeDepth]} onValueChange={v => handleParamChange('placementVolumeDepth', v[0])} min={100} max={1000} step={10} />
                </div>

                {/* Individual Box Rotation Section */}
                <div className="col-span-full mt-4"><p className="text-lg font-semibold text-gray-700">Individual Box Rotation</p></div>
                <div className="col-span-1">
                  <label htmlFor="maxRotationX" className={labelStyle}>Max X ({params.maxRotationX}°)</label>
                  <Slider value={[params.maxRotationX]} onValueChange={v => handleParamChange('maxRotationX', v[0])} min={0} max={180} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="maxRotationY" className={labelStyle}>Max Y ({params.maxRotationY}°)</label>
                  <Slider value={[params.maxRotationY]} onValueChange={v => handleParamChange('maxRotationY', v[0])} min={0} max={180} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="maxRotationZ" className={labelStyle}>Max Z ({params.maxRotationZ}°)</label>
                  <Slider value={[params.maxRotationZ]} onValueChange={v => handleParamChange('maxRotationZ', v[0])} min={0} max={180} step={1} />
                </div>

                {/* Scene & View Section */}
                <div className="col-span-full mt-4"><p className="text-lg font-semibold text-gray-700">Scene & View</p></div>
                <div className="col-span-1">
                  <label htmlFor="strokeWeight" className={labelStyle}>Stroke Weight ({params.strokeWeight.toFixed(1)})</label>
                  <Slider value={[params.strokeWeight]} onValueChange={v => handleParamChange('strokeWeight', v[0])} min={0.1} max={5} step={0.1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="initialRotationX" className={labelStyle}>Scene X Rotation ({params.initialRotationX}°)</label>
                  <Slider value={[params.initialRotationX]} onValueChange={v => handleParamChange('initialRotationX', v[0])} min={-180} max={180} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="initialRotationY" className={labelStyle}>Scene Y Rotation ({params.initialRotationY}°)</label>
                  <Slider value={[params.initialRotationY]} onValueChange={v => handleParamChange('initialRotationY', v[0])} min={-180} max={180} step={1} />
                </div>
                <div className="col-span-1">
                  <label htmlFor="initialRotationZ" className={labelStyle}>Scene Z Rotation ({params.initialRotationZ}°)</label>
                  <Slider value={[params.initialRotationZ]} onValueChange={v => handleParamChange('initialRotationZ', v[0])} min={-180} max={180} step={1} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <Button onClick={regenerate} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md shadow-sm transition duration-150">
                  Regenerate (New Seed)
                </Button>
                <Button onClick={exportSVG} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-md shadow-sm transition duration-150">
                  Export as SVG
                </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 