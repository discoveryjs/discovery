var ye=Object.create,x=Object.defineProperty,be=Object.getPrototypeOf,Se=Object.prototype.hasOwnProperty,we=Object.getOwnPropertyNames,xe=Object.getOwnPropertyDescriptor;var ke=t=>x(t,"__esModule",{value:!0});var k=(t,e)=>()=>(e||(e={exports:{}},t(e.exports,e)),e.exports);var ve=(t,e,r)=>{if(ke(t),e&&typeof e=="object"||typeof e=="function")for(let s of we(e))!Se.call(t,s)&&s!=="default"&&x(t,s,{get:()=>e[s],enumerable:!(r=xe(e,s))||r.enumerable});return t},De=t=>t&&t.__esModule?t:ve(x(t!=null?ye(be(t)):{},"default",{value:t,enumerable:!0}),t);var W=k((ot,V)=>{var P=1,O=2,j=3,J=4,$=5,U=6,je={8:"\\b",9:"\\t",10:"\\n",12:"\\f",13:"\\r",34:'\\"',92:"\\\\"};function Re(t){return t>=55296&&t<=56319}function Ce(t){return t>=56320&&t<=57343}function H(t){return typeof t.pipe=="function"&&typeof t._read=="function"&&typeof t._readableState=="object"&&t._readableState!==null}function Ee(t,e,r,s){switch(r&&typeof r.toJSON=="function"&&(r=r.toJSON()),s!==null&&(r=s.call(t,String(e),r)),typeof r){case"function":case"symbol":r=void 0;break;case"object":if(r!==null){let n=r.constructor;(n===String||n===Number||n===Boolean)&&(r=r.valueOf())}break}return r}function Te(t){return t===null||typeof t!="object"?P:Array.isArray(t)?j:O}function Ae(t){return t===null||typeof t!="object"?P:typeof t.then=="function"?J:H(t)?t._readableState.objectMode?U:$:Array.isArray(t)?j:O}function Fe(t){if(typeof t=="function")return t;if(Array.isArray(t)){let e=new Set(t.map(r=>typeof r=="string"||typeof r=="number"?String(r):null).filter(r=>typeof r=="string"));return e.add(""),(r,s)=>e.has(r)?s:void 0}return null}function Be(t){return typeof t=="number"?!Number.isFinite(t)||t<1?!1:" ".repeat(Math.min(t,10)):typeof t=="string"&&t.slice(0,10)||!1}V.exports={escapableCharCodeSubstitution:je,isLeadingSurrogate:Re,isTrailingSurrogate:Ce,type:{PRIMITIVE:P,PROMISE:J,ARRAY:j,OBJECT:O,STRING_STREAM:$,OBJECT_STREAM:U},isReadableStream:H,replaceValue:Ee,getTypeNative:Te,getTypeAsync:Ae,normalizeReplacer:Fe,normalizeSpace:Be}});var G=k((it,K)=>{K.exports=TextDecoder});var Z=k((lt,Q)=>{var{isReadableStream:Ne}=W(),Le=G(),h=1,Me=2,_e=new Le;function Y(t){return t!==null&&typeof t=="object"}function R(t,e){return t.name==="SyntaxError"&&e.jsonParseOffset&&(t.message=t.message.replace(/at position (\d+)/,(r,s)=>"at position "+(Number(s)+e.jsonParseOffset))),t}function C(t,e){let r=t.length;t.length+=e.length;for(let s=0;s<e.length;s++)t[r+s]=e[s]}Q.exports=function(t){let e=new X;if(Y(t)&&Ne(t))return new Promise((r,s)=>{t.on("data",n=>{try{e.push(n)}catch(a){s(R(a,e)),e=null}}).on("error",n=>{e=null,s(n)}).on("end",()=>{try{r(e.finish())}catch(n){s(R(n,e))}finally{e=null}})});if(typeof t=="function"){let r=t();if(Y(r)&&(Symbol.iterator in r||Symbol.asyncIterator in r))return new Promise(async(s,n)=>{try{for await(let a of r)e.push(a);s(e.finish())}catch(a){n(R(a,e))}finally{e=null}})}throw new Error("Chunk emitter should be readable stream, generator, async generator or function returning an iterable object")};var X=class{constructor(){this.value=void 0,this.valueStack=null,this.stack=new Array(100),this.lastFlushDepth=0,this.flushDepth=0,this.stateString=!1,this.stateStringEscape=!1,this.pendingByteSeq=null,this.pendingChunk=null,this.pos=0,this.jsonParseOffset=0}flush(e,r,s){let n=e.slice(r,s);if(this.jsonParseOffset=this.pos,this.pendingChunk!==null&&(n=this.pendingChunk+n,this.pendingChunk=null),n[0]===","&&(n=n.slice(1),this.jsonParseOffset++),this.flushDepth===this.lastFlushDepth)this.flushDepth>0?(this.jsonParseOffset--,this.stack[this.flushDepth-1]===h?Object.assign(this.valueStack.value,JSON.parse("{"+n+"}")):C(this.valueStack.value,JSON.parse("["+n+"]"))):(this.value=JSON.parse(n),this.valueStack={value:this.value,prev:null});else if(this.flushDepth>this.lastFlushDepth){for(let a=this.flushDepth-1;a>=this.lastFlushDepth;a--)n+=this.stack[a]===h?"}":"]";this.lastFlushDepth===0?(this.value=JSON.parse(n),this.valueStack={value:this.value,prev:null}):(this.jsonParseOffset--,this.stack[this.lastFlushDepth-1]===h?Object.assign(this.valueStack.value,JSON.parse("{"+n+"}")):C(this.valueStack.value,JSON.parse("["+n+"]")));for(let a=this.lastFlushDepth||1;a<this.flushDepth;a++){let o=this.valueStack.value;if(this.stack[a-1]===h){let i;for(i in o);o=o[i]}else o=o[o.length-1];this.valueStack={value:o,prev:this.valueStack}}}else{for(let a=this.lastFlushDepth-1;a>=this.flushDepth;a--)this.jsonParseOffset--,n=(this.stack[a]===h?"{":"[")+n;this.stack[this.lastFlushDepth-1]===h?Object.assign(this.valueStack.value,JSON.parse(n)):C(this.valueStack.value,JSON.parse(n));for(let a=this.lastFlushDepth-1;a>=this.flushDepth;a--)this.valueStack=this.valueStack.prev}this.pos+=s-r,this.lastFlushDepth=this.flushDepth}push(e){if(typeof e!="string"){if(this.pendingByteSeq!==null){let a=e;e=new Uint8Array(this.pendingByteSeq.length+a.length),e.set(this.pendingByteSeq),e.set(a,this.pendingByteSeq.length),this.pendingByteSeq=null}if(e[e.length-1]>127)for(let a=0;a<e.length;a++){let o=e[e.length-1-a];if(o>>6==3){a++,(a!==4&&o>>3==30||a!==3&&o>>4==14||a!==2&&o>>5==6)&&(this.pendingByteSeq=e.slice(e.length-a),e=e.slice(0,-a));break}}e=_e.decode(e)}let r=e.length,s=0,n=0;e:for(let a=0;a<r;a++){if(this.stateString){for(;a<r;a++)if(this.stateStringEscape)this.stateStringEscape=!1;else switch(e.charCodeAt(a)){case 34:this.stateString=!1;continue e;case 92:this.stateStringEscape=!0}break}switch(e.charCodeAt(a)){case 34:this.stateString=!0,this.stateStringEscape=!1;break;case 44:n=a;break;case 123:n=a+1,this.stack[this.flushDepth++]=h;break;case 91:n=a+1,this.stack[this.flushDepth++]=Me;break;case 93:case 125:n=a+1,this.flushDepth--,this.flushDepth<this.lastFlushDepth&&(this.flush(e,s,n),s=n);break}}if(n>s&&this.flush(e,s,n),n<r){let a=e.slice(n,r);this.pendingChunk=this.pendingChunk!==null?this.pendingChunk+a:a}}finish(){return this.pendingChunk!==null&&(/[^ \t\r\n]/.test(this.pendingChunk)&&this.flush("",0,0),this.pendingChunk=null),this.value}}});var f={name:"Discovery",mode:"modelfree",darkmode:"auto",data:null,model:{slug:"modelfree",cache:!1,meta:null}};var Pe=`
:host {
    position: absolute;
    margin: 35px 40px;
    width: 100%;
    max-width: 300px;
    z-index: 1;
    transition: opacity .15s var(--appearance-delay, 0ms);
    pointer-events: none;
}
:host(.init) {
    opacity: 0;
}
.progress {
    content: '';
    display: block;
    position: relative;
    overflow: hidden;
    margin-top: 4px;
    box-sizing: border-box;
    height: 3px;
    background: rgba(198, 198, 198, 0.3);
    border-radius: 2px;
}
.progress::before {
    content: '';
    display: block;
    height: 100%;
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
    transform: scaleX(var(--progress, 0));
    transform-origin: left;
    /* transition: transform .2s; */ /* since Chrome (tested on 85) freezes transition during js loop */
    background-color: #1f7ec5;
}`,p={request:{value:0,title:"Awaiting data"},receive:{value:.1,title:"Receiving data"},parse:{value:.9,title:"Processing data (parse)"},prepare:{value:.925,title:"Processing data (prepare)"},initui:{value:.975,title:"Preparing UI"},done:{value:1,title:"Done!"}};Object.values(p).forEach((t,e,r)=>{t.duration=(e!==r.length-1?r[e+1].value:0)-t.value});var Oe=async()=>{if(await new Promise(t=>setTimeout(t,1)),!document.hidden)return Promise.race([new Promise(requestAnimationFrame),new Promise(t=>setTimeout(t,8))])},v=class{constructor({onTiming:e,delay:r}){this.finished=!1,this.awaitRepaint=null,this.lastStage=null,this.lastStageStart=null,this.timings=[],this.onTiming=typeof e=="function"?e:()=>{},this.el=document.createElement("div"),this.shadowRoot=this.el.attachShadow({mode:"closed"}),this.el.className="progressbar init",this.el.style.setProperty("--appearance-delay",`${r===!0?200:Number(r)||0}ms`),this.shadowRoot.innerHTML=`<style>${Pe}</style><div class="title"></div><div class="progress"></div>`}async setState(e){let{stage:r,progress:s,error:n}=e;if(n||this.finished)return;let{value:a,title:o,duration:i}=p[r],c=r!==this.lastStage,l=Date.now(),u=0,g;if(this.lastStage||(this.startTime=l,requestAnimationFrame(()=>this.el.classList.remove("init"))),c){if(this.lastStageStart!==null){let d={stage:this.lastStage,title:p[this.lastStage].title,duration:l-this.lastStageStart};this.timings.push(d),this.onTiming(d)}this.lastStage=r,this.lastStageStart=l,this.awaitRepaint=l}if(s){let{done:d,elapsed:me,units:B,completed:m,total:w}=s;w?(u=d?1:m/w,g=B==="bytes"?Math.round(u*100)+"%":`${m}/${w}`):(u=d?1:.1+Math.min(.9,me/2e4),g=B==="bytes"?(m/(1024*1024)).toFixed(1)+"MB":m)}this.el.style.setProperty("--progress",a+u*i),this.shadowRoot.querySelector(".title").textContent=g?`${o} (${g})...`:r!=="done"?`${o}...`:o,(c||l-this.awaitRepaint>65&&l-this.lastStageStart>200)&&(await Oe(),this.awaitRepaint=Date.now())}finish(){if(!this.finished&&this.lastStageStart!==null){let e=this.lastStage,r=Date.now()-this.lastStageStart,s=p[e].title,n={stage:e,title:s,duration:r};this.timings.push(n),this.onTiming(n),this.onTiming({stage:"done",title:p.done.title,duration:Date.now()-this.startTime})}this.finished=!0}dispose(){this.finish(),this.el.remove()}},N=v;var D=class{static setValue(e,r){if(!e.shouldPublish(r,e.value))return!1;let s=[],n=e.subscriber;for(e.value=r;n!==null;){let{callback:a,thisArg:o}=n;a!==null&&s.push(a.call(o,r,()=>e.unsubscribe(a,o))),n=n.subscriber}return s}constructor(e,r){this.value=e,this.shouldPublish=typeof r=="function"?r:this.shouldPublish,this.subscriber=null}get readonly(){let e=this;return{subscribe:this.subscribe.bind(this),subscribeSync:this.subscribeSync.bind(this),unsubscribe:this.unsubscribe.bind(this),get value(){return e.value}}}subscribe(e,r){return this.subscriber={callback:e,thisArg:r,subscriber:this.subscriber},()=>this.unsubscribe(e,r)}subscribeSync(e,r){let s=this.subscribe(e,r);return e.call(r,this.value,s),s}unsubscribe(e,r){let s=this,n=this.subscriber;for(;n!==null;){if(n.callback===e&&n.thisArg===r){n.callback=null,n.thisArg=null,s.subscriber=n.subscriber;break}s=n,n=n.subscriber}}shouldPublish(e,r){return e!==r}set(e){return this.constructor.setValue(this,e)!==!1}asyncSet(e){let r=this.constructor.setValue(this,e);return r===!1?Promise.resolve(!1):Promise.all(r).then(s=>s!==!1)}},L=D;var M=!1,_=!1,q=!1;try{new ReadableStream({}),_=!0}catch(t){}try{new ReadableStream({type:"bytes"}),M=!0}catch(t){}try{new Response(new Blob).getReader(),q=!0}catch(t){}function z(t){return typeof t.arrayBuffer=="function"?t.arrayBuffer():new Promise((e,r)=>{let s=new FileReader;s.readAsArrayBuffer(t),s.onload=s.onerror=({type:n})=>{s.onload=s.onerror=null,n==="load"?e(s.result||s):r(new Error("Failed to read the blob/file"))}})}function I(t){let e=0;if(typeof t.stream=="function"&&!/Version\/14\.1/.test(navigator.userAgent))return t.stream();if(M)return new ReadableStream({type:"bytes",autoAllocateChunkSize:512*1024,pull(r){let s=r.byobRequest.view,n=t.slice(e,e+s.byteLength);return z(n).then(function(a){let o=new Uint8Array(a),i=o.byteLength;e+=i,s.set(o),r.byobRequest.respond(i),e>=t.size&&r.close()})}});if(_)return new ReadableStream({pull(r){let s=t.slice(e,e+512*1024);return z(s).then(function(n){e+=n.byteLength,r.enqueue(new Uint8Array(n)),e==t.size&&r.close()})}});if(q)return new Response(t).body;throw new Error("Include https://github.com/creatorrr/web-streams-polyfill")}var ee=De(Z()),E={stream:y,event:qe,file:te,url:ze,push:Ie};function Ve(t){try{return new URL(t,location.origin).origin===location.origin}catch(e){return!1}}function Je(t,e,r){let s=1024*1024,n=0;return ee.default(async function*(){let a=t.getReader(),o=Date.now();try{for(;;){let{done:i,value:c}=await a.read();if(i){await r({done:!0,elapsed:Date.now()-o,units:"bytes",completed:n,total:e});break}for(let l=0;l<c.length;l+=s){let u=l===0&&c.length-l<s?c:c.slice(l,l+s);n+=u.length,yield u,await r({done:!1,elapsed:Date.now()-o,units:"bytes",completed:n,total:e})}}}finally{a.releaseLock()}}).then(a=>({data:a,size:n}))}async function $e(t,e){let r=async(s,n)=>(await e.asyncSet({stage:s}),await n());try{let s=Date.now(),{stream:n,data:a,size:o}=await r("request",t),i=Date.now()-s,{data:c,size:l}=a||await r("receive",()=>Je(n,Number(o)||0,u=>e.asyncSet({stage:"receive",progress:u})));return await e.asyncSet({stage:"done"}),{data:c,size:l,payloadSize:Number(o)||0,time:Date.now()-s,requestTime:i}}catch(s){throw console.error("[Discovery] Error loading data:",s),await e.asyncSet({stage:"error",error:s}),s}}function y(t,e,r){let s=new L;return{state:s,result:$e(t,s).then(n=>({...n,...e(n.data)})),...r}}function te(t){return y(()=>{if(t.type!=="application/json")throw new Error("Not a JSON file");return{stream:I(t),size:t.size}},e=>({data:e,context:{name:`File: ${t.name}`,createdAt:new Date(t.lastModified||Date.now()),data:e}}))}function qe(t){let e=t.dataTransfer||t.target,r=e&&e.files&&e.files[0];return t.stopPropagation(),t.preventDefault(),te(r)}function ze(t,e){let r=typeof t=="string"?void 0:t;return y(async()=>{let s=await fetch(r?"data:application/json,{}":t);if(s.ok)return r?{data:r}:{stream:s.body,size:Ve(t)&&!s.headers.get("content-encoding")?s.headers.get("content-length"):s.headers.get("x-file-size")};let n=s.headers.get("content-type")||"",a=await s.text();if(n.toLowerCase().startsWith("application/json")){let o=JSON.parse(a);a=o.error||o}throw a=new Error(a),a.stack=null,a},s=>({data:e?s[e]:s,context:{name:"Discovery",createdAt:e&&s.createdAt?new Date(Date.parse(s.createdAt)):new Date,...e?s:{data:s}}}))}function Ie(t,e){let r;return y(()=>({size:t,stream:new ReadableStream({start(s){r=s},cancel(){r=null}})}),s=>({data:s.data,context:{name:s.name||"Discovery",createdAt:e||s.createdAt||Date.now(),data:s.data}}),{push(s){r.enqueue(s)},finish(){r.close(),r=null}})}function se({result:t,state:e},r){return new Promise((s,n)=>{let a=e.subscribeSync(({stage:o,progress:i,error:c})=>{if(c){a(),n(c);return}if(o==="done"){a(),s(t);return}r.setState({stage:o,progress:i})})})}var T=class{constructor(){this.listeners=Object.create(null)}on(e,r){return this.listeners[e]={callback:r,next:this.listeners[e]||null},this}once(e,r){return this.on(e,function s(...n){r.apply(this,n),this.off(e,s)})}off(e,r){let s=this.listeners[e]||null,n=null;for(;s!==null;){if(s.callback===r){s.callback=null,n?n.next=s.next:this.listeners[e]=s.next;break}n=s,s=s.next}return this}emit(e,...r){let s=this.listeners[e]||null,n=!1;for(;s!==null;)typeof s.callback=="function"&&s.callback.apply(this,r),n=!0,s=s.next;return n}},re=T;function Ue(t){let e="__storage_test__"+Math.random(),r;try{r=window[t]}catch(s){return null}try{r.setItem(e,e),r.removeItem(e)}catch(s){if(!(s instanceof DOMException&&(s.code===22||s.code===1014||s.name==="QuotaExceededError"||s.name==="NS_ERROR_DOM_QUOTA_REACHED")&&r.length!==0))return null}return r}function ne(t){let e=new Map;return e.storage=Ue(t),e.getOrCreate=r=>e.get(r)||He(r,e),e.getOrCreate.available=e.storage!==null,e}var A=new Map([["session",ne("sessionStorage")],["local",ne("localStorage")]]),gt=A.get("session").getOrCreate,ae=A.get("local").getOrCreate;addEventListener("storage",t=>{for(let[,e]of A)e.storage===t.storageArea&&e.has(t.key)&&e.get(t.key).forceSync()});function He(t,e){let r=null,s=new re,n=(o=e.storage.getItem(t))=>{r!==o&&s.emit("change",r=o)},a={get value(){return this.get()},get(){return r},set(o){e.storage&&(e.storage.setItem(t,o),n())},delete(){e.storage&&(e.storage.removeItem(t),n())},forceSync(){return e.storage&&n(),this.get()},on(o,i){return s.on("change",o),i&&o(r),()=>s.off("change",o)},off(o){s.off("change",o)}};return e.set(t,a),a.forceSync(),a}var We=new Set([!0,!1,"auto","disabled"]),oe=new Set,ie=matchMedia("(prefers-color-scheme:dark)"),le=ae("discoveryjs:darkmode"),ce=new Map([["true",!0],["false",!1],["auto","auto"]]),b=null;function Ke(){for(let t of oe)t.mode==="auto"&&t.set("auto")}function ue(t){let e=ce.has(t)?ce.get(t):null;if(b!==e){b=e;for(let r of oe)r.persistent&&r.mode!=="disabled"&&r.set(e!==null?e:"auto")}}ue(le.value);le.on(ue);ie.addListener(Ke);function Ge(t,e){return(t==="off"||t==="disable")&&(t="disabled"),t!=="disabled"&&e&&b!==null&&(t=b),t}function Qe(t){return We.has(t)||(t="disabled"),t==="auto"?ie.matches:t===!0}function he(t,e){return Qe(Ge(t,e))}var Ye={"font-family":"Tahoma, Verdana, Arial, sans-serif","font-size":"16px","line-height":"1.6","-webkit-text-size-adjust":"none","text-size-adjust":"none","background-color":"var(--discovery-background-color, white)",color:"var(--discovery-color, black)","transition-property":"background-color, color","transition-duration":".25s","transition-timing-function":"ease-in"},Xe={"--discovery-background-color":"#242424","--discovery-color":"#cccccc"},de=new WeakSet;function fe(t,e){e=e||{};let r=he(e.darkmode,e.darkmodePersistent);for(let[s,n]of Object.entries(Ye))(de.has(t)||!/^transition/.test(s))&&t.style.setProperty(s,n);for(let[s,n]of Object.entries(Xe))r?t.style.setProperty(s,n):t.style.removeProperty(s);de.add(t)}function Ze(){return new N({delay:300,onTiming:({title:t,duration:e})=>console.log(`[Discovery/loader] ${t} \u2013 ${e}ms`)})}function pe(t={}){let e=t.container||document.body,r=t.progressbar||Ze();if(t.dataSource&&!E.hasOwnProperty(t.dataSource))throw new Error(`dataSource "${t.dataSource}" is not supported`);fe(e,t);let s=E[t.dataSource||"url"],n=t.dataSource==="push"?s():t.data?s(t.data,"data"):{result:Promise.resolve(t)};return n.push&&(window.discoveryLoader={push:n.push,finish:()=>{delete window.discoveryLoader,n.finish()}}),n.state&&se(n,r),e.append(r.el),Object.assign(n.result,{progressbar:r})}var et=t=>fetch(t).then(e=>{if(!e.ok)throw new Error(`Failed to load styles "${t}"`);return e.text()});function ge(t,e,r,s){let n=document.body,a=pe({...s,container:n});return Promise.all([t,Promise.all(e.map(et)),a]).then(([o,i,{data:c,context:l}])=>o({...r,styles:i},a.progressbar,c,l)).catch(o=>{let i=document.createElement("pre");i.style.cssText="margin:20px;padding:20px;font-size:14px;color:#d85a5a;background:#ff00002e;text-shadow:1px 1px var(--discovery-background-color)",i.append(document.createTextNode("[ERROR] "+o+(o.stack?`

`+o.stack:""))),a.progressbar.el.replaceWith(i)}).finally(()=>a.progressbar.dispose())}var S=f.model||{},F={mode:f.mode,darkmodePersistent:!0,setup:f,...S?{darkmode:S.darkmode,download:S.download,cache:S.cache}:null};ge(import("./model.js").then(t=>t.default),["model.css"],F,{darkmode:F.darkmode,darkmodePersistent:F.darkmodePersistent,dataSource:"url",data:f.data});