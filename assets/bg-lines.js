/* Фоновые трейлы: Bezier-кривые в 3D с перспективой.
 * Адаптация https://codepen.io/goomy/pen/nmQpQK:
 * — камера статичная
 * — цвет приглушённое золото (один тон для всех трейлов)
 * — линии тоньше
 * — точки спавнятся в ограниченной области, чтобы не уходили за кадр
 */
(function (d, w) {
  var F = 780;             // фокусное расстояние → крупнее масштаб
  var N = 5;               // число трейлов
  var VERTEX_MAX = 10;
  var TRAIL_QUALITY = 4000;
  var mu = 0.95;           // близко к 1.0 → C1-непрерывность касательных на стыках сегментов
  var SIGMA = 18;          // размах случайного смещения целей (меньше → мягче изгибы)
  var MIN_SPREAD = 22;     // минимальное смещение анкора — чтобы не возникали тугие петли
  var BOUND = 180;          // мягкий радиус подтягивания к центру
  var CAMERA_Z = -150;     // статичная камера, ближе к сцене
  var TAKE_MIN = 1100;     // мс на один сегмент кривой (длиннее → более плавные дуги)
  var TAKE_VAR = 1000;
  var MOUSE_LERP = 0.08;    // сглаживание движения цели к курсору

  // Box-Muller для нормального распределения
  function bmRandom(mean, sigma) {
    var tmp = null, tmp2, x, y, r;
    return function () {
      if (tmp !== null) {
        tmp2 = tmp;
        tmp = null;
        return y * tmp2 + mean;
      }
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        r = x * x + y * y;
      } while (r >= 1);
      tmp = sigma * Math.sqrt(-2 * Math.log(r) / r);
      return x * tmp + mean;
    };
  }
  var myrand = bmRandom(0, SIGMA);

  // Вариант с минимальной амплитудой — не даёт анкорам схлопываться в одну точку.
  function myrandSpread() {
    var v = myrand();
    var mag = Math.abs(v);
    if (mag < MIN_SPREAD) v = (v >= 0 ? 1 : -1) * (MIN_SPREAD + Math.random() * SIGMA * 0.4);
    return v;
  }

  function pointCopy(src, dst) {
    dst.x = src.x; dst.y = src.y; dst.z = src.z;
    return dst;
  }

  function bezier3(t, a, b, c, dd, e, dst) {
    t /= e;
    var it = 1 - t;
    dst.x = a.x * it * it * it + b.x * 3 * t * it * it + c.x * 3 * t * t * it + dd.x * t * t * t;
    dst.y = a.y * it * it * it + b.y * 3 * t * it * it + c.y * 3 * t * t * it + dd.y * t * t * t;
    dst.z = a.z * it * it * it + b.z * 3 * t * it * it + c.z * 3 * t * t * it + dd.z * t * t * t;
  }

  function perspective(point, camera, dst) {
    var dx = point.x - camera.x;
    var dy = point.y - camera.y;
    var dz = point.z - camera.z;
    if (dz > 0) {
      dst.x = F * dx / dz;
      dst.y = F * dy / dz;
      return true;
    }
    return false;
  }

  // Мягкое подталкивание цели к (0,0,0), чтобы трейлы не уходили за кадр
  function pullToBounds(p) {
    var k = 0.25;
    if (Math.abs(p.x) > BOUND) p.x -= (p.x - 0) * k;
    if (Math.abs(p.y) > BOUND) p.y -= (p.y - 0) * k;
    if (Math.abs(p.z) > BOUND) p.z -= (p.z - 0) * k;
  }

  function Trail(pos, t) {
    this.pos = { x: 0, y: 0, z: 0 };
    this.start = { x: 0, y: 0, z: 0 };
    this.goal = { x: 0, y: 0, z: 0 };
    this.anchor_1 = { x: 0, y: 0, z: 0 };
    this.anchor_2 = { x: 0, y: 0, z: 0 };
    this.start_time = 0;
    this.take_time = 1;
    this.vertexes = [];
    this.anchors_1 = [];
    this.anchors_2 = [];
    pointCopy(pos, this.pos);
    pointCopy(pos, this.start);
    pointCopy(pos, this.goal);
    this.setNextGoal(t);
  }

  Trail.prototype.setNextGoal = function (t, target) {
    pointCopy(this.goal, this.start);
    this.anchor_1.x = this.start.x + (this.start.x - this.anchor_2.x) * mu;
    this.anchor_1.y = this.start.y + (this.start.y - this.anchor_2.y) * mu;
    this.anchor_1.z = this.start.z + (this.start.z - this.anchor_2.z) * mu;
    if (target) {
      this.anchor_2.x = (this.anchor_1.x + target.x) / 2 + myrand();
      this.anchor_2.y = (this.anchor_1.y + target.y) / 2 + myrand();
      this.anchor_2.z = (this.anchor_1.z + target.z) / 2 + myrand();
      this.goal.x = target.x;
      this.goal.y = target.y;
      this.goal.z = target.z;
      // не дёргать target — он мог прийти из курсора и уже за BOUND
      pullToBounds(this.anchor_1);
      pullToBounds(this.anchor_2);
    } else {
      // anchor_2 должен быть достаточно далеко от anchor_1, иначе возникает петля/узел
      this.anchor_2.x = this.anchor_1.x + myrandSpread();
      this.anchor_2.y = this.anchor_1.y + myrandSpread();
      this.anchor_2.z = this.anchor_1.z + myrandSpread();
      this.goal.x = this.anchor_2.x + myrandSpread();
      this.goal.y = this.anchor_2.y + myrandSpread();
      this.goal.z = this.anchor_2.z + myrandSpread();
      pullToBounds(this.anchor_1);
      pullToBounds(this.anchor_2);
      pullToBounds(this.goal);
    }

    this.start_time = t;
    this.take_time = TAKE_MIN + Math.random() * TAKE_VAR;
    this.vertexes.push(pointCopy(this.start, { x: 0, y: 0, z: 0 }));
    this.anchors_1.push(pointCopy(this.anchor_1, { x: 0, y: 0, z: 0 }));
    this.anchors_2.push(pointCopy(this.anchor_2, { x: 0, y: 0, z: 0 }));
    if (this.vertexes.length > VERTEX_MAX) {
      this.vertexes.splice(0, this.vertexes.length - VERTEX_MAX);
      this.anchors_1.splice(0, this.anchors_1.length - VERTEX_MAX);
      this.anchors_2.splice(0, this.anchors_2.length - VERTEX_MAX);
    }
  };

  Trail.prototype.update = function (t, target) {
    bezier3(t - this.start_time, this.start, this.anchor_1, this.anchor_2, this.goal, this.take_time, this.pos);
    if (t - this.start_time > this.take_time) {
      this.setNextGoal(this.start_time + this.take_time, target);
      this.update(t, target);
    }
  };

  // Слои для head→tail fade. Много тонких слоёв с квадратичной прогрессией
  // альфы → визуально неотличимо от градиента, без ступенек.
  // Альфа подобрана так, чтобы у «головы» трейла накопилось ~0.8.
  var LAYERS = (function () {
    var n = 16;
    var arr = [];
    for (var i = 0; i < n; i++) {
      var p = i / (n - 1); // 0..1
      arr.push({
        start: p * 0.97,
        alpha: 0.018 + 0.045 * p * p
      });
    }
    return arr;
  })();

  Trail.prototype.draw = function (ctx, camera, t) {
    var i, dz, dt, ddt, rt, v = { x: 0, y: 0, z: 0 };
    var ps = { x: 0, y: 0 };
    var points = [];

    // 1) Собираем все экранные точки всего Безье-пути в массив
    for (i = 1; i < this.vertexes.length; i++) {
      ddt = 0.04;
      for (dt = 0; dt < 1; dt += ddt) {
        bezier3(dt, this.vertexes[i - 1], this.anchors_1[i - 1], this.anchors_2[i - 1], this.vertexes[i], 1, v);
        if (perspective(v, camera, ps)) {
          points.push(ps.x);
          points.push(ps.y);
        }
        dz = v.z - camera.z;
        if (dz > 0) ddt = Math.max(0.025, dz / TRAIL_QUALITY + 0.025);
      }
    }
    rt = (t - this.start_time) / this.take_time;
    ddt = 0.04;
    for (dt = 0; dt < rt; dt += ddt) {
      bezier3(dt, this.start, this.anchor_1, this.anchor_2, this.goal, 1, v);
      if (perspective(v, camera, ps)) {
        points.push(ps.x);
        points.push(ps.y);
      }
      dz = v.z - camera.z;
      if (dz > 0) ddt = Math.max(0.025, dz / TRAIL_QUALITY + 0.025);
    }
    if (perspective(this.pos, camera, ps)) {
      points.push(ps.x);
      points.push(ps.y);
    }

    var nPts = points.length / 2;
    if (nPts < 2) return;

    // 2) Одна толщина для всего трейла — по глубине кончика (головы)
    var tipDz = this.pos.z - camera.z;
    if (tipDz < 10) tipDz = 10;
    var lw = F / tipDz * 2.3;
    if (lw < 3) lw = 3;
    if (lw > 14) lw = 14;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';

    // Простые золотые линии: один тон, плавный фейд через слои.
    // Без светотени, без направленного света, без композитинга.
    ctx.lineWidth = lw;
    for (var li = 0; li < LAYERS.length; li++) {
      var layer = LAYERS[li];
      var startIdx = Math.floor(nPts * layer.start);
      if (startIdx >= nPts - 1) continue;
      ctx.beginPath();
      ctx.moveTo(points[startIdx * 2], points[startIdx * 2 + 1]);
      for (var pi = startIdx + 1; pi < nPts; pi++) {
        ctx.lineTo(points[pi * 2], points[pi * 2 + 1]);
      }
      ctx.strokeStyle = 'rgba(204,158,64,' + layer.alpha.toFixed(4) + ')';
      ctx.stroke();
    }
  };

  var canvas = d.getElementById('bg-world');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var trails = [];
  var time_now = Date.now();

  // Камера — статичная
  var camera = { x: 0, y: 0, z: CAMERA_Z };

  for (var i = 0; i < N; i++) {
    trails.push(new Trail({ x: myrand(), y: myrand(), z: myrand() }, time_now));
  }

  function resize() {
    canvas.width = w.innerWidth;
    canvas.height = w.innerHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(canvas.width / 2, canvas.height / 2);
  }
  resize();
  w.addEventListener('resize', resize);

  // --- Курсор: экран → world координаты, с плавным lerp ---
  // Плоскость курсора в world-координатах на z = 0. Камера в (0,0,CAMERA_Z) ⇒ dz = -CAMERA_Z.
  var mouseRaw = null;   // свежий отпечаток курсора
  var mouseGoal = { x: 0, y: 0, z: 0 }; // сглаженная цель (подаётся трейлу)
  var mouseActive = false;

  function setMouseFromScreen(sx, sy) {
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var dz = -CAMERA_Z;
    var worldX = (sx - cx) * dz / F;
    var worldY = (sy - cy) * dz / F;
    if (!mouseRaw) mouseRaw = { x: worldX, y: worldY, z: 0 };
    else { mouseRaw.x = worldX; mouseRaw.y = worldY; mouseRaw.z = 0; }
    if (!mouseActive) {
      // первая активация — перенесём сглаженную цель прямо в курсор, без «плавного въезда»
      mouseGoal.x = worldX; mouseGoal.y = worldY; mouseGoal.z = 0;
      mouseActive = true;
    }
  }

  w.addEventListener('mousemove', function (e) {
    setMouseFromScreen(e.clientX, e.clientY);
  }, { passive: true });
  w.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length) {
      setMouseFromScreen(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  // Пауза при скрытой вкладке, чтобы не жечь батарейку
  var hidden = false;
  d.addEventListener('visibilitychange', function () { hidden = d.hidden; });

  function updateScene() {
    time_now = Date.now();
    // Сглаженная цель плавно догоняет сырой курсор
    if (mouseActive && mouseRaw) {
      mouseGoal.x += (mouseRaw.x - mouseGoal.x) * MOUSE_LERP;
      mouseGoal.y += (mouseRaw.y - mouseGoal.y) * MOUSE_LERP;
    }
    var aim = mouseActive ? mouseGoal : null;
    trails[0].update(time_now, aim);
    for (var i = 1; i < trails.length; i++) {
      trails[i].update(time_now, trails[i - 1].pos);
    }
    // Камера НЕ обновляется — статичный кадр
  }

  function drawScene() {
    ctx.clearRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    for (var i = 0; i < trails.length; i++) {
      trails[i].draw(ctx, camera, time_now);
    }
  }

  function loop() {
    if (!hidden) {
      updateScene();
      drawScene();
    }
    w.requestAnimationFrame(loop);
  }
  loop();
})(document, window);
