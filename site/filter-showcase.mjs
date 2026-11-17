const studio = document.querySelector('#filter-showcase');
const viewport = document.querySelector('#studio-viewport');
const experience = document.querySelector('#filter-experience');
const explode = document.querySelector('#studio-explode');
const pause = document.querySelector('#studio-pause');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
function fallback(error) {
  studio.classList.remove('has-model');studio.classList.add('studio-unavailable');
  studio.querySelector('.studio-controls').hidden=true;
  document.querySelector('#studio-note').textContent='Gallium product reference';
  console.warn('Interactive filter preview unavailable; product images remain available.',error);
}
const clamp=value=>Math.max(0,Math.min(1,value));
async function start() {
  const [THREE,{createOilModel,createStudioLighting}]=await Promise.all([
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
  const model=createOilModel();
  scene.add(model.root);
  canvas.setAttribute('aria-label','Illustrative oil filter. Scroll to reveal its components, or use View layers.');
  // A single model renders immediately and moves only in response to interaction.
  viewport.append(canvas);
  let aspect=1,spread=.04,target=.04,scrollStart=0,scrollDistance=300;
  let userPaused=false,visible=false,frame=0,lastTime=0,rotation=0,dragging=false,lastX=0,contextLost=false;

  function render() {
    model.pose(spread);
    model.root.rotation.set(.08,-.28+spread*.52+rotation,-.24+spread*.07);
    model.root.position.y=-.06;
    const half=Math.max(1.6+spread*.56,(1.15+spread*1.25)/aspect);
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    studio.style.setProperty('--explosion',spread.toFixed(3));
    const open=spread>.5;
    explode.setAttribute('aria-pressed',String(open));
    explode.firstElementChild.textContent=open?'Assemble':'View layers';
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
    target=.04+.96*clamp((scrollY-scrollStart)/scrollDistance);
    requestRender();
  }
  function sync() {
    const stopped=userPaused||preference.matches;
    pause.disabled=preference.matches;
    pause.lastElementChild.textContent=preference.matches?'Reduced motion':userPaused?'Resume motion':'Pause motion';
    pause.querySelector('path').setAttribute('d',stopped?'M4 2.5 13 8l-9 5.5z':'M4 3h2v10H4zm6 0h2v10h-2z');
    pause.setAttribute('aria-pressed',String(stopped));
    studio.dataset.motion=stopped?'paused':'scroll';
    if(!canMove())cancel();
    else readScroll();
  }
  function resize() {
    const width=viewport.clientWidth,height=viewport.clientHeight;
    if(!width||!height)return;
    aspect=width/height;
    renderer.setSize(width,height,false);
    const top=experience.getBoundingClientRect().top+scrollY;
    const headerHeight=document.querySelector('header').getBoundingClientRect().height;
    scrollStart=Math.max(0,top-innerHeight*.65);
    // Finish opening while the full-width scene is still held in view.
    const end=top+experience.offsetHeight-studio.offsetHeight-headerHeight-12;
    scrollDistance=Math.max(180,end-scrollStart);
    readScroll();render();
  }
  explode.disabled=false;pause.disabled=false;
  explode.addEventListener('click',()=>{
    target=spread>.5?0:1;
    if(preference.matches||userPaused){spread=target;render();}
    else requestRender();
  });
  pause.addEventListener('click',()=>{userPaused=!userPaused;sync();});
  preference.addEventListener('change',()=>{
    cancel();
    if(preference.matches){spread=target=.04;render();}
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
  resize();studio.classList.add('has-model');sync();
}
if(studio&&viewport)start().catch(fallback);
