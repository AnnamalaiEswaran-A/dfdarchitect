
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DFDStructure } from '../types';

interface DFDCanvasProps {
  structure: DFDStructure;
  onSelectElement?: (element: any) => void;
  isEditMode?: boolean;
  onUpdateElementPosition?: (id: string, x: number, y: number) => void;
}

const DFDCanvas: React.FC<DFDCanvasProps> = ({ structure, onSelectElement, isEditMode, onUpdateElementPosition }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const initialized = useRef(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const HEIGHT_ENTITY = 60;
  const HEIGHT_PROCESS = 80;
  const HEIGHT_STORE = 50;

  const calculateWidth = (text: string, minWidth: number) => {
    const estimatedWidth = (text?.length || 0) * 10 + 60; 
    return Math.max(minWidth, estimatedWidth);
  };

  const getEdgePoint = (source: {x: number, y: number}, target: {x: number, y: number, width: number, height: number}) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const hw = target.width / 2;
    const hh = target.height / 2;
    
    if (Math.abs(dx) === 0 && Math.abs(dy) === 0) return { x: target.x, y: target.y };

    const slope = dy / dx;
    const rectSlope = hh / hw;

    if (Math.abs(slope) <= rectSlope) {
      const x = dx > 0 ? target.x - hw : target.x + hw;
      const y = target.y - (dx > 0 ? hw : -hw) * slope;
      return { x, y };
    } else {
      const y = dy > 0 ? target.y - hh : target.y + hh;
      const x = target.x - (dy > 0 ? hh : -hh) / slope;
      return { x, y };
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    if (!initialized.current) {
      // Setup Markers once
      const defs = svg.append('defs');
      const addMarkers = (id: string, color: string) => {
        // Forward Arrow
        defs.append('marker')
          .attr('id', `arrow-end-${id}`)
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 9)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M0,-5L10,0L0,5')
          .attr('fill', color);

        // Backward Arrow (Bidirectional)
        defs.append('marker')
          .attr('id', `arrow-start-${id}`)
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 0)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto-start-reverse')
          .append('path')
          .attr('d', 'M0,-5L10,0L0,5')
          .attr('fill', color);
      };

      addMarkers('https', '#3b82f6');
      addMarkers('sql', '#f59e0b');
      addMarkers('standard', '#64748b');

      const mainG = svg.append('g').attr('class', 'main-container');
      (gRef as any).current = mainG.node();

      mainG.append('g').attr('class', 'links-layer');
      mainG.append('g').attr('class', 'nodes-layer');

      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          mainG.attr('transform', event.transform);
          setZoomLevel(event.transform.k);
        });

      svg.call(zoomBehavior);
      initialized.current = true;
    }

    const g = d3.select(gRef.current);
    const linkLayer = g.select('.links-layer');
    const nodeLayer = g.select('.nodes-layer');

    // Process Nodes
    const spacingX = 450;
    const startX = 300;
    const centerY = 600;

    const nodes: any[] = [
      ...structure.externalEntities.map((e, i) => ({ 
        ...e, type: 'entity', 
        x: e.x ?? (startX - 200), 
        y: e.y ?? (centerY - 250), 
        width: calculateWidth(e.name, 160), 
        height: HEIGHT_ENTITY 
      })),
      ...structure.processes.map((p, i) => ({ 
        ...p, type: 'process', 
        x: p.x ?? (startX + i * spacingX), 
        y: p.y ?? centerY, 
        width: calculateWidth(p.name, 180), 
        height: HEIGHT_PROCESS 
      })),
      ...structure.dataStores.map((s, i) => ({ 
        ...s, type: 'store', 
        x: s.x ?? (startX + i * spacingX), 
        y: s.y ?? (centerY + 250), 
        width: calculateWidth(s.name, 180), 
        height: HEIGHT_STORE 
      }))
    ];

    const links = structure.dataFlows.map(f => {
      const source = nodes.find(n => n.id === f.sourceId);
      const target = nodes.find(n => n.id === f.targetId);
      return { ...f, source, target };
    }).filter(l => l.source && l.target);

    function updatePositions() {
      linkLayer.selectAll('.link-path')
        .attr('d', (d: any) => {
          const start = getEdgePoint({ x: d.target.x, y: d.target.y }, d.source);
          const end = getEdgePoint({ x: d.source.x, y: d.source.y }, d.target);
          return `M${start.x},${start.y} L${end.x},${end.y}`;
        });

      linkLayer.selectAll('.link-label')
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 12);

      nodeLayer.selectAll('.node-container')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    }

    // Nodes Join
    const nodeSelection = nodeLayer.selectAll<SVGGElement, any>('g.node-container')
      .data(nodes, d => d.id)
      .join(
        enter => {
          const gEnter = enter.append('g').attr('class', 'node-container');
          gEnter.style('cursor', isEditMode ? 'move' : 'pointer')
            .on('click', (event, d) => {
              event.stopPropagation();
              onSelectElement?.(d);
            });
          return gEnter;
        },
        update => update.style('cursor', isEditMode ? 'move' : 'pointer')
      );

    // Re-render node content to reflect property changes
    nodeSelection.each(function(d) {
      const el = d3.select(this);
      el.selectAll('*').remove();
      if (d.type === 'entity') {
        el.append('rect').attr('width', d.width).attr('height', d.height).attr('x', -d.width / 2).attr('y', -d.height / 2).attr('fill', '#0c122b').attr('stroke', '#1e293b').attr('stroke-width', 2);
        el.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '13px').attr('font-weight', 'bold').attr('fill', 'white').text(d.name);
      } else if (d.type === 'process') {
        el.append('rect').attr('width', d.width).attr('height', d.height).attr('x', -d.width / 2).attr('y', -d.height / 2).attr('rx', 14).attr('fill', '#8a9fdd').attr('stroke', '#1e293b').attr('stroke-width', 2);
        el.append('line').attr('x1', -d.width / 2).attr('y1', -d.height / 2 + 30).attr('x2', d.width / 2).attr('y2', -d.height / 2 + 30).attr('stroke', '#1e293b').attr('stroke-width', 1.5);
        el.append('text').attr('y', -d.height / 2 + 20).attr('text-anchor', 'middle').attr('font-size', '11px').attr('font-weight', '900').attr('fill', '#0f172a').text(d.number || d.id);
        el.append('text').attr('y', -d.height / 2 + 60).attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', 'bold').attr('fill', '#0f172a').text(d.name);
      } else if (d.type === 'store') {
        el.append('rect').attr('width', d.width).attr('height', d.height).attr('x', -d.width / 2).attr('y', -d.height / 2).attr('fill', '#f1f5f9').attr('stroke', '#334155').attr('stroke-width', 1.5);
        const prefixBoxWidth = 50;
        el.append('line').attr('x1', -d.width / 2 + prefixBoxWidth).attr('y1', -d.height / 2).attr('x2', -d.width / 2 + prefixBoxWidth).attr('y2', d.height / 2).attr('stroke', '#334155').attr('stroke-width', 1.5);
        el.append('text').attr('x', -d.width / 2 + prefixBoxWidth / 2).attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '11px').attr('font-weight', '900').attr('fill', '#475569').text(d.prefix || 'DB');
        el.append('text').attr('x', prefixBoxWidth / 2).attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '13px').attr('font-weight', 'bold').attr('fill', '#0f172a').text(d.name);
      }
    });

    if (isEditMode) {
      nodeSelection.call(d3.drag<SVGGElement, any>()
        .on('start', function() { d3.select(this).raise(); })
        .on('drag', (event, d) => {
          d.x = event.x;
          d.y = event.y;
          updatePositions();
        })
        .on('end', (event, d) => {
          onUpdateElementPosition?.(d.id, d.x, d.y);
        })
      );
    } else {
      nodeSelection.on('.drag', null);
    }

    // Links Join
    linkLayer.selectAll('path.link-path')
      .data(links, (d: any) => d.id)
      .join('path')
      .attr('class', 'link-path')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke', (d: any) => d.protocol === 'https' ? '#3b82f6' : d.protocol === 'sql' ? '#fbbf24' : '#94a3b8')
      .attr('marker-end', (d: any) => `url(#arrow-end-${d.protocol || 'standard'})`)
      .attr('marker-start', (d: any) => d.isBidirectional ? `url(#arrow-start-${d.protocol || 'standard'})` : null)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectElement?.(d);
      });

    linkLayer.selectAll('text.link-label')
      .data(links, (d: any) => d.id)
      .join('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#475569')
      .attr('text-anchor', 'middle')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .text((d: any) => d.label)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectElement?.(d);
      });

    updatePositions();
  }, [structure, isEditMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white overflow-hidden rounded-[2.5rem] border-8 border-white shadow-2xl group/canvas">
      <svg ref={svgRef} className="w-full h-full" xmlns="http://www.w3.org/2000/svg" />
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-2 text-xs font-black text-slate-800 shadow-xl uppercase tracking-widest flex items-center gap-2">
          {isEditMode && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          {isEditMode ? 'Manual Edit Mode' : 'View Mode'} | Zoom: {Math.round(zoomLevel * 100)}%
        </div>
      </div>
    </div>
  );
};

export default DFDCanvas;
