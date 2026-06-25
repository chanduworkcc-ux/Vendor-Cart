import { useEffect, useRef } from "react";

export function Loading3D({ message = "Loading..." }: { message?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 200;
    let frame = 0;
    let raf: number;

    const drawCube = (time: number) => {
      ctx.clearRect(0, 0, 200, 200);
      const cx = 100, cy = 100;
      const size = 40;
      const rx = Math.sin(time * 0.8) * 0.4 + 0.3;
      const ry = time * 1.2;

      // Compute 8 vertices of a cube
      const verts = [
        [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
        [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],
      ].map(([x,y,z]) => {
        // Rotate Y
        const cosY = Math.cos(ry), sinY = Math.sin(ry);
        const nx = x * cosY - z * sinY, nz = x * sinY + z * cosY;
        // Rotate X
        const cosX = Math.cos(rx), sinX = Math.sin(rx);
        const ny2 = y * cosX - nz * sinX, nz2 = y * sinX + nz * cosX;
        // Project
        const pz = nz2 + 4;
        return [cx + (nx / pz) * size * 2, cy + (ny2 / pz) * size * 2, pz];
      });

      const faces = [
        [0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [0,3,7,4], [1,2,6,5]
      ];

      const faceColors = [
        "rgba(59,130,246,0.9)", "rgba(99,102,241,0.9)", "rgba(139,92,246,0.9)",
        "rgba(168,85,247,0.9)", "rgba(79,70,229,0.9)", "rgba(109,40,217,0.9)",
      ];

      // Sort faces by average z for painter's algorithm
      const sorted = faces.map((face, i) => ({
        face, color: faceColors[i],
        z: face.reduce((s, vi) => s + verts[vi][2], 0) / 4,
      })).sort((a, b) => a.z - b.z);

      for (const { face, color } of sorted) {
        ctx.beginPath();
        const [x0, y0] = verts[face[0]];
        ctx.moveTo(x0, y0);
        for (let i = 1; i < 4; i++) {
          const [xi, yi] = verts[face[i]];
          ctx.lineTo(xi, yi);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw orbit dots
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time * 2;
        const r = 70;
        const dotX = cx + Math.cos(angle) * r;
        const dotY = cy + Math.sin(angle) * r * 0.4;
        const scale = (Math.sin(angle) + 1.5) / 2.5;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${0.3 + scale * 0.7})`;
        ctx.fill();
      }
    };

    const animate = () => {
      frame++;
      drawCube(frame * 0.02);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
      <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
      <div className="flex items-center gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
  );
}
