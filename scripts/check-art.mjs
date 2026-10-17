#!/usr/bin/env node
/** Quick sanity check for an art PNG. */
import sharp from "sharp";

const PATH = process.argv[2] || "public/art/kakashi.png";
const MAX_DIM = Number(process.argv[3] || 160);

const img = sharp(PATH);
const { width: W, height: H } = await img.metadata();
const buf = await img.ensureAlpha().raw().toBuffer();
const data = Buffer.from(buf);

let ink = 0, bg = 0, accent = 0, minX=W,minY=H,maxX=0,maxY=0;

for (let y=0; y<H; y++) {
  for (let x=0; x<W; x++) {
    const i=(y*W+x)*4; const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
    const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    if (a < 60 || (lum>0.894 && max-min<16)) { bg++; continue; }
    ink++;
    if (x<minX) minX=x; if (x>maxX) maxX=x; if (y<minY) minY=y; if (y>maxY) maxY=y;
    if (r>95 && r>g*1.2 && r>b*1.2) accent++;
  }
}

console.log(`Image ${W}x${H}`);
console.log(`bg=${bg} (${(bg/(W*H)*100).toFixed(1)}%) ink=${ink} (${(ink/(W*H)*100).toFixed(1)}%) accent=${accent}`);
console.log(`bbox (${minX},${minY})-(${maxX},${maxY}) w=${maxX-minX} h=${maxY-minY}`);

const scale = MAX_DIM / Math.max(W,H);
const w=Math.round(W*scale), h=Math.round(H*scale);
const out = Array(h).fill(0).map(()=>Array(w).fill('.'));
for (let y=0; y<H; y++) {
  const dy = Math.round(y*scale);
  if (dy<0||dy>=h) continue;
  for (let x=0; x<W; x++) {
    const dx = Math.round(x*scale);
    if (dx<0||dx>=w) continue;
    const i=(y*W+x)*4; const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
    const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    if (a<60||(lum>0.894&&max-min<16)) continue;
    if (r>95&&r>g*1.2&&r>b*1.2) out[dy][dx]='@';
    else if (lum<0.25) out[dy][dx]='#';
    else if (lum<0.55) out[dy][dx]='+';
  }
}
console.log(out.map(r=>r.join('')).join('\n'));
