'use strict';

const http=require('http');

const fs=require('fs');

const path=require('path');

const crypto=require('crypto');

const {spawn}=require('child_process');

const {LocalStore}=require('./lib/storage');

const {zipStore,unzipStore,walk}=require('./lib/zip');

const {makeDocx,makePdf,makeQrPng,makeQrSvg,makePptx}=require('./lib/exports');



const APP_VERSION='0.5.0';

const PORT=Number(process.env.PORT||3080);

const ROOT=__dirname;

const PUB=path.join(ROOT,'public');

const DATA=process.env.SMC_DATA_DIR?path.resolve(process.env.SMC_DATA_DIR):path.join(ROOT,'data');

const MEDIA=path.join(DATA,'media'),PRODUCED=path.join(DATA,'produced'),EXPORTS=path.join(DATA,'exports'),BACKUPS=path.join(DATA,'backups');

const SECRET_FILE=path.join(DATA,'secret.key'),AUTH_FILE=path.join(DATA,'admin_auth.json');

const BASE_URL=(process.env.BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,'');

const LICENSE_DOMAIN=(process.env.LICENSE_DOMAIN||'').toLowerCase();

const JEV_MODEL=process.env.SMC_JEV_MODEL||'~typesafe/jev-latest';

const JEV_ENABLED=process.env.SMC_JEV_DISABLED!=='1';

const JEV_ROUTE_CONFIDENCE=Math.max(0,Math.min(1,Number(process.env.SMC_JEV_ROUTE_CONFIDENCE||0.70)));

const JEV_MIN_COMPLIANCE=Math.max(0,Math.min(1,Number(process.env.SMC_JEV_MIN_COMPLIANCE||0.70)));

const JEV_MAX_UNSUPPORTED=Math.max(0,Math.min(1,Number(process.env.SMC_JEV_MAX_UNSUPPORTED||0.30)));

const MAX_BODY=30*1024*1024;

for(const d of [DATA,MEDIA,PRODUCED,EXPORTS,BACKUPS])fs.mkdirSync(d,{recursive:true});

if(!fs.existsSync(SECRET_FILE))fs.writeFileSync(SECRET_FILE,crypto.randomBytes(32).toString('hex'),{mode:0o600});

let SECRET=fs.readFileSync(SECRET_FILE,'utf8').trim();



const defaults={

 version:6,

 settings:{platformName:'Super Máquina de Conteúdo',brandName:'White Label',brandColor:'#0f172a',accent:'#b8911f',openrouterTopupUrl:'https://openrouter.ai/credits',openrouterSignupUrl:'https://openrouter.ai/',geminiSignupUrl:'https://aistudio.google.com/app/apikey',geminiLimitsUrl:'https://aistudio.google.com/app/usage',licenseDomain:LICENSE_DOMAIN,pricingCurrency:'BRL',userProfile:{name:'Administrador'},uiMode:'guided'},

 plans:{

  economico:{label:'Econômico',credits:100,features:{radar:false,campaign:false,sales:false,slides:false},limits:{posts:30,reviews:30,carousels:8,images:15,scripts:10,videos:4,avatarVideos:0,ebooks:1,pdfs:2,analyses:3,research:4,communities:1,networks:3,links:10}},

  equilibrado:{label:'Equilibrado',credits:250,features:{radar:false,campaign:true,sales:false,slides:false},limits:{posts:60,reviews:60,carousels:16,images:30,scripts:20,videos:10,avatarVideos:4,ebooks:2,pdfs:5,analyses:8,research:10,communities:3,networks:5,links:30}},

  maxima:{label:'Máxima Qualidade',credits:600,features:{radar:true,campaign:true,sales:false,slides:true},limits:{posts:90,reviews:90,carousels:24,images:50,scripts:30,videos:20,avatarVideos:10,ebooks:4,pdfs:10,analyses:15,research:20,communities:5,networks:8,links:100}},

  top:{label:'TOP Premium',credits:1000,features:{radar:true,campaign:true,sales:true,slides:true,opportunities:true},limits:{posts:150,reviews:150,carousels:50,images:100,scripts:60,videos:40,avatarVideos:20,ebooks:8,pdfs:20,analyses:30,research:40,communities:15,networks:12,links:300}}

 },

 creditWeights:{post:1,review:1,carousel:3,image:2,script:2,video:8,avatarVideo:12,analysis:4,research:5,pdf:5,ebook:12,campaign:8,slides:8,newsletter:2,multinetwork:4,promptgen:1,promptrun:2,x:2,blog:3,podcast:2,youtube:5,community:2,coach:4,cover:1,salespage:3},

 modelMatrix:{

  economico:{text:['qwen/qwen3.5-35b-a3b'],analysis:['qwen/qwen3.5-35b-a3b'],image:['qwen/qwen-image-3']},

  equilibrado:{text:['qwen/qwen3.5-35b-a3b'],analysis:['qwen/qwen3.8-max-0902','qwen/qwen3.5-35b-a3b'],image:['qwen/qwen-image-3-pro','qwen/qwen-image-3']},

  maxima:{text:['qwen/qwen3.8-max-0902','qwen/qwen3.5-35b-a3b'],analysis:['qwen/qwen3.8-max-0902','qwen/qwen3.5-35b-a3b'],image:['qwen/qwen-image-3-pro','qwen/qwen-image-3']},

  top:{text:['qwen/qwen3.8-max-0902','qwen/qwen3.5-35b-a3b'],analysis:['qwen/qwen3.8-max-0902','qwen/qwen3.5-35b-a3b'],image:['qwen/qwen-image-3-pro','qwen/qwen-image-3']}

 },

 clients:[],links:[],leads:[],usage:[],externalCosts:[],geminiUsage:[],workSessions:[],jobs:[],audit:[],contents:[],campaigns:[],events:[],opportunities:[],testimonials:[],drafts:{},reservations:[]

};

const clone=x=>JSON.parse(JSON.stringify(x));

const store=new LocalStore(DATA,defaults);

let state=store.load();

if(!state.contentSchemaVersion){const stamp=new Date().toISOString().replace(/[:.]/g,'-');store.snapshot(path.join(BACKUPS,'banco_antes_0_4_0_'+stamp+'.sqlite'));fs.writeFileSync(path.join(BACKUPS,'estado_antes_0_4_0_'+stamp+'.json'),JSON.stringify(state,null,2));}



function migrate(){

 state.version=7;

 state.settings={...clone(defaults.settings),...(state.settings||{})};

 state.settings.userProfile={...defaults.settings.userProfile,...(state.settings.userProfile||{})};

 state.plans={...clone(defaults.plans),...(state.plans||{})};

 state.creditWeights={...defaults.creditWeights,...(state.creditWeights||{})};

 state.modelMatrix={...clone(defaults.modelMatrix),...(state.modelMatrix||{})};

 for(const k of ['clients','links','leads','usage','externalCosts','geminiUsage','workSessions','jobs','audit','contents','campaigns','events','opportunities','testimonials','reservations','prompts','pages'])if(!Array.isArray(state[k]))state[k]=[];

 if(!state.drafts||typeof state.drafts!=='object'||Array.isArray(state.drafts))state.drafts={};

 state.reservations=[];

 for(const c of state.clients){

  c.name=String(c.name||'Cliente');c.context=c.context||{};c.brand=c.brand||{logo:'',colors:[]};c.products=Array.isArray(c.products)?c.products:[];c.networks=Array.isArray(c.networks)?c.networks:[];c.communities=Array.isArray(c.communities)?c.communities:[];c.media=Array.isArray(c.media)?c.media:[];

  c.ai={keyEnc:'',mgmtKeyEnc:'',alertBelowUsd:1,geminiKeyEnc:'',geminiTier:'free',geminiModel:'gemini-3.5-flash-lite',geminiFreeDailyRequestLimit:0,geminiPaidAuthorized:false,paidFallbackAuthorized:true,zeroMode:false,monthlyLimitBrl:0,...(c.ai||{})};

  c.radar={topics:[],sources:[],approvedSources:[],sourceSuggestions:[],schedule:{mode:'manual',time:'08:00',days:[]},findings:[],...(c.radar||{})};

  if(!Array.isArray(c.radar.approvedSources))c.radar.approvedSources=[];if(!Array.isArray(c.radar.sourceSuggestions))c.radar.sourceSuggestions=[];

  c.companyDna=normalizeCompanyDna(c,c.companyDna);

 }

 for(const l of state.leads){l.status=l.status||'Novo';l.nextAction=l.nextAction||'';l.nextFollowUp=l.nextFollowUp||'';l.updatedAt=l.updatedAt||l.createdAt||new Date().toISOString();}

 if(!state.workSessions.length&&state.contents.length){for(const ct of state.contents.slice(-30).reverse()){state.workSessions.push({id:id('wrk'),clientId:ct.clientId,title:String(ct.title||'Conteúdo'),type:String(ct.kind||'conteúdo'),relatedType:'content',relatedId:ct.id,summary:String(ct.goal||ct.prompt||'').slice(0,180),status:ct.status==='Arquivado'?'Arquivado':'Concluído',pinned:false,archived:ct.status==='Arquivado',createdAt:ct.createdAt||new Date().toISOString(),updatedAt:ct.updatedAt||ct.createdAt||new Date().toISOString()})}}

 save();

}

function save(){store.save(state)}

migrate();

const contentEngine=require('./lib/content-engine').createEngine({root:ROOT,data:DATA,getState:()=>state,save,json,body,send,enc,dec,port:PORT});
let machineModule=null;
function machine(){return machineModule||(machineModule=require('./lib/machine').createMachine({getState:()=>state,save,id,clientById,canUse,recordUse,recordProviderCost,generateVerified,promptEngine,workSession,createTextFiles,repairText,normalizedCredits,geminiKeyFor,audit,json,body,produced:PRODUCED,safeName}))}



function id(prefix='id'){return prefix+'_'+crypto.randomBytes(7).toString('hex')}

function safeName(s){return String(s||'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)}

function clientById(x){return state.clients.find(c=>c.id===x)}

function dnaSeed(c){

 const x=c.context||{}, proofs=(state.testimonials||[]).filter(t=>t.clientId===c.id).slice(0,20);

 const colors=Array.isArray(c.brand?.colors)?c.brand.colors.filter(Boolean):[];

 return{

  identidade:String(c.name||''),

  entrega:String(x.oferta||''),

  clienteAtual:String(x.publicoAtual||x.publico||''),

  clienteDesejado:String(x.publicoDesejado||''),

  problema:String(x.problema||''),

  propostaValor:String(x.posicionamento||''),

  produtos:(Array.isArray(c.products)?c.products:[]).join('\n'),

  diferenciais:String(x.diferenciais||''),

  valores:'',

  formaTrabalhar:'',

  tom:String(x.tom||''),

  comercial:String(x.cta||''),

  provas:proofs.map(t=>[t.name||t.author||'',t.text||t.content||''].filter(Boolean).join(': ')).filter(Boolean).join('\n\n'),

  identidadeVisual:[c.brand?.logo?'Logo cadastrado':'',colors.length?'Cores: '+colors.join(', '):''].filter(Boolean).join(' | '),

  lideranca:'',

  restricoes:String(x.restricoes||''),

  objetivosAtuais:''

 };

}

function normalizeCompanyDna(c,dna){

 const now=new Date().toISOString(), seed=dnaSeed(c), current=(dna&&typeof dna==='object')?dna:{};

 const data={...seed,...(current.data&&typeof current.data==='object'?current.data:{})};

 for(const [k,v] of Object.entries(seed))if(!String(data[k]??'').trim()&&String(v||'').trim())data[k]=v;

 return{

  version:String(current.version||'1.0'),

  status:current.status==='Aprovado'?'Aprovado':'Rascunho',

  data,

  createdAt:current.createdAt||now,

  updatedAt:current.updatedAt||now,

  approvedAt:current.approvedAt||'',

  history:Array.isArray(current.history)?current.history:[]

 };

}

function syncDnaBlanks(c){

 c.companyDna=normalizeCompanyDna(c,c.companyDna);

 const seed=dnaSeed(c);

 for(const [k,v] of Object.entries(seed))if(!String(c.companyDna.data[k]??'').trim()&&String(v||'').trim())c.companyDna.data[k]=v;

 c.companyDna.updatedAt=new Date().toISOString();

 return c.companyDna;

}

function nextDnaVersion(v){

 const m=String(v||'1.0').match(/^(\d+)\.(\d+)$/);

 return m?`${m[1]}.${Number(m[2])+1}`:'1.1';

}

function approvedDna(c){return c?.companyDna?.status==='Aprovado'?c.companyDna.data:null}

function audit(type,detail=''){state.audit.unshift({at:new Date().toISOString(),type,detail});state.audit=state.audit.slice(0,1000);save()}

function b64u(x){return Buffer.from(x).toString('base64url')}

function sign(obj){const body=b64u(JSON.stringify(obj)),sig=crypto.createHmac('sha256',SECRET).update(body).digest('base64url');return body+'.'+sig}

function unsign(tok){try{const [b,s]=String(tok||'').split('.');if(!b||!s)return null;const good=crypto.createHmac('sha256',SECRET).update(b).digest('base64url'),ab=Buffer.from(s),bb=Buffer.from(good);if(ab.length!==bb.length||!crypto.timingSafeEqual(ab,bb))return null;const p=JSON.parse(Buffer.from(b,'base64url').toString());return p.exp>Date.now()?p:null}catch{return null}}

function cookies(req){const o={};String(req.headers.cookie||'').split(';').forEach(c=>{const i=c.indexOf('=');if(i>0)o[c.slice(0,i).trim()]=decodeURIComponent(c.slice(i+1))});return o}

function isHttps(req){return !!req.socket.encrypted||String(req.headers['x-forwarded-proto']||'').startsWith('https')}

function send(req,res,code,body,type='application/json; charset=utf-8',extra={}){const headers={'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",...extra};if(isHttps(req))headers['Strict-Transport-Security']='max-age=31536000; includeSubDomains';res.writeHead(code,headers);res.end(body)}

function json(req,res,code,obj,extra={}){send(req,res,code,JSON.stringify(obj),'application/json; charset=utf-8',extra)}

function body(req){return new Promise((resolve,reject)=>{let n=0,a=[];req.on('data',c=>{n+=c.length;if(n>MAX_BODY){reject(Object.assign(new Error('Arquivo ou envio muito grande.'),{code:413}));req.destroy()}else a.push(c)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(a).toString()||'{}'))}catch{reject(Object.assign(new Error('Dados inválidos.'),{code:400}))}});req.on('error',reject)})}

function session(req){const p=unsign(cookies(req).smc_s);return p&&p.role==='admin'?p:null}

function csrf(req){const o=req.headers.origin;if(o){try{if(new URL(o).host!==req.headers.host)return false}catch{return false}}return req.headers['x-smc']==='1'}

function auth(req,res){if(!session(req)){json(req,res,401,{error:'Sessão expirada. Entre novamente.'});return false}return true}

function enc(txt){if(!txt)return'';const iv=crypto.randomBytes(12),key=crypto.createHash('sha256').update(SECRET).digest(),c=crypto.createCipheriv('aes-256-gcm',key,iv);const out=Buffer.concat([c.update(txt,'utf8'),c.final()]);return[iv.toString('hex'),c.getAuthTag().toString('hex'),out.toString('hex')].join('.')}

function dec(blob){if(!blob)return'';try{const [ivh,tagh,dh]=blob.split('.'),key=crypto.createHash('sha256').update(SECRET).digest(),d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(ivh,'hex'));d.setAuthTag(Buffer.from(tagh,'hex'));return Buffer.concat([d.update(Buffer.from(dh,'hex')),d.final()]).toString()}catch{return''}}

function authConfigured(){return fs.existsSync(AUTH_FILE)}

function hashPassword(password,salt){return crypto.scryptSync(String(password),salt,64).toString('hex')}

function setPassword(password){const salt=crypto.randomBytes(16).toString('hex'),hash=hashPassword(password,salt);fs.writeFileSync(AUTH_FILE,JSON.stringify({version:2,salt,hash,createdAt:new Date().toISOString()},null,2),{mode:0o600})}

function verifyPassword(password){try{const a=JSON.parse(fs.readFileSync(AUTH_FILE,'utf8'));let got;if(a.algo==='pbkdf2-sha256'||a.iterations){got=crypto.pbkdf2Sync(String(password||''),a.salt,Number(a.iterations||210000),32,'sha256')}else got=Buffer.from(hashPassword(password,a.salt),'hex');const exp=Buffer.from(String(a.hash||''),'hex'),ok=got.length===exp.length&&crypto.timingSafeEqual(got,exp);if(ok&&(a.algo==='pbkdf2-sha256'||a.iterations))setPassword(String(password||''));return ok}catch{return false}}

if(!authConfigured()&&process.env.ADMIN_PASSWORD&&String(process.env.ADMIN_PASSWORD).length>=6)setPassword(String(process.env.ADMIN_PASSWORD));

function fileMime(f){const e=path.extname(f).toLowerCase();return{'.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.map':'application/json; charset=utf-8','.ico':'image/x-icon','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.mp4':'video/mp4','.zip':'application/zip','.txt':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8','.md':'text/markdown; charset=utf-8','.srt':'application/x-subrip; charset=utf-8'}[e]||'application/octet-stream'}

function checkDomain(req,res){const required=(state.settings.licenseDomain||LICENSE_DOMAIN||'').toLowerCase();if(!required)return true;const host=String(req.headers.host||'').split(':')[0].toLowerCase();if(host===required||host==='localhost'||host==='127.0.0.1')return true;send(req,res,403,'Instalação não autorizada.','text/plain; charset=utf-8');return false}

function streamFile(req,res,f,download=false){const size=fs.statSync(f).size,headers={'Content-Type':fileMime(f),'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(download)headers['Content-Disposition']='attachment; filename="'+path.basename(f)+'"';let start=0,end=size-1,status=200;if(req.headers.range){const r=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!r){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end()}start=Number(r[1]);end=r[2]?Math.min(Number(r[2]),size-1):end;if(start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end()}status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`}headers['Content-Length']=end-start+1;res.writeHead(status,headers);const stream=fs.createReadStream(f,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res)}

function staticFile(req,res,p){let f=path.join(PUB,p==='/'?'index.html':p.replace(/^\//,''));if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return false;send(req,res,200,fs.readFileSync(f),fileMime(f));return true}



function publicState(){

 const s=clone(state);

 delete s.modelMatrix;delete s.creditWeights;delete s.reservations;

 if(s.settings){delete s.settings.openrouterKeyEnc;delete s.settings.openrouterMgmtKeyEnc}

 for(const c of s.clients||[]){if(c.ai){c.ai={alertBelowUsd:Number(c.ai.alertBelowUsd||1),configured:!!c.ai.keyEnc,geminiConfigured:!!c.ai.geminiKeyEnc,geminiTier:String(c.ai.geminiTier||'free'),geminiModel:String(c.ai.geminiModel||'gemini-3.5-flash-lite'),geminiFreeDailyRequestLimit:Number(c.ai.geminiFreeDailyRequestLimit||0),geminiPaidAuthorized:!!c.ai.geminiPaidAuthorized,paidFallbackAuthorized:c.ai.paidFallbackAuthorized!==false,zeroMode:!!c.ai.zeroMode,monthlyLimitBrl:Number(c.ai.monthlyLimitBrl||0)}}}

 return s;

}

function monthKey(d=new Date()){return d.toISOString().slice(0,7)}

function used(clientId,kind){return state.usage.filter(u=>u.clientId===clientId&&u.month===monthKey()&&u.kind===kind).reduce((s,u)=>s+(u.qty||1),0)}

function usedCredits(clientId){return state.usage.filter(u=>u.clientId===clientId&&u.month===monthKey()).reduce((s,u)=>s+(u.credits||0),0)}

const kindToLimit={post:'posts',review:'reviews',carousel:'carousels',image:'images',script:'scripts',video:'videos',avatarVideo:'avatarVideos',ebook:'ebooks',pdf:'pdfs',analysis:'analyses',research:'research',campaign:'analyses',slides:'pdfs',newsletter:'posts',multinetwork:'posts',promptgen:'prompts',promptrun:'prompts',salespage:'pages'};

function canUse(c,kind){const p=state.plans[c.plan]||state.plans.economico,limKey=kindToLimit[kind],limit=p.limits[limKey]??999999,current=used(c.id,kind),w=state.creditWeights[kind]||1,cred=usedCredits(c.id);if(current>=limit)return{ok:false,error:`Limite de ${limKey} atingido (${limit}).`};if(cred+w>p.credits)return{ok:false,error:`Limite mensal do plano atingido (${cred}/${p.credits}).`};return{ok:true,w,limit,current,credits:cred,maxCredits:p.credits}}

function recordUse(c,kind,costUsd=0,meta={}){const w=state.creditWeights[kind]||1;state.usage.push({id:id('use'),month:monthKey(),clientId:c.id,kind,qty:1,credits:w,costUsd:Number(costUsd||0),at:new Date().toISOString(),meta});save()}

function recordProviderCost(c,kind,costUsd,model,status,meta={}){const n=Number(costUsd||0);if(!(n>0))return;state.externalCosts.push({id:id('cost'),clientId:c.id,kind,costUsd:n,model:String(model||''),status:String(status||'success'),at:new Date().toISOString(),meta});save()}

function costEvents(clientId){const own=state.externalCosts.filter(x=>x.clientId===clientId);if(own.length)return own;return state.usage.filter(x=>x.clientId===clientId&&Number(x.costUsd||0)>0).map(x=>({...x,status:'legacy'}))}

function costSummary(clientId){const now=new Date(),events=costEvents(clientId),day=now.toISOString().slice(0,10),month=monthKey(now),weekAgo=now.getTime()-7*864e5;const sum=f=>events.filter(f).reduce((a,x)=>a+Number(x.costUsd||0),0),today=sum(x=>String(x.at).slice(0,10)===day),week=sum(x=>Date.parse(x.at)>=weekAgo),monthCost=sum(x=>String(x.at).slice(0,7)===month),success=state.usage.filter(x=>x.clientId===clientId&&x.month===month);const byKind={};for(const x of events.filter(x=>String(x.at).slice(0,7)===month))byKind[x.kind]=(byKind[x.kind]||0)+Number(x.costUsd||0);return{today,week,month:monthCost,averageProduction:success.length?monthCost/success.length:0,successfulProductions:success.length,byKind}}



function workSession(c,{title,type='trabalho',relatedType='',relatedId='',status='Em andamento',summary=''}){

 const now=new Date().toISOString();let w=state.workSessions.find(x=>x.clientId===c.id&&relatedId&&x.relatedId===relatedId&&x.relatedType===relatedType);

 if(w){w.title=title||w.title;w.status=status||w.status;w.summary=summary||w.summary;w.updatedAt=now;return w}

 w={id:id('wrk'),clientId:c.id,title:String(title||'Novo trabalho').slice(0,120),type:String(type||'trabalho'),relatedType:String(relatedType||''),relatedId:String(relatedId||''),summary:String(summary||''),status:String(status||'Em andamento'),pinned:false,archived:false,createdAt:now,updatedAt:now};state.workSessions.unshift(w);return w;

}

function geminiKeyFor(c){return dec(c?.ai?.geminiKeyEnc)||process.env.GEMINI_API_KEY||''}

function geminiUsageToday(c){const day=new Date().toISOString().slice(0,10),rows=state.geminiUsage.filter(x=>x.clientId===c.id&&String(x.at||'').slice(0,10)===day);return{requests:rows.length,inputTokens:rows.reduce((a,x)=>a+Number(x.inputTokens||0),0),outputTokens:rows.reduce((a,x)=>a+Number(x.outputTokens||0),0),costUsd:rows.reduce((a,x)=>a+Number(x.costUsd||0),0)}}

function geminiStatus(c){const u=geminiUsageToday(c),limit=Number(c?.ai?.geminiFreeDailyRequestLimit||0),pct=limit>0?Math.min(100,Math.round(u.requests*100/limit)):null;return{configured:!!geminiKeyFor(c),tier:String(c?.ai?.geminiTier||'free'),model:String(c?.ai?.geminiModel||'gemini-3.5-flash-lite'),requestsToday:u.requests,inputTokensToday:u.inputTokens,outputTokensToday:u.outputTokens,costUsdToday:u.costUsd,freeDailyRequestLimit:limit,percentUsed:pct,percentRemaining:pct==null?null:Math.max(0,100-pct),paidAuthorized:!!c?.ai?.geminiPaidAuthorized,zeroMode:!!c?.ai?.zeroMode}}

async function callGemini(c,{system='',prompt='',maxTokens=3500}){

 const key=geminiKeyFor(c);if(!key)throw Object.assign(new Error('Chave Gemini não configurada para esta empresa.'),{code:'NO_GEMINI_KEY'});

 const tier=String(c.ai?.geminiTier||'free');if(tier!=='free'&&!c.ai?.geminiPaidAuthorized)throw Object.assign(new Error('O Gemini está configurado como pago, mas o uso pago ainda não foi autorizado.'),{code:'GEMINI_PAYMENT_APPROVAL'});

 const model=String(c.ai?.geminiModel||'gemini-3.5-flash-lite');

 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:[system,prompt].filter(Boolean).join('\n\n')}]}],generationConfig:{maxOutputTokens:maxTokens}})});

 const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t}};if(!r.ok){const e=new Error(d?.error?.message||`Gemini ${r.status}`);e.status=r.status;e.code=r.status===429?'GEMINI_FREE_LIMIT':'GEMINI_ERROR';throw e}

 const text=(d?.candidates?.[0]?.content?.parts||[]).map(x=>x?.text||'').join('\n').trim();if(!text)throw new Error('O Gemini respondeu sem conteúdo utilizável.');const inputTokens=Number(d?.usageMetadata?.promptTokenCount||0),outputTokens=Number(d?.usageMetadata?.candidatesTokenCount||0);const costUsd=tier==='free'?0:(inputTokens*0.30+outputTokens*2.50)/1e6;state.geminiUsage.push({id:id('gmu'),clientId:c.id,at:new Date().toISOString(),model,tier,inputTokens,outputTokens,costUsd});save();return{d,model,text,cost:costUsd,usage:{input_tokens:inputTokens,output_tokens:outputTokens,cost:costUsd},provider:'gemini'}

}


const NETWORKS={
 linkedin:{label:'LinkedIn',marker:'LINKEDIN',max:1300,rules:'Primeira linha forte que gere curiosidade, pois o LinkedIn corta o texto após cerca de três linhas. Parágrafos curtos de uma a duas frases, com linha em branco entre eles. Tom profissional e direto. Entre 700 e 1300 caracteres. Termine com uma pergunta ou um convite claro para conversar. De 3 a 5 hashtags na última linha.'},
 instagram:{label:'Instagram',marker:'INSTAGRAM',max:2000,rules:'Legenda com gancho nos primeiros 120 caracteres. Linguagem próxima e leve, frases curtas. Emojis apenas se combinarem com o tom da empresa, no máximo três. Entre 400 e 1000 caracteres. Chamada para ação simples, como enviar mensagem ou usar o link da bio. De 5 a 8 hashtags na última linha.'},
 facebook:{label:'Facebook',marker:'FACEBOOK',max:1500,rules:'Texto conversado, em tom acolhedor, com parágrafos curtos. Entre 300 e 900 caracteres. Uma chamada para ação clara. No máximo 3 hashtags.'}
};
const CAROUSEL_RULE='Formato carrossel: escreva de 6 a 8 slides, cada um iniciado por "Slide 1:", "Slide 2:" e assim por diante, com no máximo duas frases curtas por slide. O primeiro slide é a capa com promessa clara e o último traz a chamada para ação. Depois dos slides, escreva uma linha "Legenda:" seguida da legenda pronta, seguindo as regras da rede.';
function quickNetworks(c,list){const keys=Object.keys(NETWORKS);let sel=(Array.isArray(list)?list:[]).map(x=>String(x).toLowerCase()).filter(x=>keys.includes(x));if(!sel.length){const own=(c.networks||[]).map(x=>String(typeof x==='string'?x:(x.name||x.network||'')).toLowerCase());sel=keys.filter(k=>own.some(o=>o.includes(k)))}if(!sel.length)sel=['linkedin','instagram'];return [...new Set(sel)]}
function quickPrompt(request,nets,format){
 const blocks=nets.map(n=>`[[${NETWORKS[n].marker}]]\n(${NETWORKS[n].label}) ${NETWORKS[n].rules}${format==='carousel'?' '+CAROUSEL_RULE:''}`).join('\n\n');
 return `PEDIDO DO CLIENTE (é o foco exato do conteúdo): ${request}\n\nCrie uma publicação separada para cada rede abaixo, adaptada ao formato e ao comportamento da rede, sem copiar o mesmo texto entre elas. Use apenas informações aprovadas da empresa; se o pedido citar um produto ou serviço, use os dados dele. Não invente números, resultados nem depoimentos. Não use Markdown, asteriscos nem títulos com #.\n\nFORMATO DE SAÍDA OBRIGATÓRIO: escreva o marcador exato de cada rede em uma linha sozinha e, logo abaixo, o texto pronto para publicar. Não escreva nada fora dos blocos.\n\n${blocks}`;
}
function parseNetworkBlocks(text){const out={},re=/\[\[([A-Z]+)\]\]/g,idx=[];let m;while((m=re.exec(String(text||''))))idx.push({k:m[1],s:m.index,e:re.lastIndex});idx.forEach((x,i)=>{out[x.k]=String(text).slice(x.e,i+1<idx.length?idx[i+1].s:undefined).trim()});return out}
function fakeContent(prompt){const mf=machine().fake(prompt);if(mf)return mf;if(/\[\[SALESPAGE\]\]/.test(prompt)){const m=String(prompt).match(/PEDIDO DO CLIENTE:\s*(.+)/),t=m?m[1].trim():'sua oferta';return `[[HEADLINE]]\nSaiba como ${t.slice(0,60)} pode funcionar para você\n\n[[SUB]]\nUm caminho simples para entender o que fazer agora e dar o próximo passo com segurança.\n\n[[PROBLEMA]]\nTudo depende de você\nO dia acaba e o importante fica para depois\nVocê sente que poderia estar mais longe\n\n[[BENEFICIOS]]\nClareza sobre o que priorizar\nUm plano simples para executar\nAcompanhamento de quem conhece o assunto\nDecisões com mais segurança\n\n[[COMO]]\nVocê conta a sua situação\nRecebe um caminho claro\nColoca em prática com apoio\n\n[[PARAQUEM]]\nEmpresários que querem mais autonomia\nLíderes que querem decidir melhor\nQuem está pronto para agir\n\n[[FECHAMENTO]]\nSe faz sentido para você, deixe seu contato e eu retorno para conversarmos.\n\n[[CTA]]\nQuero conversar`}if(/\[\[PROMPTGEN\]\]/.test(prompt)){const m=String(prompt).match(/PEDIDO DO CLIENTE:\s*(.+)/);return 'Você é um especialista. Objetivo: '+(m?m[1].trim():'atender o pedido')+'.\nContexto: [DESCREVA SEU SEGMENTO].\nEntregue o resultado no formato pedido e pergunte o que faltar antes de começar.'}if(/\[\[PROMPTRUN\]\]/.test(prompt)){return /PLANILHA/.test(prompt)?'Item;Quantidade;Valor\nExemplo A;1;100\nExemplo B;2;50':'Resultado de teste gerado a partir do prompt, com conteúdo objetivo e útil para homologação.'}if(/FAIL_QC/.test(prompt))return 'Fale comigo para saber mais.';const marks=[...new Set([...String(prompt).matchAll(/\[\[([A-Z]+)\]\]/g)].map(x=>x[1]))];if(marks.length)return marks.map(k=>`[[${k}]]\nPublicação de teste para ${k}, com foco no pedido do cliente e linguagem natural.\n#lideranca #mentoria`).join('\n\n');return 'Conteúdo de teste válido, humano e objetivo para homologação local da Super Máquina.'}

const PROMPT_TARGETS={gemini:'Gemini',chatgpt:'ChatGPT',claude:'Claude',outra:'qualquer IA'};
const PROMPT_TYPES={imagem:{label:'Imagem ou logomarca',here:false},planilha:{label:'Planilha',here:true},texto:{label:'Texto',here:true},documento:{label:'Documento',here:true},apresentacao:{label:'Apresentação',here:true},video:{label:'Vídeo ou roteiro',here:true},site:{label:'Site ou página',here:false},outro:{label:'Outro',here:true}};
function promptGuessType(t){t=String(t||'');if(/logo|logomarca|imagem|arte\b|foto|banner|capa|ilustra|desenho|identidade visual/i.test(t))return'imagem';if(/planilha|tabela|excel|or[cç]amento|fluxo de caixa|controle de/i.test(t))return'planilha';if(/slide|apresenta[cç][aã]o|powerpoint/i.test(t))return'apresentacao';if(/v[ií]deo|roteiro|reel/i.test(t))return'video';if(/\bsite\b|landing|p[aá]gina/i.test(t))return'site';if(/documento|contrato|proposta|relat[oó]rio|ebook|e-book|manual|ata\b/i.test(t))return'documento';return'texto'}
function promptContext(c){const d=approvedDna(c),x=c.context||{},v=[];const add=(k,val)=>{val=String(val||'').trim();if(val)v.push(`${k}: ${val.slice(0,500)}`)};add('Empresa',c.name);if(d){add('Identidade',d.identidade);add('Entrega',d.entrega);add('Cliente atual',d.clienteAtual);add('Produtos e serviços',d.produtos);add('Tom de voz',d.tom);add('Identidade visual',d.identidadeVisual);add('Restrições',d.restricoes)}else{add('Público',x.publicoAtual||x.publico);add('Oferta',x.oferta);add('Problema',x.problema)}const cols=(c.brand?.colors||[]).filter(Boolean);if(cols.length)v.push('Cores da marca: '+cols.join(', '));return v.join('\n')}
function promptMeta(c,request,target,type){const tn=PROMPT_TARGETS[target]||PROMPT_TARGETS.outra,tl=PROMPT_TYPES[type]?.label||'Texto';const rules={imagem:'Descreva o visual em linguagem natural e concreta: o que aparece, estilo, composição, cores, fundo, tipografia (se houver texto na arte), formato e proporção. Peça 3 variações. Liste o que evitar. Se for logomarca, peça versão simples, legível em tamanho pequeno e com fundo transparente ou branco.',planilha:'Defina o nome de cada aba e de cada coluna, o tipo de dado, exemplos de linhas, fórmulas úteis, totais e formatação. Peça a saída em formato que se cole direto no Excel ou no Google Planilhas.',texto:'Defina o papel da IA, o público, o objetivo, o tom, o tamanho e a estrutura do texto.',documento:'Defina o tipo de documento, o público, as seções esperadas, o tom e o tamanho. Peça o texto final, sem comentários.',apresentacao:'Defina o número de slides, o título e o conteúdo de cada um, o tom e o fecho com chamada para ação.',video:'Defina duração, formato, público, gancho dos primeiros segundos, roteiro cena a cena e chamada para ação.',site:'Defina objetivo da página, seções, textos, chamadas para ação e estilo visual. Peça código limpo e responsivo.',outro:'Defina o papel da IA, o objetivo, o contexto, o formato da resposta e as restrições.'}[type]||'';return `[[PROMPTGEN]]
Você é um engenheiro de prompt sênior. Sua tarefa é escrever UM prompt final, em português do Brasil, para o cliente colar na ferramenta ${tn}. O resultado esperado é: ${tl}.

PEDIDO DO CLIENTE: ${request}

DADOS DA EMPRESA (use somente o que for relevante para o pedido; não invente nada):
${promptContext(c)||'Sem dados cadastrados.'}

REGRAS PARA O PROMPT:
- Comece definindo o papel da IA e o objetivo em uma frase.
- Inclua o contexto da empresa que importa para este pedido.
- ${rules}
- Quando faltar uma informação que só o cliente sabe, escreva um campo entre colchetes em maiúsculas, por exemplo [NOME DA EMPRESA] ou [COR PREFERIDA], para ele preencher antes de colar.
- Termine dizendo o formato exato da resposta e pedindo que a IA faça perguntas se algo essencial estiver ausente.
- Não use Markdown, asteriscos nem títulos com #. Escreva em texto simples, com linhas curtas e listas com hífen.

FORMATO DE SAÍDA: entregue somente o prompt pronto para colar, sem explicações antes ou depois.`}
function promptClean(t){return String(t||'').replace(/\r/g,'').replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'').replace(/__/g,'').replace(/^\s{0,3}#{1,6}\s+/gm,'').replace(/^\s*\*\s+/gm,'- ').replace(/\*/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
async function promptEngine(c,kind,system,prompt,maxTokens){const models=uniqueModels((state.modelMatrix[c.plan]||state.modelMatrix.economico).text);if(!models.length&&!geminiKeyFor(c))throw Object.assign(new Error('Nenhuma IA configurada. Cadastre a chave em Configurações.'),{code:'NO_KEY'});let out=null;if(geminiKeyFor(c)&&!process.env.SMC_FAKE_OPENROUTER){try{out=await callGemini(c,{system,prompt,maxTokens});audit('gemini_generation',`${c.id}:${kind}:${out.model}`)}catch(e){audit('gemini_fallback',e.message);if(c.ai?.zeroMode||c.ai?.paidFallbackAuthorized===false)throw Object.assign(new Error(e.code==='GEMINI_FREE_LIMIT'?'A cota configurada do Gemini não está disponível e o fallback pago não foi autorizado. O Max pode orientar a escolha antes de gerar custo.':e.message),{code:e.code||'GEMINI_FALLBACK_BLOCKED'})}}if(!out){if(c.ai?.zeroMode)throw Object.assign(new Error('Modo Custo Zero ativo. Esta tarefa exigiria um modelo pago da OpenRouter. Desative o modo ou escolha uma alternativa gratuita.'),{code:'ZERO_MODE'});out=await callChat(c,models,[{role:'system',content:system},{role:'user',content:prompt}],maxTokens);recordProviderCost(c,kind,out.cost,out.model,'success',{phase:'generation'})}return out}
function promptItemView(it){const {resultCsvPath,...rest}=it;return rest}

const htmlEsc=x=>String(x==null?'':x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const SALES_LIMITS={headline:140,sub:320,problema:900,beneficios:1200,como:900,paraQuem:700,fechamento:500,ctaLabel:40,brandName:80,name:80};
const HEXC=/^#[0-9a-fA-F]{6}$/;
const cutStr=(v,n)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,n);
function salesLines(t){return String(t||'').split('\n').map(x=>x.replace(/^\s*[-•*]+\s+/,'').replace(/^\s*\d+[.)]\s+/,'').trim()).filter(Boolean).slice(0,8)}
function promoActive(pg){const pr=(pg.promos||[]).find(x=>x.id===pg.activePromoId);if(!pr)return null;if(pr.validUntil&&Date.now()>Date.parse(pr.validUntil+'T23:59:59-03:00'))return null;return pr}
function sanitizePromo(x){x=x||{};return{id:/^pro_[A-Za-z0-9_-]+$/.test(String(x.id||''))?String(x.id):id('pro'),label:cutStr(x.label,60),title:cutStr(x.title,120),text:cutStr(x.text,500),price:cutStr(x.price,120),validUntil:/^\d{4}-\d{2}-\d{2}$/.test(String(x.validUntil||''))?String(x.validUntil):''}}
function salesPrompt(request){return `[[SALESPAGE]]
PEDIDO DO CLIENTE (é o foco exato da página): ${request}

Escreva o texto de uma página de vendas de uma única página, em português do Brasil, tratando o leitor por "você". Use apenas informações aprovadas da empresa e do produto. Não invente números, prazos, garantias, resultados, depoimentos, casos nem preços, e não cite valores. Não use Markdown, asteriscos, numeração nem emojis nas linhas.

FORMATO DE SAÍDA OBRIGATÓRIO: escreva cada marcador exato abaixo em uma linha sozinha e, logo abaixo, o texto da parte. Não escreva nada fora dos blocos.

[[HEADLINE]]
Uma frase de até 90 caracteres com a promessa central, sem exagero.
[[SUB]]
Uma frase de apoio de até 200 caracteres.
[[PROBLEMA]]
De 3 a 4 linhas; cada linha é uma situação ou dor reconhecível, na fala do público.
[[BENEFICIOS]]
De 4 a 5 linhas; cada linha é um benefício concreto da oferta.
[[COMO]]
3 passos curtos, um por linha.
[[PARAQUEM]]
3 linhas dizendo para quem a oferta é indicada.
[[FECHAMENTO]]
De 2 a 3 frases que levam à decisão, sem pressão artificial.
[[CTA]]
O texto do botão, com até 28 caracteres.`}
function renderSalesPage(c,pg,o={}){
 const E=htmlEsc,pr=HEXC.test(pg.theme&&pg.theme.primary)?pg.theme.primary:'#031B46',ac=HEXC.test(pg.theme&&pg.theme.accent)?pg.theme.accent:'#C9A227',promo=promoActive(pg),brand=pg.brandName||(c&&c.name)||'',label=pg.ctaLabel||'Quero saber mais';
 const list=(t,ord)=>{const a=salesLines(t);return a.length?`<${ord?'ol':'ul'}>${a.map(x=>`<li>${E(x)}</li>`).join('')}</${ord?'ol':'ul'}>`:''};
 const sec=(title,body)=>body?`<section class=card><h2>${title}</h2>${body}</section>`:'';
 const promoBox=promo?`<div class=promo><span class=tag>${E(promo.label||'Oferta')}</span>${promo.title?`<h3>${E(promo.title)}</h3>`:''}${promo.text?`<p>${E(promo.text)}</p>`:''}${promo.price?`<p class=price>${E(promo.price)}</p>`:''}${promo.validUntil?`<p class=until>Válida até ${E(promo.validUntil.split('-').reverse().join('/'))}</p>`:''}</div>`:'';
 const formMode=pg.ctaMode!=='redirect';let action='';
 if(formMode){const dis=o.preview?' disabled':'';action=`<div class=box ${o.token&&!o.preview?`data-token="${E(o.token)}" data-action="form"`:''}><input id=pubname placeholder="Seu nome" aria-label="Seu nome"${dis}><input id=pubphone placeholder="WhatsApp" aria-label="WhatsApp"${dis}><input id=pubemail placeholder="E-mail" aria-label="E-mail"${dis}><textarea id=pubnotes rows=2 placeholder="Quer contar algo? (opcional)" aria-label="Mensagem"${dis}></textarea><button id=pubsend class=cta${dis}>${E(label)}</button><div id=pubmsg class=msg role=status></div></div>`}
 else{const href=o.preview?'#':(o.exportUrl||(o.token?'/link/'+encodeURIComponent(o.token)+'/go':'#'));action=`<a class=cta href="${E(href)}">${E(label)}</a>`}
 const script=(formMode&&o.token&&!o.preview)?'<script src="/link.js"></script>':'';
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(pg.headline||pg.name||'Página')}</title><style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#17202a;background:#f4f6f8;line-height:1.55}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
.hero{background:${pr};color:#fff;padding:56px 0 64px}.hero .eyebrow{color:${ac};font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 14px}
.hero h1{font-size:clamp(28px,5vw,46px);line-height:1.15;margin:0 0 16px}.hero .sub{font-size:clamp(17px,2.4vw,21px);opacity:.92;margin:0 0 26px;max-width:640px}
.cta{display:inline-block;background:${ac};color:${pr};font-weight:700;font-size:17px;padding:14px 26px;border:0;border-radius:10px;text-decoration:none;cursor:pointer;font-family:inherit}
.card{background:#fff;border-radius:16px;padding:26px 28px;margin:18px 0;box-shadow:0 8px 30px #0000000d}.card h2{margin:0 0 12px;font-size:22px;color:${pr}}
ul,ol{margin:0;padding-left:22px}li{margin:7px 0}main{padding:8px 0 30px}
.promo{background:#fff8e1;border:2px solid ${ac};border-radius:14px;padding:18px 22px;margin:0 0 18px}.tag{display:inline-block;background:${ac};color:${pr};font-weight:700;font-size:12px;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em}.promo h3{margin:10px 0 6px;font-size:20px;color:${pr}}.promo p{margin:4px 0}.price{font-weight:700;font-size:20px}.until{font-size:14px;color:#5b6570}
.offer{background:${pr};color:#fff;border-radius:16px;padding:28px;margin:18px 0}.offer p{margin:0 0 16px;font-size:18px}.offer .promo{color:#17202a}
.box input,.box textarea{display:block;width:100%;padding:13px;margin:8px 0;border:1px solid #ccd5df;border-radius:9px;font:inherit;color:#17202a}.box button{width:100%;margin-top:6px}.msg{margin-top:10px;font-size:15px}
footer{padding:26px 0 40px;text-align:center;color:#5b6570;font-size:14px}
@media(max-width:640px){.hero{padding:40px 0 46px}.card{padding:20px}.offer{padding:22px}}
</style></head><body>
<header class=hero><div class=wrap><p class=eyebrow>${E(brand)}</p><h1>${E(pg.headline)}</h1>${pg.sub?`<p class=sub>${E(pg.sub)}</p>`:''}<a class=cta href="#oferta">${E(label)}</a></div></header>
<main><div class=wrap>${sec('Você se reconhece?',list(pg.problema))}${sec('O que você ganha',list(pg.beneficios))}${sec('Como funciona',list(pg.como,true))}${sec('Para quem é',list(pg.paraQuem))}
<section class=offer id=oferta>${promoBox}${pg.fechamento?`<p>${E(pg.fechamento)}</p>`:''}${action}</section></div></main>
<footer><div class=wrap>${E(brand)}</div></footer>${script}</body></html>`}
function servePage(req,res,link){const pg=state.pages.find(x=>x.id===link.pageId);if(!pg)return send(req,res,404,'Esta página não está mais disponível.','text/plain; charset=utf-8');if(pg.linkTarget==='published'&&/^https?:\/\//i.test(pg.publishedUrl||'')){res.writeHead(302,{Location:pg.publishedUrl,'Cache-Control':'no-store'});return res.end()}const c=clientById(pg.clientId);return send(req,res,200,renderSalesPage(c,pg,{token:link.token}),'text/html; charset=utf-8')}
function pageLinksInfo(cid){return state.links.filter(l=>l.clientId===cid&&l.action==='page').map(l=>({id:l.id,name:l.name,token:l.token,url:BASE_URL+'/link/'+l.token,pageId:l.pageId,active:l.active,hits:l.hits||0,clicks:l.clicks||0,leads:(l.submissions||[]).filter(x=>x.type==='form').length,publicUrl:isPublicBase()}))}
function isPublicBase(){return !/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(BASE_URL)}
function contentQueued(id){return state.publicationQueue.find(x=>x.contentId===id&&x.status!=='Removida')}
function contentImage(ct){return ct.image&&ct.image.url?ct.image:null}
function keyFor(c){return dec(c?.ai?.keyEnc)||dec(state.settings.openrouterKeyEnc)||process.env.OPENROUTER_API_KEY||''}

function mgmtKeyFor(c){return dec(c?.ai?.mgmtKeyEnc)||keyFor(c)}

async function openrouter(c,pathname,opts={}){if(process.env.SMC_FAKE_OPENROUTER==='1'){if(pathname==='/chat/completions'){const req=JSON.parse(opts.body||'{}'),prompt=String(req.messages?.at(-1)?.content||'');const content=fakeContent(prompt);return{choices:[{message:{content}}],usage:{cost:0.002,input_tokens:100,output_tokens:40}}}throw new Error('Rota fake não implementada.')}const key=keyFor(c);if(!key)throw Object.assign(new Error('Chave OpenRouter não configurada para esta empresa.'),{code:'NO_KEY'});const r=await fetch('https://openrouter.ai/api/v1'+pathname,{...opts,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':BASE_URL,'X-OpenRouter-Title':state.settings.platformName,...(opts.headers||{})}});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t}};if(!r.ok)throw Object.assign(new Error(d?.error?.message||d?.message||`OpenRouter ${r.status}`),{provider:d,status:r.status});return d}

async function openrouterDecision(c,payload){

 if(process.env.SMC_FAKE_OPENROUTER==='1'){

  const answers={};

  if(payload.questions?.complexity)answers.complexity={type:'choice',choice:'economico',probabilities:{economico:.96,intermediario:.03,avancado:.01},confidence:.93};

  if(payload.questions?.requires_external_facts)answers.requires_external_facts={type:'noul',noul:.05};

  if(payload.questions?.briefing_respected)answers.briefing_respected={type:'noul',noul:.97};

  if(payload.questions?.unsupported_specific_claims)answers.unsupported_specific_claims={type:'noul',noul:.02};

  if(payload.questions?.format_matches)answers.format_matches={type:'noul',noul:.95};

  if(payload.questions?.style_ok)answers.style_ok={type:'noul',noul:.95};

  return{model:JEV_MODEL,answers,usage:{cost:0.00001,input_tokens:220,output_tokens:20},id:'fake-jev'};

 }

 const key=keyFor(c);if(!key)throw Object.assign(new Error('Chave OpenRouter não configurada para esta empresa.'),{code:'NO_KEY'});

 const r=await fetch('https://openrouter.ai/api/alpha/decisions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':BASE_URL,'X-OpenRouter-Title':state.settings.platformName},body:JSON.stringify(payload)});

 const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t}};if(!r.ok)throw Object.assign(new Error(d?.error?.message||d?.message||`OpenRouter Decisions ${r.status}`),{provider:d,status:r.status});return d;

}

function extractText(message){if(!message)return'';if(typeof message.content==='string')return message.content.trim();if(Array.isArray(message.content))return message.content.map(x=>typeof x==='string'?x:(x&&typeof x.text==='string'?x.text:'')).join('\n').trim();return''}

async function callChat(c,models,messages,max_tokens=2500){let last;for(const model of models){try{const d=await openrouter(c,'/chat/completions',{method:'POST',body:JSON.stringify({model,messages,max_tokens,temperature:.55})});const text=extractText(d?.choices?.[0]?.message),cost=Number(d?.usage?.cost||0);if(!text){last=Object.assign(new Error(`O motor respondeu sem conteúdo utilizável.`),{providerCost:cost,model});recordProviderCost(c,'unknown',cost,model,'failed',{reason:'empty'});continue}return{d,model,text,cost}}catch(e){last=e}}throw last||new Error('Falha de IA')}

function uniqueModels(models){return [...new Set((models||[]).filter(Boolean))]}

function routeModels(models,route){const list=uniqueModels(models);if(list.length<2)return list;return route?.class==='economico'&&Number(route.confidence||0)>=JEV_ROUTE_CONFIDENCE?[...list].reverse():list}

async function jevRoute(c,{kind,goal,prompt}){

 if(!JEV_ENABLED)return{engine:'disabled',class:'intermediario',confidence:0,cost:0,model:null,requiresExternalFacts:false};

 const payload={model:JEV_MODEL,state:{kind:String(kind||''),goal:String(goal||''),prompt:String(prompt||'')},questions:{

  complexity:{type:'choice',instructions:'Classifique a complexidade de raciocínio necessária para executar corretamente este pedido de conteúdo.',criteria:{economico:'Pedido direto, edição, adaptação, resumo ou criação simples usando informações já fornecidas, com poucas restrições e sem análise profunda.',intermediario:'Exige síntese de várias restrições, posicionamento, estruturação ou análise moderada, mas não depende de raciocínio estratégico profundo.',avancado:'Exige análise estratégica profunda, pesquisa complexa, conteúdo longo com muitas restrições ou alto risco de erro se simplificado.'}},

  requires_external_facts:{type:'noul',instructions:'Para atender corretamente o pedido, seria necessário conhecer fatos externos, atuais ou não fornecidos no estado?'}

 }};

 const d=await openrouterDecision(c,payload),a=d.answers||{},complexity=a.complexity||{},external=Number(a.requires_external_facts?.noul||0),cost=Number(d.usage?.cost||0);

 const confidence=Number(complexity.confidence||0);let klass=String(complexity.choice||'intermediario');if(!['economico','intermediario','avancado'].includes(klass))klass='intermediario';

 if(confidence<JEV_ROUTE_CONFIDENCE||external>=0.70)klass='avancado';

 recordProviderCost(c,kind,cost,d.model||JEV_MODEL,'success',{phase:'jev_route',decisionId:d.id||'',class:klass,confidence,requiresExternalFacts:external});

 return{engine:'jev',class:klass,confidence,cost,model:d.model||JEV_MODEL,requiresExternalFacts:external,decisionId:d.id||''};

}

async function jevValidate(c,{kind,prompt,text,phase='validate'}){

 if(!JEV_ENABLED)return{engine:'disabled',approved:true,cost:0,checks:{}};

 const payload={model:JEV_MODEL,state:{requested_kind:String(kind||''),user_prompt:String(prompt||''),draft:String(text||'')},questions:{

  briefing_respected:{type:'noul',instructions:'O rascunho respeita as instruções e restrições explícitas do pedido do usuário?'},

  unsupported_specific_claims:{type:'noul',instructions:'O rascunho introduz números, preços, resultados, depoimentos, promessas ou fatos específicos que não estão sustentados pelo pedido fornecido?'},

  format_matches:{type:'noul',instructions:'O rascunho corresponde ao tipo de conteúdo solicitado em requested_kind?'},

  style_ok:{type:'noul',instructions:'O rascunho está em português do Brasil, com linguagem natural e utilizável, sem linguagem de chatbot ou marcação técnica visível?'}

 }};

 const d=await openrouterDecision(c,payload),a=d.answers||{},checks={briefing:Number(a.briefing_respected?.noul??0.5),unsupported:Number(a.unsupported_specific_claims?.noul??0.5),format:Number(a.format_matches?.noul??0.5),style:Number(a.style_ok?.noul??0.5)},cost=Number(d.usage?.cost||0);

 const approved=checks.briefing>=JEV_MIN_COMPLIANCE&&checks.unsupported<=JEV_MAX_UNSUPPORTED&&checks.format>=JEV_MIN_COMPLIANCE&&checks.style>=JEV_MIN_COMPLIANCE;

 recordProviderCost(c,kind,cost,d.model||JEV_MODEL,'success',{phase:'jev_'+phase,decisionId:d.id||'',approved,checks});

 return{engine:'jev',approved,cost,checks,model:d.model||JEV_MODEL,decisionId:d.id||''};

}

function jevIssueLabels(v){const c=v?.checks||{},x=[];if(c.briefing<JEV_MIN_COMPLIANCE)x.push('aderência ao briefing');if(c.unsupported>JEV_MAX_UNSUPPORTED)x.push('afirmações não sustentadas');if(c.format<JEV_MIN_COMPLIANCE)x.push('formato solicitado');if(c.style<JEV_MIN_COMPLIANCE)x.push('estilo e naturalidade');return x}

async function generateVerified(c,{kind,goal='',prompt,models,maxTokens=2500}){

 let route;try{route=await jevRoute(c,{kind,goal,prompt})}catch(e){audit('jev_route_fallback',e.message);route={engine:'fallback',class:'avancado',confidence:0,cost:0,error:e.message}}

 const available=uniqueModels(models),ordered=routeModels(available,route);let totalCost=Number(route.cost||0),escalated=false,out=null,usedGemini=false;

 const canGemini=route?.class==='economico'&&Number(route.confidence||0)>=JEV_ROUTE_CONFIDENCE&&!!geminiKeyFor(c);

 if(canGemini){

  try{out=await callGemini(c,{system:systemPrompt(c,kind,prompt),prompt,maxTokens});usedGemini=true;totalCost+=Number(out.cost||0);audit('gemini_generation',`${c.id}:${kind}:${out.model}`)}catch(e){audit('gemini_fallback',e.message);if(c.ai?.zeroMode||c.ai?.paidFallbackAuthorized===false)throw Object.assign(new Error(e.code==='GEMINI_FREE_LIMIT'?'A cota configurada do Gemini não está disponível e o fallback pago não foi autorizado. O Max pode orientar a escolha antes de gerar custo.':e.message),{code:e.code||'GEMINI_FALLBACK_BLOCKED'});}

 }

 if(!out){if(c.ai?.zeroMode)throw Object.assign(new Error('Modo Custo Zero ativo. Esta tarefa exigiria um modelo pago da OpenRouter. Desative o modo ou escolha uma alternativa gratuita.'),{code:'ZERO_MODE'});out=await callChat(c,ordered,[{role:'system',content:systemPrompt(c,kind,prompt)},{role:'user',content:prompt}],maxTokens);recordProviderCost(c,kind,out.cost,out.model,'success',{phase:'generation',route:route.class||'fallback'});totalCost+=Number(out.cost||0)}

 let txt=repairText(out.text,prompt),issues=qualityCheck(txt,prompt);if(issues.length)throw new Error('O conteúdo não passou pelo controle de qualidade: '+issues.join(', ')+'. Nenhum crédito interno foi consumido.');

 let validation;try{validation=await jevValidate(c,{kind,prompt,text:txt})}catch(e){audit('jev_validation_fallback',e.message);validation={engine:'fallback',approved:true,cost:0,error:e.message,checks:{}}}totalCost+=Number(validation.cost||0);

 if(!validation.approved){

  const strongest=available[0],canEscalate=strongest&&(!usedGemini||strongest!==out.model);if(!canEscalate||c.ai?.zeroMode||c.ai?.paidFallbackAuthorized===false)throw Object.assign(new Error('O conteúdo precisa de uma camada mais forte, mas a escalada paga não está autorizada. Problemas: '+jevIssueLabels(validation).join(', ')+'.'),{code:'PAID_ESCALATION_APPROVAL'});

  escalated=true;const repair=`${prompt}\n\nRevise completamente o rascunho abaixo. Corrija estes problemas detectados: ${jevIssueLabels(validation).join(', ')}. Não invente informações. Entregue somente a versão final corrigida.\n\nRASCUNHO A REVISAR:\n${txt}`;

  out=await callChat(c,[strongest,...available.filter(x=>x!==strongest)],[{role:'system',content:systemPrompt(c,kind,prompt)},{role:'user',content:repair}],maxTokens);recordProviderCost(c,kind,out.cost,out.model,'success',{phase:'generation_escalated'});totalCost+=Number(out.cost||0);txt=repairText(out.text,prompt);issues=qualityCheck(txt,prompt);if(issues.length)throw new Error('A versão escalada não passou pelo controle de qualidade: '+issues.join(', ')+'. Nenhum crédito interno foi consumido.');

  try{validation=await jevValidate(c,{kind,prompt,text:txt,phase:'revalidate'})}catch(e){audit('jev_revalidation_fallback',e.message);validation={engine:'fallback',approved:true,cost:0,error:e.message,checks:{}}}totalCost+=Number(validation.cost||0);if(!validation.approved)throw new Error('A versão escalada continuou reprovada pela validação do Jev: '+jevIssueLabels(validation).join(', ')+'. Nenhum crédito interno foi consumido.');

 }

 return{text:txt,model:out.model,provider:usedGemini&&!escalated?'gemini':'openrouter',usage:out.usage||out.d?.usage||{},generationCost:Number(out.cost||0),totalCost,route,validation,escalated};

}

async function normalizedCredits(c){if(process.env.SMC_FAKE_OPENROUTER==='1')return{configured:true,totalCredits:10,totalUsage:2.538740429,available:7.461259571,rawUpdatedAt:new Date().toISOString()};const key=mgmtKeyFor(c);if(!key)return{configured:false,totalCredits:null,totalUsage:null,available:null};const r=await fetch('https://openrouter.ai/api/v1/credits',{headers:{Authorization:'Bearer '+key}}),d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'Não foi possível consultar o saldo.');const x=d.data||d,totalCredits=numOrNull(x.total_credits??x.credits),totalUsage=numOrNull(x.total_usage??x.usage),direct=numOrNull(x.balance??x.limit_remaining);const available=totalCredits!=null&&totalUsage!=null?Math.max(0,totalCredits-totalUsage):direct;return{configured:true,totalCredits,totalUsage,available,rawUpdatedAt:new Date().toISOString()}}

function numOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null}

function systemPrompt(c,kind,userPrompt=''){

 const x=c.context||{}, dna=approvedDna(c), forbidCTA=/sem\s+(cta|venda|vender|chamada)|não\s+(usar|inclua|incluir).{0,20}(cta|venda)/i.test(userPrompt);

 const base=dna?`DNA DA EMPRESA APROVADO:

Identidade: ${dna.identidade||c.name||''}

Entrega: ${dna.entrega||''}

Cliente atual: ${dna.clienteAtual||''}

Cliente desejado: ${dna.clienteDesejado||''}

Problema que resolve: ${dna.problema||''}

Proposta de valor: ${dna.propostaValor||''}

Produtos/serviços: ${dna.produtos||''}

Diferenciais: ${dna.diferenciais||''}

Valores e princípios: ${dna.valores||''}

Forma de trabalhar: ${dna.formaTrabalhar||''}

Tom de voz: ${dna.tom||''}

Direção comercial/CTA: ${dna.comercial||''}

Provas reais registradas: ${dna.provas||''}

Identidade visual: ${dna.identidadeVisual||''}

Liderança: ${dna.lideranca||''}

Restrições: ${dna.restricoes||''}

Objetivos atuais: ${dna.objetivosAtuais||''}`:`CONTEXTO ESTRATÉGICO:

Empresa: ${c.name}

Público atual: ${x.publicoAtual||x.publico||''}

Público desejado: ${x.publicoDesejado||''}

Oferta: ${x.oferta||''}

Problema: ${x.problema||''}

Posicionamento: ${x.posicionamento||''}

Tom: ${x.tom||''}

Diferenciais: ${x.diferenciais||''}

Restrições: ${x.restricoes||''}

CTA cadastrado: ${x.cta||''}`;

 return `Você produz conteúdo final usando somente as informações aprovadas da empresa.\n${base}\nTarefa: ${kind}.\nREGRAS: português do Brasil; linguagem humana, direta e natural; revisar ortografia; sem Markdown cru, asteriscos ou marcas técnicas; não inventar números, depoimentos, preços, resultados ou promessas; não acrescentar conceitos não pedidos; respeitar o briefing.${forbidCTA?' O briefing proíbe CTA: não inclua chamada, oferta ou convite.':''} Entregue somente o conteúdo final.`;

}

function cleanText(s){return String(s||'').replace(/\r/g,'').replace(/^\s{0,3}#{1,6}\s+/gm,'').replace(/\*\*/g,'').replace(/__/g,'').replace(/^\s*[-*]\s+/gm,'• ').replace(/\*/g,'').replace(/`{1,3}/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}

function noCta(prompt){return /sem\s+(cta|venda|vender|chamada)|não\s+(usar|inclua|incluir).{0,20}(cta|venda)/i.test(prompt)}

function repairText(text,prompt=''){let t=cleanText(text).replace(/\bcomo (uma )?ia\b/ig,'').replace(/\bcomo modelo de linguagem\b/ig,'');if(noCta(prompt)){const pat=/(saiba mais|fale comigo|entre em contato|conheça|agende|clique|comente|me chama|quer conversar|mande uma mensagem)/i;t=t.split('\n').filter(line=>!pat.test(line)).join('\n').trim()}return t}

function qualityCheck(text,prompt=''){const issues=[];if(!text||text.trim().length<20)issues.push('conteúdo vazio ou curto demais');if(/[\*`]/.test(text))issues.push('marcação técnica');if(/\b(como uma ia|como modelo de linguagem)\b/i.test(text))issues.push('linguagem de chatbot');if(noCta(prompt)&&/(saiba mais|fale comigo|entre em contato|conheça|agende|clique|comente|me chama|quer conversar)/i.test(text))issues.push('CTA incompatível com briefing');return issues}

function createTextFiles(content){const dir=path.join(PRODUCED,content.id);fs.mkdirSync(dir,{recursive:true});const base=safeName(content.title||content.kind||'conteudo'),doc=base+'.docx',pdf=base+'.pdf';fs.writeFileSync(path.join(dir,doc),makeDocx(content.title,content.text));fs.writeFileSync(path.join(dir,pdf),makePdf(content.title,content.text));return{docx:`/files/${content.id}/${doc}`,pdf:`/files/${content.id}/${pdf}`}}

function parseSlides(text,title){const blocks=String(text||'').split(/\n\s*\n/).filter(Boolean).slice(0,30);return blocks.map((b,i)=>{const lines=b.split('\n').filter(Boolean);return{title:lines.shift()||`${title} ${i+1}`,body:lines.join('\n')}})}

function allowedFile(req,pathname,u){if(session(req))return true;const t=unsign(u.searchParams.get('pt'));return !!(t&&t.role==='file'&&t.path===pathname)}

function tokenizedInternal(target,linkId){if(!/^\/(files|media)\//.test(target||''))return target;const pt=sign({role:'file',path:target,linkId,exp:Date.now()+7*24*3600e3});return target+(target.includes('?')?'&':'?')+'pt='+encodeURIComponent(pt)}

function cleanPhone(s){return String(s||'').replace(/\D/g,'')}

function leadMessage(l,type='followup'){const name=(l.name||'').split(' ')[0]||'Olá',interest=(l.interests||[])[0]||l.interest||'';if(type==='first')return `${name}, tudo bem? Vi seu interesse${interest?' em '+interest:''}. Quero entender melhor o que você busca antes de te apresentar qualquer caminho.`;if(type==='reactivate')return `${name}, tudo bem? Faz algum tempo desde nosso último contato. Queria saber como ficou aquela questão${interest?' sobre '+interest:''} e se ainda faz sentido conversarmos.`;return `${name}, tudo bem? Retomando nossa conversa${interest?' sobre '+interest:''}. O que ainda precisa ficar claro para avançarmos no próximo passo?`}

function xmlDecode(s){return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}

function rssItems(xml,source){const items=[];const blocks=String(xml||'').match(/<item[\s\S]*?<\/item>/gi)||String(xml||'').match(/<entry[\s\S]*?<\/entry>/gi)||[];for(const b of blocks.slice(0,12)){const pick=(tag)=>{const m=b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?xmlDecode(m[1]):''},title=pick('title'),summary=pick('description')||pick('summary')||pick('content'),date=pick('pubDate')||pick('published')||pick('updated');let link=pick('link');if(!link){const lm=b.match(/<link[^>]+href=["']([^"']+)["']/i);if(lm)link=lm[1]}if(title)items.push({title,summary:summary.slice(0,320),url:link,source,date})}return items}

async function refreshApprovedNews(c){const srcs=(c.radar?.approvedSources||[]).filter(x=>x.active!==false&&x.url),added=[];for(const src of srcs.slice(0,12)){try{const r=await fetch(src.url,{headers:{'User-Agent':'SuperMaquina/0.4.0 (+local approved source reader)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, text/html;q=0.5'}});const t=await r.text();if(!r.ok||!/(<rss|<feed|<item|<entry)/i.test(t))continue;for(const n of rssItems(t,src.name)){const dupe=(c.radar.findings||[]).some(x=>(x.url&&n.url&&x.url===n.url)||String(x.title||'').toLowerCase()===n.title.toLowerCase());if(dupe)continue;const f={id:id('rad'),title:n.title,url:n.url,source:src.name,summary:n.summary,status:'Novo',sourceApproved:true,createdAt:n.date&&Date.parse(n.date)?new Date(n.date).toISOString():new Date().toISOString()};c.radar.findings.unshift(f);added.push(f)}}catch(e){audit('radar_source_error',`${src.name}: ${e.message}`)}}c.radar.findings=(c.radar.findings||[]).slice(0,200);save();return{added:added.length,findings:added}}

function localAction(action){return new Promise((resolve)=>{if(action==='MAKE_BACKUP'){const f=safetyBackup('max_manual');return resolve({ok:true,message:'Backup criado com segurança.',path:f})}if(action==='CHECK_NODE')return resolve({ok:true,message:`Node.js ${process.version}`,version:process.version});if(action==='OPEN_DATA_FOLDER'||action==='OPEN_PRODUCED_FOLDER'){const target=action==='OPEN_DATA_FOLDER'?DATA:PRODUCED;if(process.platform!=='win32')return resolve({ok:true,message:'Pasta disponível.',path:target});const ch=spawn('explorer.exe',[target],{detached:true,stdio:'ignore'});ch.unref();return resolve({ok:true,message:'Pasta aberta no Windows.',path:target})}if(action==='CHECK_FFMPEG'){const ch=spawn('ffmpeg',['-version'],{windowsHide:true});let out='';ch.stdout.on('data',d=>out+=d);ch.stderr.on('data',d=>out+=d);ch.on('error',()=>resolve({ok:false,message:'FFmpeg não encontrado.'}));ch.on('close',code=>resolve({ok:code===0,message:code===0?'FFmpeg instalado.':'FFmpeg não disponível.',detail:out.split(/\r?\n/)[0]||''}));return}resolve({ok:false,message:'Ação local não autorizada.'})})}

function dashboardSummary(c){if(!c)return{};const leads=state.leads.filter(x=>x.clientId===c.id),contents=state.contents.filter(x=>x.clientId===c.id),links=state.links.filter(x=>x.clientId===c.id),today=new Date().toISOString().slice(0,10),followups=leads.filter(x=>x.nextFollowUp&&x.nextFollowUp.slice(0,10)<=today&&!['Cliente','Perdido'].includes(x.status)),newLeads=leads.filter(x=>x.status==='Novo'),proposals=leads.filter(x=>x.status==='Proposta'),clients=leads.filter(x=>x.status==='Cliente');const funnel=contents.filter(x=>x.network||x.trackLinkId).map(x=>{const lk=links.find(l=>l.id===x.trackLinkId),ls=leads.filter(l=>l.contentId===x.id||(lk&&l.source==='link:'+lk.token));return{contentId:x.id,title:x.title,network:x.network||'',status:x.status,hits:Number(lk?.hits||0),tracked:!!lk,leads:ls.length,proposals:ls.filter(l=>l.status==='Proposta').length,clients:ls.filter(l=>l.status==='Cliente').length}});return{funnel,leads:leads.length,newLeads:newLeads.length,followups:followups.length,proposals:proposals.length,clients:clients.length,contents:contents.length,pendingContents:contents.filter(x=>['Rascunho','Em revisão'].includes(x.status)).length,activeLinks:links.filter(x=>x.active).length,linkHits:links.reduce((a,x)=>a+Number(x.hits||0),0),submissions:links.reduce((a,x)=>a+(x.submissions||[]).length,0),campaigns:state.campaigns.filter(x=>x.clientId===c.id).length,costs:costSummary(c.id)}}



function makeBackupBuffer(reason='manual'){

 store.checkpoint();

 const manifest={format:'super-maquina-backup',formatVersion:1,appVersion:APP_VERSION,createdAt:new Date().toISOString(),reason};

 const entries=[['backup-manifest.json',JSON.stringify(manifest,null,2)],['state-export.json',store.exportJson()]];

 if(fs.existsSync(SECRET_FILE))entries.push(['secure/secret.key',fs.readFileSync(SECRET_FILE)]);

 if(fs.existsSync(AUTH_FILE))entries.push(['secure/admin_auth.json',fs.readFileSync(AUTH_FILE)]);

 for(const [name,data] of walk(MEDIA,'media'))entries.push(['data/'+name,data]);

 for(const [name,data] of walk(PRODUCED,'produced'))entries.push(['data/'+name,data]);

 for(const [name,data] of walk(EXPORTS,'exports'))entries.push(['data/'+name,data]);

 return zipStore(entries)

}

function safetyBackup(reason){const stamp=new Date().toISOString().replace(/[:.]/g,'-'),f=path.join(BACKUPS,`backup_${reason}_${stamp}.zip`);fs.writeFileSync(f,makeBackupBuffer(reason));return f}

function restoreBackupBuffer(buf){const files=unzipStore(buf),man=JSON.parse(String(files.get('backup-manifest.json')||''));if(man.format!=='super-maquina-backup')throw new Error('Este ZIP não é um backup da Super Máquina.');const raw=String(files.get('state-export.json')||'');if(!raw)throw new Error('Backup sem base de dados exportada.');let next;try{next=JSON.parse(raw)}catch{throw new Error('Base de dados do backup inválida.')}const before=safetyBackup('antes_restauracao');for(const d of [MEDIA,PRODUCED,EXPORTS]){fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true})}for(const [name,data] of files){if(!name.startsWith('data/'))continue;const rel=name.slice(5);if(!/^(media|produced|exports)\//.test(rel))continue;const dest=path.join(DATA,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data)}if(files.has('secure/secret.key'))fs.writeFileSync(SECRET_FILE,files.get('secure/secret.key'));if(files.has('secure/admin_auth.json'))fs.writeFileSync(AUTH_FILE,files.get('secure/admin_auth.json'));store.replaceState(next);state=store.load();migrate();contentEngine.migrate();SECRET=fs.readFileSync(SECRET_FILE,'utf8').trim();return{before,restartRequired:files.has('secure/secret.key')}}



async function handle(req,res){

 if(!checkDomain(req,res))return;

 const u=new URL(req.url,'http://x'),p=u.pathname,m=req.method;

 if(p==='/robots.txt')return send(req,res,200,'User-agent: *\nDisallow: /\n','text/plain');

 if(p==='/api/setup'&&m==='POST'){if(!csrf(req))return json(req,res,403,{error:'Ação recusada.'});if(authConfigured())return json(req,res,409,{error:'Senha administrativa já configurada.'});let b=await body(req);const pass=String(b.password||'');if(pass.length<6)return json(req,res,400,{error:'Use uma senha com pelo menos 6 caracteres.'});setPassword(pass);audit('admin_password_created');const tok=sign({role:'admin',exp:Date.now()+30*24*3600e3});return json(req,res,200,{ok:true},{'Set-Cookie':`smc_s=${encodeURIComponent(tok)}; Max-Age=${30*24*3600}; Path=/; HttpOnly; SameSite=Lax${isHttps(req)?'; Secure':''}`})}

 if(p==='/api/login'&&m==='POST'){if(!csrf(req))return json(req,res,403,{error:'Ação recusada.'});if(!authConfigured())return json(req,res,409,{error:'Senha ainda não configurada.',needsSetup:true});let b=await body(req);if(!verifyPassword(String(b.password||''))){audit('login_fail');return json(req,res,401,{error:'Senha incorreta'});}const tok=sign({role:'admin',exp:Date.now()+30*24*3600e3});audit('login_ok');return json(req,res,200,{ok:true},{'Set-Cookie':`smc_s=${encodeURIComponent(tok)}; Max-Age=${30*24*3600}; Path=/; HttpOnly; SameSite=Lax${isHttps(req)?'; Secure':''}`})}

 if(p==='/api/logout'&&m==='POST')return json(req,res,200,{ok:true},{'Set-Cookie':'smc_s=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'});

 if(p==='/api/me'&&m==='GET')return json(req,res,200,{logged:!!session(req),needsSetup:!authConfigured(),platform:state.settings.platformName,brand:state.settings.brandName,appVersion:APP_VERSION,database:'SQLite local',decisionLayer:{enabled:JEV_ENABLED,engine:'Jev',model:JEV_MODEL}});



 const lgo=p.match(/^\/(?:link|l)\/([^/]+)\/go$/);
 if(lgo&&m==='GET'){const link=state.links.find(x=>x.token===lgo[1]&&x.active&&x.action==='page'),pg=link&&state.pages.find(x=>x.id===link.pageId);if(!pg||!/^https?:\/\//i.test(pg.ctaUrl||''))return send(req,res,404,'Link inválido ou expirado.','text/plain; charset=utf-8');if(link.expiresAt&&Date.now()>Date.parse(link.expiresAt))return send(req,res,410,'Link expirado.','text/plain; charset=utf-8');let t;try{const u2=new URL(pg.ctaUrl);u2.searchParams.set('utm_source','pagina');u2.searchParams.set('utm_campaign',pg.id);const pr=promoActive(pg);if(pr)u2.searchParams.set('utm_content',pr.id);t=u2.href}catch{return send(req,res,404,'Link inválido.','text/plain; charset=utf-8')}link.clicks=(link.clicks||0)+1;link.lastClickAt=new Date().toISOString();save();res.writeHead(302,{Location:t,'Cache-Control':'no-store'});return res.end()}
 const lm=p.match(/^\/(?:link|l)\/([^/]+)$/);

 if(lm&&m==='GET'){

  const token=lm[1],link=state.links.find(x=>x.token===token&&x.active);if(!link)return send(req,res,404,'Link inválido ou expirado.','text/plain; charset=utf-8');if(link.expiresAt&&Date.now()>Date.parse(link.expiresAt))return send(req,res,410,'Link expirado.','text/plain; charset=utf-8');link.hits=(link.hits||0)+1;link.lastHitAt=new Date().toISOString();save();if(link.action==='page')return servePage(req,res,link);if(link.action==='redirect'&&/^https?:\/\//i.test(link.target||'')){res.writeHead(302,{Location:link.target});return res.end()}

  const safe=x=>String(x||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));let form='';

  if(link.action==='upload')form='<input id=pubfile type=file><input id=pubcat placeholder="Categoria ou produto"><button id=pubsend>Enviar arquivo</button>';

  else if(link.action==='form')form='<input id=pubname placeholder="Nome"><input id=pubphone placeholder="WhatsApp"><input id=pubemail placeholder="E-mail"><textarea id=pubnotes placeholder="Informações"></textarea><button id=pubsend>Enviar</button>';

  else if(link.action==='approval')form='<button data-decision=aprovado>Aprovar</button><button data-decision=revisar>Solicitar alteração</button><textarea id=pubnotes placeholder="Observação opcional"></textarea>';

  else if(link.action==='download'&&link.target)form=`<a class=button href="${safe(tokenizedInternal(link.target,link.id))}">Baixar material</a>`;

  else form='<p>Este link ainda não possui um destino válido.</p>';

  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(link.name)}</title><style>body{font-family:system-ui;background:#f4f6f8;padding:30px;color:#17202a}.box{max-width:640px;margin:auto;background:#fff;padding:24px;border-radius:16px;box-shadow:0 12px 40px #0001}input,textarea,button,.button{box-sizing:border-box;width:100%;padding:12px;margin:7px 0;border:1px solid #ccd5df;border-radius:9px;font:inherit}.button,button{display:block;background:#10233d;color:white;text-decoration:none;text-align:center;cursor:pointer}.msg{margin-top:12px}</style></head><body><div class=box data-token="${safe(token)}" data-action="${safe(link.action)}"><h1>${safe(link.name)}</h1><p>${safe(link.instructions||'')}</p>${form}<div id=pubmsg class=msg></div></div><script src="/link.js"></script></body></html>`;return send(req,res,200,html,'text/html; charset=utf-8')

 }

 if(p.startsWith('/public/link/')&&p.endsWith('/submit')&&m==='POST'){

  const token=p.split('/')[3],link=state.links.find(x=>x.token===token&&x.active);if(!link)return json(req,res,404,{error:'Link inválido'});if(link.expiresAt&&Date.now()>Date.parse(link.expiresAt))return json(req,res,410,{error:'Link expirado'});let b=await body(req);link.submissions=link.submissions||[];

  if(link.action==='upload'){const raw=String(b.data||''),mm=raw.match(/^data:([^;]+);base64,(.+)$/);if(!mm)return json(req,res,400,{error:'Arquivo inválido'});const buf=Buffer.from(mm[2],'base64');if(buf.length>20*1024*1024)return json(req,res,413,{error:'Arquivo acima de 20MB'});const c=clientById(link.clientId);if(!c)return json(req,res,409,{error:'Empresa deste link não existe mais.'});const filename=id('upl')+'_'+safeName(b.name);fs.writeFileSync(path.join(MEDIA,filename),buf);const item={id:id('asset'),clientId:c.id,name:String(b.name),type:mm[1],category:String(b.category||'link'),productId:'',url:'/media/'+filename,sourceLinkId:link.id,createdAt:new Date().toISOString()};c.media.push(item);link.submissions.push({at:new Date().toISOString(),type:'upload',assetId:item.id});save();return json(req,res,200,{ok:true,message:'Arquivo recebido e salvo.'})}

  if(link.action==='page'){b={name:cutStr(b.name,120),phone:cutStr(b.phone,40),email:cutStr(b.email,120),notes:cutStr(b.notes,1000)};if(!b.name||!(b.phone||b.email))return json(req,res,400,{error:'Informe seu nome e um contato (WhatsApp ou e-mail).'})}
  if(link.action==='form'||link.action==='page'){const pgS=link.action==='page'?state.pages.find(x=>x.id===link.pageId):null,prS=pgS?promoActive(pgS):null;const lead={id:id('lead'),clientId:link.clientId,name:String(b.name||''),phone:String(b.phone||''),email:String(b.email||''),community:String(link.name||''),temperature:'frio',interests:[],source:'link:'+link.token,notes:(pgS?`Página: ${pgS.name}${prS?' | Promoção: '+(prS.label||prS.title):''}\n`:'')+String(b.notes||''),status:'Novo',nextAction:'',nextFollowUp:'',contentId:link.contentId||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.leads.push(lead);link.submissions.push({at:new Date().toISOString(),type:'form',leadId:lead.id});save();return json(req,res,200,{ok:true,message:'Informações recebidas.'})}

  if(link.action==='approval'){const decision=String(b.decision||'');if(!['aprovado','revisar'].includes(decision))return json(req,res,400,{error:'Decisão inválida'});link.submissions.push({at:new Date().toISOString(),type:'approval',decision,notes:String(b.notes||'')});save();return json(req,res,200,{ok:true,message:'Decisão registrada.'})}

  return json(req,res,400,{error:'Ação não aceita envio'})

 }



 if(p.startsWith('/media/')&&m==='GET'){if(!allowedFile(req,p,u))return json(req,res,401,{error:'Arquivo protegido.'});const f=path.join(MEDIA,safeName(p.slice(7)));if(!f.startsWith(MEDIA)||!fs.existsSync(f))return send(req,res,404,'');return send(req,res,200,fs.readFileSync(f),fileMime(f),u.searchParams.get('download')==='1'?{'Content-Disposition':`attachment; filename="${path.basename(f)}"`}:{})}

 const fm=p.match(/^\/files\/([^/]+)\/([^/]+)$/);if(fm&&m==='GET'){if(!allowedFile(req,p,u))return json(req,res,401,{error:'Arquivo protegido.'});const cid=safeName(fm[1]),fn=safeName(fm[2]),f=path.join(PRODUCED,cid,fn);if(!f.startsWith(PRODUCED)||!fs.existsSync(f))return send(req,res,404,'Arquivo não encontrado.','text/plain');return streamFile(req,res,f,u.searchParams.get('download')==='1')}

 if(p.startsWith('/exports/')&&m==='GET'){if(!auth(req,res))return;const fn=safeName(p.slice(9)),f=path.join(EXPORTS,fn);if(!fs.existsSync(f))return send(req,res,404,'');return send(req,res,200,fs.readFileSync(f),fileMime(f),{'Content-Disposition':`attachment; filename="${fn}"`})}

 if(!p.startsWith('/api/')){if(staticFile(req,res,p))return;return staticFile(req,res,'/index.html')}

 if(!auth(req,res))return;if(m!=='GET'&&!csrf(req))return json(req,res,403,{error:'Ação recusada.'});



 if(await contentEngine.route(req,res,u))return;
 if(await machine().route(req,res,u))return;

 if(p==='/api/state'&&m==='GET'){const s=publicState();const cid=u.searchParams.get('clientId'),c=clientById(cid);s.dashboard=c?dashboardSummary(c):{};return json(req,res,200,s)}

 if(p==='/api/settings'&&m==='POST'){let b=await body(req);for(const k of ['platformName','brandName','brandColor','accent','licenseDomain','openrouterTopupUrl','openrouterSignupUrl','uiMode'])if(k in b)state.settings[k]=String(b[k]||'');if(b.userName!=null){const parts=String(b.userName||'').trim().split(/\s+/).filter(Boolean).slice(0,3);state.settings.userProfile.name=parts.join(' ')||'Administrador'}save();audit('settings_update');return json(req,res,200,{ok:true})}



 if(p==='/api/backup'&&m==='GET'){const buf=makeBackupBuffer('manual'),name=`Super_Maquina_Backup_${new Date().toISOString().slice(0,10)}.zip`;return send(req,res,200,buf,'application/zip',{'Content-Disposition':`attachment; filename="${name}"`})}

 if(p==='/api/restore'&&m==='POST'){let b=await body(req),mm=String(b.data||'').match(/^data:application\/(?:zip|x-zip-compressed);base64,(.+)$/i);if(!mm)return json(req,res,400,{error:'Selecione um ZIP de backup gerado pela Super Máquina.'});try{const r=restoreBackupBuffer(Buffer.from(mm[1],'base64'));audit('restore_ok',path.basename(r.before));return json(req,res,200,{ok:true,restartRequired:r.restartRequired,message:r.restartRequired?'Backup restaurado. Reinicie a Super Máquina para concluir a restauração das credenciais.':'Backup restaurado.'})}catch(e){audit('restore_fail',e.message);return json(req,res,400,{error:e.message})}}



 if(p==='/api/clients'&&m==='POST'){let b=await body(req);const c={id:id('cli'),name:String(b.name||'Nova empresa').trim()||'Nova empresa',plan:b.plan&&state.plans[b.plan]?b.plan:'economico',active:true,createdAt:new Date().toISOString(),context:{},brand:{logo:'',colors:[]},products:[],networks:[],communities:[],media:[],ai:{keyEnc:'',mgmtKeyEnc:'',alertBelowUsd:1,geminiKeyEnc:'',geminiTier:'free',geminiModel:'gemini-3.5-flash-lite',geminiFreeDailyRequestLimit:0,geminiPaidAuthorized:false,paidFallbackAuthorized:false,zeroMode:false,monthlyLimitBrl:0},radar:{topics:[],sources:[],approvedSources:[],sourceSuggestions:[],schedule:{mode:'manual',time:'08:00',days:[]},findings:[]},companyDna:null};c.companyDna=normalizeCompanyDna(c,null);state.clients.push(c);save();audit('client_create',c.id);return json(req,res,200,publicState().clients.find(x=>x.id===c.id))}

 const cm=p.match(/^\/api\/clients\/([^/]+)$/);if(cm&&m==='PUT'){const c=clientById(cm[1]);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});let b=await body(req);if(b.name!=null)c.name=String(b.name||'').trim()||c.name;if(b.plan&&state.plans[b.plan])c.plan=b.plan;if(b.context)c.context={...c.context,...b.context};if(b.brand)c.brand={...c.brand,...b.brand};if(Array.isArray(b.products))c.products=b.products;if(Array.isArray(b.networks))c.networks=b.networks;if(Array.isArray(b.communities))c.communities=b.communities;syncDnaBlanks(c);save();audit('client_update',c.id);return json(req,res,200,{ok:true})}

 const cdna=p.match(/^\/api\/clients\/([^/]+)\/dna$/);if(cdna&&m==='POST'){

  const c=clientById(cdna[1]);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});

  let b=await body(req),action=String(b.action||'save');

  c.companyDna=normalizeCompanyDna(c,c.companyDna);

  if(action==='refresh'){

   syncDnaBlanks(c);

  }else if(action==='newVersion'){

   const cur=clone(c.companyDna);

   if(cur.status==='Aprovado'&&!c.companyDna.history.some(h=>h.version===cur.version&&h.approvedAt===cur.approvedAt))c.companyDna.history.unshift({version:cur.version,status:cur.status,data:clone(cur.data),approvedAt:cur.approvedAt,archivedAt:new Date().toISOString()});

   c.companyDna={...c.companyDna,version:nextDnaVersion(c.companyDna.version),status:'Rascunho',approvedAt:'',updatedAt:new Date().toISOString(),data:clone(c.companyDna.data)};

  }else{

   if(b.data&&typeof b.data==='object'){for(const k of Object.keys(dnaSeed(c)))if(k in b.data)c.companyDna.data[k]=String(b.data[k]??'')}

   c.companyDna.updatedAt=new Date().toISOString();

   if(action==='approve'){

    c.companyDna.status='Aprovado';c.companyDna.approvedAt=new Date().toISOString();

    c.companyDna.history=c.companyDna.history.filter(h=>h.version!==c.companyDna.version);

    c.companyDna.history.unshift({version:c.companyDna.version,status:'Aprovado',data:clone(c.companyDna.data),approvedAt:c.companyDna.approvedAt});

   }else{c.companyDna.status='Rascunho';c.companyDna.approvedAt=''}

  }

  c.companyDna.history=c.companyDna.history.slice(0,20);save();audit('company_dna_'+action,c.id+':'+c.companyDna.version);

  return json(req,res,200,{ok:true,companyDna:clone(c.companyDna)});

 }

 const cai=p.match(/^\/api\/clients\/([^/]+)\/ai$/);if(cai&&m==='POST'){const c=clientById(cai[1]);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});let b=await body(req);if(b.openrouterKey)c.ai.keyEnc=enc(String(b.openrouterKey));if(b.managementKey)c.ai.mgmtKeyEnc=enc(String(b.managementKey));if(b.geminiKey)c.ai.geminiKeyEnc=enc(String(b.geminiKey));if(b.alertBelowUsd!=null)c.ai.alertBelowUsd=Math.max(0,Number(b.alertBelowUsd)||0);if(b.geminiTier)c.ai.geminiTier=['free','paid'].includes(String(b.geminiTier))?String(b.geminiTier):'free';if(b.geminiModel)c.ai.geminiModel=String(b.geminiModel);if(b.geminiFreeDailyRequestLimit!=null)c.ai.geminiFreeDailyRequestLimit=Math.max(0,Number(b.geminiFreeDailyRequestLimit)||0);if(b.geminiPaidAuthorized!=null)c.ai.geminiPaidAuthorized=!!b.geminiPaidAuthorized;if(b.paidFallbackAuthorized!=null)c.ai.paidFallbackAuthorized=!!b.paidFallbackAuthorized;if(b.zeroMode!=null)c.ai.zeroMode=!!b.zeroMode;if(b.monthlyLimitBrl!=null)c.ai.monthlyLimitBrl=Math.max(0,Number(b.monthlyLimitBrl)||0);save();return json(req,res,200,{ok:true,configured:!!c.ai.keyEnc,geminiConfigured:!!c.ai.geminiKeyEnc,alertBelowUsd:c.ai.alertBelowUsd,gemini:geminiStatus(c)})}

 if(p==='/api/openrouter/credits'&&m==='GET'){const c=clientById(u.searchParams.get('clientId'));if(!c)return json(req,res,404,{error:'Empresa não encontrada'});try{return json(req,res,200,await normalizedCredits(c))}catch(e){return json(req,res,400,{error:e.message,configured:!!keyFor(c)})}}

 if(p==='/api/gemini/status'&&m==='GET'){const c=clientById(u.searchParams.get('clientId'));if(!c)return json(req,res,404,{error:'Empresa não encontrada'});return json(req,res,200,geminiStatus(c))}

 if(p==='/api/gemini/test'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});try{const out=await callGemini(c,{prompt:'Responda apenas: conexão OK',maxTokens:30});return json(req,res,200,{ok:true,model:out.model,status:geminiStatus(c)})}catch(e){return json(req,res,400,{error:e.message,code:e.code||''})}}

 if(p==='/api/costs'&&m==='GET'){const c=clientById(u.searchParams.get('clientId'));if(!c)return json(req,res,404,{error:'Empresa não encontrada'});return json(req,res,200,costSummary(c.id))}



 if(p==='/api/media'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const raw=String(b.data||''),mm=raw.match(/^data:([^;]+);base64,(.+)$/);if(!mm)return json(req,res,400,{error:'Arquivo inválido'});const buf=Buffer.from(mm[2],'base64');if(buf.length>20*1024*1024)return json(req,res,413,{error:'Arquivo acima de 20MB'});const filename=id('med')+'_'+safeName(b.name);fs.writeFileSync(path.join(MEDIA,filename),buf);const item={id:id('asset'),clientId:c.id,name:String(b.name),type:String(b.type||mm[1]),category:String(b.category||'geral'),productId:String(b.productId||''),url:'/media/'+filename,createdAt:new Date().toISOString()};c.media.push(item);save();audit('media_upload',`${c.id}:${item.id}`);return json(req,res,200,item)}

 const md=p.match(/^\/api\/media\/([^/]+)$/);if(md&&m==='DELETE'){for(const c of state.clients){const i=c.media.findIndex(x=>x.id===md[1]);if(i>=0){const item=c.media[i],f=path.join(MEDIA,safeName(String(item.url||'').replace('/media/','')));if(fs.existsSync(f))fs.unlinkSync(f);c.media.splice(i,1);save();return json(req,res,200,{ok:true})}}return json(req,res,404,{error:'Material não encontrado'})}



 if(p==='/api/links'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const pl=state.plans[c.plan],count=state.links.filter(x=>x.clientId===c.id&&x.active).length;if(count>=pl.limits.links)return json(req,res,409,{error:'Limite de links do plano atingido'});const l={id:id('lnk'),clientId:c.id,token:crypto.randomBytes(7).toString('base64url'),name:String(b.name||'Link'),action:String(b.action||'redirect'),target:String(b.target||''),instructions:String(b.instructions||''),expiresAt:b.expiresAt||'',active:true,hits:0,createdAt:new Date().toISOString(),submissions:[]};state.links.push(l);save();return json(req,res,200,{...l,url:BASE_URL+'/link/'+l.token})}

 const lqr=p.match(/^\/api\/links\/([^/]+)\/qr$/);if(lqr&&m==='GET'){const l=state.links.find(x=>x.id===lqr[1]);if(!l)return json(req,res,404,{error:'Link não encontrado'});const url=BASE_URL+'/link/'+l.token,format=u.searchParams.get('format')==='svg'?'svg':'png',fn=`qr_${safeName(l.name)}_${l.id}.${format}`;fs.writeFileSync(path.join(EXPORTS,fn),format==='svg'?makeQrSvg(url):makeQrPng(url));return json(req,res,200,{url:`/exports/${fn}`,target:url,format})}



 if(p==='/api/leads'&&m==='POST'){let b=await body(req);if(!clientById(b.clientId))return json(req,res,404,{error:'Empresa não encontrada'});const lead={id:id('lead'),clientId:String(b.clientId),name:String(b.name||''),phone:String(b.phone||''),email:String(b.email||''),company:String(b.company||''),community:String(b.community||''),temperature:String(b.temperature||'frio'),interests:Array.isArray(b.interests)?b.interests:[],source:String(b.source||''),notes:String(b.notes||''),status:String(b.status||'Novo'),nextAction:String(b.nextAction||''),nextFollowUp:String(b.nextFollowUp||''),contentId:String(b.contentId||''),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.leads.push(lead);save();return json(req,res,200,lead)}

 const lu=p.match(/^\/api\/leads\/([^/]+)$/);if(lu&&m==='PUT'){const l=state.leads.find(x=>x.id===lu[1]);if(!l)return json(req,res,404,{error:'Lead não encontrado'});let b=await body(req);for(const k of ['name','phone','email','company','community','temperature','source','notes','status','nextAction','nextFollowUp','contentId'])if(k in b)l[k]=String(b[k]??'');if(Array.isArray(b.interests))l.interests=b.interests;l.updatedAt=new Date().toISOString();save();return json(req,res,200,l)}

 if(lu&&m==='DELETE'){const i=state.leads.findIndex(x=>x.id===lu[1]);if(i<0)return json(req,res,404,{error:'Lead não encontrado'});state.leads.splice(i,1);save();return json(req,res,200,{ok:true})}

 if(p==='/api/leads/import'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const rows=Array.isArray(b.rows)?b.rows:[];let imported=0,duplicates=0;for(const r of rows.slice(0,5000)){const phone=cleanPhone(r.phone),email=String(r.email||'').trim().toLowerCase(),dupe=state.leads.some(x=>x.clientId===c.id&&((phone&&cleanPhone(x.phone)===phone)||(email&&String(x.email||'').toLowerCase()===email)));if(dupe){duplicates++;continue}state.leads.push({id:id('lead'),clientId:c.id,name:String(r.name||''),phone:String(r.phone||''),email:String(r.email||''),company:String(r.company||''),community:'',temperature:String(r.temperature||'frio'),interests:r.interest?[String(r.interest)]:[],source:String(r.source||'CSV'),notes:String(r.notes||''),status:String(r.status||'Novo'),nextAction:'',nextFollowUp:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});imported++}save();return json(req,res,200,{imported,duplicates,total:rows.length})}

 const lmmsg=p.match(/^\/api\/leads\/([^/]+)\/message$/);if(lmmsg&&m==='POST'){const l=state.leads.find(x=>x.id===lmmsg[1]);if(!l)return json(req,res,404,{error:'Lead não encontrado'});let b=await body(req),type=String(b.type||'followup'),message=leadMessage(l,type);return json(req,res,200,{message,whatsappUrl:l.phone?`https://wa.me/${cleanPhone(l.phone)}?text=${encodeURIComponent(message)}`:''})}



 if(p==='/api/drafts'&&m==='POST'){let b=await body(req),cid=String(b.clientId||'');if(!clientById(cid))return json(req,res,404,{error:'Empresa não encontrada'});const key=cid+':'+String(b.slot||'content');state.drafts[key]={kind:String(b.kind||'post'),goal:String(b.goal||''),prompt:String(b.prompt||''),updatedAt:new Date().toISOString()};save();return json(req,res,200,{ok:true})}



 if(p==='/api/local/action'&&m==='POST'){let b=await body(req),action=String(b.action||'');const allowed=['MAKE_BACKUP','CHECK_NODE','CHECK_FFMPEG','OPEN_DATA_FOLDER','OPEN_PRODUCED_FOLDER'];if(!allowed.includes(action))return json(req,res,403,{error:'Ação local não autorizada.'});const d=await localAction(action);return json(req,res,d.ok?200:400,d)}

 if(p==='/api/command/interpret'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const text=String(b.text||'').trim();if(!text)return json(req,res,400,{error:'Digite um comando.'});let action='help',confidence=0.5;const low=text.toLowerCase();const rules=[['multinetwork',/todas.{0,20}redes|todas as minhas redes/],['ebook',/e-?book|ebook/],['slides',/slide|apresenta[cç][aã]o/],['newsletter',/newsletter|newslater/],['avatar',/avatar|g[eê]meo digital/],['video',/v[ií]deo|reel/],['schedule',/program|agend/],['leads',/lead/],['library',/biblioteca|conte[uú]dos pendentes|pend[eê]ncia/],['research',/pesquis|not[ií]cia/],['post',/post|linkedin|instagram|facebook/],['settings',/conect|configur|api|chave/],['backup',/backup|c[oó]pia de seguran[cç]a/],['local',/abrir.{0,20}pasta|ffmpeg|node\.js|nodejs/]];for(const [a,re] of rules)if(re.test(low)){action=a;confidence=.82;break}try{if(JEV_ENABLED&&keyFor(c)){const payload={model:JEV_MODEL,state:{command:text},questions:{action:{type:'choice',instructions:'Escolha somente a ação explicitamente solicitada. Não amplie o escopo.',criteria:{multinetwork:'Criar conteúdo adaptado para todas as redes conectadas',ebook:'Criar ebook',slides:'Criar slides ou apresentação',newsletter:'Criar newsletter',video:'Criar vídeo ou roteiro de vídeo',avatar:'Criar ou usar avatar',schedule:'Programar ou agendar publicação',leads:'Ver ou trabalhar leads',library:'Ver conteúdos ou pendências',research:'Pesquisar ou ver notícias',post:'Criar conteúdo para uma rede específica',settings:'Configurar ou conectar serviço',backup:'Criar backup local seguro',local:'Executar uma ação local autorizada no Windows, como abrir pasta ou verificar dependência',help:'Pedir orientação ao Max'}}}};const d=await openrouterDecision(c,payload),a=d.answers?.action;if(a?.choice){action=a.choice;confidence=Number(a.confidence||Math.max(...Object.values(a.probabilities||{}).map(Number).filter(Number.isFinite),0.7))}}}catch(e){audit('command_jev_fallback',e.message)}return json(req,res,200,{action,confidence,text})}




 if(p==='/api/pages/create'&&m==='POST'){
  let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});
  const request=cutStr(b.request,1500);if(request.length<8)return json(req,res,400,{error:'Conte o que você quer vender. Exemplo: página para vender a minha mentoria de liderança.'});
  const cap=canUse(c,'salespage');if(!cap.ok)return json(req,res,409,{error:cap.error});
  const rk=c.id+':page';if(state.reservations.includes(rk))return json(req,res,409,{error:'Já existe uma página sendo criada para esta empresa.'});
  try{
   const credits=await normalizedCredits(c).catch(()=>null);if(credits&&credits.available!=null&&credits.available<=0&&!geminiKeyFor(c))return json(req,res,402,{error:'Saldo de IA esgotado. Reabasteça sua OpenRouter para continuar usando os recursos com IA.',aiNoBalance:true});
   state.reservations.push(rk);save();
   const prompt=salesPrompt(request),out=await promptEngine(c,'salespage',systemPrompt(c,'salespage',request),prompt,3500),bl=parseNetworkBlocks(out.text),g=k=>promptClean(bl[k]||'');
   const headline=cutStr(g('HEADLINE').replace(/\n+/g,' '),SALES_LIMITS.headline),sub=cutStr(g('SUB').replace(/\n+/g,' '),SALES_LIMITS.sub);
   if(!headline||!sub||!(g('BENEFICIOS')||g('PROBLEMA')))throw new Error('A IA não devolveu todas as partes da página. Reformule o pedido e tente de novo. Nenhum crédito interno foi consumido.');
   const now=new Date().toISOString(),pg={id:id('pag'),clientId:c.id,name:cutStr(b.name||request,SALES_LIMITS.name),request,headline,sub,problema:cutStr(g('PROBLEMA'),SALES_LIMITS.problema),beneficios:cutStr(g('BENEFICIOS'),SALES_LIMITS.beneficios),como:cutStr(g('COMO'),SALES_LIMITS.como),paraQuem:cutStr(g('PARAQUEM'),SALES_LIMITS.paraQuem),fechamento:cutStr(g('FECHAMENTO'),SALES_LIMITS.fechamento),ctaLabel:cutStr(g('CTA').replace(/\n+/g,' '),SALES_LIMITS.ctaLabel)||'Quero saber mais',ctaMode:'form',ctaUrl:'',brandName:c.name||'',theme:{primary:HEXC.test((c.brand?.colors||[])[0])?c.brand.colors[0]:'#031B46',accent:HEXC.test((c.brand?.colors||[])[1])?c.brand.colors[1]:'#C9A227'},promos:[],activePromoId:'',costUsd:Number(out.cost||0),providerModel:out.model,createdAt:now,updatedAt:now};
   state.pages.push(pg);recordUse(c,'salespage',out.cost,{pageId:pg.id,provider:out.provider||'openrouter'});
   return json(req,res,200,pg);
  }catch(e){if(e.providerCost)recordProviderCost(c,'salespage',e.providerCost,e.model,'failed',{reason:e.message});audit('page_error',e.message);return json(req,res,e.code==='NO_KEY'?400:502,{error:e.message,chargedInternal:false})}finally{state.reservations=state.reservations.filter(x=>x!==rk);save()}
 }
 if(p==='/api/pages'&&m==='GET'){const cid=u.searchParams.get('clientId');return json(req,res,200,{pages:state.pages.filter(x=>!cid||x.clientId===cid).sort((a,b)=>a.createdAt<b.createdAt?1:-1),links:pageLinksInfo(cid)})}
 const lpg=p.match(/^\/api\/links\/([^/]+)\/page$/);
 if(lpg&&m==='POST'){const l=state.links.find(x=>x.id===lpg[1]&&x.action==='page');if(!l)return json(req,res,404,{error:'Link não encontrado'});let b=await body(req);const pg=state.pages.find(x=>x.id===b.pageId&&x.clientId===l.clientId);if(!pg)return json(req,res,404,{error:'Página não encontrada'});l.pageId=pg.id;l.updatedAt=new Date().toISOString();audit('page_link_swap',`${l.id}->${pg.id}`);save();return json(req,res,200,{ok:true,links:pageLinksInfo(l.clientId)})}
 const pgm=p.match(/^\/api\/pages\/([^/]+)(?:\/(preview|link|export|qr))?$/);
 if(pgm){
  const pg=state.pages.find(x=>x.id===pgm[1]);if(!pg)return json(req,res,404,{error:'Página não encontrada'});const c=clientById(pg.clientId);const sub=pgm[2]||'';
  if(sub==='preview'&&m==='GET')return send(req,res,200,renderSalesPage(c,pg,{preview:true}),'text/html; charset=utf-8',{'X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'"});
  if(sub===''&&m==='PUT'){let b=await body(req);const nx={...pg,theme:{...(pg.theme||{})}};
   for(const k of Object.keys(SALES_LIMITS))if(b[k]!==undefined)nx[k]=cutStr(b[k],SALES_LIMITS[k]);
   if(!nx.headline)return json(req,res,400,{error:'A página precisa de um título principal.'});
   if(b.ctaMode!==undefined){if(!['form','redirect'].includes(b.ctaMode))return json(req,res,400,{error:'Modo do botão inválido.'});nx.ctaMode=b.ctaMode}
   if(b.ctaUrl!==undefined){const uu=cutStr(b.ctaUrl,600);if(uu&&!/^https?:\/\/[^\s]+$/i.test(uu))return json(req,res,400,{error:'O link do botão deve começar com https://. Pode ser o seu site ou o link do WhatsApp.'});nx.ctaUrl=uu}
   if(nx.ctaMode==='redirect'&&!nx.ctaUrl)return json(req,res,400,{error:'Para o botão levar a um link, informe o endereço de destino.'});
   if(b.publishedUrl!==undefined){const uu=cutStr(b.publishedUrl,300);if(uu&&!/^https:\/\/[^\s]+$/i.test(uu))return json(req,res,400,{error:'O endereço publicado deve começar com https://. É o endereço que o site gratuito te deu.'});nx.publishedUrl=uu}
   if(b.linkTarget!==undefined){if(!['platform','published'].includes(b.linkTarget))return json(req,res,400,{error:'Destino do link inválido.'});nx.linkTarget=b.linkTarget}
   if(nx.linkTarget==='published'&&!nx.publishedUrl)return json(req,res,400,{error:'Para o link levar à página publicada, informe o endereço dela.'});
   if(b.theme&&typeof b.theme==='object'){for(const k of ['primary','accent'])if(b.theme[k]!==undefined){if(!HEXC.test(String(b.theme[k])))return json(req,res,400,{error:'Cor inválida. Use o seletor de cores.'});nx.theme[k]=String(b.theme[k])}}
   if(Array.isArray(b.promos)){nx.promos=b.promos.slice(0,10).map(sanitizePromo)}
   if(b.activePromoId!==undefined){nx.activePromoId=(nx.promos||[]).some(x=>x.id===b.activePromoId)?String(b.activePromoId):''}
   else if(!(nx.promos||[]).some(x=>x.id===nx.activePromoId))nx.activePromoId='';
   Object.assign(pg,nx);pg.updatedAt=new Date().toISOString();save();return json(req,res,200,pg)}
  if(sub===''&&m==='DELETE'){state.pages=state.pages.filter(x=>x.id!==pg.id);audit('page_delete',pg.id);save();return json(req,res,200,{ok:true,orphanLinks:state.links.filter(l=>l.action==='page'&&l.pageId===pg.id).length})}
  if(sub==='link'&&m==='POST'){let b=await body(req);const pl=state.plans[c.plan]||state.plans.economico,count=state.links.filter(x=>x.clientId===c.id&&x.active).length;if(count>=pl.limits.links)return json(req,res,409,{error:'Limite de links do plano atingido.'});const l={id:id('lnk'),clientId:c.id,token:crypto.randomBytes(7).toString('base64url'),name:cutStr(b.name||('Página: '+pg.name),80),action:'page',pageId:pg.id,target:'',instructions:'',expiresAt:'',active:true,hits:0,clicks:0,createdAt:new Date().toISOString(),submissions:[]};state.links.push(l);save();return json(req,res,200,{...l,url:BASE_URL+'/link/'+l.token,publicUrl:isPublicBase()})}
  if(sub==='qr'&&m==='POST'){let b=await body(req);const target=pg.publishedUrl;if(!target)return json(req,res,409,{error:'Informe primeiro o endereço onde a página foi publicada.'});const format=b.format==='svg'?'svg':'png',fn=`qr_pagina_${safeName(pg.name.slice(0,30))}_${pg.id}.${format}`;fs.writeFileSync(path.join(EXPORTS,fn),format==='svg'?makeQrSvg(target):makeQrPng(target));return json(req,res,200,{url:`/exports/${fn}`,target,format})}
  if(sub==='export'&&m==='POST'){if(pg.ctaMode!=='redirect'||!pg.ctaUrl)return json(req,res,409,{error:'Para publicar em um site gratuito, escolha “Abre um link” no botão e informe o endereço (por exemplo, o seu WhatsApp).'});let t=pg.ctaUrl;try{const u2=new URL(pg.ctaUrl);u2.searchParams.set('utm_source','pagina');u2.searchParams.set('utm_campaign',pg.id);const pr=promoActive(pg);if(pr)u2.searchParams.set('utm_content',pr.id);t=u2.href}catch{}const html=renderSalesPage(c,pg,{exportUrl:t});const dir=path.join(PRODUCED,pg.id);fs.mkdirSync(dir,{recursive:true});const fn='pagina_'+safeName(pg.name.slice(0,40))+'.zip';fs.writeFileSync(path.join(dir,fn),zipStore([['index.html',html],['LEIA-ME.txt','Página de venda pronta para hospedar\n\nComo publicar em um endereço gratuito (exemplos):\n- Netlify Drop (app.netlify.com/drop): arraste esta pasta ou o arquivo index.html para a área de envio.\n- Cloudflare Pages, envio direto (dashboard): arraste esta pasta ou um ZIP e o projeto fica em NOME.pages.dev.\nOs dois têm plano gratuito com limites mensais (na Netlify, por créditos de uso). Confira se o limite atende o seu caso.\n\nDepois de publicar, copie o endereço que a hospedagem mostrar e cole na plataforma, no campo “Endereço que o site gratuito mostrou”. A plataforma gera o QR Code desse endereço.\n\nPara mudar texto, promoção ou dados:\n1. Edite na plataforma e baixe uma nova cópia.\n2. Na hospedagem, envie a nova cópia no mesmo projeto. O endereço continua o mesmo.\n\nEsta cópia é fixa e o botão leva ao destino que você definiu. Para trocar sem enviar arquivo, use o link dinâmico da plataforma.\n']]));return json(req,res,200,{url:`/files/${pg.id}/${fn}`})}
  return json(req,res,405,{error:'Método não permitido'})
 }
 if(p==='/api/prompt/create'&&m==='POST'){
  let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});
  const request=String(b.request||'').trim();if(request.length<8)return json(req,res,400,{error:'Conte em uma frase o que você quer criar. Exemplo: uma logomarca para a minha empresa.'});if(request.length>2000)return json(req,res,400,{error:'O pedido está muito longo. Resuma em até 2000 caracteres.'});
  const target=Object.keys(PROMPT_TARGETS).includes(b.target)?b.target:'gemini',type=Object.keys(PROMPT_TYPES).includes(b.type)?b.type:promptGuessType(request);
  const cap=canUse(c,'promptgen');if(!cap.ok)return json(req,res,409,{error:cap.error});
  const rk=c.id+':prompt';if(state.reservations.includes(rk))return json(req,res,409,{error:'Já existe um prompt sendo criado para esta empresa.'});
  try{
   const credits=await normalizedCredits(c).catch(()=>null);if(credits&&credits.available!=null&&credits.available<=0&&!geminiKeyFor(c))return json(req,res,402,{error:'Saldo de IA esgotado. Reabasteça sua OpenRouter para continuar usando os recursos com IA.',aiNoBalance:true});
   state.reservations.push(rk);save();
   const out=await promptEngine(c,'promptgen','Você escreve prompts claros, completos e prontos para colar em ferramentas de IA. Responda sempre em português do Brasil.',promptMeta(c,request,target,type),2000);
   const text=promptClean(out.text);if(text.length<40)throw new Error('A IA não devolveu um prompt utilizável. Reformule o pedido e tente de novo. Nenhum crédito interno foi consumido.');
   const it={id:id('prm'),clientId:c.id,request,target,type,typeLabel:PROMPT_TYPES[type].label,targetLabel:PROMPT_TARGETS[target],prompt:text,canRunHere:PROMPT_TYPES[type].here,result:'',resultFiles:null,costUsd:Number(out.cost||0),providerModel:out.model,provider:out.provider||'openrouter',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   state.prompts.push(it);recordUse(c,'promptgen',out.cost,{promptId:it.id,provider:it.provider});
   return json(req,res,200,it);
  }catch(e){if(e.providerCost)recordProviderCost(c,'promptgen',e.providerCost,e.model,'failed',{reason:e.message});audit('prompt_error',e.message);return json(req,res,e.code==='NO_KEY'?400:502,{error:e.message,chargedInternal:false})}finally{state.reservations=state.reservations.filter(x=>x!==rk);save()}
 }
 if(p==='/api/prompts'&&m==='GET'){const cid=u.searchParams.get('clientId');return json(req,res,200,state.prompts.filter(x=>!cid||x.clientId===cid).sort((a,b)=>a.createdAt<b.createdAt?1:-1).slice(0,30))}
 const prr=p.match(/^\/api\/prompts\/([^/]+)\/run$/);
 if(prr&&m==='POST'){
  const it=state.prompts.find(x=>x.id===prr[1]);if(!it)return json(req,res,404,{error:'Prompt não encontrado'});const c=clientById(it.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});
  if(!it.canRunHere)return json(req,res,409,{error:'Este tipo de pedido não é criado aqui. Copie o prompt e cole na IA de imagem ou de código que você usa.'});
  let b=await body(req);const prompt=String(b.prompt||it.prompt).trim();if(prompt.length<20)return json(req,res,400,{error:'O prompt está vazio.'});if(prompt.length>12000)return json(req,res,400,{error:'O prompt está muito longo.'});
  const cap=canUse(c,'promptrun');if(!cap.ok)return json(req,res,409,{error:cap.error});
  const rk=c.id+':promptrun';if(state.reservations.includes(rk))return json(req,res,409,{error:'Já existe uma criação em andamento para esta empresa.'});
  try{
   state.reservations.push(rk);save();
   const isSheet=it.type==='planilha';
   const wrapped=`[[PROMPTRUN]]${isSheet?' PLANILHA':''}\n${prompt}\n\n${isSheet?'FORMATO DE SAÍDA OBRIGATÓRIO: responda somente com a planilha em CSV, usando ponto e vírgula como separador, primeira linha com os nomes das colunas, sem texto antes ou depois e sem Markdown.':'Entregue somente o resultado final, em texto simples, sem Markdown e sem comentários sobre o que fez.'}`;
   const out=await promptEngine(c,'promptrun','Você executa o pedido do cliente com precisão, em português do Brasil, sem inventar dados.',wrapped,isSheet?4000:5000);
   let text=promptClean(out.text);if(text.length<20)throw new Error('A IA não devolveu conteúdo utilizável. Nenhum crédito interno foi consumido.');
   if(isSheet){const lines=text.split('\n').filter(x=>x.trim());if(lines.length<2||!lines.some(x=>x.includes(';')))throw new Error('A IA não devolveu uma planilha válida. Tente de novo ou ajuste o prompt. Nenhum crédito interno foi consumido.')}
   const dir=path.join(PRODUCED,it.id);fs.mkdirSync(dir,{recursive:true});let files={};
   if(isSheet){const fn=safeName(it.request.slice(0,40)||'planilha')+'.csv';fs.writeFileSync(path.join(dir,fn),'﻿'+text.replace(/\n/g,'\r\n'));files={csv:`/files/${it.id}/${fn}`}}
   else files=createTextFiles({id:it.id,title:it.request.slice(0,60),kind:it.type,text});
   it.prompt=prompt;it.result=text;it.resultFiles=files;it.updatedAt=new Date().toISOString();recordUse(c,'promptrun',out.cost,{promptId:it.id,provider:out.provider||'openrouter'});save();
   return json(req,res,200,it);
  }catch(e){if(e.providerCost)recordProviderCost(c,'promptrun',e.providerCost,e.model,'failed',{reason:e.message});audit('promptrun_error',e.message);return json(req,res,e.code==='NO_KEY'?400:502,{error:e.message,chargedInternal:false})}finally{state.reservations=state.reservations.filter(x=>x!==rk);save()}
 }
 if(p==='/api/quick/create'&&m==='POST'){
  let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});
  const request=String(b.request||'').trim();if(request.length<8)return json(req,res,400,{error:'Conte em uma frase o que você quer publicar.'});
  const cap=canUse(c,'multinetwork');if(!cap.ok)return json(req,res,409,{error:cap.error});
  const rk=c.id+':quick';if(state.reservations.includes(rk))return json(req,res,409,{error:'Já existe uma criação em andamento para esta empresa.'});
  try{
   const credits=await normalizedCredits(c).catch(()=>null);if(credits&&credits.available!=null&&credits.available<=0)return json(req,res,402,{error:'Saldo de IA esgotado. Reabasteça sua OpenRouter para continuar usando os recursos com IA.',aiNoBalance:true});
   state.reservations.push(rk);save();
   const nets=quickNetworks(c,b.networks),format=(['post','carousel'].includes(b.format)?b.format:(/carross/i.test(request)?'carousel':'post')),prompt=quickPrompt(request,nets,format);
   const out=await generateVerified(c,{kind:'multinetwork',goal:request,prompt,models:(state.modelMatrix[c.plan]||state.modelMatrix.economico).text,maxTokens:format==='carousel'?4500:3500});
   const blocks=parseNetworkBlocks(out.text),groupId=id('grp'),items=[],warnings=[],perCost=Number(out.totalCost||0)/Math.max(1,nets.length);
   for(const n of nets){const spec=NETWORKS[n],text=repairText(blocks[spec.marker]||'',prompt);if(!text||text.length<20){warnings.push(`A IA não devolveu a versão para ${spec.label}. Peça novamente para essa rede.`);continue}
    if(text.length>spec.max*(format==='carousel'?2:1))warnings.push(`${spec.label}: o texto tem ${text.length} caracteres, acima do recomendado para a rede.`);
    const ct={id:id('cnt'),clientId:c.id,kind:format,network:n,groupId,title:`${spec.label}: ${request.slice(0,60)}`,goal:request,prompt:request,text,status:'Rascunho',quality:{status:'aprovado',issues:[],jev:out.validation},routing:{engine:out.route.engine,class:out.route.class,confidence:out.route.confidence,requiresExternalFacts:out.route.requiresExternalFacts,escalated:out.escalated},model:'motor interno',providerModel:out.model,provider:out.provider||'openrouter',costUsd:perCost,usage:out.usage||{},image:null,trackLinkId:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),files:{}};
    ct.files=createTextFiles(ct);state.contents.push(ct);items.push(ct)}
   if(!items.length)throw new Error('A IA não devolveu as versões por rede. Reformule o pedido e tente de novo. Nenhum crédito interno foi consumido.');
   workSession(c,{title:request.slice(0,80),type:'multinetwork',relatedType:'content',relatedId:items[0].id,status:'Concluído',summary:request.slice(0,180)});
   delete state.drafts[c.id+':content'];save();recordUse(c,'multinetwork',out.totalCost,{groupId,networks:items.map(x=>x.network),jev:true,route:out.route.class,provider:out.provider||'openrouter',escalated:out.escalated});
   return json(req,res,200,{groupId,items,warnings,costUsd:Number(out.totalCost||0)});
  }catch(e){if(e.providerCost)recordProviderCost(c,'multinetwork',e.providerCost,e.model,'failed',{reason:e.message});audit('quick_error',e.message);return json(req,res,e.code==='NO_KEY'?400:502,{error:e.message,chargedInternal:false})}finally{state.reservations=state.reservations.filter(x=>x!==rk);save()}
 }
 const cpk=p.match(/^\/api\/contents\/([^/]+)\/package$/);
 if(cpk&&m==='POST'){const ct=state.contents.find(x=>x.id===cpk[1]);if(!ct)return json(req,res,404,{error:'Conteúdo não encontrado'});if(!String(ct.text||'').trim())return json(req,res,409,{error:'Este conteúdo está sem texto.'});const net=NETWORKS[ct.network]?.label||'Rede';const entries=[['legenda.txt',ct.text],['LEIA-ME.txt',`Pacote para publicar manualmente\nRede: ${net}\nTítulo: ${ct.title}\nStatus na plataforma: ${ct.status}\n\n1. Abra a rede escolhida.\n2. Envie a imagem (se houver) e cole o texto de legenda.txt.\n3. Confira o texto antes de publicar.\n`]];const img=contentImage(ct);if(img){const f=path.join(MEDIA,safeName(path.basename(img.url)));if(f.startsWith(MEDIA)&&fs.existsSync(f))entries.push(['imagem'+(path.extname(f)||'.png'),fs.readFileSync(f)]);else return json(req,res,409,{error:'A imagem anexada não foi encontrada. Anexe novamente.'})}const dir=path.join(PRODUCED,ct.id);fs.mkdirSync(dir,{recursive:true});const fn='pacote_'+safeName(ct.network||'post')+'.zip';fs.writeFileSync(path.join(dir,fn),zipStore(entries));return json(req,res,200,{url:`/files/${ct.id}/${fn}`,hasImage:!!img})}
 const cqr=p.match(/^\/api\/contents\/([^/]+)\/queue-remove$/);
 if(cqr&&m==='POST'){const ct=state.contents.find(x=>x.id===cqr[1]);if(!ct)return json(req,res,404,{error:'Conteúdo não encontrado'});const q=contentQueued(ct.id);if(!q)return json(req,res,200,{ok:true,removed:0});q.status='Removida';q.removedAt=new Date().toISOString();ct.status='Em revisão';ct.updatedAt=new Date().toISOString();save();return json(req,res,200,{ok:true,removed:1})}
 const ctk=p.match(/^\/api\/contents\/([^/]+)\/track$/);
 if(ctk&&m==='POST'){const ct=state.contents.find(x=>x.id===ctk[1]);if(!ct)return json(req,res,404,{error:'Conteúdo não encontrado'});const c=clientById(ct.clientId);let b=await body(req);const old=state.links.find(x=>x.id===ct.trackLinkId&&x.active);if(old)return json(req,res,200,{...old,url:BASE_URL+'/link/'+old.token,publicUrl:isPublicBase()});if(b.lookup)return json(req,res,200,{none:true});const pl=state.plans[c.plan]||state.plans.economico,count=state.links.filter(x=>x.clientId===c.id&&x.active).length;if(count>=pl.limits.links)return json(req,res,409,{error:'Limite de links do plano atingido.'});let action=b.action==='form'?'form':'redirect',target=String(b.target||'').trim();if(action==='redirect'){if(!/^https?:\/\//i.test(target))return json(req,res,400,{error:'Informe o endereço de destino começando com https://. Pode ser o seu site ou o link do WhatsApp.'});try{const u2=new URL(target);u2.searchParams.set('utm_source',ct.network||'post');u2.searchParams.set('utm_campaign',ct.id);target=u2.href}catch{return json(req,res,400,{error:'Endereço de destino inválido.'})}}const l={id:id('lnk'),clientId:c.id,contentId:ct.id,token:crypto.randomBytes(7).toString('base64url'),name:'Post: '+String(ct.title||'').slice(0,60),action,target:action==='redirect'?target:'',instructions:action==='form'?'Deixe seus dados que entramos em contato.':'',expiresAt:'',active:true,hits:0,createdAt:new Date().toISOString(),submissions:[]};state.links.push(l);ct.trackLinkId=l.id;ct.updatedAt=new Date().toISOString();save();return json(req,res,200,{...l,url:BASE_URL+'/link/'+l.token,publicUrl:isPublicBase()})}
 if(p==='/api/ai/generate'&&m==='POST'){

  let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const kind=String(b.kind||'post'),cap=canUse(c,kind);if(!cap.ok)return json(req,res,409,{error:cap.error});const rk=c.id+':'+kind;if(state.reservations.includes(rk))return json(req,res,409,{error:'Já existe uma geração deste tipo em andamento para esta empresa.'});

  try{const credits=await normalizedCredits(c).catch(()=>null);if(credits&&credits.available!=null&&credits.available<=0)return json(req,res,402,{error:'Saldo de IA esgotado. Reabasteça sua OpenRouter para continuar usando os recursos com IA.',aiNoBalance:true});state.reservations.push(rk);save();const family=(kind==='analysis'||kind==='research'||kind==='ebook')?'analysis':'text',models=(state.modelMatrix[c.plan]||state.modelMatrix.economico)[family],userPrompt=String(b.prompt||''),goal=String(b.goal||'');const out=await generateVerified(c,{kind,goal,prompt:userPrompt,models,maxTokens:kind==='ebook'?6500:3500});const txt=out.text;if(!txt||txt.length<20)throw new Error('A IA respondeu, mas não entregou conteúdo utilizável. Nenhum crédito interno foi consumido.');const content={id:id('cnt'),clientId:c.id,kind,title:String(b.title||({post:'Post',carousel:'Carrossel',script:'Roteiro de vídeo',analysis:'Análise estratégica',research:'Pesquisa',ebook:'E-book',review:'Revisão',newsletter:'Newsletter',multinetwork:'Conteúdo para todas as redes',slides:'Apresentação'}[kind]||'Conteúdo')),goal,prompt:userPrompt,text:txt,status:'Rascunho',quality:{status:'aprovado',issues:[],jev:out.validation},routing:{engine:out.route.engine,class:out.route.class,confidence:out.route.confidence,requiresExternalFacts:out.route.requiresExternalFacts,escalated:out.escalated},model:'motor interno',providerModel:out.model,provider:out.provider||'openrouter',costUsd:Number(out.totalCost||0),usage:out.usage||{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),files:{}};content.files=createTextFiles(content);state.contents.push(content);workSession(c,{title:content.title,type:kind,relatedType:'content',relatedId:content.id,status:'Concluído',summary:String(content.goal||content.prompt||'').slice(0,180)});delete state.drafts[c.id+':content'];save();recordUse(c,kind,out.totalCost,{contentId:content.id,jev:true,route:out.route.class,provider:out.provider||'openrouter',escalated:out.escalated});return json(req,res,200,{...content,model:'motor interno',contentId:content.id})}catch(e){if(e.providerCost)recordProviderCost(c,kind,e.providerCost,e.model,'failed',{reason:e.message});audit('ai_error',e.message);return json(req,res,e.code==='NO_KEY'?400:502,{error:e.message,chargedInternal:false})}finally{state.reservations=state.reservations.filter(x=>x!==rk);save()}

 }



 if(p==='/api/campaigns/generate'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const plan=state.plans[c.plan]||state.plans.economico;if(!plan.features?.campaign)return json(req,res,403,{error:'Campanha 1 Clique não está incluída neste plano.'});const cap=canUse(c,'campaign');if(!cap.ok)return json(req,res,409,{error:cap.error});const prompt=`Crie uma campanha integrada. Fonte: ${String(b.source||'')}\nObjetivo: ${String(b.objective||'')}\nPúblico: ${String(b.audience||'')}\nPeríodo: ${String(b.duration||'')}\nEntregue seções claras para LinkedIn, Instagram, comunidade, roteiro de vídeo, e-mail/newsletter e WhatsApp. Não publique nada.`;try{const out=await generateVerified(c,{kind:'campaign',goal:String(b.objective||''),prompt,models:(state.modelMatrix[c.plan]||state.modelMatrix.economico).analysis,maxTokens:5500});const campaign={id:id('cmp'),clientId:c.id,name:String(b.name||b.objective||'Campanha'),source:String(b.source||''),objective:String(b.objective||''),audience:String(b.audience||''),duration:String(b.duration||''),text:out.text,status:'Rascunho',quality:{status:'aprovado',jev:out.validation},routing:{engine:out.route.engine,class:out.route.class,confidence:out.route.confidence,escalated:out.escalated},providerModel:out.model,provider:out.provider||'openrouter',costUsd:Number(out.totalCost||0),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.campaigns.push(campaign);workSession(c,{title:campaign.name,type:'campanha',relatedType:'campaign',relatedId:campaign.id,status:'Concluído',summary:campaign.objective});save();recordUse(c,'campaign',out.totalCost,{campaignId:campaign.id,jev:true,route:out.route.class,escalated:out.escalated});return json(req,res,200,campaign)}catch(e){if(e.providerCost)recordProviderCost(c,'campaign',e.providerCost,e.model,'failed');return json(req,res,502,{error:e.message,chargedInternal:false})}}

 if(p==='/api/campaigns'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const campaign={id:id('cmp'),clientId:c.id,name:String(b.name||'Campanha'),source:String(b.source||''),objective:String(b.objective||''),audience:String(b.audience||''),duration:String(b.duration||''),text:String(b.text||''),status:'Rascunho',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.campaigns.push(campaign);save();return json(req,res,200,campaign)}



 if(p==='/api/radar/config'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});c.radar={...c.radar,topics:Array.isArray(b.topics)?b.topics:c.radar.topics,sources:Array.isArray(b.sources)?b.sources:c.radar.sources,schedule:b.schedule?{...c.radar.schedule,...b.schedule}:c.radar.schedule};save();return json(req,res,200,{ok:true})}

 if(p==='/api/radar/sources'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});c.radar.approvedSources=Array.isArray(c.radar.approvedSources)?c.radar.approvedSources:[];c.radar.sourceSuggestions=Array.isArray(c.radar.sourceSuggestions)?c.radar.sourceSuggestions:[];const action=String(b.action||'add');if(action==='add'){const item={id:id('src'),name:String(b.name||'').trim(),url:String(b.url||'').trim(),official:!!b.official,active:true,approvedAt:new Date().toISOString()};if(!item.name)return json(req,res,400,{error:'Informe o nome da fonte.'});c.radar.approvedSources.push(item)}else if(action==='suggest'){c.radar.sourceSuggestions.push({id:id('sug'),name:String(b.name||'').trim(),url:String(b.url||'').trim(),reason:String(b.reason||''),createdAt:new Date().toISOString()})}else if(action==='approve'){const sug=c.radar.sourceSuggestions.find(x=>x.id===b.id);if(sug){c.radar.approvedSources.push({id:id('src'),name:sug.name,url:sug.url,official:false,active:true,approvedAt:new Date().toISOString()});c.radar.sourceSuggestions=c.radar.sourceSuggestions.filter(x=>x.id!==b.id)}}else if(action==='toggle'){const x=c.radar.approvedSources.find(x=>x.id===b.id);if(x)x.active=!x.active}else if(action==='delete'){c.radar.approvedSources=c.radar.approvedSources.filter(x=>x.id!==b.id)}save();return json(req,res,200,{ok:true,approvedSources:c.radar.approvedSources,sourceSuggestions:c.radar.sourceSuggestions})}

 if(p==='/api/radar/refresh'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const d=await refreshApprovedNews(c);return json(req,res,200,d)}

 if(p==='/api/radar/finding'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const src=String(b.source||''),approved=(c.radar.approvedSources||[]).some(x=>x.active!==false&&String(x.name||'').toLowerCase()===src.toLowerCase());const f={id:id('rad'),title:String(b.title||''),url:String(b.url||''),source:src,summary:String(b.summary||''),status:'Novo',sourceApproved:approved,createdAt:new Date().toISOString()};c.radar.findings.unshift(f);save();return json(req,res,200,f)}



 if(p==='/api/work-sessions'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const w=workSession(c,{title:b.title,type:b.type,relatedType:b.relatedType,relatedId:b.relatedId,status:b.status||'Em andamento',summary:b.summary});save();return json(req,res,200,w)}

 const wu=p.match(/^\/api\/work-sessions\/([^/]+)$/);if(wu&&m==='PUT'){const w=state.workSessions.find(x=>x.id===wu[1]);if(!w)return json(req,res,404,{error:'Trabalho não encontrado'});let b=await body(req);if('title'in b)w.title=String(b.title||w.title).slice(0,120);if('pinned'in b)w.pinned=!!b.pinned;if('archived'in b)w.archived=!!b.archived;if('status'in b)w.status=String(b.status||w.status);w.updatedAt=new Date().toISOString();save();return json(req,res,200,w)}

 if(wu&&m==='DELETE'){const w=state.workSessions.find(x=>x.id===wu[1]);if(!w)return json(req,res,404,{error:'Trabalho não encontrado'});let b={};try{b=await body(req)}catch{};if(b.deleteLinked&&w.relatedType==='content')state.contents=state.contents.filter(x=>x.id!==w.relatedId);if(b.deleteLinked&&w.relatedType==='campaign')state.campaigns=state.campaigns.filter(x=>x.id!==w.relatedId);state.workSessions=state.workSessions.filter(x=>x.id!==w.id);save();return json(req,res,200,{ok:true})}

 const cu=p.match(/^\/api\/contents\/([^/]+)$/);if(cu&&m==='PUT'){const ct=state.contents.find(x=>x.id===cu[1]);if(!ct)return json(req,res,404,{error:'Conteúdo não encontrado'});let b=await body(req);if(('text'in b||'imageAssetId'in b)&&contentQueued(ct.id))return json(req,res,409,{error:'Este conteúdo já está na fila de publicação. Retire da fila para editar.'});const wasApproved=ct.status==='Aprovado'&&!b.status;if('imageAssetId'in b){if(!b.imageAssetId){ct.image=null}else{const asset=(clientById(ct.clientId)?.media||[]).find(x=>x.id===b.imageAssetId);if(!asset||!/^image\//i.test(asset.type||''))return json(req,res,400,{error:'Escolha uma imagem (PNG ou JPG) da sua Biblioteca de materiais.'});ct.image={assetId:asset.id,url:asset.url,name:asset.name,type:asset.type}}if(wasApproved)ct.status='Em revisão'}if('text'in b){if(wasApproved&&String(b.text||'')!==String(ct.text||''))ct.status='Em revisão';ct.text=repairText(String(b.text||''),ct.prompt||'');const issues=qualityCheck(ct.text,ct.prompt||'');if(issues.length)return json(req,res,409,{error:'A edição ainda contém problema de qualidade: '+issues.join(', ')});ct.files={...ct.files,...createTextFiles(ct)}}if(['Agendado','Publicado'].includes(b.status))return json(req,res,409,{error:'Use o fluxo de publicação. O serviço precisa confirmar antes de marcar este estado.'});if(b.status&&['Rascunho','Em revisão','Aprovado','Arquivado'].includes(b.status))ct.status=b.status;if('scheduledFor'in b)ct.scheduledFor=String(b.scheduledFor||'');ct.updatedAt=new Date().toISOString();save();return json(req,res,200,ct)}

 if(p==='/api/export/material'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const content={id:id('cnt'),clientId:c.id,kind:'pdf',title:String(b.title||'Material'),goal:'',prompt:'',text:repairText(b.content||''),status:'Rascunho',quality:{status:'aprovado',issues:[]},model:'local',costUsd:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),files:{}};if(!content.text)return json(req,res,400,{error:'Não há conteúdo para exportar.'});content.files=createTextFiles(content);state.contents.push(content);save();recordUse(c,'pdf',0,{contentId:content.id});return json(req,res,200,{contentId:content.id,files:content.files})}

 if(p==='/api/export/slides'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const title=String(b.title||'Apresentação'),slides=parseSlides(b.content,title),fn=`${safeName(title)}_${Date.now()}.pptx`;fs.writeFileSync(path.join(EXPORTS,fn),makePptx(title,slides));return json(req,res,200,{url:'/exports/'+fn,slides:slides.length})}



 if(p==='/api/jobs'&&m==='POST'){let b=await body(req),c=clientById(b.clientId);if(!c)return json(req,res,404,{error:'Empresa não encontrada'});const kind=String(b.kind||'video'),cap=canUse(c,kind==='avatar'?'avatarVideo':'video');if(!cap.ok)return json(req,res,409,{error:cap.error});const job={id:id('job'),clientId:c.id,kind,status:'queued',spec:b.spec||{},createdAt:new Date().toISOString(),note:'Job registrado. A renderização só será cobrada quando o arquivo final existir.'};state.jobs.push(job);save();return json(req,res,200,job)}

 return json(req,res,404,{error:'not_found'});

}



const server=http.createServer((req,res)=>handle(req,res).catch(e=>{console.error(e);json(req,res,500,{error:'Erro interno: '+e.message})}));

server.listen(PORT,'127.0.0.1',()=>console.log(`Super Máquina v${APP_VERSION} em ${BASE_URL} | banco SQLite local`));

process.on('SIGTERM',()=>{try{store.close()}finally{server.close(()=>process.exit(0))}});

process.on('SIGINT',()=>{try{store.close()}finally{server.close(()=>process.exit(0))}});


