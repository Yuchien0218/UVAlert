import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const LOGO_DIR = path.join(ROOT_DIR, "docs", "design", "logo");
const PUBLIC_LOGO_DIR = path.join(ROOT_DIR, "apps", "web", "public", "logo");

fs.mkdirSync(LOGO_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_LOGO_DIR, { recursive: true });

// 讀取正式 SVG 路徑
const svgPath = path.join(LOGO_DIR, "uvalert-lockup-horizontal.svg");
const svgContent = fs.readFileSync(svgPath, "utf8");

// 提取 mark 和 wordmark 的幾何路徑
const markPaths = [...svgContent.matchAll(/<path[^>]*fill="[^"]*"[^>]*\/>/g)].map(m => m[0]);
// 前三個 path 屬於 mark，其餘屬於 wordmark
const wordmarkPaths = markPaths.slice(3).join("\n    ");

const HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>UVAlert GIF Generator</title>
</head>
<body>
  <h1>Rendering UVAlert Logo GIFs...</h1>
  <div id="status">Loading libraries...</div>
  <script type="module">
    import { GIFEncoder, quantize, applyPalette } from 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';

    const statusEl = document.getElementById('status');
    const updateStatus = (msg) => {
      statusEl.textContent = msg;
      console.log(msg);
    };

    function cubicBezier(p1x, p1y, p2x, p2y) {
      return function(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        let u = t;
        for (let i = 0; i < 8; i++) {
          const currentX = 3*(1-u)*(1-u)*u*p1x + 3*(1-u)*u*u*p2x + u*u*u;
          const dx = 3*(1-u)*(1-u)*p1x + 6*(1-u)*u*(p2x - p1x) + 3*u*u*(1 - p2x);
          if (Math.abs(currentX - t) < 1e-5) break;
          if (Math.abs(dx) < 1e-6) break;
          u -= (currentX - t) / dx;
          u = Math.max(0, Math.min(1, u));
        }
        return 3*(1-u)*(1-u)*u*p1y + 3*(1-u)*u*u*p2y + u*u*u;
      };
    }

    const easeInOut = cubicBezier(0.65, 0, 0.35, 1);

    function evaluateAnimation(p) {
      // 1. Sun pulse (scale & opacity)
      let sunScale = 1;
      let sunOpacity = 1;
      if (p <= 0.30) {
        const prog = easeInOut(p / 0.30);
        sunScale = 1 + (0.9 - 1) * prog;
        sunOpacity = 1 + (0.85 - 1) * prog;
      } else if (p <= 0.65) {
        const prog = easeInOut((p - 0.30) / 0.35);
        sunScale = 0.9 + (1.06 - 0.9) * prog;
        sunOpacity = 0.85 + (1 - 0.85) * prog;
      } else {
        const prog = easeInOut((p - 0.65) / 0.35);
        sunScale = 1.06 + (1 - 1.06) * prog;
        sunOpacity = 1;
      }

      // 2. Ray 1
      let ray1Tx = 0;
      let ray1Opacity = 0.35;
      if (p <= 0.25) {
        const prog = easeInOut(p / 0.25);
        ray1Tx = 1.5 * prog;
        ray1Opacity = 0.35 + (1 - 0.35) * prog;
      } else if (p <= 0.55) {
        const prog = easeInOut((p - 0.25) / 0.30);
        ray1Tx = 1.5 * (1 - prog);
        ray1Opacity = 1 + (0.35 - 1) * prog;
      }

      // 3. Ray 2
      let ray2Tx = 0;
      let ray2Opacity = 0.35;
      if (p <= 0.40) {
        const prog = easeInOut(p / 0.40);
        ray2Tx = 1.5 * prog;
        ray2Opacity = 0.35 + (1 - 0.35) * prog;
      } else if (p <= 0.70) {
        const prog = easeInOut((p - 0.40) / 0.30);
        ray2Tx = 1.5 * (1 - prog);
        ray2Opacity = 1 + (0.35 - 1) * prog;
      }

      // 4. Ray 3
      let ray3Tx = 0;
      let ray3Opacity = 0.35;
      if (p <= 0.55) {
        const prog = easeInOut(p / 0.55);
        ray3Tx = 1.5 * prog;
        ray3Opacity = 0.35 + (1 - 0.35) * prog;
      } else if (p <= 0.85) {
        const prog = easeInOut((p - 0.55) / 0.30);
        ray3Tx = 1.5 * (1 - prog);
        ray3Opacity = 1 + (0.35 - 1) * prog;
      }

      return { sunScale, sunOpacity, ray1Tx, ray1Opacity, ray2Tx, ray2Opacity, ray3Tx, ray3Opacity };
    }

    const RAY1_D = "M16.1,9.64l10-6c.9-.6,1.1-1.9.5-2.8-.6-.8-1.7-1.1-2.6-.6l-10,6c-.9.6-1.1,1.9-.5,2.8.6.8,1.7,1.1,2.6.6Z";
    const RAY2_D = "M18,17.95h14c1.1,0,2-.9,2-2s-.9-2-2-2h-14c-1.1,0-2,.9-2,2s.9,2,2,2Z";
    const RAY3_D = "M14.17,26.01l9.63,5.35c1.07.53,2.35.21,2.89-.86s.21-2.35-.86-2.89h0l-9.63-5.35c-1.07-.53-2.35-.21-2.89.86s-.21,2.35.86,2.89Z";

    const WORDMARK = \`${wordmarkPaths}\`;

    function buildSvg({ variant, anim }) {
      const { sunScale, sunOpacity, ray1Tx, ray1Opacity, ray2Tx, ray2Opacity, ray3Tx, ray3Opacity } = anim;

      const markContent = \`
        <g data-part="mark">
          <g transform="translate(6, 15.94) scale(\${sunScale}) translate(-6, -15.94)" opacity="\${sunOpacity}">
            <circle cx="6" cy="15.94" r="6" fill="#C1832E"/>
          </g>
          <path d="\${RAY1_D}" fill="#33291F" transform="translate(\${ray1Tx}, 0)" opacity="\${ray1Opacity}"/>
          <path d="\${RAY2_D}" fill="#33291F" transform="translate(\${ray2Tx}, 0)" opacity="\${ray2Opacity}"/>
          <path d="\${RAY3_D}" fill="#C1832E" transform="translate(\${ray3Tx}, 0)" opacity="\${ray3Opacity}"/>
        </g>
      \`;

      if (variant === "mark") {
        // 純標記，原始尺寸 34 x 31.61，置中放入正方形 viewBox
        // 在 42 x 42 的 viewBox 中置中 (留邊距 4px)
        return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -5.2 42 42" width="100%" height="100%">
          \${markContent}
        </svg>\`;
      } else {
        // 橫式完整版 168.44 x 31.61
        return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168.44 31.61" width="100%" height="100%">
          \${markContent}
          <g data-part="wordmark">
            \${WORDMARK}
          </g>
        </svg>\`;
      }
    }

    async function svgToImage(svgString, width, height) {
      return new Promise((resolve, reject) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });
    }

    async function renderGif(config) {
      const { name, variant, width, height, background, frames = 45, fps = 30 } = config;
      updateStatus(\`Rendering \${name} (\${width}x\${height}, \${frames} frames)...\`);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const gif = GIFEncoder();
      const delayMs = Math.round(1000 / fps);

      for (let i = 0; i < frames; i++) {
        const p = i / frames;
        const anim = evaluateAnimation(p);
        const svgString = buildSvg({ variant, anim });
        const img = await svgToImage(svgString, width, height);

        ctx.clearRect(0, 0, width, height);
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const { data } = imgData;

        // 如果是透明背景，使用 rgba4444 保留透明色階
        const format = background ? 'rgb565' : 'rgba4444';
        const palette = quantize(data, 256, { format });
        const index = applyPalette(data, palette, format);

        gif.writeFrame(index, width, height, {
          palette,
          delay: delayMs,
          transparent: !background,
          transparentIndex: !background ? palette.length - 1 : undefined
        });
      }

      gif.finish();
      const buffer = gif.bytes();

      // 上傳給本機伺服器儲存
      updateStatus(\`Uploading \${name} (\${buffer.length} bytes)...\`);
      await fetch('/save?name=' + encodeURIComponent(name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      });
      updateStatus(\`Saved \${name} successfully.\`);
    }

    async function runAll() {
      try {
        // 1. 橫式完整 Logo・暖象牙米底（社群分享、簡報、橫幅最佳）
        await renderGif({
          name: 'uvalert-logo-horizontal-cream.gif',
          variant: 'full',
          width: 842,
          height: 158,
          background: '#FAF5EC',
          frames: 45,
          fps: 30
        });

        // 2. 橫式完整 Logo・透明底（可自由疊加於任何底色）
        await renderGif({
          name: 'uvalert-logo-horizontal-transparent.gif',
          variant: 'full',
          width: 842,
          height: 158,
          background: null,
          frames: 45,
          fps: 30
        });

        // 3. 正方形太陽標記・暖象牙米底（512x512 社群頭像、大頭貼、貼圖）
        await renderGif({
          name: 'uvalert-mark-square-cream.gif',
          variant: 'mark',
          width: 512,
          height: 512,
          background: '#FAF5EC',
          frames: 45,
          fps: 30
        });

        // 4. 正方形太陽標記・透明底（512x512 貼圖、動態 Favicon）
        await renderGif({
          name: 'uvalert-mark-square-transparent.gif',
          variant: 'mark',
          width: 512,
          height: 512,
          background: null,
          frames: 45,
          fps: 30
        });

        updateStatus('ALL_COMPLETED');
        await fetch('/done');
      } catch (err) {
        console.error(err);
        updateStatus('ERROR: ' + err.message);
        await fetch('/error?msg=' + encodeURIComponent(err.message));
      }
    }

    runAll();
  </script>
</body>
</html>
`;

// 建立 HTTP 伺服器
const savedFiles = [];
let serverResolve;
const serverPromise = new Promise((resolve) => {
  serverResolve = resolve;
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_TEMPLATE);
    return;
  }

  if (url.pathname === "/save" && req.method === "POST") {
    const filename = url.searchParams.get("name");
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const targetLogoPath = path.join(LOGO_DIR, filename);
    const targetPublicPath = path.join(PUBLIC_LOGO_DIR, filename);

    fs.writeFileSync(targetLogoPath, buffer);
    fs.writeFileSync(targetPublicPath, buffer);

    savedFiles.push({
      name: filename,
      size: buffer.length,
      path: targetLogoPath
    });

    console.log(`[Generated] ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    res.writeHead(200);
    res.end("OK");
    return;
  }

  if (url.pathname === "/done") {
    res.writeHead(200);
    res.end("DONE");
    serverResolve({ success: true });
    return;
  }

  if (url.pathname === "/error") {
    const msg = url.searchParams.get("msg");
    console.error("[Client Error]", msg);
    res.writeHead(500);
    res.end("ERROR");
    serverResolve({ success: false, error: msg });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  console.log(`Server listening on http://127.0.0.1:${port}`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`Launching browser: ${browserPath}`);
  const browser = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `http://127.0.0.1:${port}/`
  ]);

  browser.on("error", (err) => {
    console.error("Browser failed to launch:", err);
    serverResolve({ success: false, error: err.message });
  });

  const result = await serverPromise;

  try {
    browser.kill();
  } catch {
    // ignore
  }
  server.close();

  if (result.success) {
    console.log("\n==========================================");
    console.log("  Successfully generated all 4 Logo GIFs! ");
    console.log("==========================================");
    for (const f of savedFiles) {
      console.log(`- ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
    }
  } else {
    console.error("Failed to generate GIFs:", result.error);
    process.exit(1);
  }
});
