const studio = document.querySelector('#filter-showcase');
const viewport = document.querySelector('#studio-viewport');
const tabs = [...document.querySelectorAll('[data-filter-model]')];
const explode = document.querySelector('#studio-explode');
const pause = document.querySelector('#studio-pause');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const descriptions = {
  air: {category:'AIR FILTRATION',title:'Air filter construction',image:'air-filter.jpg',name:'air filter'},
  oil: {category:'OIL FILTRATION',title:'Oil filter construction',image:'oil-filter.jpg',name:'oil filter'},
  hydraulic: {category:'HYDRAULIC FILTRATION',title:'Hydraulic filter construction',image:'hydraulic-filter.jpg',name:'hydraulic filter'}
};
let active = 'air', changeScene;
function select(key) {
  if (!Object.hasOwn(descriptions,key)) return;
  active=key;
  const data=descriptions[key];
  tabs.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filterModel===key)));
  document.querySelector('#studio-category').textContent=data.category;
  document.querySelector('#studio-title').textContent=data.title;
  const fallback=document.querySelector('#studio-fallback');
  fallback.src=`assets/${data.image}`;fallback.alt=`Gallium ${data.name} category reference`;
  studio.dataset.filter=key;
  changeScene?.();
}
tabs.forEach(button=>button.addEventListener('click',()=>select(button.dataset.filterModel)));
function fallback(error) {
  studio.classList.remove('has-model');studio.classList.add('studio-unavailable');
  studio.querySelector('.studio-controls').hidden=true;
  document.querySelector('#studio-note').textContent='Gallium product reference images';
  console.warn('Interactive filter preview unavailable; product images remain available.',error);
}
const clamp=value=>Math.max(0,Math.min(1,value));
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
  Object.entries(models).forEach(([key,model])=>{model.root.visible=key===active;scene.add(model.root);});
  // Render the selected model immediately; there is no timer or all-model compilation gate.
  viewport.append(canvas);
  let aspect=1,spread=.12,target=.12,scrollStart=0,scrollDistance=300;
  let userPaused=false,visible=false,frame=0,lastTime=0,rotation=0,dragging=false,lastX=0,contextLost=false;

  function render() {
    const model=models[active];
    model.pose(spread);
    model.root.rotation.set(.08,-.28+spread*.52+rotation,-.24+spread*.07);
    model.root.position.y=-.06;
    const half=1.76+spread*.53+(aspect<1?.12:0);
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    studio.style.setProperty('--explosion',spread.toFixed(3));
    const open=spread>.5;
    explode.setAttribute('aria-pressed',String(open));
    explode.firstElementChild.textContent=open?'Assemble filter':'View all layers';
    document.querySelector('#studio-phase').textContent=spread>.97?'LAYERS REVEALED':spread<.03?'ASSEMBLED':'SCROLL TO REVEAL THE LAYERS';
  }
  function cancel() {cancelAnimationFrame(frame);frame=0;lastTime=0;}
  function canMove(){return visible&&!document.hidden&&!userPaused&&!preference.matches&&!contextLost;}
  function tick(now) {
    frame=0;
    if(!canMove())return;
    const delta=lastTime?Math.min((now-lastTime)/1000,.05):1/60;
    lastTime=now;
    spread+=(target-spread)*(1-Math.exp(-delta*24));
    if(Math.abs(target-spread)<.001)spread=target;
    render();
    if(spread!==target)frame=requestAnimationFrame(tick);
    else lastTime=0;
  }
  function requestRender() {
    if(canMove()&&!frame){lastTime=0;frame=requestAnimationFrame(tick);}
  }
  function readScroll() {
    if(userPaused||preference.matches)return;
    target=.12+.88*clamp((scrollY-scrollStart)/scrollDistance);
    requestRender();
  }
  function sync() {
    const stopped=userPaused||preference.matches;
    pause.disabled=preference.matches;
    pause.lastElementChild.textContent=preference.matches?'Reduced motion':userPaused?'Enable scroll motion':'Pause scroll motion';
    pause.querySelector('path').setAttribute('d',stopped?'M4 2.5 13 8l-9 5.5z':'M4 3h2v10H4zm6 0h2v10h-2z');
    pause.setAttribute('aria-pressed',String(stopped));
    studio.dataset.motion=stopped?'paused':'scroll';
    if(!canMove())cancel();
    else readScroll();
  }
  function resize() {
    const width=viewport.clientWidth,height=viewport.clientHeight-45;
    if(!width||!height)return;
    aspect=width/height;
    renderer.setSize(width,height,false);
    // Start as the scene enters the screen; desktop responds from the first scroll.
    scrollStart=Math.max(0,viewport.getBoundingClientRect().top+scrollY-innerHeight*.8);
    scrollDistance=Math.min(330,innerHeight*.45);
    readScroll();render();
  }
  changeScene=()=>{
    Object.entries(models).forEach(([key,model])=>{model.root.visible=key===active;});
    canvas.setAttribute('aria-label',`Illustrative ${descriptions[active].name}. Scroll to separate the media, core and seals, or use the View all layers button.`);
    rotation=0;render();
  };
  explode.disabled=false;pause.disabled=false;
  explode.addEventListener('click',()=>{
    target=spread>.5?0:1;
    if(preference.matches||userPaused){spread=target;render();}
    else requestRender();
  });
  pause.addEventListener('click',()=>{userPaused=!userPaused;sync();});
  preference.addEventListener('change',()=>{
    cancel();
    if(preference.matches){spread=target=.12;render();}
    sync();
  });
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0)return;
    dragging=true;lastX=event.clientX;canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    rotation+=(event.clientX-lastX)*.008;lastX=event.clientX;render();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{dragging=false;});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;studio.classList.remove('has-model');cancel();
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    contextLost=false;studio.classList.add('has-model');render();sync();
  });
  addEventListener('scroll',readScroll,{passive:true});
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',cancel);
  addEventListener('pageshow',sync);
  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:0}).observe(viewport);
  select(active);resize();studio.classList.add('has-model');sync();
}
if(studio&&viewport)start().catch(fallback);
