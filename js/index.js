/**
 * 音乐列表
 */
const musicList = [
  {
    name: "Snowflakes Falling Down",
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Simon_Panrucker/Happy_Christmas_You_Guys/Simon_Panrucker_-_01_-_Snowflakes_Falling_Down.mp3",
  },
  {
    name: "Jingle Bell Swing",
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Mark_Smeby/En_attendant_Nol/Mark_Smeby_-_07_-_Jingle_Bell_Swing.mp3",
  },
  {
    name: "This Christmas",
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Dott/This_Christmas/Dott_-_01_-_This_Christmas.mp3",
  },
  {
    name: "No room at the inn",
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/TRG_Banks/TRG_Banks_Christmas_Album/TRG_Banks_-_12_-_No_room_at_the_inn.mp3",
  },
];

/**
 * 初始化音乐列表（支持触摸事件）
 */
const baseMusicListBox = document.querySelector("#base-music-list");
let fragment = document.createDocumentFragment();
musicList.forEach((item, index) => {
  let li = document.createElement("li");
  li.innerHTML = `<button class="btn" type="button">${item.name}</button>`;
  fragment.appendChild(li);
  // 绑定点击和触摸事件
  li.querySelector('.btn').addEventListener('click', () => loadAudio(index));
  li.querySelector('.btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    loadAudio(index);
  });
});
baseMusicListBox.appendChild(fragment);

/**
 * 自动填充文字部分
 */
let text = "Merry Christmas!<br>圣诞快乐";
const getQueryVariable = (variable) => {
  let query = window.location.search.substring(1);
  let vars = query.split("&");
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split("=");
    if (pair[0] == variable) {
      return decodeURI(pair[1]);
    }
  }
  return false;
};
let t = getQueryVariable("t");
if (t) {
  text = t;
}

/**
 * 核心变量
 */
const { PI, sin, cos } = Math;
const TAU = 2 * PI;
let scene, camera, renderer, analyser;
let step = 0;
const uniforms = {
  time: { type: "f", value: 0.0 },
  step: { type: "f", value: 0.0 },
};
const params = {
  exposure: 1,
  bloomStrength: 0.9,
  bloomThreshold: 0,
  bloomRadius: 0.5,
};
let composer;
const fftSize = 2048;
const totalPoints = 4000;
const listener = new THREE.AudioListener();
const audio = new THREE.Audio(listener);

// 上传音乐事件（适配手机触摸）
document.querySelector("input").addEventListener("change", uploadAudio, false);
document.querySelector(".upload-btn").addEventListener('touchstart', (e) => {
  e.preventDefault();
  document.querySelector("#upload").click();
});

/**
 * 添加平面（地面）
 */
function addPlane(scene, uniforms, size) {
  const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `;
  const fragmentShader = `
  varying vec2 vUv;
  uniform float time;
  void main() {
    gl_FragColor = vec4(0.1, 0.1, 0.2, 1.0);
  }
  `;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms },
    vertexShader,
    fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(size, size);
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -6;
  scene.add(plane);
}

/**
 * 初始化场景（适配手机屏幕）
 */
function init() {
  const overlay = document.getElementById("overlay");
  overlay.remove();

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 添加元素到页面
  let fragmentDom = document.createDocumentFragment();
  fragmentDom.appendChild(renderer.domElement);
  let h1 = document.createElement("h1");
  h1.id = "sentence-box";
  h1.innerHTML = text || "";
  fragmentDom.appendChild(h1);
  document.body.appendChild(fragmentDom);

  // 相机适配
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(-0.1, -1.5, 20);
  camera.rotation.set(0.08, -0.004, 0);
  camera.add(listener); // 添加音频监听器到相机

  const format = renderer.capabilities.isWebGL2
    ? THREE.RedFormat
    : THREE.LuminanceFormat;
  uniforms.tAudioData = {
    value: new THREE.DataTexture(analyser.data, fftSize / 2, 1, format),
  };

  // 添加场景元素
  addPlane(scene, uniforms, 2000);
  addSnow(scene, uniforms);
  
  // 添加树木
  range(6).map((i) => {
    addTree(scene, uniforms, totalPoints, [15, 0, -15 * i]);
    addTree(scene, uniforms, totalPoints, [-15, 0, -15 * i]);
  });

  // 后期处理
  const renderScene = new THREE.RenderPass(scene, camera);
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,
    0.4,
    0.85
  );
  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;

  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  addListners(camera, renderer, composer);
  animate();
}

/**
 * 动画循环
 */
function animate(time) {
  if (analyser) {
    analyser.getFrequencyData();
    uniforms.tAudioData.value.needsUpdate = true;
  }
  step = (step + 1) % 1000;
  uniforms.time.value = time;
  uniforms.step.value = step;
  composer.render();
  requestAnimationFrame(animate);
}

/**
 * 加载音乐
 */
function loadAudio(i) {
  const overlay = document.getElementById("overlay");
  overlay.innerHTML = '<div class="text-loading">加载中...</div>';

  const file = musicList[i].url;
  const loader = new THREE.AudioLoader();
  
  loader.load(file, function (buffer) {
    audio.setBuffer(buffer);
    
    // 修复：兼容不返回Promise的浏览器
    try {
      // 尝试播放音频
      const playResult = audio.play();
      
      // 检测返回值是否为Promise
      if (playResult && typeof playResult.then === 'function') {
        // 支持Promise的现代浏览器
        playResult.then(() => {
          analyser = new THREE.AudioAnalyser(audio, fftSize);
          init();
        }).catch(err => {
          handlePlayError();
        });
      } else {
        // 不支持Promise的旧浏览器
        analyser = new THREE.AudioAnalyser(audio, fftSize);
        init();
      }
    } catch (err) {
      // 播放失败时的降级处理
      handlePlayError();
    }
  });
}

/**
 * 上传音乐
 */
function uploadAudio(event) {
  const overlay = document.getElementById("overlay");
  overlay.innerHTML = '<div class="text-loading">加载中...</div>';
  const files = event.target.files;
  if (!files.length) return;

  const reader = new FileReader();
  reader.onload = function (file) {
    var arrayBuffer = file.target.result;
    listener.context.decodeAudioData(arrayBuffer, function (audioBuffer) {
      audio.setBuffer(audioBuffer);
      
      // 修复：同样的Promise兼容处理
      try {
        const playResult = audio.play();
        
        if (playResult && typeof playResult.then === 'function') {
          playResult.then(() => {
            analyser = new THREE.AudioAnalyser(audio, fftSize);
            init();
          }).catch(err => {
            handlePlayError();
          });
        } else {
          analyser = new THREE.AudioAnalyser(audio, fftSize);
          init();
        }
      } catch (err) {
        handlePlayError();
      }
    });
  };
  reader.readAsArrayBuffer(files[0]);
}

/**
 * 处理播放错误（需要用户交互）
 */
function handlePlayError() {
  const overlay = document.getElementById("overlay");
  overlay.innerHTML = '<div class="text-loading">请点击屏幕继续播放</div>';
  
  // 添加单次点击事件监听
  const playOnClick = function() {
    try {
      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult.then(() => {
          analyser = new THREE.AudioAnalyser(audio, fftSize);
          init();
        });
      } else {
        analyser = new THREE.AudioAnalyser(audio, fftSize);
        init();
      }
    } catch (err) {
      console.error("播放失败:", err);
    }
    document.removeEventListener('click', playOnClick);
    document.removeEventListener('touchstart', playOnClick);
  };
  
  document.addEventListener('click', playOnClick, { once: true });
  document.addEventListener('touchstart', playOnClick, { once: true });
}

/**
 * 辅助函数
 */
const map = (value, sMin, sMax, dMin, dMax) => {
  return dMin + ((value - sMin) / (sMax - sMin)) * (dMax - dMin);
};
const range = (n, m = 0) =>
  Array(n)
    .fill(m)
    .map((i, j) => i + j);
const rand = (max, min = 0) => min + Math.random() * (max - min);
const randInt = (max, min = 0) => Math.floor(min + Math.random() * (max - min));
const randChoise = (arr) => arr[randInt(arr.length)];
const polar = (ang, r = 1) => [r * cos(ang), r * sin(ang)];

/**
 * 添加树木
 */
function addTree(scene, uniforms, totalPoints, treePosition) {
  const vertexShader = `
  attribute float mIndex;
  varying vec3 vColor;
  varying float opacity;
  uniform sampler2D tAudioData;

  float map(float value, float sourceMin, float sourceMax, float destMin, float destMax){
    return destMin + ((value - sourceMin) / (sourceMax - sourceMin)) * (destMax - destMin);
  }
  void main() {
      vColor = color;
      vec3 p = position;
      vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
      float amplitude = texture2D( tAudioData, vec2( mIndex, 0.1 ) ).r;
      float amplitudeClamped = clamp(amplitude-0.4,0.0, 0.6 );
      float sizeMapped = map(amplitudeClamped, 0.0, 0.6, 1.0, 15.0);
      opacity = map(mvPosition.z , -200.0, 15.0, 0.0, 1.0);
      gl_PointSize = sizeMapped * ( 80.0 / -mvPosition.z );
      gl_Position = projectionMatrix * mvPosition;
  }
  `;
  const fragmentShader = `
  varying vec3 vColor;
  varying float opacity;
  uniform sampler2D pointTexture;
  void main() {
      gl_FragColor = vec4( vColor, opacity );
      gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord ); 
  }
  `;
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      pointTexture: {
        value: new THREE.TextureLoader().load(
          `https://assets.codepen.io/3685267/spark1.png`
        ),
      },
    },
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    vertexColors: true,
  });

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];
  const phases = [];
  const mIndexs = [];
  const color = new THREE.Color();

  for (let i = 0; i < totalPoints; i++) {
    const t = Math.random();
    const y = map(t, 0, 1, -6, 8);
    const ang = map(t, 0, 1, 0, 6 * TAU) + (TAU / 2) * (i % 2);
    const [z, x] = polar(ang, map(t, 0, 1, 4, 0));

    const modifier = map(t, 0, 1, 1, 0);
    positions.push(x + rand(-0.2 * modifier, 0.2 * modifier));
    positions.push(y + rand(-0.2 * modifier, 0.2 * modifier));
    positions.push(z + rand(-0.2 * modifier, 0.2 * modifier));

    color.setHSL(map(i, 0, totalPoints, 1.0, 0.0), 1.0, 0.5);
    colors.push(color.r, color.g, color.b);
    phases.push(rand(1000));
    sizes.push(1);
    const mIndex = map(i, 0, totalPoints, 1.0, 0.0);
    mIndexs.push(mIndex);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("phase", new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute("mIndex", new THREE.Float32BufferAttribute(mIndexs, 1));

  const tree = new THREE.Points(geometry, shaderMaterial);
  const [px, py, pz] = treePosition;
  tree.position.x = px;
  tree.position.y = py;
  tree.position.z = pz;
  scene.add(tree);
}

/**
 * 添加雪花
 */
function addSnow(scene, uniforms) {
  const vertexShader = `
  attribute float size;
  attribute float phase;
  attribute float phaseSecondary;
  varying vec3 vColor;
  varying float opacity;
  uniform float time;
  uniform float step;

  float map(float value, float sMin, float sMax, float dMin, float dMax){
    return dMin + ((value - sMin) / (sMax - sMin)) * (dMax - dMin);
  }
  void main() {
      float t = time* 0.0006;
      vColor = color;
      vec3 p = position;
      p.y = map(mod(phase+step, 1000.0), 0.0, 1000.0, 20.0, -6.0);
      p.x += sin(t+phase) * 0.5;
      p.z += sin(t+phaseSecondary) * 0.5;
      opacity = map(p.z, -100.0, 15.0, 0.0, 1.0);
      vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
      gl_PointSize = size * ( 80.0 / -mvPosition.z );
      gl_Position = projectionMatrix * mvPosition;
  }
  `;

  const fragmentShader = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  varying float opacity;
  void main() {
      gl_FragColor = vec4( vColor, opacity );
      gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord ); 
  }
  `;

  function createSnowSet(sprite) {
    const totalPoints = 200;
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        pointTexture: {
          value: new THREE.TextureLoader().load(sprite),
        },
      },
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true,
    });

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const phases = [];
    const phaseSecondaries = [];

    const color = new THREE.Color();

    for (let i = 0; i < totalPoints; i++) {
      const [x, y, z] = [rand(25, -25), 0, rand(15, -150)];
      positions.push(x);
      positions.push(y);
      positions.push(z);

      color.set(randChoise(["#f1d4d4", "#f1f6f9", "#eeeeee", "#f1f1e8"]));

      colors.push(color.r, color.g, color.b);
      phases.push(rand(1000));
      phaseSecondaries.push(rand(1000));
      sizes.push(rand(4, 2));
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute("phase", new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute(
      "phaseSecondary",
      new THREE.Float32BufferAttribute(phaseSecondaries, 1)
    );

    const mesh = new THREE.Points(geometry, shaderMaterial);

    scene.add(mesh);
  }
  const sprites = [
    "https://assets.codepen.io/3685267/snowflake1.png",
    "https://assets.codepen.io/3685267/snowflake2.png",
    "https://assets.codepen.io/3685267/snowflake3.png",
    "https://assets.codepen.io/3685267/snowflake4.png",
    "https://assets.codepen.io/3685267/snowflake5.png",
  ];
  sprites.forEach((sprite) => {
    createSnowSet(sprite);
  });
}

function addPlaneGround(scene, uniforms, totalPoints) {
  const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;

  void main() {
      vColor = customColor;
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      gl_PointSize = size * ( 300.0 / -mvPosition.z );
      gl_Position = projectionMatrix * mvPosition;

  }
  `;
  const fragmentShader = `
  uniform vec3 color;
  uniform sampler2D pointTexture;
  varying vec3 vColor;

  void main() {
      gl_FragColor = vec4( vColor, 1.0 );
      gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );

  }
  `;
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      pointTexture: {
        value: new THREE.TextureLoader().load(
          `https://assets.codepen.io/3685267/spark1.png`
        ),
      },
    },
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    vertexColors: true,
  });

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];

  const color = new THREE.Color();

  for (let i = 0; i < totalPoints; i++) {
    const [x, y, z] = [rand(-25, 25), 0, rand(-150, 15)];
    positions.push(x);
    positions.push(y);
    positions.push(z);

    color.set(randChoise(["#93abd3", "#f2f4c0", "#9ddfd3"]));

    colors.push(color.r, color.g, color.b);
    sizes.push(1);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3).setUsage(
      THREE.DynamicDrawUsage
    )
  );
  geometry.setAttribute(
    "customColor",
    new THREE.Float32BufferAttribute(colors, 3)
  );
  geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

  const plane = new THREE.Points(geometry, shaderMaterial);

  plane.position.y = -8;
  scene.add(plane);
}

function addListners(camera, renderer, composer) {
  window.addEventListener(
    "resize",
    () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composer.setSize(width, height);
    },
    false
  );
}
