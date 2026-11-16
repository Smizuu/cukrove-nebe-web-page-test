/* theme before first paint (saved choice, else system setting) + enables scroll-reveal motion */
(function(){
  var t=null;try{var m=document.cookie.match(/(?:^|; )cn_theme=(light|dark)/);t=m&&m[1]}catch(e){}
  if(!t)t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
  var d=document.documentElement;d.setAttribute("data-theme",t);
  if("IntersectionObserver"in window&&!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)){
    d.classList.add("anim");setTimeout(function(){if(!d.hasAttribute("data-ready"))d.classList.remove("anim")},3000);
  }
})();
