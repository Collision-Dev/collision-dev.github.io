/**
 * Cinematic hero background — diagonal blue/orange convergence, impact, shards.
 * Loop ~7s. Respects prefers-reduced-motion.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var LOOP_MS = 7000;
  var SPAWN_MS = 1000;
  var COLLIDE_MS = 3400;
  var FRAG_MS = 4500;
  var DISSIP_MS = 6000;

  var w = 0;
  var h = 0;
  var cx = 0;
  var cy = 0;
  var scale = 1;

  var blueTrail = [];
  var orangeTrail = [];
  var shards = [];
  var burstRays = [];
  var shardsSpawnedThisLoop = false;
  var startTime = performance.now();
  var lastFrame = performance.now();

  function clamp(t, a, b) {
    return Math.max(a, Math.min(b, t));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function resize() {
    var section = canvas.closest(".hero");
    if (!section) return;
    var rect = section.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w * 0.5;
    cy = h * 0.48;
    scale = Math.min(w, h) * 0.00115;
  }

  function drawBackground() {
    ctx.fillStyle = "rgb(3, 3, 8)";
    ctx.fillRect(0, 0, w, h);

    var bx0 = 0;
    var by0 = h * 0.16;
    var blueG = ctx.createLinearGradient(bx0, by0, cx, cy);
    blueG.addColorStop(0, "rgba(0, 32, 96, 0.94)");
    blueG.addColorStop(0.28, "rgba(0, 45, 110, 0.62)");
    blueG.addColorStop(0.52, "rgba(4, 10, 32, 0.22)");
    blueG.addColorStop(0.78, "rgba(3, 3, 8, 0.04)");
    blueG.addColorStop(1, "rgba(3, 3, 8, 0)");
    ctx.fillStyle = blueG;
    ctx.fillRect(0, 0, w, h);

    var ox0 = w;
    var oy0 = h * 0.86;
    var orangeG = ctx.createLinearGradient(ox0, oy0, cx, cy);
    orangeG.addColorStop(0, "rgba(90, 22, 0, 0.92)");
    orangeG.addColorStop(0.26, "rgba(120, 32, 0, 0.58)");
    orangeG.addColorStop(0.52, "rgba(40, 12, 0, 0.2)");
    orangeG.addColorStop(0.78, "rgba(3, 3, 8, 0.04)");
    orangeG.addColorStop(1, "rgba(3, 3, 8, 0)");
    ctx.fillStyle = orangeG;
    ctx.fillRect(0, 0, w, h);

    var coreR = Math.min(w, h) * 0.36;
    var darkCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    darkCore.addColorStop(0, "rgba(2, 2, 7, 0.98)");
    darkCore.addColorStop(0.38, "rgba(3, 3, 9, 0.72)");
    darkCore.addColorStop(0.62, "rgba(3, 3, 8, 0.28)");
    darkCore.addColorStop(0.88, "rgba(3, 3, 8, 0)");
    darkCore.addColorStop(1, "rgba(3, 3, 8, 0)");
    ctx.fillStyle = darkCore;
    ctx.fillRect(0, 0, w, h);

    var edge = ctx.createRadialGradient(cx, cy, coreR * 0.85, cx, cy, Math.max(w, h) * 0.58);
    edge.addColorStop(0, "rgba(3, 3, 8, 0)");
    edge.addColorStop(0.55, "rgba(3, 3, 8, 0)");
    edge.addColorStop(1, "rgba(2, 2, 6, 0.48)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  }

  function wedgePoints(len, wid) {
    return [
      { x: 0, y: 0 },
      { x: -len * 0.78, y: -wid },
      { x: -len, y: 0 },
      { x: -len * 0.78, y: wid },
    ];
  }

  /** motionBlur: neutral shadow on body; color glow always when glow>0 (spawn + move match) */
  function drawWedge(tipX, tipY, angle, len, wid, colors, alpha, glow, motionBlur) {
    if (alpha <= 0.01) return;

    var blurMain = motionBlur ? 23 * scale : 0;

    var pts = wedgePoints(len, wid);
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(angle);

    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow * alpha * 0.2;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = motionBlur ? 16 * scale : 0;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = colors.glow;
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = alpha;
    ctx.shadowColor = motionBlur ? "rgba(0, 0, 0, 0.42)" : colors.glow;
    ctx.shadowBlur = blurMain;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    var sideGrad = ctx.createLinearGradient(0, 0, -len, 0);
    sideGrad.addColorStop(0, colors.highlight);
    sideGrad.addColorStop(0.45, colors.mid);
    sideGrad.addColorStop(1, colors.dark);
    ctx.fillStyle = sideGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    var sideGrad2 = ctx.createLinearGradient(0, 0, -len * 0.6, wid * 0.3);
    sideGrad2.addColorStop(0, colors.highlight2);
    sideGrad2.addColorStop(1, colors.shadow);
    ctx.fillStyle = sideGrad2;
    ctx.fill();

    ctx.restore();
  }

  var COL_BLUE = {
    glow: "rgba(0, 200, 255, 0.9)",
    face: "rgba(0, 140, 220, 0.4)",
    highlight: "rgba(180, 245, 255, 0.95)",
    highlight2: "rgba(100, 210, 255, 0.75)",
    mid: "rgba(0, 120, 255, 0.9)",
    dark: "rgba(0, 25, 80, 0.95)",
    shadow: "rgba(0, 15, 50, 0.98)",
  };

  var COL_ORANGE = {
    glow: "rgba(255, 140, 40, 0.95)",
    face: "rgba(255, 100, 20, 0.4)",
    highlight: "rgba(255, 248, 200, 0.95)",
    highlight2: "rgba(255, 200, 100, 0.85)",
    mid: "rgba(255, 90, 0, 0.95)",
    dark: "rgba(100, 25, 0, 0.96)",
    shadow: "rgba(60, 12, 0, 0.98)",
  };

  function pushTrail(arr, x, y, rot, maxLen) {
    arr.push({ x: x, y: y, r: rot });
    while (arr.length > maxLen) arr.shift();
  }

  function drawTrail(arr, len, wid, colors) {
    for (var i = 0; i < arr.length - 1; i++) {
      var t = arr[i];
      var a = ((i + 1) / arr.length) * 0.22;
      drawWedge(t.x, t.y, t.r, len * 0.92, wid * 0.88, colors, a, 0, true);
    }
  }

  function spawnShards() {
    var n = 52;
    var i;
    var ang;
    var sp;
    var vBase = Math.min(w, h) * 0.038;
    for (i = 0; i < n; i++) {
      if (i < n * 0.38) {
        ang = -Math.PI * 0.72 + (Math.random() - 0.5) * 0.95;
        sp = (0.55 + Math.random() * 0.75) * vBase;
        shards.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.1,
          life: 0,
          maxLife: 1.45 + Math.random() * 0.65,
          size: (4 + Math.random() * 9) * scale,
          kind: "blue",
        });
      } else if (i < n * 0.72) {
        ang = Math.PI * 0.28 + (Math.random() - 0.5) * 0.95;
        sp = (0.5 + Math.random() * 0.7) * vBase;
        shards.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.09,
          life: 0,
          maxLife: 1.4 + Math.random() * 0.55,
          size: (4 + Math.random() * 9) * scale,
          kind: "orange",
        });
      } else {
        ang = Math.random() * Math.PI * 2;
        sp = (0.45 + Math.random() * 0.65) * vBase;
        shards.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.12,
          life: 0,
          maxLife: 1.05 + Math.random() * 0.45,
          size: (2.5 + Math.random() * 5) * scale,
          kind: "white",
        });
      }
    }

    burstRays.length = 0;
    for (i = 0; i < 14; i++) {
      burstRays.push({
        angle: (i / 14) * Math.PI * 2 + Math.random() * 0.08,
        len0: 0,
        maxLen: (0.08 + Math.random() * 0.07) * Math.min(w, h),
        width: 0.012 + Math.random() * 0.01,
        life: 0,
        hue: i % 2 === 0 ? "w" : "y",
      });
    }
  }

  /** Single full-intensity flash per loop (drawn once when impact happens) */
  function drawImpactFlash() {
    var peak = 1;

    ctx.save();
    ctx.translate(cx, cy);

    var coreRad = 52 * scale * 1.25;
    var core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRad);
    core.addColorStop(0, "rgba(255,255,255," + (0.92 * peak) + ")");
    core.addColorStop(0.32, "rgba(255,248,210," + (0.55 * peak) + ")");
    core.addColorStop(0.65, "rgba(255,190,70," + (0.22 * peak) + ")");
    core.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, coreRad, 0, Math.PI * 2);
    ctx.fill();

    var i;
    for (i = 0; i < burstRays.length; i++) {
      var ray = burstRays[i];
      var rl = ray.maxLen * peak;
      if (rl < 0.5) continue;
      ctx.save();
      ctx.rotate(ray.angle);
      var grd = ctx.createLinearGradient(0, 0, rl, 0);
      if (ray.hue === "w") {
        grd.addColorStop(0, "rgba(255,255,255," + (0.9 * peak) + ")");
        grd.addColorStop(0.55, "rgba(255,255,255," + (0.28 * peak) + ")");
        grd.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        grd.addColorStop(0, "rgba(255,235,140," + (0.85 * peak) + ")");
        grd.addColorStop(0.45, "rgba(255,170,50," + (0.35 * peak) + ")");
        grd.addColorStop(1, "rgba(255,100,0,0)");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(10 * scale, -Math.max(1, ray.width * rl));
      ctx.lineTo(rl, -Math.max(1, ray.width * rl * 0.32));
      ctx.lineTo(rl, Math.max(1, ray.width * rl * 0.32));
      ctx.lineTo(10 * scale, Math.max(1, ray.width * rl));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawShard(s, dt) {
    s.life += dt / 1000;
    var f = s.life / s.maxLife;
    if (f >= 1) return false;

    s.vx *= 0.981;
    s.vy *= 0.981;
    s.x += s.vx * dt * 0.024;
    s.y += s.vy * dt * 0.024;
    s.rot += s.vr * dt * 0.04;

    var sdx = s.x - cx;
    var sdy = s.y - cy;
    var sdist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
    var scap = Math.min(w, h) * 0.3;
    if (sdist > scap) {
      s.vx -= (sdx / sdist) * (sdist - scap) * 0.14;
      s.vy -= (sdy / sdist) * (sdist - scap) * 0.14;
    }

    var alpha = f < 0.12 ? f / 0.12 : 1 - easeOutCubic((f - 0.12) / 0.88);
    alpha *= 0.92;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = alpha;

    if (s.kind === "blue") {
      ctx.fillStyle = "rgba(120, 220, 255, 0.95)";
      ctx.strokeStyle = "rgba(0, 180, 255, 0.5)";
    } else if (s.kind === "orange") {
      ctx.fillStyle = "rgba(255, 200, 120, 0.95)";
      ctx.strokeStyle = "rgba(255, 100, 30, 0.5)";
    } else {
      ctx.fillStyle = "rgba(255, 255, 250, 0.9)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    }

    var sz = s.size * (1 - f * 0.25);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(sz * 0.65, sz * 0.35);
    ctx.lineTo(-sz * 0.55, sz * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  function drawReducedStatic() {
    if (!w) resize();
    drawBackground();
    var lenR = 270 * scale;
    var widR = 127.5 * scale;
    drawWedge(cx - lenR * 0.35, cy - 12 * scale, 0.08, lenR, widR, COL_BLUE, 0.38, 0.45, false);
    drawWedge(cx + lenR * 0.35, cy + 12 * scale, Math.PI - 0.08, lenR, widR, COL_ORANGE, 0.38, 0.45, false);
  }

  function frame(now) {
    if (!w) resize();
    var elapsed = (now - startTime) % LOOP_MS;
    var rawDt = now - lastFrame;
    lastFrame = now;
    if (rawDt > 80) rawDt = 1000 / 60;
    var dt = Math.min(32, Math.max(10, rawDt));

    drawBackground();

    var playImpactFlash = false;

    var bx0 = cx - w * 0.44;
    var by0 = cy - h * 0.14;
    var ox0 = cx + w * 0.44;
    var oy0 = cy + h * 0.14;

    var blueX = bx0;
    var blueY = by0;
    var blueRot = -0.35;
    var orangeX = ox0;
    var orangeY = oy0;
    var orangeRot = Math.PI + 0.35;

    var blueAlpha = 1;
    var orangeAlpha = 1;
    var len = 292.5 * scale;
    var wid = 132 * scale;

    var approachDur = COLLIDE_MS - SPAWN_MS;

    if (elapsed < SPAWN_MS) {
      var sp = easeOutCubic(elapsed / SPAWN_MS);
      blueAlpha = orangeAlpha = sp;
      var sc = 0.35 + 0.65 * sp;
      len *= sc;
      wid *= sc;
      blueX = bx0;
      blueY = by0;
      orangeX = ox0;
      orangeY = oy0;
      blueRot = -0.35;
      orangeRot = Math.PI + 0.35;
    } else if (elapsed < COLLIDE_MS) {
      var ap = (elapsed - SPAWN_MS) / approachDur;
      ap = clamp(ap, 0, 1);
      var e = easeInCubic(ap);
      blueX = lerp(bx0, cx, e);
      blueY = lerp(by0, cy, e);
      orangeX = lerp(ox0, cx, e);
      orangeY = lerp(oy0, cy, e);
      blueRot = lerp(-0.35, 0, e);
      orangeRot = lerp(Math.PI + 0.35, Math.PI, e);
      pushTrail(blueTrail, blueX, blueY, blueRot, 10);
      pushTrail(orangeTrail, orangeX, orangeY, orangeRot, 10);
    } else {
      if (!shardsSpawnedThisLoop) {
        spawnShards();
        shardsSpawnedThisLoop = true;
        playImpactFlash = true;
      }
      blueX = cx;
      blueY = cy;
      orangeX = cx;
      orangeY = cy;
      blueRot = 0;
      orangeRot = Math.PI;
    }

    if (elapsed >= SPAWN_MS && elapsed < COLLIDE_MS) {
      drawTrail(blueTrail, len, wid, COL_BLUE);
      drawTrail(orangeTrail, len, wid, COL_ORANGE);
    }

    var triAlpha = 1;
    if (elapsed >= COLLIDE_MS && elapsed < FRAG_MS) {
      triAlpha = 1 - easeOutCubic((elapsed - COLLIDE_MS) / (FRAG_MS - COLLIDE_MS)) * 0.88;
    } else if (elapsed >= FRAG_MS) {
      triAlpha = Math.max(0, 0.12 - (elapsed - FRAG_MS) / (DISSIP_MS - FRAG_MS) * 0.12);
    }

    var motionStyle = elapsed < COLLIDE_MS;

    if (elapsed < COLLIDE_MS || triAlpha > 0.02) {
      if (elapsed < COLLIDE_MS) {
        drawWedge(blueX, blueY, blueRot, len, wid, COL_BLUE, blueAlpha, 1, motionStyle);
        drawWedge(orangeX, orangeY, orangeRot, len, wid, COL_ORANGE, orangeAlpha, 1, motionStyle);
      } else {
        drawWedge(blueX, blueY, blueRot, len * 0.92, wid * 0.92, COL_BLUE, blueAlpha * triAlpha, 0.4, false);
        drawWedge(orangeX, orangeY, orangeRot, len * 0.92, wid * 0.92, COL_ORANGE, orangeAlpha * triAlpha, 0.4, false);
      }
    }

    if (playImpactFlash) {
      drawImpactFlash();
    }

    if (elapsed >= COLLIDE_MS) {
      shards = shards.filter(function (s) {
        return drawShard(s, dt);
      });
    }

    if (elapsed >= FRAG_MS) {
      var diss = (elapsed - FRAG_MS) / (DISSIP_MS - FRAG_MS);
      diss = clamp(diss, 0, 1);
      ctx.save();
      ctx.globalAlpha = (1 - easeOutCubic(diss)) * 0.18;
      var dim = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 * scale);
      dim.addColorStop(0, "rgba(255,255,255,0.5)");
      dim.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = dim;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (elapsed >= DISSIP_MS) {
      var idle = (elapsed - DISSIP_MS) / (LOOP_MS - DISSIP_MS);
      ctx.save();
      ctx.globalAlpha = (1 - idle) * 0.08;
      var rg3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 * scale);
      rg3.addColorStop(0, "rgba(200,230,255,0.35)");
      rg3.addColorStop(0.5, "rgba(255,200,120,0.12)");
      rg3.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg3;
      ctx.beginPath();
      ctx.arc(cx, cy, 70 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (elapsed < SPAWN_MS) {
      shards.length = 0;
      burstRays.length = 0;
      blueTrail.length = 0;
      orangeTrail.length = 0;
      shardsSpawnedThisLoop = false;
    }

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", function () {
    resize();
    if (reduced) drawReducedStatic();
  });

  if (reduced) {
    drawReducedStatic();
    return;
  }

  requestAnimationFrame(frame);
})();
