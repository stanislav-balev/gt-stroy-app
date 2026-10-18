// Canvas helpers shared by all post types. Ported from v1; a painter closes over the context and the colour set.
export const D='"Unbounded", sans-serif',B='"Golos Text", sans-serif';
export const SAFE=170; // bottom strip of a story that Facebook covers with its reply bar
export const SIZES={post:[1080,1350],sq:[1080,1080],story:[1080,1920],wide:[1280,720]};

export function painter(ctx,C,o){
  const story=o.fmt==="story";
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
  const fitFont=(text,weight,family,size,maxW,min=20)=>{let s=size;do{ctx.font=`${weight} ${s}px ${family}`;s-=2;}while(ctx.measureText(text).width>maxW&&s>min);return s+2;};
  // wraps text to maxW, at most `max` lines; an overflowing last line is cut with "…"
  let maxWNow=0;
  const splitWord=w=>{const parts=[];let cur="";for(const ch of w){if(cur&&ctx.measureText(cur+ch).width>maxWNow){parts.push(cur);cur=ch;}else cur+=ch;}if(cur)parts.push(cur);return parts;};
  const wlines=(text,maxW,max)=>{
    maxWNow=maxW;
    const words=String(text).split(/\s+/).filter(Boolean).flatMap(w=>ctx.measureText(w).width>maxW?splitWord(w):[w]),out=[];let l="";
    for(const w of words){const t=l?l+" "+w:w;if(ctx.measureText(t).width>maxW&&l){out.push(l);l=w;}else l=t;}
    if(l)out.push(l);
    if(out.length>max){out.length=max;let s=out[max-1];while(s&&ctx.measureText(s+"…").width>maxW)s=s.slice(0,-1);out[max-1]=s.replace(/[\s,.;:–-]+$/,"")+"…";}
    return out;
  };
  const cover=(p,x,y,w,h)=>{
    const im=p.im;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const s=Math.max(w/im.width,h/im.height)*(p.zoom||1),iw=im.width*s,ih=im.height*s;
    ctx.drawImage(im,x+(w-iw)/2-(p.x||0)*(iw-w)/2,y+(h-ih)/2-(p.y||0)*(ih-h)/2,iw,ih);ctx.restore();
  };
  const placeholder=(x,y,w,h,txt)=>{
    const gr=ctx.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,"#8a9089");gr.addColorStop(1,"#5b625c");ctx.fillStyle=gr;ctx.fillRect(x,y,w,h);
    ctx.strokeStyle="rgba(255,255,255,.08)";ctx.lineWidth=2;for(let i=0;i<w;i+=90){ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i,y+h);ctx.stroke();}for(let j=0;j<h;j+=90){ctx.beginPath();ctx.moveTo(x,y+j);ctx.lineTo(x+w,y+j);ctx.stroke();}
    ctx.fillStyle="rgba(255,255,255,.55)";ctx.font=`600 36px ${B}`;ctx.textAlign="center";ctx.fillText(txt,x+w/2,y+h*0.4);ctx.textAlign="left";
  };
  // all=true: collage of every photo; otherwise only the first photo, full-bleed
  const drawPhotos=(x,y,w,h,photos,all)=>{
    const ps=all?photos:photos.slice(0,1),n=ps.length,g=8;
    if(!n){placeholder(x,y,w,h,all?"Тук идват снимките от обекта":"Тук идва снимката");return;}
    if(n===1){cover(ps[0],x,y,w,h);return;}
    ctx.fillStyle=C.ink;ctx.fillRect(x,y,w,h);
    if(n===2){const cw=(w-g)/2;cover(ps[0],x,y,cw,h);cover(ps[1],x+cw+g,y,cw,h);}
    else if(n===3){const lw=(w-g)*0.6,rw=w-g-lw,rh=(h-g)/2;cover(ps[0],x,y,lw,h);cover(ps[1],x+lw+g,y,rw,rh);cover(ps[2],x+lw+g,y+rh+g,rw,rh);}
    else{const cw=(w-g)/2,rh=(h-g)/2;ps.slice(0,4).forEach((p,i)=>cover(p,x+(i%2)*(cw+g),y+Math.floor(i/2)*(rh+g),cw,rh));}
  };
  const topShade=W=>{const t=ctx.createLinearGradient(0,0,0,220);t.addColorStop(0,"rgba(0,0,0,.45)");t.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=t;ctx.fillRect(0,0,W,220);};
  const shade=(W,H,from)=>{const g=ctx.createLinearGradient(0,H*from,0,H);g.addColorStop(0,"rgba(10,20,15,0)");g.addColorStop(.45,"rgba(10,20,15,.72)");g.addColorStop(1,"rgba(10,20,15,.94)");ctx.fillStyle=g;ctx.fillRect(0,H*from,W,H*(1-from));topShade(W);};
  const solid=(W,H)=>{ // brand-colour background with faint diagonal stripes, for posts without a photo
    ctx.fillStyle=C.green;ctx.fillRect(0,0,W,H);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.strokeStyle="rgba(255,255,255,.06)";ctx.lineWidth=28;
    for(let i=-H;i<W+H;i+=90){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+H,H);ctx.stroke();}ctx.restore();
  };
  // company mark top-left: uploaded logo if there is one, else the little house + name
  const brand=(x,y)=>{
    if(o.logo){const lh=56,lw=Math.min(380,o.logo.width*lh/o.logo.height);rr(x,y,lw+32,72,16);ctx.fillStyle=C.white;ctx.fill();ctx.drawImage(o.logo,x+16,y+8,lw,lh);return lw+32;}
    const name=(o.brandName||"Г.Т. СТРОЙ").toUpperCase();
    ctx.font=`800 ${fitFont(name,800,D,34,560)}px ${D}`;const tw=ctx.measureText(name).width;
    rr(x,y,tw+92,72,16);ctx.fillStyle=C.white;ctx.fill();
    ctx.fillStyle=C.green;ctx.beginPath();ctx.moveTo(x+22,y+40);ctx.lineTo(x+42,y+20);ctx.lineTo(x+62,y+40);ctx.lineTo(x+56,y+40);ctx.lineTo(x+56,y+54);ctx.lineTo(x+28,y+54);ctx.lineTo(x+28,y+40);ctx.closePath();ctx.fill();
    ctx.fillStyle=C.white;ctx.fillRect(x+38,y+42,8,12);
    ctx.fillStyle=C.green;ctx.textBaseline="middle";ctx.fillText(name,x+74,y+38);ctx.textBaseline="alphabetic";return tw+92;
  };
  const chip=(text,xRight,y,bg,fg)=>{if(!text)return;ctx.font=`700 26px ${B}`;const w=ctx.measureText(text.toUpperCase()).width+44;rr(xRight-w,y+8,w,56,28);ctx.fillStyle=bg;ctx.fill();ctx.fillStyle=fg;ctx.textBaseline="middle";ctx.fillText(text.toUpperCase(),xRight-w+22,y+37);ctx.textBaseline="alphabetic";};
  const tag=(text,x,y,bg,fg)=>{ctx.font=`700 26px ${B}`;chip(text,x+ctx.measureText(text.toUpperCase()).width+44,y,bg,fg);};
  const pill=(text,x,y,bg,fg,font=`700 30px ${B}`)=>{ctx.font=font;const w=ctx.measureText(text).width+44;rr(x,y,w,60,30);ctx.fillStyle=bg;ctx.fill();ctx.fillStyle=fg;ctx.textBaseline="middle";ctx.fillText(text,x+22,y+31);ctx.textBaseline="alphabetic";return w;};
  // bottom bar with region line + phone; returns its full height (incl. the story safe strip)
  const footer=(W,H)=>{
    const sf=story?SAFE:0;
    if(o.showFooter===false){if(sf){ctx.fillStyle=C.green;ctx.fillRect(0,H-sf,W,sf);}return sf;}
    const h=96,Y=H-h-sf;ctx.fillStyle=C.green;ctx.fillRect(0,Y,W,h+sf);
    const ph="☎ "+(o.phone||""),lt=o.region||"";ctx.fillStyle=C.white;ctx.textBaseline="middle";
    ctx.font=`700 38px ${D}`;const pw=o.phone?ctx.measureText(ph).width:0;
    if(pw){ctx.textAlign="right";ctx.fillText(ph,W-60,Y+h/2);ctx.textAlign="left";}
    if(lt){ctx.font=`500 ${fitFont(lt,500,B,28,W-120-pw-(pw?30:0))}px ${B}`;ctx.fillText(lt,60,Y+h/2);}
    ctx.textBaseline="alphabetic";return h+sf;
  };
  const statusColor=s=>s==="Завършен"?[C.sand,C.ink]:s==="Предстои"?[C.white,C.green]:[C.green2,C.white];
  const stats=(items,x,y,W)=>{
    items=items.filter(i=>i[1]);if(!items.length)return 0;
    const cols=Math.min(items.length,4),gap=16,w=(W-gap*(cols-1))/cols,h=140;
    items.slice(0,4).forEach((it,i)=>{const cx=x+i*(w+gap);rr(cx,y,w,h,14);ctx.fillStyle="rgba(255,255,255,.12)";ctx.fill();ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,.7)";ctx.font=`600 22px ${B}`;ctx.fillText(it[0].toUpperCase(),cx+20,y+40);
      ctx.fillStyle=C.white;const s=fitFont(it[1],700,D,46,w-40);ctx.font=`700 ${s}px ${D}`;ctx.fillText(it[1],cx+20,y+102);});
    return h;
  };
  const bar=(pct,x,y,w)=>{pct=Math.max(0,Math.min(100,+pct||0));rr(x,y,w,26,13);ctx.fillStyle="rgba(255,255,255,.18)";ctx.fill();if(pct>0){rr(x,y,Math.max(26,w*pct/100),26,13);ctx.fillStyle=C.sand;ctx.fill();}};
  const avatar=(img,cx,cy,r)=>{
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r+6,0,Math.PI*2);ctx.fillStyle=C.white;ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();const s=Math.max(2*r/img.width,2*r/img.height);
    ctx.drawImage(img,cx-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s);ctx.restore();
  };
  // list of lines, each with a leading mark (✓ or a numbered dot) in the accent colour.
  // y = top of the block; returns its height. opts.dry measures without drawing.
  const marks=(lines,x,y,maxW,opts={})=>{
    const size=opts.size||32,lh=opts.lh||Math.round(size*1.35),gap=opts.gap??10;let yy=y;
    lines.forEach((t,i)=>{
      const base=yy+size;
      ctx.font=`500 ${size}px ${B}`;const ls=wlines(t,maxW-size*(opts.numbered?1.6:1.9),2);
      if(!opts.dry){
        if(opts.numbered){const r=size*0.62;ctx.beginPath();ctx.arc(x+r,base-size*0.3,r,0,Math.PI*2);ctx.fillStyle=C.sand;ctx.fill();
          ctx.fillStyle=C.ink;ctx.textAlign="center";ctx.font=`800 ${Math.round(size*0.78)}px ${D}`;ctx.fillText(String(i+1),x+r,base-size*0.3+size*0.27);ctx.textAlign="left";}
        else{ctx.font=`800 ${size}px ${D}`;ctx.fillStyle=C.sand;ctx.fillText("✓",x,base);}
        ctx.font=`500 ${size}px ${B}`;ctx.fillStyle=C.white;ls.forEach((l,j)=>ctx.fillText(l,x+size*(opts.numbered?1.6:1.9),base+j*lh));
      }
      yy+=Math.max(opts.numbered?size*1.3:size,(ls.length-1)*lh+size)+gap;
    });
    return yy-y-(lines.length?gap:0);
  };
  // five-pointed star, filled or outlined
  const star=(cx,cy,r,filled)=>{
    ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*0.45:r;ctx[i?"lineTo":"moveTo"](cx+rad*Math.cos(a),cy+rad*Math.sin(a));}ctx.closePath();
    if(filled){ctx.fillStyle=C.sand;ctx.fill();}else{ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=4;ctx.stroke();}
  };
  return {rr,fitFont,wlines,cover,placeholder,drawPhotos,topShade,shade,solid,brand,chip,tag,pill,footer,statusColor,stats,bar,avatar,marks,star};
}
