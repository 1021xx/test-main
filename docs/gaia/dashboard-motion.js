(()=>{
 const board=document.querySelector('.dashboard-board');if(!board)return;
 const bars=[...board.querySelectorAll('.d315 [data-name="bar-element"] > [data-name="bar"]')];
 const gauges=[];
 board.querySelectorAll('.d477,.d495').forEach(gauge=>{
  const layers=[...gauge.querySelectorAll('.d478')];
  if(!layers.length||layers.every(layer=>layer.querySelector('img')?.getAttribute('src')==='gaia/assets/7303-4081-0a622.svg'))return;
  const base=document.createElement('img');base.src='gaia/assets/7303-4081-0a622.svg';base.alt='';base.className='dashboard-gauge-base';base.width=51.042;base.height=51.042;
  const color=document.createElement('div');color.className='dashboard-gauge-color';layers.forEach(layer=>color.append(layer));gauge.prepend(base,color);gauges.push(color);
 });
 const mm=gsap.matchMedia();mm.add('(prefers-reduced-motion:no-preference)',()=>{
  gsap.set(bars,{scaleY:0,transformOrigin:'50% 100%'});
  gsap.set(gauges,{'--gauge-angle':'0deg'});
  const tl=gsap.timeline({scrollTrigger:{id:'dashboard-charts',trigger:board,start:'top 80%',once:true}});
  tl.to(bars,{scaleY:1,duration:1.05,stagger:.012,ease:'power2.out'},0)
   .to(gauges,{'--gauge-angle':'360deg',duration:1.5,stagger:.12,ease:'power2.inOut'},.15);
  return()=>{gsap.set(bars,{clearProps:'transform,transformOrigin'});gsap.set(gauges,{'--gauge-angle':'360deg'});};
 });
})();
