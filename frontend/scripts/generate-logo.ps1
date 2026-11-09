<#
  Fairtrike logo preparer
  ---------------------------------------------------------------------------
  The brand artwork (scripts/brand/tricycle-mark-source.jpeg) was exported as a
  JPEG, so its transparent canvas was flattened into a visible grey/white
  checkerboard. Every <img> that pointed at it rendered a checkerboard square
  behind the tricycle mark.

  This script rebuilds a real transparent PNG from that artwork:
    1. decode the source,
    2. flood-fill the light (background coloured) region inwards from the image
       border -> the real background mask (enclosed light art is preserved),
    2b. reclaim the artwork's own holes (glass panes, basket mesh, canopy gaps):
       enclosed light regions that carry both checkerboard tones are transparent
       in the original design, the painted silver parts are not,
    3. feather the seam between mark and background so downscaled edges stay clean,
    4. bleed edge colour into the transparent halo (prevents dark fringes when
       the browser downsamples),
    5. crop to the mark + padding and re-fit onto a square RGBA canvas.

  Zero third-party tooling: it uses the .NET System.Drawing (GDI+) that ships
  with Windows / Windows PowerShell, so it runs fully offline.

  Usage (from the `frontend` folder):
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-logo.ps1

  Output: public/fairtrike-logo.png  (512x512, 32bpp RGBA)
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$code = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class FairtrikeLogo
{
    private const int LightMin = 170;  // pixel counts as background-coloured when min(R,G,B) >= this
    private const int RampLow  = 110;  // seam pixel is fully opaque at or below this luminance
    private const int RampHigh = 205;  // seam pixel is fully transparent at or above this luminance
    private const int Spill    = 3;    // px of edge colour bled into the transparent halo
    private const int HoleMinArea  = 200;   // enclosed light region must be at least this big to be a hole
    private const double HoleToneMin = 0.30; // ...and carry at least this much of BOTH checkerboard tones

    private static void Visit(int idx, bool[] light, bool[] bg, Stack<int> stack)
    {
        if (!bg[idx] && light[idx]) { bg[idx] = true; stack.Push(idx); }
    }

    private static int Min3(byte[] buf, int offset)
    {
        int m = buf[offset];
        if (buf[offset + 1] < m) m = buf[offset + 1];
        if (buf[offset + 2] < m) m = buf[offset + 2];
        return m;
    }

    public static string Prepare(string srcPath, string dstPath, int outSize, int padPercent)
    {
        int w, h, stride, n;
        byte[] px;

        using (Image srcImg = Image.FromFile(srcPath))
        {
            w = srcImg.Width;
            h = srcImg.Height;
            n = w * h;

            using (Bitmap loaded = new Bitmap(w, h, PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(loaded))
                {
                    g.Clear(Color.Transparent);
                    g.DrawImage(srcImg, new Rectangle(0, 0, w, h));
                }
                BitmapData data = loaded.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                stride = data.Stride;
                px = new byte[stride * h];
                Marshal.Copy(data.Scan0, px, 0, px.Length);
                loaded.UnlockBits(data);
            }
        }

        // 1. tag the "light" (possibly background) pixels
        bool[] light = new bool[n];
        for (int y = 0; y < h; y++)
        {
            int rowBase = y * stride;
            int rowIdx = y * w;
            for (int x = 0; x < w; x++)
                light[rowIdx + x] = Min3(px, rowBase + x * 4) >= LightMin;
        }

        // 2. flood fill inwards from the border -> the real background mask
        bool[] bg = new bool[n];
        Stack<int> stack = new Stack<int>(1 << 16);
        for (int x = 0; x < w; x++)
        {
            Visit(x, light, bg, stack);
            Visit((h - 1) * w + x, light, bg, stack);
        }
        for (int y = 0; y < h; y++)
        {
            Visit(y * w, light, bg, stack);
            Visit(y * w + (w - 1), light, bg, stack);
        }
        while (stack.Count > 0)
        {
            int i = stack.Pop();
            int x = i % w;
            int y = i / w;
            if (x > 0)     Visit(i - 1, light, bg, stack);
            if (x < w - 1) Visit(i + 1, light, bg, stack);
            if (y > 0)     Visit(i - w, light, bg, stack);
            if (y < h - 1) Visit(i + w, light, bg, stack);
        }

        // 2b. Reclaim the artwork's own holes. The glass panes, basket mesh and canopy gaps
        //     were transparent in the original design, so the flattened canvas checkerboard
        //     shows through them. An enclosed light region is a hole when it is big AND
        //     carries both checkerboard tones; the painted silver parts (headlight, mirror,
        //     trims) are either too small or too single-toned to qualify.
        System.Text.StringBuilder log = new System.Text.StringBuilder();
        bool[] seenHole = new bool[n];
        int holes = 0;
        int holePixels = 0;
        for (int i = 0; i < n; i++)
        {
            if (!light[i] || bg[i] || seenHole[i]) continue;

            List<int> comp = new List<int>();
            Stack<int> cs = new Stack<int>();
            cs.Push(i);
            seenHole[i] = true;
            while (cs.Count > 0)
            {
                int k = cs.Pop();
                comp.Add(k);
                int x = k % w, y = k / w;
                if (x > 0 && !seenHole[k - 1] && light[k - 1] && !bg[k - 1]) { seenHole[k - 1] = true; cs.Push(k - 1); }
                if (x < w - 1 && !seenHole[k + 1] && light[k + 1] && !bg[k + 1]) { seenHole[k + 1] = true; cs.Push(k + 1); }
                if (y > 0 && !seenHole[k - w] && light[k - w] && !bg[k - w]) { seenHole[k - w] = true; cs.Push(k - w); }
                if (y < h - 1 && !seenHole[k + w] && light[k + w] && !bg[k + w]) { seenHole[k + w] = true; cs.Push(k + w); }
            }

            int low = 0, high = 0;
            foreach (int k in comp)
            {
                int m = Min3(px, (k / w) * stride + (k % w) * 4);
                if (m >= 190 && m <= 218) low++;
                if (m >= 232) high++;
            }
            bool isHole = comp.Count >= HoleMinArea
                && Math.Min(low, high) >= comp.Count * HoleToneMin;

            if (comp.Count >= 40)
                log.Append(string.Format("{0}enclosed region {1,6} px  low {2,3}%  high {3,3}%  -> {4}",
                    Environment.NewLine, comp.Count,
                    (int)Math.Round(100.0 * low / comp.Count),
                    (int)Math.Round(100.0 * high / comp.Count),
                    isHole ? "HOLE (transparent)" : "artwork (kept)"));

            if (!isHole) continue;
            foreach (int k in comp) bg[k] = true;
            holes++;
            holePixels += comp.Count;
        }

        // 3. bounding box of the mark, plus padding
        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                if (!bg[y * w + x])
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
        if (maxX < 0) { throw new InvalidOperationException("no mark pixels found - background threshold too low?"); }

        int inkW = maxX - minX + 1;
        int inkH = maxY - minY + 1;
        int pad = (int)Math.Round(Math.Max(inkW, inkH) * (padPercent / 100.0));
        int cx0 = Math.Max(0, minX - pad);
        int cy0 = Math.Max(0, minY - pad);
        int cropW = Math.Min(w - 1, maxX + pad) - cx0 + 1;
        int cropH = Math.Min(h - 1, maxY + pad) - cy0 + 1;

        // 4. crop to an RGBA buffer, keeping the original (light) RGB in the empty area
        byte[] cut = new byte[cropW * cropH * 4];
        for (int y = 0; y < cropH; y++)
        {
            int sy = cy0 + y;
            for (int x = 0; x < cropW; x++)
            {
                int so = sy * stride + (cx0 + x) * 4;
                int d = (y * cropW + x) * 4;
                cut[d] = px[so];
                cut[d + 1] = px[so + 1];
                cut[d + 2] = px[so + 2];
                cut[d + 3] = 255;
            }
        }

        // 5. alpha: background -> 0, mark -> 255, seam -> luminance ramp (soft edge)
        int feathered = 0;
        for (int y = 0; y < cropH; y++)
        {
            for (int x = 0; x < cropW; x++)
            {
                int sx = cx0 + x;
                int sy = cy0 + y;
                int gi = sy * w + sx;
                int d = (y * cropW + x) * 4;
                if (bg[gi]) { cut[d + 3] = 0; continue; }

                bool seam = false;
                if (x > 0 && bg[gi - 1]) seam = true;
                else if (sx < w - 1 && bg[gi + 1]) seam = true;
                else if (y > 0 && bg[gi - w]) seam = true;
                else if (sy < h - 1 && bg[gi + w]) seam = true;
                if (!seam) continue;

                int a = (int)Math.Round(255.0 * (RampHigh - Min3(cut, d)) / (double)(RampHigh - RampLow));
                if (a < 0) a = 0;
                if (a > 255) a = 255;
                cut[d + 3] = (byte)a;
                feathered++;
            }
        }

        // 6. bleed edge colour outwards so downscaling never blends against black
        for (int pass = 0; pass < Spill; pass++)
        {
            byte[] next = (byte[])cut.Clone();
            for (int y = 0; y < cropH; y++)
            {
                for (int x = 0; x < cropW; x++)
                {
                    int d = (y * cropW + x) * 4;
                    if (cut[d + 3] != 0) continue;
                    int sr = -1;
                    if (x > 0 && cut[d - 1] != 0) sr = d - 4;
                    else if (x < cropW - 1 && cut[d + 7] != 0) sr = d + 4;
                    else if (y > 0 && cut[d - cropW * 4 + 3] != 0) sr = d - cropW * 4;
                    else if (y < cropH - 1 && cut[d + cropW * 4 + 3] != 0) sr = d + cropW * 4;
                    if (sr < 0) continue;
                    next[d] = cut[sr];
                    next[d + 1] = cut[sr + 1];
                    next[d + 2] = cut[sr + 2];
                }
            }
            cut = next;
        }

        // 7. fit the crop onto a transparent square canvas
        using (Bitmap cutBmp = new Bitmap(cropW, cropH, PixelFormat.Format32bppArgb))
        {
            BitmapData dst = cutBmp.LockBits(new Rectangle(0, 0, cropW, cropH), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            long scan0 = dst.Scan0.ToInt64();
            for (int y = 0; y < cropH; y++)
                Marshal.Copy(cut, y * cropW * 4, new IntPtr(scan0 + (long)y * dst.Stride), cropW * 4);
            cutBmp.UnlockBits(dst);

            using (Bitmap outBmp = new Bitmap(outSize, outSize, PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(outBmp))
                {
                    g.CompositingMode = CompositingMode.SourceOver;
                    g.CompositingQuality = CompositingQuality.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.SmoothingMode = SmoothingMode.HighQuality;

                    double scale = Math.Min((double)outSize / cropW, (double)outSize / cropH);
                    int dw = (int)Math.Round(cropW * scale);
                    int dh = (int)Math.Round(cropH * scale);
                    int dx = (outSize - dw) / 2;
                    int dy = (outSize - dh) / 2;

                    using (ImageAttributes ia = new ImageAttributes())
                    {
                        ia.SetWrapMode(WrapMode.TileFlipXY);
                        g.DrawImage(cutBmp, new Rectangle(dx, dy, dw, dh), 0, 0, cropW, cropH, GraphicsUnit.Pixel, ia);
                    }
                }
                outBmp.Save(dstPath, ImageFormat.Png);
            }
        }

        int semi = 0;
        for (int i = 3; i < cut.Length; i += 4)
            if (cut[i] > 0 && cut[i] < 255) semi++;

        return string.Format(
            "source {0}x{1} | mark {2}x{3} at ({4},{5}) | crop {6}x{7} | holes {8} ({9} px) | seam px {10} | soft-alpha px {11} | {12}{13}",
            w, h, inkW, inkH, minX, minY, cropW, cropH, holes, holePixels, feathered, semi, dstPath, log.ToString());
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies 'System.Drawing'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here 'brand\tricycle-mark-source.jpeg'
$dst = Join-Path (Split-Path -Parent $here) 'public\fairtrike-logo.png'

if (-not (Test-Path $src)) { throw "missing source artwork: $src" }
Write-Output ([FairtrikeLogo]::Prepare($src, $dst, 512, 6))
