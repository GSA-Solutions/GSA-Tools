// Control de acceso por proyecto. Cada página lo carga así (dentro de <head>):
//   <style id="gsa-hide">html{visibility:hidden}</style>
//   <script src="../config.js"></script>
//   <script src="../gate.js" data-p="NOMBRE-DE-LA-CARPETA"></script>
// Entra: (1) el dueño (ya puso la clave en el inicio), o (2) quien abre el link con ?k=CLAVE de ESE proyecto.
// Si no, se muestra "Acceso restringido" y la página original no llega a cargar.
(function(){
  function sha256(m){function r(n,x){return x>>>n|x<<32-n}var K=[],H=[],i,j,p=0,c={};
    for(var n=2;p<64;n++){if(!c[n]){for(i=0;i<313;i+=n)c[i]=n;H[p]=Math.pow(n,.5)*4294967296|0;K[p++]=Math.pow(n,1/3)*4294967296|0}}
    var b=unescape(encodeURIComponent(m)),l=b.length,w=[];b+="\x80";while(b.length%64-56)b+="\0";
    for(i=0;i<b.length;i++){j=b.charCodeAt(i);w[i>>2]|=j<<(3-i%4)*8}w[w.length]=l*8/4294967296|0;w[w.length]=l*8|0;
    for(j=0;j<w.length;){var W=w.slice(j,j+=16),o=H;H=H.slice(0,8);
      for(i=0;i<64;i++){var w15=W[i-15],w2=W[i-2],a=H[0],e=H[4],
        t1=H[7]+(r(6,e)^r(11,e)^r(25,e))+(e&H[5]^~e&H[6])+K[i]+(W[i]=i<16?W[i]:W[i-16]+(r(7,w15)^r(18,w15)^w15>>>3)+W[i-7]+(r(17,w2)^r(19,w2)^w2>>>10)|0),
        t2=(r(2,a)^r(13,a)^r(22,a))+(a&H[1]^a&H[2]^H[1]&H[2]);
        H=[t1+t2|0].concat(H);H[4]=H[4]+t1|0}
      for(i=0;i<8;i++)H[i]=H[i]+o[i]|0}
    var s="";for(i=0;i<8;i++)for(j=3;j+1;j--){var q=H[i]>>j*8&255;s+=(q<16?"0":"")+q.toString(16)}return s}

  var cfg=window.GSA_CONFIG||{}, proj=document.currentScript&&document.currentScript.getAttribute("data-p");
  if(cfg.servidor&&!/github\.io$/.test(location.hostname)){
    window.GSA_OWNER=/(?:^|;\s*)gsa_o=1/.test(document.cookie);
    var hs=document.getElementById("gsa-hide");if(hs)hs.parentNode.removeChild(hs);return;
  }
  var want=cfg.proyectos&&cfg.proyectos[proj], owner=cfg.claveHash;
  function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  var ok=false;
  if(owner&&get("gsa_ok")===owner){ok=true;window.GSA_OWNER=true}
  if(!ok&&want){
    var m=location.search.match(/[?&]k=([^&#]+)/)||location.hash.match(/[#&]k=([^&]+)/);
    if(m&&sha256(decodeURIComponent(m[1]))===want){ok=true;set("gsa_k_"+proj,want)}
    else if(get("gsa_k_"+proj)===want){ok=true}
  }
  if(ok){var h=document.getElementById("gsa-hide");if(h)h.parentNode.removeChild(h);return}
  var hh=document.getElementById("gsa-hide");if(hh)hh.parentNode.removeChild(hh);
  document.open();
  document.write('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso restringido</title><style>html{visibility:visible!important}</style>'+
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#11161b;color:#e8edf2;font:17px system-ui,sans-serif;text-align:center;padding:24px">'+
    '<div><h1 style="font-size:1.5rem;margin:0 0 8px">Acceso restringido</h1><p style="margin:0;color:#93a1ad">Abrí el link completo que te enviaron.</p></div>');
  document.close();
})();
