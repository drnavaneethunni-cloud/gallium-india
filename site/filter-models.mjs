import * as THREE from './vendor/three.module.js';

const tau = Math.PI * 2;
const surface = (color, metalness = .1, roughness = .5) => new THREE.MeshStandardMaterial({color, metalness, roughness});
const steel = surface(0xc1cbd3, .92, .25);
const darkSteel = surface(0x697782, .86, .3);
const rubber = surface(0x20272d, .04, .68);
const paper = surface(0xcbbd98, .03, .8);
const silverMedia = surface(0xbfc8c9, .55, .46);

function add(group, geometry, material, y = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  group.add(mesh);
  return mesh;
}

function ring(group, outer, inner, height, material, y) {
  const e = Math.min(.025, height / 4);
  const points = [
    [inner, -height / 2], [outer - e, -height / 2], [outer, -height / 2 + e],
    [outer, height / 2 - e], [outer - e, height / 2], [inner, height / 2],
    [inner, -height / 2]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return add(group, new THREE.LatheGeometry(points, 96), material, y);
}

function pleats(group, radius, depth, height, count, material) {
  const positions = [], n = count * 2;
  // Independent facets retain the crisp fold normals under the studio lights.
  for (let i = 0; i < n; i++) {
    const a = i / n * tau, b = (i + 1) / n * tau;
    const ra = radius - (i % 2 ? depth : 0), rb = radius - (i % 2 ? 0 : depth);
    const ax = Math.cos(a) * ra, az = Math.sin(a) * ra;
    const bx = Math.cos(b) * rb, bz = Math.sin(b) * rb;
    positions.push(ax,-height/2,az, ax,height/2,az, bx,-height/2,bz,
      bx,-height/2,bz, ax,height/2,az, bx,height/2,bz);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  add(group, geometry, material);
  ring(group, radius, radius * .53, .035, material, height / 2);
  ring(group, radius, radius * .53, .035, material, -height / 2);
}

function perforatedCore(group, radius, height) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bec8d1'; ctx.fillRect(0, 0, 64, 64);
  ctx.globalCompositeOperation = 'destination-out';
  for (const [x, y] of [[16,16],[48,48]]) {
    ctx.beginPath(); ctx.arc(x, y, 7, 0, tau); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 13); texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({map:texture, metalness:.8, roughness:.32, alphaTest:.5, side:THREE.DoubleSide});
  add(group, new THREE.CylinderGeometry(radius, radius, height, 64, 1, true), mat);
  ring(group, radius + .012, radius - .027, .04, steel, height / 2);
  ring(group, radius + .012, radius - .027, .04, steel, -height / 2);
}

function meshGuard(group, radius, height) {
  const points = [], lines = 36, steps = 22;
  for (const direction of [-1, 1]) for (let i = 0; i < lines; i++) {
    for (let j = 0; j < steps; j++) {
      const a = i / lines * tau + direction * j / steps * 1.65;
      const b = i / lines * tau + direction * (j + 1) / steps * 1.65;
      points.push(Math.cos(a)*radius, j/steps*height-height/2, Math.sin(a)*radius,
        Math.cos(b)*radius, (j+1)/steps*height-height/2, Math.sin(b)*radius);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points,3));
  group.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x788892,transparent:true,opacity:.5})));
}

function brandTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e9edf0'; ctx.fillRect(0,0,1024,512);
  ctx.fillStyle = '#df2928'; ctx.fillRect(0,352,1024,160);
  for (const x of [128,640,1152]) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#d82625';
    ctx.font = 'bold 57px Arial'; ctx.fillText('GALLIUM',x,208);
    ctx.fillStyle = '#45525b'; ctx.font = '12px Arial'; ctx.fillText('INSPIRED BY FILTRATION',x,239);
    ctx.fillStyle = '#fff'; ctx.font = '16px Arial'; ctx.fillText('OIL FILTRATION',x,414);
    ctx.fillStyle = '#58666e';
    for(let i=0;i<29;i++) ctx.fillRect(x-62+i*4,272,1+(i%3),27);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeModel(type) {
  const root = new THREE.Group(), parts = {};
  const component = name => {const g = new THREE.Group(); root.add(g); parts[name]=g; return g;};
  const media = component('media'), core = component('core'), top = component('top');
  const bottom = component('bottom'), seal = component('seal'), shell = component('shell');
  const air = type === 'air', oil = type === 'oil';
  const radius = air ? .78 : oil ? .66 : .54;
  const height = air ? 2.08 : oil ? 1.63 : 2.34;
  pleats(media,radius,air?.105:.085,height,air?88:oil?70:76,air||oil?paper:silverMedia);
  perforatedCore(core,radius*.48,height+.03);
  if (air) {
    meshGuard(media,radius+.012,height);
    for (const y of [-.5,.5]) ring(media,radius+.026,radius-.015,.065,steel,y);
    ring(top,radius+.09,radius*.49,.16,rubber,height/2+.07);
    ring(top,radius+.035,radius*.51,.038,darkSteel,height/2+.16);
    ring(bottom,radius+.09,radius*.49,.16,rubber,-height/2-.07);
    ring(bottom,radius+.035,radius*.51,.038,darkSteel,-height/2-.16);
    ring(seal,radius+.025,radius-.04,.032,rubber,height/2+.2);
  } else if (oil) {
    const casing = new THREE.MeshStandardMaterial({map:brandTexture(),metalness:.42,roughness:.3});
    add(shell,new THREE.CylinderGeometry(.77,.77,1.94,96,1,true),casing,-.04);
    const baseProfile = [[0,-1.16],[.58,-1.16],[.7,-1.12],[.765,-1.04],[.77,-.99]].map(([x,y])=>new THREE.Vector2(x,y));
    add(shell,new THREE.LatheGeometry(baseProfile,96),surface(0xc92525,.48,.26));
    ring(shell,.79,.72,.055,steel,.94);
    ring(bottom,.7,.03,.08,darkSteel,-height/2-.04);
    ring(top,.79,.17,.12,steel,.96);
    ring(top,.22,.16,.1,darkSteel,1.055);
    for (let i=0;i<8;i++) {
      const hole=add(top,new THREE.CylinderGeometry(.063,.063,.012,24),rubber,1.026);
      hole.position.x=Math.cos(i/8*tau)*.47;hole.position.z=Math.sin(i/8*tau)*.47;
      const lip=ring(top,.073,.062,.012,darkSteel,1.032);lip.position.x=hole.position.x;lip.position.z=hole.position.z;
    }
    ring(seal,.705,.625,.06,rubber,1.06);
  } else {
    ring(top,radius+.06,radius*.44,.12,steel,height/2+.035);
    ring(top,radius*.55,radius*.43,.18,darkSteel,height/2+.16);
    ring(bottom,radius+.06,radius*.42,.12,steel,-height/2-.035);
    ring(seal,radius*.58,radius*.45,.045,rubber,height/2+.27);
    for(const y of [-.73,0,.73]) ring(media,radius+.012,radius-.015,.025,darkSteel,y);
  }
  // The exploded arrangement is a construction illustration, not a part specification.
  function pose(value) {
    top.position.y=value*.63;
    seal.position.y=value*.96;
    bottom.position.y=-value*.55;
    core.position.y=value*.17;
    core.position.x=value*(oil?-1.4:.94);
    shell.position.x=value*1.58;
    shell.rotation.z=-value*.18;
    media.position.x=oil?-value*.3:-value*.18;
  }
  // Each part approaches along a different path. All transforms settle to zero
  // so the final assembly preserves the original component geometry.
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function assemble(progress, span, compact, right, up) {
    const paths=compact ? [
      [core, -.95*span, .8, -.75, 0, .61],
      [media, -.55*span, -.1, -.32, .03, .68],
      [bottom, -.2*span, -1.35, .55, .12, .76],
      [shell, .65*span, -.45, .3, .18, .86],
      [top, -.05*span, 1.1, -.2, .3, .94],
      [seal, .7*span, 1.15, .4, .42, 1]
    ] : [
      [core, -.96*span, -.35, -.85, 0, .61],
      [media, -.56*span, .1, -.3, .03, .68],
      [bottom, .22*span, -.7, .45, .12, .76],
      [shell, .86*span, -.15, .3, .18, .86],
      [top, -.2*span, .85, -.18, .3, .94],
      [seal, .48*span, .75, .35, .42, 1]
    ];
    paths.forEach(([part,x,y,tilt,start,end])=>{
      const remaining=1-ease((progress-start)/(end-start));
      part.position.copy(right).multiplyScalar(x*remaining).addScaledVector(up,y*remaining);
      part.rotation.set(0,0,tilt*remaining);
    });
  }
  root.rotation.z=-.25;
  return {root,pose,assemble};
}

export function createOilModel() {
  return makeModel('oil');
}

export function createStudioLighting(renderer, scene) {
  scene.add(new THREE.HemisphereLight(0xe8f3ff,0x5b6470,2.1));
  for (const [color,intensity,position] of [[0xfff5e7,3.5,[3,5,4]],[0xd9e9ff,2.3,[-4,1,2]],[0xffffff,3.5,[1,3,-4]]]) {
    const light = new THREE.DirectionalLight(color,intensity); light.position.set(...position);scene.add(light);
  }
  // Local softbox reflections keep metals dimensional without a large HDR download.
  const room=new THREE.Scene();room.background=new THREE.Color(0x66727e);
  const walls=new THREE.Mesh(new THREE.BoxGeometry(12,10,12),new THREE.MeshBasicMaterial({color:0x8b97a2,side:THREE.BackSide}));room.add(walls);
  for (const [position,width,height,power] of [[[3,3,2],3,6,5],[[-4,1,1],2,5,3],[[0,4,-4],4,3,4]]) {
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(power,power,power),side:THREE.DoubleSide}));
    panel.position.set(...position);panel.lookAt(0,0,0);room.add(panel);
  }
  const generator=new THREE.PMREMGenerator(renderer);
  const environment=generator.fromScene(room,.06);
  scene.environment=environment.texture;scene.environmentIntensity=.7;
  room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});generator.dispose();
  return environment;
}
