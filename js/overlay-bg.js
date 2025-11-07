(function () {
  var regular_stars = [],
    falling_star;

  // 调整参数适配手机屏幕
  var R = Math.PI / 5;
  var G = 1.2; // 降低重力系数，让流星下落更自然
  var TOTAL = 15; // 减少星星总数，优化手机性能
  var SIZE = 2.5; // 缩小星星尺寸
  var CURVE = 0.2; // 调整星星棱角
  var ENERGY = 0.008; // 降低能量变化速度，动画更平缓
  var FALLING_CHANCE = 0.15; // 降低流星出现概率，减少性能消耗

  var canvas = document.querySelector("#overlay-bg");
  var cx = canvas.getContext("2d");
  resizeViewport();

  function Star() {
    this.r = Math.random() * SIZE * SIZE + SIZE;
    this.rp = Math.PI / Math.random();
    this.rd = Math.random() * 2 - 1;
    this.c = Math.random() * (CURVE * 2 - CURVE) + CURVE;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.e = 0;
    this.d = false;
  }

  function FallingStar() {
    Star.call(this);
    this.y = (Math.random() * canvas.height) / 2;
    this.r = Math.random() * SIZE * SIZE + SIZE * 2; // 流星尺寸稍小
    this.falling = false;
  }

  function setShape(p) {
    var o = p.o;
    cx.save();
    cx.beginPath();
    cx.translate(o.x, o.y);
    cx.rotate(o.rp);
    o.rp += o.rd * 0.008; // 降低旋转速度
    cx.moveTo(0, 0 - o.r);
    for (var i = 0; i < 5; i++) {
      cx.rotate(R);
      cx.lineTo(0, 0 - o.r * o.c);
      cx.rotate(R);
      cx.lineTo(0, 0 - o.r);
    }
  }

  function drawShape() {
    cx.stroke();
    cx.fill();
    cx.restore();
  }

  Star.prototype.shine = function () {
    this.d ? (this.e -= (ENERGY * this.r) / 50) : (this.e += ENERGY);
    if (this.e > 1 - ENERGY && this.d === false) {
      this.d = true;
    }
    setShape({ o: this });
    cx.strokeStyle = "rgba(255, 209, 143, " + this.e + ")";
    cx.shadowColor = "rgba(255, 209, 143, " + this.e + ")";
    cx.fillStyle = "rgba(255, 209, 143, " + this.e + ")";
    cx.lineWidth = this.c * 1.5; // 减细线宽
    cx.shadowBlur = this.r / SIZE * 0.8; // 降低阴影强度
    cx.shadowOffsetX = 0;
    cx.shadowOffsetY = 0;
    drawShape();
  };

  FallingStar.prototype.shine = function () {
    this.d ? (this.e -= (ENERGY * this.r) / 25) : (this.e += ENERGY * 4); // 降低闪烁速度
    if (this.e > 1 - ENERGY && this.d === false) {
      this.d = true;
    }
    setShape({ o: this });
    cx.strokeStyle = "rgba(221, 19, 255, " + this.e * 1.5 + ")"; // 降低透明度
    cx.shadowColor = "rgba(221, 19, 255, " + this.e * 1.5 + ")";
    cx.fillStyle = "rgba(221, 19, 255, " + this.e * 1.5 + ")";
    cx.lineWidth = this.c * 1.5;
    cx.shadowBlur = 30; // 降低流星阴影
    cx.shadowOffsetX = 0;
    cx.shadowOffsetY = 0;
    drawShape();
  };

  FallingStar.prototype.fall = function () {
    this.e -= ENERGY * 0.4;
    this.r -= this.r * ENERGY * 0.8; // 减慢尺寸缩小速度
    cx.save();
    cx.translate(this.x + this.vx, this.y + this.vy);
    cx.scale(1, Math.pow(this.e, 2));
    cx.beginPath();
    cx.rotate(this.rp);
    this.rp += 0.08; // 降低旋转速度
    cx.moveTo(0, 0 - this.r);
    for (var i = 0; i < 5; i++) {
      cx.rotate(R);
      cx.lineTo(0, 0 - this.r * this.c);
      cx.rotate(R);
      cx.lineTo(0, 0 - this.r);
    }
    // 降低流星速度，适合手机视觉
    this.vx += this.vx * 0.8;
    this.vy += this.vy * G * 0.8;
    cx.strokeStyle = "rgba(255, 210, 93, " + 1 / this.e * 0.8 + ")";
    cx.shadowColor = "rgba(255, 210, 93, " + 1 / this.e * 0.8 + ")";
    cx.fillStyle = "rgba(255, 210, 93, " + 1 / this.e * 0.8 + ")";
    cx.shadowBlur = 60; // 降低拖尾强度
    drawShape();
  };

  function redrawWorld() {
    resizeViewport();
    cx.clearRect(0, 0, canvas.width, canvas.height);
    // 控制星星数量，避免手机卡顿
    if (regular_stars.length < TOTAL) {
      regular_stars.push(new Star());
    }
    // 绘制普通星星
    for (var i = 0; i < regular_stars.length; i++) {
      regular_stars[i].shine();
      if (regular_stars[i].d === true && regular_stars[i].e < 0) {
        regular_stars.splice(i, 1);
      }
    }
    // 流星逻辑
    if (!falling_star && FALLING_CHANCE > Math.random()) {
      falling_star = new FallingStar();
    }
    if (falling_star) {
      falling_star.falling ? falling_star.fall() : falling_star.shine();
      if (falling_star.e < ENERGY) {
        falling_star = null;
      }
    }
    // 降低动画帧率，优化手机性能
    requestAnimationFrame(redrawWorld, canvas);
  }

  // 适配手机屏幕大小
  function resizeViewport() {
    // 限制最大尺寸，避免高清大屏手机性能问题
    const maxWidth = 1080;
    const maxHeight = 1920;
    const scale = Math.min(
      window.innerWidth / maxWidth,
      window.innerHeight / maxHeight,
      1
    );
    canvas.width = window.innerWidth * scale;
    canvas.height = window.innerHeight * scale;
    // 调整画布CSS尺寸，铺满屏幕
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  // 处理手机触摸事件（替代鼠标事件）
  function handleInteraction(e) {
    if (!falling_star) return;
    
    // 获取触摸/鼠标位置
    let clientX, clientY;
    if (e.type === 'touchstart') {
      // 触摸事件取第一个触摸点
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // 防止触摸时页面滚动
    } else {
      // 鼠标事件
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 检测是否点击到流星
    if (
      clientX > falling_star.x - 2 * falling_star.r &&
      clientX < falling_star.x + 2 * falling_star.r &&
      clientY > falling_star.y - 2 * falling_star.r &&
      clientY < falling_star.y + 2 * falling_star.r
    ) {
      if (!falling_star.falling) {
        falling_star.falling = true;
        falling_star.e = 1;
        falling_star.r *= 1.8; // 稍小的放大倍数
        falling_star.vy = 0.0008; // 降低初始速度
        // 根据屏幕中心判断流星方向
        if (clientX > canvas.width / 2) {
          falling_star.vx = -(Math.random() * 0.008 + 0.008);
        } else {
          falling_star.vx = Math.random() * 0.008 + 0.008;
        }
      }
    }
  }

  // 事件监听适配
  window.addEventListener("resize", resizeViewport, false);
  canvas.addEventListener("mousemove", handleInteraction, false);
  canvas.addEventListener("touchstart", handleInteraction, { passive: false }); // 允许阻止默认行为
  redrawWorld();
})();
