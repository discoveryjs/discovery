var wt=Object.create;var he=Object.defineProperty;var vt=Object.getOwnPropertyDescriptor;var Et=Object.getOwnPropertyNames;var xt=Object.getPrototypeOf,kt=Object.prototype.hasOwnProperty;var J=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var Tt=(e,t,r,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of Et(t))!kt.call(e,n)&&n!==r&&he(e,n,{get:()=>t[n],enumerable:!(s=vt(t,n))||s.enumerable});return e};var jt=(e,t,r)=>(r=e!=null?wt(xt(e)):{},Tt(t||!e||!e.__esModule?he(r,"default",{value:e,enumerable:!0}):r,e));var we=J((os,Se)=>{var Mt={8:"\\b",9:"\\t",10:"\\n",12:"\\f",13:"\\r",34:'\\"',92:"\\\\"};function Bt(e){return e>=55296&&e<=56319}function Vt(e){return e>=56320&&e<=57343}function Ae(e){return typeof e.pipe=="function"&&typeof e._read=="function"&&typeof e._readableState=="object"&&e._readableState!==null}function qt(e,t,r,s){switch(r&&typeof r.toJSON=="function"&&(r=r.toJSON()),s!==null&&(r=s.call(e,String(t),r)),typeof r){case"function":case"symbol":r=void 0;break;case"object":if(r!==null){let n=r.constructor;(n===String||n===Number||n===Boolean)&&(r=r.valueOf())}break}return r}function zt(e){return e===null||typeof e!="object"?1:Array.isArray(e)?3:2}function $t(e){return e===null||typeof e!="object"?1:typeof e.then=="function"?4:Ae(e)?e._readableState.objectMode?6:5:Array.isArray(e)?3:2}function Ht(e){return typeof e=="function"?e:Array.isArray(e)?[...new Set(e.map(r=>{let s=r&&r.constructor;return s===String||s===Number?String(r):null}).filter(r=>typeof r=="string"))]:null}function Wt(e){return typeof e=="number"?!Number.isFinite(e)||e<1?!1:" ".repeat(Math.min(e,10)):typeof e=="string"&&e.slice(0,10)||!1}Se.exports={escapableCharCodeSubstitution:Mt,isLeadingSurrogate:Bt,isTrailingSurrogate:Vt,type:{PRIMITIVE:1,PROMISE:4,ARRAY:3,OBJECT:2,STRING_STREAM:5,OBJECT_STREAM:6},isReadableStream:Ae,replaceValue:qt,getTypeNative:zt,getTypeAsync:$t,normalizeReplacer:Ht,normalizeSpace:Wt}});var Ee=J((ls,ve)=>{ve.exports=TextDecoder});var Te=J((cs,ke)=>{var{isReadableStream:Jt}=we(),Yt=Ee(),F=1,Gt=2,Kt=new Yt;function xe(e){return e!==null&&typeof e=="object"}function G(e,t){return e.name==="SyntaxError"&&t.jsonParseOffset&&(e.message=e.message.replace(/at position (\d+)/,(r,s)=>"at position "+(Number(s)+t.jsonParseOffset))),e}function Zt(e,t){let r=e.length;e.length+=t.length;for(let s=0;s<t.length;s++)e[r+s]=t[s]}ke.exports=function(e){let t=new K;if(xe(e)&&Jt(e))return new Promise((r,s)=>{e.on("data",n=>{try{t.push(n)}catch(a){s(G(a,t)),t=null}}).on("error",n=>{t=null,s(n)}).on("end",()=>{try{r(t.finish())}catch(n){s(G(n,t))}finally{t=null}})});if(typeof e=="function"){let r=e();if(xe(r)&&(Symbol.iterator in r||Symbol.asyncIterator in r))return new Promise(async(s,n)=>{try{for await(let a of r)t.push(a);s(t.finish())}catch(a){n(G(a,t))}finally{t=null}})}throw new Error("Chunk emitter should be readable stream, generator, async generator or function returning an iterable object")};var K=class{constructor(){this.value=void 0,this.valueStack=null,this.stack=new Array(100),this.lastFlushDepth=0,this.flushDepth=0,this.stateString=!1,this.stateStringEscape=!1,this.pendingByteSeq=null,this.pendingChunk=null,this.chunkOffset=0,this.jsonParseOffset=0}parseAndAppend(t,r){this.stack[this.lastFlushDepth-1]===F?(r&&(this.jsonParseOffset--,t="{"+t+"}"),Object.assign(this.valueStack.value,JSON.parse(t))):(r&&(this.jsonParseOffset--,t="["+t+"]"),Zt(this.valueStack.value,JSON.parse(t)))}prepareAddition(t){let{value:r}=this.valueStack;if(Array.isArray(r)?r.length!==0:Object.keys(r).length!==0){if(t[0]===",")return this.jsonParseOffset++,t.slice(1);if(t[0]!=="}"&&t[0]!=="]")return this.jsonParseOffset-=3,"[[]"+t}return t}flush(t,r,s){let n=t.slice(r,s);if(this.jsonParseOffset=this.chunkOffset+r,this.pendingChunk!==null&&(n=this.pendingChunk+n,this.jsonParseOffset-=this.pendingChunk.length,this.pendingChunk=null),this.flushDepth===this.lastFlushDepth)this.flushDepth>0?this.parseAndAppend(this.prepareAddition(n),!0):(this.value=JSON.parse(n),this.valueStack={value:this.value,prev:null});else if(this.flushDepth>this.lastFlushDepth){for(let a=this.flushDepth-1;a>=this.lastFlushDepth;a--)n+=this.stack[a]===F?"}":"]";this.lastFlushDepth===0?(this.value=JSON.parse(n),this.valueStack={value:this.value,prev:null}):this.parseAndAppend(this.prepareAddition(n),!0);for(let a=this.lastFlushDepth||1;a<this.flushDepth;a++){let i=this.valueStack.value;if(this.stack[a-1]===F){let l;for(l in i);i=i[l]}else i=i[i.length-1];this.valueStack={value:i,prev:this.valueStack}}}else{n=this.prepareAddition(n);for(let a=this.lastFlushDepth-1;a>=this.flushDepth;a--)this.jsonParseOffset--,n=(this.stack[a]===F?"{":"[")+n;this.parseAndAppend(n,!1);for(let a=this.lastFlushDepth-1;a>=this.flushDepth;a--)this.valueStack=this.valueStack.prev}this.lastFlushDepth=this.flushDepth}push(t){if(typeof t!="string"){if(this.pendingByteSeq!==null){let a=t;t=new Uint8Array(this.pendingByteSeq.length+a.length),t.set(this.pendingByteSeq),t.set(a,this.pendingByteSeq.length),this.pendingByteSeq=null}if(t[t.length-1]>127)for(let a=0;a<t.length;a++){let i=t[t.length-1-a];if(i>>6===3){a++,(a!==4&&i>>3===30||a!==3&&i>>4===14||a!==2&&i>>5===6)&&(this.pendingByteSeq=t.slice(t.length-a),t=t.slice(0,-a));break}}t=Kt.decode(t)}let r=t.length,s=0,n=0;e:for(let a=0;a<r;a++){if(this.stateString){for(;a<r;a++)if(this.stateStringEscape)this.stateStringEscape=!1;else switch(t.charCodeAt(a)){case 34:this.stateString=!1;continue e;case 92:this.stateStringEscape=!0}break}switch(t.charCodeAt(a)){case 34:this.stateString=!0,this.stateStringEscape=!1;break;case 44:n=a;break;case 123:n=a+1,this.stack[this.flushDepth++]=F;break;case 91:n=a+1,this.stack[this.flushDepth++]=Gt;break;case 93:case 125:n=a+1,this.flushDepth--,this.flushDepth<this.lastFlushDepth&&(this.flush(t,s,n),s=n);break;case 9:case 10:case 13:case 32:s===a&&s++,n===a&&n++;break}}n>s&&this.flush(t,s,n),n<r&&(this.pendingChunk!==null?this.pendingChunk+=t:this.pendingChunk=t.slice(n,r)),this.chunkOffset+=r}finish(){return this.pendingChunk!==null&&(this.flush("",0,0),this.pendingChunk=null),this.value}}});var D={name:"Discovery",mode:"modelfree",embed:!1,darkmode:"auto",darkmodePersistent:!0,model:{name:"Untitled model",slug:"default",url:"default/index.html",data:null,cache:!1,cacheReset:!1,upload:!0,download:!1,embed:!1,darkmode:"auto",darkmodePersistent:!0,inspector:!0,router:!0,meta:{description:["Running in `model free mode` since no config or model is set. However, you can load the JSON file, analyse it, and create your own report.","","See [documention](https://github.com/discoveryjs/discovery/blob/master/README.md) for details."]}},indexUrl:"../../index.html",assets:{"model.css":"model.css","model-loader.css":"model-loader.css"}};if(!location.pathname.endsWith(".html")&&(D.model&&(D.indexUrl=D.indexUrl.replace(/^\.\.\/|index\.html$/g,"")),D.models))for(let e of D.models)e.url=e.url.replace(/(^|\/|\\)index\.html$/,"$1");var j=D;var I=class{static setValue(t,r){if(!t.shouldPublish(r,t.value))return!1;let s=[],n=t.subscriber;for(t.value=r;n!==null;){let{callback:a,thisArg:i}=n;a!==null&&s.push(a.call(i,r,()=>t.unsubscribe(a,i))),n=n.subscriber}return s}constructor(t,r){this.value=t,this.shouldPublish=typeof r=="function"?r:this.shouldPublish,this.subscriber=null}get readonly(){let t=this;return{subscribe:this.subscribe.bind(this),subscribeSync:this.subscribeSync.bind(this),unsubscribe:this.unsubscribe.bind(this),get value(){return t.value}}}subscribe(t,r){return this.subscriber={callback:t,thisArg:r,subscriber:this.subscriber},()=>this.unsubscribe(t,r)}subscribeSync(t,r){let s=this.subscribe(t,r);return t.call(r,this.value,s),s}unsubscribe(t,r){let s=this,n=this.subscriber;for(;n!==null;){if(n.callback===t&&n.thisArg===r){n.callback=null,n.thisArg=null,s.subscriber=n.subscriber;break}s=n,n=n.subscriber}}shouldPublish(t,r){return t!==r}set(t){return this.constructor.setValue(this,t)!==!1}asyncSet(t){let r=this.constructor.setValue(this,t);return r===!1?Promise.resolve(!1):Promise.all(r).then(s=>s!==!1)}};function C(e,t,r){let s=document.createElement(e);typeof t=="string"&&(t={class:t});for(let n in t)if(hasOwnProperty.call(t,n)){if(t[n]===void 0)continue;n.startsWith("on")?s.addEventListener(n.substr(2),t[n]):s.setAttribute(n,t[n])}return Array.isArray(r)?r.forEach(n=>s.appendChild(n instanceof Node?n:Ct(n))):typeof r=="string"&&(s.innerHTML=r),s}function Ct(e){return document.createTextNode(String(e))}var It=(()=>{let e=!1;try{let t={get passive(){return e=!0,!1}};window.addEventListener("test",null,t),window.removeEventListener("test",null,t)}catch{}return e})(),es=It?Object.freeze({passive:!0,capture:!0}):!0;var Y={request:{value:0,title:"Awaiting data"},receive:{value:.1,title:"Receiving data"},received:{value:.9,title:"Await app ready"},prepare:{value:.925,title:"Processing data (prepare)"},initui:{value:.975,title:"Rendering UI"},done:{value:1,title:"Done!"},error:{value:1,title:"Error!"}};Object.values(Y).forEach((e,t,r)=>{e.duration=(t!==r.length-1?r[t+1].value:0)-e.value});var pe=e=>e|0,me=e=>typeof e=="function"?e:()=>{},Ot=async()=>{if(await new Promise(e=>setTimeout(e,1)),!document.hidden)return Promise.race([new Promise(requestAnimationFrame),new Promise(e=>setTimeout(e,8))])};function Dt(e,t){let{value:r,title:s,duration:n}=Y[e],a=0,i=null;if(t){let{done:l,elapsed:c,units:o,completed:d,total:u}=t;u?(a=l?1:d/u,i=o==="bytes"?Math.round(a*100)+"%":`${d}/${u}`):(a=l?1:.1+Math.min(.9,c/2e4),i=o==="bytes"?(d/(1024*1024)).toFixed(1)+"MB":d)}return{stageTitle:s,progressValue:r+a*n,progressText:i,title:i?`${s} (${i})...`:e!=="done"?`${s}...`:s}}var N=class extends I{constructor({onTiming:t,onFinish:r,delay:s,domReady:n}){super({stage:null,progress:null,error:null}),this.finished=!1,this.awaitRepaint=null,this.lastStage="created",this.lastStageStart=null,this.timings=[],this.onTiming=me(t),this.onFinish=me(r),this.appearanceDelay=s===!0?200:Number(s)||0,this.domReady=n||Promise.resolve(),this.el=C("div","view-progress init",[C("div","title"),C("div","progress")])}recordTiming(t,r,s=performance.now()){let n={stage:t,title:Y[t].title,duration:pe(s-r)};this.timings.push(n),this.onTiming(n)}async setState(t){let{stage:r,progress:s,error:n}=t;if(this.finished)return;if(n){this.set("stage"in t?{stage:r,progress:s,error:n}:{...this.value,error:n}),this.finish(n);return}this.set(t);let a=r!==this.lastStage,i=performance.now();this.lastStage==="created"&&(this.startTime=i,this.domReady.then(()=>{let o=Math.max(0,this.appearanceDelay-pe(performance.now()-i));o&&this.el.style.setProperty("--appearance-delay",`${o}ms`),getComputedStyle(this.el).opacity,this.el.classList.remove("init")})),a&&(this.lastStageStart!==null&&this.recordTiming(this.lastStage,this.lastStageStart,i),this.lastStage=r,this.lastStageStart=i,this.awaitRepaint=i);let{title:l,progressValue:c}=Dt(r,s);this.el.querySelector(".title").textContent=l,this.el.style.setProperty("--progress",c),(a||i-this.awaitRepaint>65&&i-this.lastStageStart>200)&&(await Ot(),this.awaitRepaint=performance.now())}finish(t){this.finished||(this.finished=!0,this.lastStageStart!==null&&this.recordTiming(this.lastStage,this.lastStageStart),this.recordTiming(t?"error":"done",this.startTime),this.onFinish(this.timings),this.set({stage:"done"}))}dispose(){this.finish(),this.el.remove()}};var ye=typeof new Blob().stream=="function"?e=>e.stream():Pt();function Pt(){try{return new ReadableStream({type:"bytes"}),Lt}catch{try{return new ReadableStream({}),Ut}catch{try{return new Response(new Blob).body.getReader(),Rt}catch{}}}return Nt}function ge(e){return typeof e.arrayBuffer=="function"?e.arrayBuffer():new Promise((t,r)=>{let s=new FileReader;s.readAsArrayBuffer(e),s.onload=s.onerror=({type:n})=>{s.onload=s.onerror=null,n==="load"?t(s.result||s):r(new Error("Failed to read the blob/file"))}})}function Lt(e){let t=0;return new ReadableStream({type:"bytes",autoAllocateChunkSize:512*1024,pull(r){let s=r.byobRequest.view,n=e.slice(t,t+s.byteLength);return ge(n).then(a=>{let i=new Uint8Array(a),l=i.byteLength;t+=l,s.set(i),r.byobRequest.respond(l),t>=e.size&&r.close()})}})}function Ut(e){let t=0;return new ReadableStream({pull(r){let s=e.slice(t,t+524288);return ge(s).then(n=>{t+=n.byteLength,r.enqueue(new Uint8Array(n)),t==e.size&&r.close()})}})}function Rt(e){return new Response(e).body}function Nt(){throw new Error("Blob#stream() is not supported and no fallback can be applied, include https://github.com/MattiasBuelens/web-streams-polyfill")}function Ft(e){if(!e||typeof e!="object")return"value is not an object";let{name:t,test:r,decode:s}=e;return typeof t!="string"?"missed name":typeof r!="function"?"missed test function":typeof s!="function"?"missed decode function":!1}function _t(e){let t=Ft(e);if(t)throw new Error(`Bad encoding config${e?.name?` "${e.name}"`:""}: ${t}`);let{name:r,test:s,streaming:n,decode:a}=e;return Object.freeze({name:r||"unknown",test:s,streaming:!!n,decode:a})}function be(e){if(!e)return[];if(!Array.isArray(e))throw new Error("Encodings must be an array");return e.map(_t)}var je=jt(Te(),1),Z=Object.freeze({name:"json",test:()=>!0,streaming:!0,decode:e=>(0,je.default)(()=>e)});var Qt=new Uint8Array([0,0,74,83,79,78,88,76]),Ce=9,Xt=268435455,er=4294967295,Le=1<<0,V=1<<1,P=1<<2,_=1<<3,L=1<<4,q=1<<5,z=1<<6,O=1<<7,Ue=0,Re=1,Ne=2,Fe=3,_e=4,Me=5,Be=6,tr=7,Ve=8,qe=9,ze=10,$e=11,He=12,rr=31,us=~rr,We=224,fs=~We,Je=7936,hs=~Je,Ye=0,X=1,sr=2,nr=3,ar=4,ir=5,Ge=6,Ke=7,or=8,Ie=16,Oe=32,ps=~L,De=V|q|z,lr=new Uint8Array(256),Ze=new Uint8Array(8).map((e,t)=>(lr[1<<t]=t,1<<t)),Qe=new Uint8Array(256).map((e,t)=>{for(let r=0;r<8;r++)e+=t>>r&1;return e}),ms=Object.fromEntries(Object.entries({TYPE_UNDEF:Le,TYPE_TRUE:q,TYPE_FALSE:z,TYPE_NULL:V,TYPE_NUMBER:P,TYPE_STRING:_,TYPE_OBJECT:L,TYPE_ARRAY:O}).map(([e,t])=>[t,e])),ys=Object.fromEntries(Object.entries({UINT_8:Ue,UINT_16:Re,UINT_24:Ne,UINT_32:Fe,UINT_32_VAR:_e,INT_8:Ve,INT_16:qe,INT_24:ze,INT_32:$e,INT_32_VAR:He,FLOAT_32:Me,FLOAT_64:Be,DECIMAL:tr}).map(([e,t])=>[t,e])),Q=new Uint8Array(32),cr=class{constructor(e){this.view=new DataView(e.buffer,e.byteOffset,e.byteLength),this.bytes=e,this.pos=0}readBytes(e){return this.bytes.subarray(this.pos,this.pos+=e)}readTypeIndex(e,t,r){let s=0,n=0;for(;t>0;)t&1&&(Q[s++]=n),n++,t>>=1;let a=new Uint8Array(e),i=32-Math.clz32(s-1),l=(1<<i)-1,c=this.readBytes(Math.ceil(i*e/8)),o=0,d=0,u=0;for(let f=0;f<e;f++)d<i&&(u|=c[o]<<d,d+=8,o++),a[f]=r?Ze[Q[u&l]]:Q[u&l],u>>=i,d-=i;return a}readVlq(){let e=this.view.getUint8(this.pos);if(!(e&1))e=e>>1,this.pos+=1;else if(!(e&2))e=this.view.getUint8(this.pos+1)<<6|e>>2,this.pos+=2;else if(!(e&4))e=this.view.getUint16(this.pos+1,!0)<<5|e>>3,this.pos+=3;else{let t=this.view.getUint32(this.pos,!0);e=t>>>3&Xt,this.pos+=4,t>>>31&&(e+=this.readUintVar()*(1<<28))}return e}readUintVar(){let e=this.view.getUint8(this.pos++),t=e&127,r=128;for(;e&128;)e=this.view.getUint8(this.pos++),t+=(e&127)*r,r*=128;return t}readIntVar(){let e=this.readUintVar();return e&1?-(e-1)/2:e<=er?e>>>1:e/2}readUint8(){let e=this.view.getUint8(this.pos);return this.pos++,e}readInt8(){let e=this.view.getInt8(this.pos);return this.pos++,e}readUint16(){let e=this.view.getUint16(this.pos,!0);return this.pos+=2,e}readInt16(){let e=this.view.getInt16(this.pos,!0);return this.pos+=2,e}readUint24(){let e=this.view.getUint16(this.pos,!0)|this.view.getUint8(this.pos+2)<<16;return this.pos+=3,e}readInt24(){let e=this.view.getUint16(this.pos,!0),t=this.view.getUint8(this.pos+2),r=t&128?-(16777215-(e|t<<16)+1):e|t<<16;return this.pos+=3,r}readUint32(){let e=this.view.getUint32(this.pos,!0);return this.pos+=4,e}readInt32(){let e=this.view.getInt32(this.pos,!0);return this.pos+=4,e}readFloat32(){let e=this.view.getFloat32(this.pos);return this.pos+=4,e}readFloat64(){let e=this.view.getFloat64(this.pos);return this.pos+=8,e}};function ee(e,t){switch(t){case Ue:return e.readUint8();case Re:return e.readUint16();case Ne:return e.readUint24();case Fe:return e.readUint32();case _e:return e.readUintVar();case Ve:return e.readInt8();case qe:return e.readInt16();case ze:return e.readInt24();case $e:return e.readInt32();case He:return e.readIntVar();case Me:return e.readFloat32();case Be:return e.readFloat64()}}function dr(e){let t=e.readUint8();switch(t&15){case Ye:case X:case Ge:case Ke:t|=e.readUint8()<<8;break}return t}function T(e,t=e.readVlq()){let r=dr(e);return te(e,r,t)}function te(e,t,r,s=new Array(r)){let n=t&15,a=t&48,i=r,l=0,c=0;switch(a){case Ie:{l=s[0]=e.readIntVar(),i--,c=1;break}case Oe:{l=e.readIntVar();break}}switch(n){case sr:{for(let o=0;o<i;o++)s[c+o]=e.readVlq();break}case nr:{for(let o=0;o<i;o++)s[c+o]=e.readIntVar();break}case ar:{let o=e.readBytes(Math.ceil(i/2));for(let d=0,u=0;d<i;d++)u=d&1?u>>4:o[d>>1],s[c+d]=u&8?e.readVlq()*8+(u&7):u&7;break}case ir:{let o=e.readBytes(Math.ceil(i/2));for(let d=0,u=0;d<i;d++){u=d&1?u>>4:o[d>>1];let f=u&4?-1:1;s[c+d]=u&8?f*(e.readVlq()*4+(u&3)):f*(u&3)}break}case Ge:{let o=t>>8,d=(1<<o)-1,u=e.readBytes(Math.ceil(i*o/8)),f=0,p=0,h=0;for(let m=0;m<i;m++){for(;p<o;)h|=u[f]<<p,p+=8,f++;s[c+m]=h&d,h>>=o,p-=o}break}case Ke:{let o=t>>8,d=(1<<o)-1,u=e.readBytes(Math.ceil(i*o/8)),f=0,p=0,h=0;for(let m=0;m<i;m++){for(;p<o;)h|=u[f]<<p,p+=8,f++;s[c+m]=h&1?-((h&d)>>1):(h&d)>>1,h>>=o,p-=o}break}case or:{let o=s[0]=e.readIntVar(),d=e.readIntVar();for(let u=1;u<r;u++)o=s[u]=o+d;break}case Ye:case X:{let o=n===X,d=t>>8,u=o?t&Je|d&We:d;if(Qe[d]>1){let f=e.readTypeIndex(i,u);for(let p=0;p<i;p++)s[c+p]=ee(e,f[p])}else{let f=31-Math.clz32(u);for(let p=0;p<i;p++)s[c+p]=ee(e,f)}break}default:throw new Error(`Unknown numeric array encoding method: ${n}`)}switch(a){case Ie:{s[0]=l;for(let o=1;o<r;o++)s[o]+=s[o-1];break}case Oe:{for(let o=0;o<r;o++)s[o]+=l;break}}return s}var ur=new TextDecoder("utf8",{ignoreBOM:!0});function fr(e){if(e.readBytes(8).some((s,n)=>s!==Qt[n]))throw new Error("Bad magic number");let t=e.readUint16();if(t!==Ce)throw new Error(`Unsupported jsonxl version "${t}", expected "${Ce}"`);let r=e.readUint16();return{version:t,flags:r}}function hr(e){let t=ur.decode(e.readBytes(e.readVlq())),r=T(e),s=T(e),n=T(e),a=T(e),i=new Array(r),l=0;for(let c=0,o=0,d=0,u=0,f="";c<r.length;c++){let p=r[c],h=t.slice(o,o+=p>>2);p&2&&(h=f.slice(0,s[d++])+h),p&1&&(h=h+f.slice(-n[u++])),i[c]=h,f=h}return{readStrings(c,o){return a.slice(c,o).map(d=>i[d])},readString(){return i[a[l++]]}}}function pr(e){let t=T(e),r=0;return function(){return t[r++]}}function mr(e){let t=T(e),r=T(e),s=0;return function(){return t[r[s++]]}}function yr(e,t){let r=e.readVlq(),s=e.readVlq();if(r===0)return()=>null;let n=s?t(-s):[],a=new Array(r);for(let i=0;i<r;i++)a[i]={dict:T(e),refs:T(e),index:0};return function(i){let l=a[i],c=l.refs[l.index++],o=l.dict[c];return o===0?null:{key:n[o>>8],type:o&255}}}function Pe(e,t){let r=0;for(let s=0;s<e.length;s++)e[s]===t&&r++;return r}function Xe(e){function t(f={}){let p=0,h;for(;h=d(p++);)f[h.key]=n(h.type);return f}function r(f=c()){if(f===0)return[];let p=o(),h=p>>16,m=p&65535,y=h&1,g=h>>5&1,w=h>>9&1,v=h>>1&255|(h&1)<<4,x=new Array(f),A=Qe[v]>1?a.readTypeIndex(f,v,!0):null;if(v&De)if(A===null)x.fill(s(v));else for(let b=0;b<f;b++)A[b]&De&&(x[b]=s(A[b]));if(v&_)for(let b=0;b<f;b++)(A===null||A[b]===_)&&(x[b]=l());if(v&P)if(v===P)te(a,m,f,x);else{let b=Pe(A,P),S=te(a,m,b);for(let k=0,E=0;k<f;k++)A[k]===P&&(x[k]=S[E++])}if(v&O)if(w){let b=v===O?f:Pe(A,O),S=T(a,b),k=r();for(let E=0,W=0,U=0;E<f;E++)(A===null||A[E]===O)&&(x[E]=k.slice(U,U+=S[W++]))}else for(let b=0;b<f;b++)(A===null||A[b]===O)&&(x[b]=r());if(v&L){let b=v===L?x:[];for(let S=0,k=0;S<f;S++)(A===null||A[S]===L)&&(x[S]=b[k++]={});if(g){let S=a.readVlq(),k=new Array(S);for(let E=0;E<S;E++)k[E]=l();for(let E=0;E<S;E++){let W=k[E],U=r(b.length);for(let R=0;R<b.length;R++)U[R]!==void 0&&(b[R][W]=U[R])}}if(y)for(let S=0;S<b.length;S++)t(b[S])}return x}function s(f){switch(f){default:return;case V:return null;case _:return l();case q:return!0;case z:return!1}}function n(f){switch(Ze[f&7]){case Le:return;case V:return null;case _:return l();case P:return ee(a,f>>3);case L:return t();case q:return!0;case z:return!1;case O:return r()}}let a=new cr(e);fr(a);let{readStrings:i,readString:l}=hr(a),c=pr(a),o=mr(a),d=yr(a,i),u=n(a.readUint8());if(a.pos!==e.byteLength)throw new Error("End of input not reached");return u}var gr=[0,0,74,83,79,78,88,76];function br(e){return gr.every((t,r)=>t===e[r])}var re=Object.freeze({name:"jsonxl/snapshot9",test:br,streaming:!1,decode:Xe});var se={stream:Or,event:Dr,file:et,url:Pr,push:Lr};function Sr(e){try{return new URL(e,location.origin).origin===location.origin}catch{return!1}}function wr(e){return e.ok}function vr(e){return e.headers.get("x-file-encoded-size")||e.headers.get("content-length")}function Er(e){return e.headers.get("x-file-size")||(Sr(e.url)&&!e.headers.get("content-encoding")?e.headers.get("content-length"):void 0)}function xr(e){return e.headers.get("x-file-created-at")||e.headers.get("last-modified")}function kr(e){let t=e?Object.keys(e):[],r=["name","createdAt","elapsedTime","data"];return!(t.length!==4||t.some(s=>!r.includes(s)))}function Tr(e,t,r,{encoding:s,size:n}){if(kr(e)){let{data:m,...y}=e;e=m,t={...t,createdAt:m.createdAt},r=y}let a=e,i=r||{},{type:l,name:c,encoding:o,size:d,encodedSize:u,createdAt:f,...p}=t;return{resource:{type:l||"unknown",name:c||"unknown",encoding:s,size:n,...u?{encodedSize:u}:null,createdAt:new Date(Date.parse(f)||Date.now()),...p},meta:i,data:a}}async function jr(e){let t=[],r=0;for await(let a of e)t.push(a),r+=a.byteLength;let s=new Uint8Array(r),n=0;for(let a of t)s.set(a,n),n+=a.length;return s}function Cr(e,t,r,s){let a=e.getReader(),i=Date.now(),l=[...be(t),re,Z],c="unknown",o=0,d=async function*(u){for(;;){let{value:f,done:p}=u||await a.read();if(u=void 0,p){await s({done:!0,elapsed:Date.now()-i,units:"bytes",completed:o,total:r});break}for(let h=0;h<f.length;h+=1048576){let m=h===0&&f.length-h<1048576?f:f.slice(h,h+1048576);o+=m.length,yield m,await s({done:!1,elapsed:Date.now()-i,units:"bytes",completed:o,total:r})}}};return a.read().then(u=>{for(let{name:f,test:p,streaming:h,decode:m}of l)if(p(u.value,u.done))return c=f,h?m(d(u)):jr(d(u)).then(m);throw new Error("No matched encoding found for the payload")}).finally(()=>a.releaseLock()).then(u=>({data:u,encoding:c,size:o}))}async function Ir(e,t){let r=async(s,n)=>(await t.asyncSet({stage:s}),await n());try{let s=new Date,{method:n,stream:a,resource:i,options:l,data:c}=await r("request",e),o=new Date,d=i?.size,{validateData:u,encodings:f}=l||{},{data:p,encoding:h,size:m}=c?{data:c}:await r("receive",()=>Cr(a,f,Number(d)||0,b=>t.asyncSet({stage:"receive",progress:b}))),y=new Date;typeof u=="function"&&u(v);let g=new Date;await t.asyncSet({stage:"received"});let w=new Date,{data:v,resource:x,meta:A}=Tr(p,i,null,{size:m,encoding:h});return{loadMethod:n,resource:x,meta:A,data:v,timing:{time:w-s,start:s,end:w,requestTime:o-s,requestStart:s,requestEnd:o,responseTime:y-o,responseStart:o,responseEnd:y,validateTime:g-y,validationStart:y,validationEnd:g}}}catch(s){throw console.error("[Discovery] Error loading data:",s),await t.asyncSet({stage:"error",error:s}),s}}function $(e,t){let r=new I;return{state:r,result:Ir(e,r),...t}}function Or(e,t){return $(()=>({method:"stream",stream:e,resource:t?.resource,options:t}))}function et(e,t){let r=rt(e);return $(()=>({method:"file",stream:ye(e),resource:t?.resource||r,options:t}),{title:"Load data from file: "+(r.name||"unknown")})}function Dr(e,t){let r=e.dataTransfer||e.target,s=r&&r.files&&r.files[0];if(e.stopPropagation(),e.preventDefault(),!s)throw new Error("Can't extract a file from an event object");return et(s,t)}function Pr(e,t){return t=t||{},$(async()=>{let r=await fetch(e,t.fetch),s=rt(r,t);if(s)return{method:"fetch",stream:r.body,resource:t.resource||s,options:t};let n=r.headers.get("content-type")||"",a=await r.text();if(n.toLowerCase().startsWith("application/json"))try{let i=JSON.parse(a);a=i.error||i}catch{}throw a=new Error(a),a.stack=null,a},{title:`Load data from url: ${e}`})}function Lr(e){let t,r=new ReadableStream({start(i){t=i},cancel(){t=null}}),s,n,a=new Promise(i=>{s=l=>i({method:"push",stream:r,resource:(n=l)||e.resource,options:e})||(s=()=>{})});return e=e||{},$(()=>a,{start(i){s(i)},push(i){s(),t.enqueue(i)},finish(i){t.close(),t=null,isFinite(i)&&n&&(n.encodedSize=Number(i))}})}function tt({result:e,state:t},r){return new Promise((s,n)=>t.subscribeSync(({stage:a,progress:i,error:l},c)=>{if(l){c(),n(l);return}return a==="received"&&(c(),s(e)),r.setState({stage:a,progress:i})}))}function rt(e,t){if(e instanceof Response){let r=t?.isResponseOk||wr,s=t?.getContentSize||Er,n=t?.getContentEncodedSize||vr,a=t?.getContentSize||xr;if(r(e))return{type:"url",name:e.url,size:Number(s(e))||null,encodedSize:Number(n(e)),createdAt:a(e)}}if(e instanceof File)return{type:"file",name:e.name,size:e.size,createdAt:e.lastModified};if(e instanceof Blob)return{size:e.size};if(ArrayBuffer.isView(e))return{size:e.byteLength};if(typeof e=="string")return{size:e.length}}var M=class{constructor(){this.listeners=Object.create(null)}on(t,r){return this.listeners[t]={callback:r,next:this.listeners[t]||null},this}once(t,r){return this.on(t,function s(...n){r.apply(this,n),this.off(t,s)})}off(t,r){let s=this.listeners[t]||null,n=null;for(;s!==null;){if(s.callback===r){s.callback=null,n?n.next=s.next:this.listeners[t]=s.next;break}n=s,s=s.next}return this}emit(t,...r){let s=this.listeners[t]||null,n=!1;for(;s!==null;)typeof s.callback=="function"&&s.callback.apply(this,r),n=!0,s=s.next;return n}};function Ur(e){let t="__storage_test__"+Math.random(),r;try{r=window[e]}catch{return null}try{r.setItem(t,t),r.removeItem(t)}catch(s){if(!(s instanceof DOMException&&(s.code===22||s.code===1014||s.name==="QuotaExceededError"||s.name==="NS_ERROR_DOM_QUOTA_REACHED")&&r.length!==0))return null}return r}function st(e){let t=new Map;return t.storage=Ur(e),t.getOrCreate=r=>t.get(r)||Rr(r,t),t.getOrCreate.available=t.storage!==null,t}var ne=new Map([["session",st("sessionStorage")],["local",st("localStorage")]]),Is=ne.get("session").getOrCreate,nt=ne.get("local").getOrCreate;addEventListener("storage",e=>{for(let[,t]of ne)t.storage===e.storageArea&&t.has(e.key)&&t.get(e.key).forceSync()});function Rr(e,t){let r=null,s=new M,n=(i=t.storage.getItem(e))=>{r!==i&&s.emit("change",r=i)},a={get value(){return this.get()},get(){return r},set(i){t.storage&&(t.storage.setItem(e,i),n())},delete(){t.storage&&(t.storage.removeItem(e),n())},forceSync(){return t.storage&&n(),this.get()},on(i,l){return s.on("change",i),l&&i(r),()=>s.off("change",i)},off(i){s.off("change",i)}};return t.set(e,a),a.forceSync(),a}var it=new Set([!0,!1,"auto","disabled","only"]),ot=new Set,lt=matchMedia("(prefers-color-scheme:dark)"),ct=nt("discoveryjs:darkmode"),at=new Map([["true",!0],["false",!1],["auto","auto"]]),H=null;function Nr(){for(let e of ot)e.mode==="auto"&&e.set("auto")}function dt(e){let t=at.has(e)?at.get(e):null;if(H!==t){H=t;for(let r of ot)r.persistent&&r.mode!=="disabled"&&r.mode!=="only"&&r.set(t!==null?t:"auto")}}dt(ct.value);ct.on(dt);lt.addListener(Nr);function Fr(e,t){return(e==="off"||e==="disable"||!it.has(e))&&(e="disabled"),e!=="disabled"&&e!=="only"&&t&&H!==null&&(e=H),e}function _r(e){switch(it.has(e)||(e="disabled"),e){case"only":return!0;case"auto":return lt.matches;default:return e===!0}}function ut(e,t){return _r(Fr(e,t))}var Mr={"font-family":"Tahoma, Verdana, Arial, sans-serif","font-size":"16px","line-height":"1.6","-webkit-text-size-adjust":"none","text-size-adjust":"none","background-color":"var(--discovery-background-color, white)",color:"var(--discovery-color, black)","transition-property":"background-color, color","transition-duration":".25s","transition-timing-function":"ease-in"},Br={"--discovery-background-color":"#242424","--discovery-color":"#cccccc"},ft=new WeakSet,ae=new WeakMap;function ht(e,t,r){t in r||(r[t]=[e.style.getPropertyValue(t),e.style.getPropertyPriority(t)])}function pt(e,t){t=t||{},ae.has(e)||ae.set(e,Object.create(null));let r=ut(t.darkmode,t.darkmodePersistent),s=ae.get(e);for(let[n,a]of Object.entries(Mr))(ft.has(e)||!/^transition/.test(n))&&(ht(e,n,s),e.style.setProperty(n,a));for(let[n,a]of Object.entries(Br))ht(e,n,s),r?e.style.setProperty(n,a):e.style.removeProperty(n);return ft.add(e),r}function ie(e,t){let r=C("style",null,":host{display:none}"),s=new Set,n=Promise.resolve();return Array.isArray(t)&&(e.append(...t.map(a=>{switch(typeof a=="string"&&(a={type:"style",content:a}),a.type){case"style":case"inline":return C("style",{media:a.media},a.content);case"link":case"external":{let i,l,c=new Promise((d,u)=>{i=d,l=u});return s.add(c),C("link",{rel:"stylesheet",href:a.href,media:a.media,onerror(d){s.delete(c),l(d),s.size||r.remove()},onload(){s.delete(c),i(),s.size||r.remove()}})}default:throw new Error(`Unknown type "${a.type}" for a style descriptor`)}})),s.size&&(n=Promise.all(s),e.append(r))),n}function mt(){return[parseInt(performance.timeOrigin,10).toString(16),parseInt(1e4*performance.now(),10).toString(16),String(Math.random().toString(16).slice(2))].join("-")}function Vr(e,t){return new N({delay:300,domReady:e,title:t,onTiming:({title:r,duration:s})=>console.log(`[Discovery/preloader] ${r} \u2013 ${s}ms`)})}function yt(e){e=e||{};let t=e.dataSource;if(t&&!se.hasOwnProperty(t))throw new Error(`dataSource "${t}" is not supported`);let r=e.container||document.body,s=document.createElement("div"),n=s.attachShadow({mode:"open"});pt(r,e)&&s.setAttribute("darkmode","");let i=se[t||"url"],l=e.data?t==="push"?i(e.loadDataOptions):i(e.data,e.loadDataOptions):{result:Promise.resolve()};l.push&&(window.discoveryLoader={start:l.start,push:l.push,finish(...u){delete window.discoveryLoader,l.finish(...u)}});let c=ie(n,e.styles),o=e.progressbar||Vr(c,l.title),d=e.embed?qr(l):()=>{};return l.state&&tt(l,o).catch(()=>{}),n.append(o.el),r.append(s),Object.assign(l.result,{el:s,shadowRoot:n,progressbar:o,disposeEmbed:d})}function qr(e){let t=mt(),r=window.parent,s=[],n=(c,o=null)=>{r.postMessage({from:"discoveryjs-app",id:t,type:c,payload:o},"*")},a=()=>n("destroy"),i=c=>{let{id:o,type:d}=c.data||{};if(o===t)switch(d){case"defineAction":case"setPageHash":case"setRouterPreventLocationUpdate":{s.push(c.data);break}default:console.error(`[Discovery/preloader] Unknown preload message type "${d}"`)}};if(r===window)return;addEventListener("message",i,!1),addEventListener("unload",a,!1),n("preinit",{page:{hash:location.hash||"#"}});let l=e.state?e.state.subscribeSync(({stage:c,progress:o,error:d})=>((d||c==="received")&&l(),n("loadingState",{stage:c,progress:o,error:d}))):()=>{};return()=>(removeEventListener("message",i,!1),removeEventListener("unload",a,!1),l(),a(),{hostId:t,postponeMessages:s})}var gt="AGFzbQEAAAABEANgAABgAX8Bf2ADf39/AX8CEwEHaW1wb3J0cwZtZW1vcnkCAAADBgUAAQICAQYMAn8AQbMKC38BQQALBygDC2lucHV0T2Zmc2V0AwAMb3V0cHV0T2Zmc2V0AwEHaW5mbGF0ZQAECAEACuoIBQwAPwBBAXZBEHQkAQvEAQEEfyMAIgEiAiAAaiEEAkADQCAARSAEQQFrLQAAQT1Hcg0BIARBAWshBCAAQQFrIQAMAAsLA0AgAS0AAC0AswhBEnQgAUEBai0AAC0AswhBDHRyIAFBAmotAAAtALMIQQZ0ciABQQNqLQAALQCzCHIhAyACIANBEHY6AAAgAkEBaiADQQh2OgAAIAJBAmogAzoAACABQQRqIQEgAkEDaiECIAEgBEkNAAsCfyAAQQJ2QQNsCwJ/IABBA3FBBmxBA3YLagsrACACIAAgAk8NAANAIAAgAS0AADoAACABQQFqIQEgAEEBaiIAIAJJDQALCxAAIAEgACACIAFr/AsAIAIL1wYBGn8gABABIRMjACEBIwEhAiABQQMiBnQhBQN/An8CQAJ/AkACQAJAAkACfwJAAn8CQAJAAkACQAJAAkACQAJAIAVBA3YoAgAgBUEHcXZBASAGdEEBa3EhByAFIAZqIQUgAw4IAAQJBQcFDgUOCyAHQQFxIQQgB0EBdg4CAAECCyACIAVBB2pBA3YiAUEEaiIJIAIgAS8BACIaahACIQIgCSAaakEDdCEFDA4LQRVBCEEHQQlBCEEAQZABEANBgAIQA0GYAhADQaACIgsQA0HAAhADIQ5BBQwHC0EODA0LIAdBBXZBH3EgB0EfcUGBAmoiC2pBAWohDCAHQQp2QQRqIQ1BACIKQQBBFiIOEANBAwwMCyAIQQF0IAdyIBJBAWoiEi0AgANrIghBAE4NDCASQQF0LwHAAiAIQQF0ai8BoAMhCCADQQNrQQF2DgIABQYLIAhBEEkEQCAIIAogC09BBHRqIREgCkEBagwCCyAIQRBGIBFsIREgCiAIQRVGQQN0aiEPIAhBDmsMCgtBASEGQQMhAyAHIA9qQQNqCyEPIBEgCiAPEAMhCkEAIAogDEkNBiAMIQ5BBQwBCyAKLQCgCCAHOgAAIApBAWoiCiANSQ0IQQMLIQNBAEHAAkGgAxADIA4hCgNAIApBAWsiCi0AACIQIBAtAIADQQFqOgCAAyAKDQALA0AgCiAKLwHAAiAKQQF2LQCAA0EBdGo7AcICIApBAmoiCkE+SQ0AC0EAIQoDQCAKLQAAQQF0IhAvAcACIhEgCjsBoAMgECARQQJqOwHAAiAKQQFqIgogDkkNAAtBACIKDAQLIAhBgAJJBEAgAiAIOgAAIAJBAWohAkEADAQLIAhBgAJGDQRBAyEVQRwhFkECIRcgCEGBAmshCAwBC0EBIhchFUEfIRYgCCALayEICyAVIBVBAWogCCAVcWogCCAXdkEBa0EAIAggFUsiGCAIIBZJIhlxGyIGdEH/ASAZGyAIIBgbaiEUIAYgBg0DGkEAIQcLIBQgB2ohFCADQQdJBH8gFCEaQQchA0EQBSACIAIgFGsgAiAaahACIQJBBSEDQQALCyESQQEhBkEAIQgMAgsgAiMBayAEDQJBAyEGQQAhAwwBCyEGIANBAWohAwwACwsLcAIAQaAICxMQERUACAcJBgoFCwQMAw0CDgEPAEHeCAtQPgAAAD80NTY3ODk6Ozw9AAAAAAAAAAABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZAAAAAAAAGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM=";var bt="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",B=new Uint8Array(256),$r=new TextEncoder,oe=null;for(let e=0;e<bt.length;e++)B[bt.charCodeAt(e)]=e;function le(e){let t=e.length;for(;t>0&&e[t-1]==="=";)t--;let r=new Uint8Array(3*Math.ceil(t/4)),s,n,a,i;for(let l=0,c=0;l<t;)s=B[e.charCodeAt(l++)&255],n=B[e.charCodeAt(l++)&255],a=B[e.charCodeAt(l++)&255],i=B[e.charCodeAt(l++)&255],r[c++]=s<<2|n>>4,r[c++]=n<<4|a>>2,r[c++]=a<<6|i;return r.subarray(0,(t>>2)*3+(t%4*6>>3))}function Hr(e,t={}){let r=le(e),s={imports:t},n=new WebAssembly.Module(r);return new WebAssembly.Instance(n,s)}function Wr(){let e=new WebAssembly.Memory({initial:32}),t=Hr(gt,{memory:e}),{inputOffset:r,outputOffset:s,inflate:n}=t.exports,a=new Uint8Array(e.buffer,r,s),i=new Uint8Array(e.buffer,s);return function(l){let c=n($r.encodeInto(l,a).written);return i.subarray(0,c)}}function ce(e){return oe===null&&(oe=Wr()),oe(e)}var fe=e=>({type:"link",href:e});function At(e,t,r,s){let n=document.body,a=String(Math.random()).slice(2,18).padStart(16,"0"),i=yt({...s,loadDataOptions:{...s.loadDataOptions,fetch:{headers:{"Cache-Control":"no-cache, no-transform","x-data-request-id":a}}},container:n});return Jr(),s.dataSource==="url"&&s.data&&Yr(i,a),Promise.all([e,i]).then(([l,c])=>l({...r,styles:t},i.progressbar,i.disposeEmbed?.(),c)).then(()=>{i.el.remove()},l=>{let c=document.querySelector("body > .discovery"),o=document.createElement("div");if(o.firstChild&&(o.className="action-buttons",i.progressbar.el.before(o)),!l.supressLoadDataError){let d=document.createElement("pre");d.className="error",d.append(document.createTextNode("[ERROR] "+l+(l.stack?`

`+l.stack:""))),i.progressbar.el.replaceWith(d)}i.disposeEmbed?.(),i.progressbar.dispose(),c&&c.remove()})}function Jr(){let e=new TextDecoder,{push:t}=window.discoveryLoader||{};typeof t=="function"&&(window.discoveryLoader.push=function(r,s,n){n?r=s?ce(r).slice():e.decode(ce(r)):s&&(r=le(r)),t(r)})}function Yr(e,t){let r=!1,s=!0,n=document.createElement("div"),a=setTimeout(()=>{if(e.progressbar.lastStage!=="request")return;let i=e.progressbar.onTiming,l=new EventSource("data-status?data-request-id="+t),c,o,d,u,f,p,h=m=>{if(!(!s||!isFinite(m)||d!==void 0&&m<=d)){if(clearTimeout(u),d=Number(m),o&&d-o>=1e3&&(n.querySelector(":scope > .header > .elapsed-time").textContent=ue(d-o,r?1:0)),c)for(let{started:y,elapsedTimeEl:g}of c.values())y&&(g.textContent=ue(d-y,1));f=Date.now(),u=setTimeout(()=>h(d+(Date.now()-f)-5),42)}};l.addEventListener("open",()=>{n.classList.remove("init")},{once:!0}),l.addEventListener("message",m=>{try{let y=JSON.parse(m.data);switch(y.type){case"start":o=y.timestamp;break;case"finish":break;case"crash":if(r=!0,c)for(let{started:g,el:w}of c.values())g&&(w.classList.add("crashed"),w.classList.remove("started"),w.classList.toggle("collapsed",w!==p));break;case"stderr":case"stdout":{let g=document.createElement("div");if(g.className=y.type,g.append(document.createTextNode(y.chunk)),!c)n.lastChild.append(g),de(g);else{let w=c.get(y.stepId);w&&(w.contentEl.append(g),w.el.classList.add("has-output"),de(g),y.type=="stderr"&&(p=w.el))}break}case"plan":{let g=St(y.plan.steps);c=g.map,n.lastChild.innerHTML="",n.lastChild.appendChild(g.el);break}case"plan-step-event":{let g=c.get(y.stepId);if(g)switch(y.stepEvent){case"start":g.started=y.timestamp,g.el.classList.add("started"),de(g.el);break;case"finish":g.elapsedTimeEl.textContent=ue(y.timestamp-g.started),g.started=!1,g.el.classList.remove("started"),g.el.classList.add("finished");break;case"summary":g.summaryEl.innerHTML=Kr(y.data);break;default:console.warn("Unhandled data status SSE pipeline step event",y)}else console.warn("Pipeline step not found",y);break}default:console.warn("Unhandled data status SSE event",y)}h(y.timestamp)}catch(y){console.error("SSE message parse error",y)}}),l.addEventListener("server-time",({data:m})=>{h(m)}),l.addEventListener("done",()=>{l.close(),s=!1}),e.progressbar.onTiming=m=>{i(m),m.lastStage!=="request"&&(n.classList.add("finished"),l.close(),s=!1)}},150);n.className="data-status init",n.innerHTML='<div class="header">Getting data: <span class="elapsed-time"></span></div><div class="output"></div>',n.firstChild.addEventListener("click",function(){n.classList.toggle("collapsed")},!0),e.progressbar.el.append(n),e.then(()=>clearTimeout(a),i=>{if(s=!1,!n.classList.contains("init")){e.progressbar.el.after(n),n.classList.add("crashed"),n.firstChild.firstChild.textContent="Getting data failed in ",r?(i.supressLoadDataError=!0,e.el.classList.add("generate-data-crash")):n.classList.add("compliment-error","collapsed");for(let l of n.querySelectorAll(".plan-step.started"))l.classList.remove("started")}})}function de(e){try{typeof e.scrollIntoViewIfNeeded=="function"?e.scrollIntoViewIfNeeded(!1):e.scrollIntoView({block:"nearest"})}catch{}}function St(e,t=0,r=new Map){let s=document.createElement("ul");s.className="plan-step-list",s.style.setProperty("--level",t);for(let n of e){let a=s.appendChild(document.createElement("li")),i=a.appendChild(document.createElement("div")),l=i.appendChild(document.createElement("span")),c=i.appendChild(document.createElement("span")),o=i.appendChild(document.createElement("span")),d=i.appendChild(document.createElement("span")),u=i.appendChild(document.createElement("span")),f=a.appendChild(document.createElement("div"));r.set(n.id,{step:n,el:a,elapsedTimeEl:u,summaryEl:d,contentEl:f,started:!1}),a.className="plan-step collapsed",i.className="plan-step__header",i.addEventListener("click",()=>a.classList.toggle("collapsed")),l.className="plan-step__header-toggle",c.className="plan-step__header-status",o.className="plan-step__header-content",o.textContent=n.name||"Untitled",d.className="plan-step__header-summary",u.className="plan-step__elapsed-time",f.className="plan-step__content",n.steps&&a.append(St(n.steps,t+1,r).el)}return{el:s,map:r}}function Gr(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Kr(e,t=!0){let r=t&&typeof e!="number"?Gr(String(e)):String(e);return r.length>3?r.replace(/\.\d+(eE[-+]?\d+)?|\B(?=(\d{3})+(\D|$))/g,s=>s||'<span class="num-delim"></span>'):r}function ue(e,t=1){return e<1e3?e+"ms":e<1e4?(e/1e3).toFixed(t)+"s":e<6e4?Math.round(e/1e3)+"s":`${Math.floor(e/6e4)}:${String(Math.floor(e/1e3)%60).padStart(2,"0")}`}At(import("./model.js").then(e=>e.default),[fe(j.assets["model.css"])],j,{styles:[fe(j.assets["model-loader.css"])],embed:j.model.embed,darkmode:j.model.darkmode,darkmodePersistent:j.model.darkmodePersistent,dataSource:"url",data:j.model.data});
