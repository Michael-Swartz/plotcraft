'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Delaunay } from 'd3-delaunay'

const Sketch = dynamic(() => import('react-p5'), { ssr: false })
import type P5Instance from 'p5'

// Define a Point type compatible with d3-delaunay
type Point = [number, number];

interface TriangulationParameters {
  numPoints: number;
  showPoints: boolean;
  showTriangleEdges: boolean;
}

export default function DelaunayTriangulationPage() {
  const [params, setParams] = useState<TriangulationParameters>({
    numPoints: 30,
    showPoints: true,
    showTriangleEdges: true,
  });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10000));

  const p5Instance = useRef<P5Instance | null>(null);
  const canvasSize = { width: 800, height: 600 };
  const sitesToDraw = useRef<P5Instance.Vector[]>([]); // For p5.point drawing
  const sitePointsForDelaunay = useRef<Point[]>([]); // For Delaunay input and SVG export
  const delaunayRef = useRef<Delaunay<Point> | undefined>(undefined);

  const handleParamChange = (paramName: keyof TriangulationParameters, value: number | boolean) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const generateSitesAndTriangulation = useCallback((p5: P5Instance, currentParams: TriangulationParameters, currentSeed: number) => {
    p5.randomSeed(currentSeed);
    const newSitesArray: Point[] = []; 
    const newSitesToDraw: P5Instance.Vector[] = [];
    for (let i = 0; i < currentParams.numPoints; i++) {
      const x = p5.random(canvasSize.width);
      const y = p5.random(canvasSize.height);
      newSitesArray.push([x, y]);
      newSitesToDraw.push(p5.createVector(x,y)); 
    }
    sitePointsForDelaunay.current = newSitesArray;
    sitesToDraw.current = newSitesToDraw;

    if (sitePointsForDelaunay.current.length >= 3) { 
      delaunayRef.current = Delaunay.from(sitePointsForDelaunay.current);
    } else {
      delaunayRef.current = undefined;
    }
  }, []);

  const setup = (p5Setup: P5Instance, canvasParentRef: Element) => {
    p5Instance.current = p5Setup;
    p5Setup.createCanvas(canvasSize.width, canvasSize.height).parent(canvasParentRef);
    p5Setup.pixelDensity(1);
    p5Setup.randomSeed(seed);
    p5Setup.noLoop();
    generateSitesAndTriangulation(p5Setup, params, seed);
  };

  const draw = useCallback((p5: P5Instance) => {
    if (!p5) return;
    p5.background(255); 

    const delaunay = delaunayRef.current;
    const currentSitePoints = sitePointsForDelaunay.current;

    if (params.showTriangleEdges && delaunay && delaunay.triangles.length > 0 && currentSitePoints.length > 0) {
      p5.stroke(0); 
      p5.strokeWeight(1);
      const triangles = delaunay.triangles;
      for (let i = 0; i < triangles.length; i += 3) {
        const p1 = currentSitePoints[triangles[i]];
        const p2 = currentSitePoints[triangles[i + 1]];
        const p3 = currentSitePoints[triangles[i + 2]];
        // Ensure p1, p2, p3 are not undefined before drawing
        if (p1 && p2 && p3) {
          p5.line(p1[0], p1[1], p2[0], p2[1]);
          p5.line(p2[0], p2[1], p3[0], p3[1]);
          p5.line(p3[0], p3[1], p1[0], p1[1]);
        }
      }
    }

    if (params.showPoints && sitesToDraw.current.length > 0) {
      p5.stroke(0); 
      p5.fill(0);
      p5.strokeWeight(5);
      for (const site of sitesToDraw.current) {
        p5.point(site.x, site.y);
      }
      p5.noFill();
    }

  }, [params, seed]); // currentSitePoints is from ref, delaunay is from ref

  useEffect(() => {
    if (p5Instance.current) {
      generateSitesAndTriangulation(p5Instance.current, params, seed);
      p5Instance.current.redraw();
    }
  }, [params, seed, generateSitesAndTriangulation]);

  const regenerate = () => {
    const newSeed = Math.floor(Math.random() * 10000);
    setSeed(newSeed);
  };

  const exportSVG = () => {
    const delaunay = delaunayRef.current;
    const currentSitePoints = sitePointsForDelaunay.current;

    if (!delaunay || !p5Instance.current || delaunay.triangles.length === 0 || currentSitePoints.length === 0) {
      console.error("Delaunay data or site points not available or insufficient for SVG export.");
      return;
    }

    let svgOutput = `<svg width="${canvasSize.width}" height="${canvasSize.height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white;">\n`;
    svgOutput += `  <g stroke="black" stroke-width="1" fill="none">\n`;

    const triangles = delaunay.triangles;
    for (let i = 0; i < triangles.length; i += 3) {
      const p1 = currentSitePoints[triangles[i]];
      const p2 = currentSitePoints[triangles[i + 1]];
      const p3 = currentSitePoints[triangles[i + 2]];
      if (p1 && p2 && p3) {
        svgOutput += `    <line x1="${p1[0].toFixed(2)}" y1="${p1[1].toFixed(2)}" x2="${p2[0].toFixed(2)}" y2="${p2[1].toFixed(2)}"/>\n`;
        svgOutput += `    <line x1="${p2[0].toFixed(2)}" y1="${p2[1].toFixed(2)}" x2="${p3[0].toFixed(2)}" y2="${p3[1].toFixed(2)}"/>\n`;
        svgOutput += `    <line x1="${p3[0].toFixed(2)}" y1="${p3[1].toFixed(2)}" x2="${p1[0].toFixed(2)}" y2="${p1[1].toFixed(2)}"/>\n`;
      }
    }
    svgOutput += `  </g>\n`;

    if (params.showPoints && sitesToDraw.current.length > 0) {
        svgOutput += `  <g fill="black" stroke="none">\n`;
        for(const site of sitesToDraw.current) {
            svgOutput += `    <circle cx="${site.x.toFixed(2)}" cy="${site.y.toFixed(2)}" r="2.5"/>\n`;
        }
        svgOutput += `  </g>\n`;
    }

    svgOutput += `</svg>`;

    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delaunay-triangulation-${seed}.svg`;
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
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-700 flex-grow">Delaunay Triangulation Generator</h1>
          <Link href="/" legacyBehavior passHref>
            <Button asChild variant="outline" className="ml-4">
              <a>Back to Home</a>
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <div className="lg:flex-grow">
            <div className="border border-gray-300 rounded-md overflow-hidden aspect-[4/3] shadow-inner bg-white mx-auto lg:mx-0" style={{ maxWidth: canvasSize.width }}>
              {/* @ts-expect-error p5 types can be tricky */}
              <Sketch setup={setup} draw={draw} />
            </div>
          </div>

          <div className="lg:w-96 space-y-6 p-4 border border-gray-200 rounded-lg shadow-sm bg-slate-50 flex-shrink-0">
            <div className="grid grid-cols-1 gap-y-4">
                <p className="text-lg font-semibold text-gray-700">Controls</p>
                <div>
                  <label htmlFor="numPoints" className={labelStyle}>Number of Points ({params.numPoints})</label>
                  <Slider value={[params.numPoints]} onValueChange={v => handleParamChange('numPoints', v[0])} min={3} max={200} step={1} />
                </div>

                <div className="flex items-center mt-2">
                  <input 
                    type="checkbox" 
                    id="showPoints" 
                    checked={params.showPoints} 
                    onChange={e => handleParamChange('showPoints', e.target.checked)} 
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="showPoints" className="ml-2 text-sm text-gray-700">Show Points</label>
                </div>

                <div className="flex items-center mt-1">
                  <input 
                    type="checkbox" 
                    id="showTriangleEdges" 
                    checked={params.showTriangleEdges} 
                    onChange={e => handleParamChange('showTriangleEdges', e.target.checked)} 
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="showTriangleEdges" className="ml-2 text-sm text-gray-700">Show Triangle Edges</label>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200">
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