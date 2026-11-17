const studio = document.querySelector('#filter-showcase');
const viewport = document.querySelector('#studio-viewport');
const tabs = [...document.querySelectorAll('[data-filter-model]')];
const explode = document.querySelector('#studio-explode');
const pause = document.querySelector('#studio-pause');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const descriptions = {
  air: {category:'AIR FILTRATION',title:'Clean air. Strong performance.',image:'air-filter.jpg',name:'air filter'},
  oil: {category:'OIL FILTRATION',title:'Protection in every circulation.',image:'oil-filter.jpg',name:'oil filter'},
  hydraulic: {category:'HYDRAULIC FILTRATION',title:'Precision under pressure.',image:'hydraulic-filter.jpg',name:'hydraulic filter'}
};
const order = Object.keys(descriptions);
let active = 'air', changeScene;

function select(key, automatic = false) {
  if (!Object.hasOwn(descriptions,key)) return;
  active=key;
  const data=descriptions[key];
  tabs.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filterModel===key)));
  document.querySelector('#studio-category').textContent=data.category;
  document.querySelector('#studio-title').textContent=data.title;
  const fallback=document.querySelector('#studio-fallback');
  fallback.src=`assets/${data.image}`;fallback.alt=`Gallium ${data.name} category reference`;
  studio.dataset.filter=key;
  changeScene?.(automatic);
}
tabs.forEach(button=>button.addEventListener('click',()=>select(button.dataset.filterModel)));

function fallback(error) {
  studio.classList.remove('has-model');studio.classList.add('studio-unavailable');
  studio.querySelector('.studio-controls').hidden=true;
  document.querySelector('#studio-note').textContent='Gallium product reference images';
  console.warn('Interactive filter preview unavailable; product images remain available.',error);
}

const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
function assemblyAt(seconds) {
  if(seconds<3)return 0;
  if(seconds<6)return smooth((seconds-3)/3);
  if(seconds<8.5)return 1;
  if(seconds<11.5)return 1-smooth((seconds-8.5)/3);
  return 0;
}

async function start() {
  const [THREE,{createModels,createStudioLighting}]=await Promise.all([
    import('./vendor/three.module.js'), import('./filter-models.mjs')
  ]);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  const canvas=renderer.domElement;
  canvas.setAttribute('role','img');
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,40);
  camera.position.set(3.3,2.2,6.8);camera.lookAt(0,0,0);
  createStudioLighting(renderer,scene);
  const models=createModels();
  Object.values(models).forEach(model=>scene.add(model.root));
  // Compile every material once so selecting another filter does not stall the animation.
  await renderer.compileAsync(scene,camera);
  viewport.append(canvas);
  let width=1,height=1,aspect=1,elapsed=0,started=0,spread=0,manual=null;
  let userPaused=false,visible=false,frame=0,lastTime=0,autoModels=true;
  let rotation=0,dragging=false,lastX=0,contextLost=false,fade;

  function updateLabels() {
    const open=spread>.5;
    const pressed=String(open);
    if(explode.getAttribute('aria-pressed')!==pressed) {
      explode.setAttribute('aria-pressed',pressed);
      explode.firstElementChild.textContent=open?'Assemble filter':'Explore the layers';
    }
    const state=spread>.97?'LAYERS REVEALED':spread<.03?'ASSEMBLED':'EXPLORING THE LAYERS';
    const phase=document.querySelector('#studio-phase');
    if(phase.textContent!==state)phase.textContent=state;
  }
  function render() {
    const model=models[active];
    model.pose(spread);
    model.root.rotation.set(.08,-.28+(elapsed-started)*.13+rotation,-.24);
    model.root.position.y=-.06+Math.sin(elapsed*.52)*.025;
    const half=1.76+spread*.53+(aspect<1?.12:0);
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    studio.style.setProperty('--explosion',spread.toFixed(3));
    studio.style.setProperty('--cycle',autoModels&&manual===null?String(Math.min((elapsed-started)/14,1)):'1');
    updateLabels();
  }
  function canMove(){return visible&&!document.hidden&&!userPaused&&!preference.matches&&!contextLost;}
  function tick(now) {
    frame=0;
    if(!canMove())return;
    const delta=lastTime?Math.min((now-lastTime)/1000,.05):0;
    lastTime=now;
    if(!dragging)elapsed+=delta;
    if(autoModels&&manual===null&&elapsed-started>=14) {
      select(order[(order.indexOf(active)+1)%order.length],true);
    }
    const target=manual===null?assemblyAt((elapsed-started)%14):manual;
    spread+=(target-spread)*(1-Math.exp(-delta*7));
    render();
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    const stopped=userPaused||preference.matches;
    pause.disabled=preference.matches;
    pause.lastElementChild.textContent=preference.matches?'Reduced motion':userPaused?'Resume motion':'Pause motion';
    pause.querySelector('path').setAttribute('d',stopped?'M4 2.5 13 8l-9 5.5z':'M4 3h2v10H4zm6 0h2v10h-2z');
    pause.setAttribute('aria-pressed',String(stopped));
    studio.dataset.motion=stopped?'paused':'playing';
    if(!canMove()) {
      cancelAnimationFrame(frame);frame=0;lastTime=0;fade?.cancel();
    } else if(!frame){lastTime=0;frame=requestAnimationFrame(tick);}
  }
  function resize() {
    width=viewport.clientWidth;height=viewport.clientHeight-50;
    if(!width||!height)return;
    aspect=width/height;
    renderer.setSize(width,height,false);render();
  }
  changeScene=automatic=>{
    if(!automatic)autoModels=false;
    started=elapsed;manual=null;spread=0;
    Object.entries(models).forEach(([key,model])=>{model.root.visible=key===active;});
    canvas.setAttribute('aria-label',`Animated illustrative ${descriptions[active].name} showing the media, core and seals. Use Explore the layers to separate the components.`);
    fade?.cancel();
    render();
    if(!preference.matches&&!userPaused&&visible) {
      fade=canvas.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.65,.25,1)'});
    }
  };
  explode.disabled=false;pause.disabled=false;
  explode.addEventListener('click',()=>{
    manual=spread>.5?0:1;autoModels=false;
    if(preference.matches||userPaused){spread=manual;render();}
    sync();
  });
  pause.addEventListener('click',()=>{userPaused=!userPaused;sync();});
  preference.addEventListener('change',()=>{
    if(preference.matches){spread=manual??0;render();}
    sync();
  });
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0)return;
    dragging=true;lastX=event.clientX;autoModels=false;canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    rotation+=(event.clientX-lastX)*.008;lastX=event.clientX;render();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{dragging=false;});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;studio.classList.remove('has-model');sync();
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    contextLost=false;studio.classList.add('has-model');render();sync();
  });
  document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;lastTime=0;});
  addEventListener('pageshow',sync);
  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.05}).observe(viewport);
  select(active,true);resize();studio.classList.add('has-model');sync();
}
if(studio&&viewport)start().catch(fallback);
