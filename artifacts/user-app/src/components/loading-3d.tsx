import { useEffect, useRef } from "react";

export function Loading3D({ message = "Loading..." }: { message?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 280, H = 280;
    canvas.width = W;
    canvas.height = H;
    let frame = 0;
    let raf: number;

    const project = (x: number, y: number, z: number, fov = 320) => {
      const pz = z + 5;
      return { x: W / 2 + (x / pz) * fov, y: H / 2 + (y / pz) * fov, scale: fov / pz };
    };

    const rotateX = (x: number, y: number, z: number, a: number) => ({
      x, y: y * Math.cos(a) - z * Math.sin(a), z: y * Math.sin(a) + z * Math.cos(a),
    });
    const rotateY = (x: number, y: number, z: number, a: number) => ({
      x: x * Math.cos(a) + z * Math.sin(a), y, z: -x * Math.sin(a) + z * Math.cos(a),
    });
    const rotateZ = (x: number, y: number, z: number, a: number) => ({
      x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a), z,
    });

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // Background glow
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
      grad.addColorStop(0, "rgba(99,102,241,0.08)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Spinning torus-like rings
      const numRings = 3;
      for (let ring = 0; ring < numRings; ring++) {
        const ringAngle = (ring / numRings) * Math.PI;
        const numDots = 24;
        const r = 50 + ring * 12;
        const dots: { x: number; y: number; z: number; alpha: number }[] = [];

        for (let i = 0; i < numDots; i++) {
          const a = (i / numDots) * Math.PI * 2 + t * (1 + ring * 0.4);
          let px = Math.cos(a) * r;
          let py = Math.sin(a) * r;
          let pz = 0;

          // Tilt each ring differently
          const rX = rotateX(px, py, pz, ringAngle + t * 0.2);
          const rY = rotateY(rX.x, rX.y, rX.z, t * (0.5 + ring * 0.15));
          const rZ = rotateZ(rY.x, rY.y, rY.z, ring * 0.8);

          dots.push({ x: rZ.x, y: rZ.y, z: rZ.z, alpha: (Math.sin(a + t) + 1) / 2 });
        }

        const hue = 240 + ring * 30;
        dots.sort((a, b) => a.z - b.z);
        for (const d of dots) {
          const p = project(d.x, d.y, d.z);
          const size = Math.max(0.1, p.scale * 4);
          const alpha = 0.4 + d.alpha * 0.6;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
          g.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha})`);
          g.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
      }

      // Central glowing sphere
      const cg = ctx.createRadialGradient(W / 2 - 6, H / 2 - 6, 0, W / 2, H / 2, 28);
      cg.addColorStop(0, "rgba(200, 200, 255, 0.95)");
      cg.addColorStop(0.4, "rgba(99, 102, 241, 0.8)");
      cg.addColorStop(1, "rgba(79, 70, 229, 0)");
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 22, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();

      // Pulsing outer glow
      const pulse = (Math.sin(t * 2) + 1) / 2;
      const og = ctx.createRadialGradient(W / 2, H / 2, 14, W / 2, H / 2, 35 + pulse * 10);
      og.addColorStop(0, `rgba(99,102,241,${0.2 + pulse * 0.1})`);
      og.addColorStop(1, "rgba(99,102,241,0)");
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 35 + pulse * 10, 0, Math.PI * 2);
      ctx.fillStyle = og;
      ctx.fill();
    };

    const animate = () => {
      frame++;
      draw(frame * 0.018);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
      <div className="relative">
        <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.12}s`, animationDuration: "0.8s" }} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm font-medium tracking-wide">{message}</p>
    </div>
  );
}
