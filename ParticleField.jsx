import React, { useEffect, useRef } from "react";
import { createParticleSystem } from "./particle-field.js";

/**
 * ParticleField React Component
 * Drop-in interactive 3D particle canvas for React & Next.js portfolios.
 *
 * @param {Object} props
 * @param {string} [props.className] - Container CSS class names
 * @param {string} [props.initialShape] - Initial shape ("Manzil", "guitar", "cricket", etc.)
 * @param {number} [props.particleCount] - Explicit particle count override
 * @param {string} [props.inkColor] - Ink particle color (default: CSS var(--fg))
 * @param {string} [props.accentColor] - Accent particle color (default: CSS var(--accent))
 */
export default function ParticleField({
  className = "relative h-72 w-full sm:h-96 lg:aspect-square lg:h-auto",
  initialShape = "Manzil",
  particleCount,
  inkColor,
  accentColor
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const system = createParticleSystem(containerRef.current, {
      initialShape,
      particleCount,
      inkColor,
      accentColor,
      canvasClass: "block h-full w-full"
    });

    return () => {
      system.destroy();
    };
  }, [initialShape, particleCount, inkColor, accentColor]);

  return <div ref={containerRef} className={className} />;
}
