var j=new Uint8Array([0,0,74,83,79,78,88,76]),L=9;var H=268435455;var F=4294967295;var b=2,y=4,w=8,R=16,m=32,U=64,E=128,K=0,Q=1,q=2,W=3,z=4,J=5,$=6;var Z=8,tt=9,et=10,rt=11,st=12;var nt=224,ot=7936,P=0,g=1,it=2,ct=3,at=4,ft=5,V=6,B=7,_t=8;var S=16,k=32,At=~R,Nt=b|m|U,M=new Uint8Array(256).map((n,t)=>{for(let e=0;e<8;e++)n+=t>>e&1;return n});function ut(n,t,e,s=new Array(e)){let d=t&15,N=t&48,_=e,a=0,l=0;switch(N){case S:{a=s[0]=n.readIntVar(),_--,l=1;break}case k:{a=n.readIntVar();break}}switch(d){case it:{for(let r=0;r<_;r++)s[l+r]=n.readVlq();break}case ct:{for(let r=0;r<_;r++)s[l+r]=n.readIntVar();break}case at:{let r=n.readBytes(Math.ceil(_/2));for(let i=0,c=0;i<_;i++)c=i&1?c>>4:r[i>>1],s[l+i]=c&8?n.readVlq()*8+(c&7):c&7;break}case ft:{let r=n.readBytes(Math.ceil(_/2));for(let i=0,c=0;i<_;i++){c=i&1?c>>4:r[i>>1];let I=c&4?-1:1;s[l+i]=c&8?I*(n.readVlq()*4+(c&3)):I*(c&3)}break}case V:{let r=t>>8,i=(1<<r)-1,c=n.readBytes(Math.ceil(_*r/8)),I=0,h=0,o=0;for(let u=0;u<_;u++){for(;h<r;)o|=c[I++]<<h,h+=8;s[l+u]=o&i,o>>=r,h-=r}break}case B:{let r=t>>8,i=(1<<r)-1,c=n.readBytes(Math.ceil(_*r/8)),I=0,h=0,o=0;for(let u=0;u<_;u++){for(;h<r;)o|=c[I++]<<h,h+=8;s[l+u]=o&1?-((o&i)>>1):(o&i)>>1,o>>=r,h-=r}break}case _t:{let r=s[0]=n.readIntVar(),i=n.readIntVar();for(let c=1;c<e;c++)s[c]=r+=i;break}case P:case g:{let r=d===g,i=t>>8,c=r?t&ot|i&nt:i;if(M[i]>1){let h=n.readTypeIndex(_,c);for(let o=0;o<_;o++)s[l+o]=n.readNumber(h[o])}else{let h=31-Math.clz32(c);for(let o=0;o<_;o++)s[l+o]=n.readNumber(h)}break}default:throw new Error(`Unknown numeric array encoding method: ${d}`)}switch(N){case S:{s[0]=a;for(let r=1;r<e;r++)s[r]+=s[r-1];break}case k:{for(let r=0;r<e;r++)s[r]+=a;break}}return s}var C=12;function lt(n){return n===L||n===9}function It(n){try{let{version:t}=v(n);if(lt(t))return!0;throw new Error(`Unsupported jsonxl version "${t}", expected "${L}"`)}catch{return!1}}function v(n){if(n.byteLength<C)throw new Error(`Header length must be at least ${C} bytes`);let t=new Uint8Array(n.buffer,n.byteOffset,C);if(t.subarray(0,8).some((_,a)=>_!==j[a]))throw new Error("Bad magic number");let s=new DataView(t.buffer,t.byteOffset,C),d=s.getUint16(8,!0),N=s.getUint16(10,!0);return{version:d,flags:N,headerSize:C}}var ht=new TextDecoder("utf8",{ignoreBOM:!0});function dt(n){let t=ht.decode(n.readBytes(n.readVlq())),e=n.readNumericArray(),s=n.readNumericArray(),d=n.readNumericArray(),N=new Array(e);for(let _=0,a=0,l=0,r=0,i="";_<e.length;_++){let c=e[_],I=t.slice(a,a+=c>>2);c&2&&(I=i.slice(0,s[l++])+I),c&1&&(I=I+i.slice(-d[r++])),N[_]=I,i=I}return N}var G=class{constructor(t,e){this.view=new DataView(t.buffer,t.byteOffset,t.byteLength),this.bytes=t,this.pos=0,typeof e=="function"&&e(this),this.consumeHeader(),this.loadStrings(),this.loadArrayLengths(),this.loadArrayHeaders(),this.loadObjectEntries()}consumeHeader(){let{version:t,flags:e,headerSize:s}=v(this.view);return this.pos+=s,{version:t,flags:e}}loadStrings(){this.strings=dt(this),this.stringRefs=this.readNumericArray(),this.stringRefsCursor=0}loadArrayHeaders(){this.arrayHeaders=this.readNumericArray(),this.arrayHeaderRefs=this.readNumericArray(),this.arrayHeaderRefsCursor=0}loadArrayLengths(){this.arrayLengths=this.readNumericArray(),this.arrayLengthsCursor=0}loadObjectEntries(){let t=this.readVlq(),e=this.readVlq();this.objectEntries=new Array(t),this.objectKeys=e?this.stringRefs.slice(-e).map(s=>this.strings[s]):[];for(let s=0;s<t;s++)this.objectEntries[s]={dict:this.readNumericArray(),refs:this.readNumericArray(),cursor:0}}readString(){return this.strings[this.stringRefs[this.stringRefsCursor++]]}readArrayHeader(){return this.arrayHeaders[this.arrayHeaderRefs[this.arrayHeaderRefsCursor++]]}readArrayLength(){return this.arrayLengths[this.arrayLengthsCursor++]}readObjectEntry(t){let e=this.objectEntries[t],s=e.refs[e.cursor++],d=e.dict[s];return d===0?null:{key:this.objectKeys[d>>8],type:d&255}}readBytes(t){return this.bytes.subarray(this.pos,this.pos+=t)}readTypeIndex(t,e,s){let d=0,N=0,_=0;for(;e>0;)e&1&&(d|=_<<(N++<<2)),_++,e>>=1;let a=new Uint8Array(t),l=32-Math.clz32(N-1),r=(1<<l)-1,i=this.readBytes(Math.ceil(l*t/8)),c=0,I=0,h=0;for(let o=0;o<t;o++){h<l&&(I|=i[c++]<<h,h+=8);let u=d>>((I&r)<<2)&15;a[o]=s?1<<u:u,I>>=l,h-=l}return a}readVlq(){let t=this.view.getUint8(this.pos);if(!(t&1))t=t>>1,this.pos+=1;else if(!(t&2))t=this.view.getUint8(this.pos+1)<<6|t>>2,this.pos+=2;else if(!(t&4))t=this.view.getUint16(this.pos+1,!0)<<5|t>>3,this.pos+=3;else{let e=this.view.getUint32(this.pos,!0);t=e>>>3&H,this.pos+=4,e>>>31&&(t+=this.readUintVar()*(1<<28))}return t}readUintVar(){let t=this.view.getUint8(this.pos++),e=t&127,s=128;for(;t&128;)t=this.view.getUint8(this.pos++),e+=(t&127)*s,s*=128;return e}readIntVar(){let t=this.readUintVar();return t&1?-(t-1)/2:t<=F?t>>>1:t/2}readUint8(){let t=this.view.getUint8(this.pos);return this.pos++,t}readInt8(){let t=this.view.getInt8(this.pos);return this.pos++,t}readUint16(){let t=this.view.getUint16(this.pos,!0);return this.pos+=2,t}readInt16(){let t=this.view.getInt16(this.pos,!0);return this.pos+=2,t}readUint24(){let t=this.view.getUint16(this.pos,!0)|this.view.getUint8(this.pos+2)<<16;return this.pos+=3,t}readInt24(){let t=this.view.getUint16(this.pos,!0),e=this.view.getUint8(this.pos+2),s=e&128?(e<<16|t)-16777216:e<<16|t;return this.pos+=3,s}readUint32(){let t=this.view.getUint32(this.pos,!0);return this.pos+=4,t}readInt32(){let t=this.view.getInt32(this.pos,!0);return this.pos+=4,t}readFloat32(){let t=this.view.getFloat32(this.pos,!0);return this.pos+=4,t}readFloat64(){let t=this.view.getFloat64(this.pos,!0);return this.pos+=8,t}readNumber(t){switch(t){case K:return this.readUint8();case Q:return this.readUint16();case q:return this.readUint24();case W:return this.readUint32();case z:return this.readUintVar();case Z:return this.readInt8();case tt:return this.readInt16();case et:return this.readInt24();case rt:return this.readInt32();case st:return this.readIntVar();case J:return this.readFloat32();case $:return this.readFloat64()}}readNumericArrayEncoding(){let t=this.readUint8();switch(t&15){case P:case g:case V:case B:t|=this.readUint8()<<8;break}return t}readNumericArray(t=this.readVlq()){if(t===0)return[];let e=this.readNumericArrayEncoding();return this.readNumbers(e,t)}readNumbers(t,e,s){return ut(this,t,e,s)}};function X(n,t){let e=0;for(let s=0;s<n.length;s++)n[s]===t&&e++;return e}function pt(n,t){function e(a={}){let l=0,r;for(;r=N.readObjectEntry(l++);)a[r.key]=d(r.type);return a}function s(a=N.readArrayLength()){if(a===0)return[];let l=N.readArrayHeader(),r=l>>16,i=l&65535,c=r&1,I=r>>5&1,h=r>>9&1,o=r>>1&255|(r&1)<<4,u=new Array(a),x=M[o]>1?N.readTypeIndex(a,o,!0):null;if(o&Nt)if(x===null)switch(o){case b:u.fill(null);break;case m:u.fill(!0);break;case U:u.fill(!1);break}else for(let f=0;f<a;f++)switch(x[f]){case b:u[f]=null;break;case m:u[f]=!0;break;case U:u[f]=!1;break}if(o&w)for(let f=0;f<a;f++)(x===null||x[f]===w)&&(u[f]=N.readString());if(o&y)if(o===y)N.readNumbers(i,a,u);else{let f=X(x,y),p=N.readNumbers(i,f);for(let T=0,A=0;T<a;T++)x[T]===y&&(u[T]=p[A++])}if(o&E)if(h){let f=o===E?a:X(x,E),p=N.readNumericArray(f),T=s();for(let A=0,D=0,O=0;A<a;A++)(x===null||x[A]===E)&&(u[A]=T.slice(O,O+=p[D++]))}else for(let f=0;f<a;f++)(x===null||x[f]===E)&&(u[f]=s());if(o&R){let f=o===R?u:[];for(let p=0,T=0;p<a;p++)(x===null||x[p]===R)&&(u[p]=f[T++]={});if(I){let p=N.readVlq(),T=new Array(p);for(let A=0;A<p;A++)T[A]=N.readString();for(let A=0;A<p;A++){let D=T[A],O=s(f.length);for(let Y=0;Y<f.length;Y++)O[Y]!==void 0&&(f[Y][D]=O[Y])}}if(c)for(let p=0;p<f.length;p++)e(f[p])}return u}function d(a){switch(1<<(a&7)){case b:return null;case w:return N.readString();case y:return N.readNumber(a>>3);case R:return e();case m:return!0;case U:return!1;case E:return s()}}let N=new G(n,t),_=d(N.readUint8());if(N.pos!==n.byteLength)throw new Error("End of input is not reached");return _}export{pt as decode,It as isHeaderAcceptable,lt as isVersionSupported,v as parseHeader};