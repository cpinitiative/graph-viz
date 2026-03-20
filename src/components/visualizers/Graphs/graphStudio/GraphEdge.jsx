/* eslint-disable react/prop-types */
import React from "react";
import { motion } from "framer-motion";

const GraphEdge = ({
  edge,
  pathD,
  selected,
  multiSelected,
  shouldAnimate,
  markerId,
  labelPosition,
  onPointerDown,
  onClick,
  strokeWidth,
}) => {
  return (
    <g style={{ cursor: "pointer" }}>
      <path
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={Math.max(16, strokeWidth + 12)}
        strokeLinecap="round"
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={
          selected || multiSelected ? "#000000" : (edge.color ?? "#77777766")
        }
        strokeWidth={
          selected
            ? strokeWidth + 1.5
            : multiSelected
              ? strokeWidth + 0.5
              : strokeWidth
        }
        strokeLinecap="round"
        markerEnd={edge.directed ? `url(#${markerId})` : undefined}
        layoutId={`edge-${edge.id}`}
        initial={false}
        animate={{ d: pathD }}
        transition={
          shouldAnimate
            ? {
                duration: Math.max((edge.duration ?? 450) / 1000, 0.1),
                ease: "easeInOut",
              }
            : { duration: 0 }
        }
        pointerEvents="none"
        style={{
          filter:
            selected || multiSelected
              ? "drop-shadow(0 8px 32px rgba(27, 27, 27, 0.04))"
              : "none",
        }}
      />
      {edge.label && labelPosition && (
        <g pointerEvents="none">
          <text
            x={labelPosition.x}
            y={labelPosition.y + 4}
            textAnchor="middle"
            style={{ fontSize: "10px", fontWeight: 500, fill: '#1b1b1b', fontFamily: 'sans-serif' }}
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
};

export default GraphEdge;
