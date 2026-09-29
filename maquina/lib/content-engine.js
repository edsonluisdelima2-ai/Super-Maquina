'use strict';

const fs=require('fs'),path=require('path'),crypto=require('crypto');

const {spawn}=require('child_process');

const {zipStore,unzipStore,walk}=require('./zip');

const uid=p=>p+'_'+crypto.randomBytes(8).toString('hex');

const now=()=>new Date().toISOString();

const fail=m=>{throw new Error(m)};

const hash=async f=>{const h=crypto.createHash('sha256');for await(const b of fs.createReadStream(f))h.update(b);return h.digest('hex')};

function run(exe,args,opts={}){return new Promise((resolve,reject)=>{const ch=spawn(exe,args,{windowsHide:true,...opts});let out='',err='';ch.stdout.on('data',b=>out=(out+b).slice(-100000));ch.stderr.on('data',b=>err=(err+b).slice(-12000));ch.on('error',reject);ch.on('close',code=>code===0?resolve(out):reject(new Error(err||'Processamento interrompido ('+code+').')));})}

function transcriptValid(t){if(!t||!Array.isArray(t.segments)||!t.segments.length)fail('Nenhuma fala foi reconhecida. Confira o áudio do vídeo.');for(const s of t.segments)if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||typeof s.text!=='string')fail('Transcrição contém intervalo inválido.');return t}

function curate(t,client){

 const groups=[];let g=[];

 for(const s of t.segments){if(g.length&&s.end-g[0].start>65){groups.push(g);g=[]}g.push(s);if(s.end-g[0].start>=25&&/[.!?]$/.test(s.text.trim())){groups.push(g);g=[]}}

 if(g.length)groups.push(g);

 return groups.filter(a=>a.at(-1).end-a[0].start>=3).map(a=>{const text=a.map(s=>s.text).join(' '),low=text.toLowerCase();const type=/cliente|resultado|consegui|conquist/.test(low)?'prova social':/medo|obje[cç]|caro|dif[ií]cil/.test(low)?'objeção':/mentoria|compr|inscri|oferta/.test(low)?'venda':'autoridade';const products=(client.products||[]).map(p=>typeof p==='string'?p:p.name||p.title||'');const product=products.find(p=>p&&low.includes(p.toLowerCase()))||'';const score=10+(type==='prova social'?5:type==='objeção'?4:type==='venda'?3:0)+(product?3:0)+(/\?/.test(text)?2:0);return{id:uid('cut'),start:a[0].start,end:a.at(-1).end,text,theme:text.slice(0,90),hook:a[0].text,product,type,objective:type==='venda'?'Gerar conversa sobre a oferta':'Abrir conversa qualificada',cta:client.context?.cta||'Vamos conversar sobre como isso se aplica à sua empresa?',priority:score,method:'Curadoria local por sinais da transcrição; sugestão para revisão',status:'Sugerido'};}).sort((a,b)=>b.priority-a.priority).slice(0,8);

}

function stamp(sec){const ms=Math.max(0,Math.round(sec*1000)),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`}

function srt(t,start,end){let lines=[];for(const seg of t.segments){const words=seg.words?.length?seg.words:[{start:seg.start,end:seg.end,word:seg.text}];for(let i=0;i<words.length;i+=7){const a=words.slice(i,i+7),s=Math.max(start,a[0].start),e=Math.min(end,a.at(-1).end);if(e>s)lines.push(`${lines.length+1}\n${stamp(s-start)} --> ${stamp(e-start)}\n${a.map(w=>w.word).join(' ').replace(/\s+/g,' ').trim()}\n`)}}return lines.join('\n')}

function createEngine(ctx){

 const {root,data,getState,save,json,body,send}=ctx;

 const produced=path.join(data,'produced'),exportsDir=path.join(data,'exports');

 const ffmpeg=process.env.SMC_FFMPEG||path.join(root,'runtime','ffmpeg.exe');

 const python=process.env.SMC_PYTHON||(fs.existsSync(path.join(root,'runtime','python-standalone','python.exe'))?path.join(root,'runtime','python-standalone','python.exe'):path.join(root,'runtime','python','Scripts','python.exe'));

 const models=path.join(root,'runtime','models');

 const metricool=require('./metricool').createMetricool({...ctx,port:ctx.port||3080});

 let busy=false;

 const state=()=>getState();

 function transcriptionHealth(){
  const configured=state().transcription||{};
  const model=configured.model||'small';
  const modelFile=path.join(models,model,'model.bin');
  const checks={
   python:fs.existsSync(python),
   worker:fs.existsSync(path.join(root,'workers','transcribe.py')),
   installer:fs.existsSync(path.join(root,'workers','install-transcription.py')),
   ffmpeg:fs.existsSync(ffmpeg),
   model:fs.existsSync(modelFile)&&fs.statSync(modelFile).size>=1024*1024
  };
  return{model,checks,ready:Object.values(checks).every(Boolean),installation:configured.installation||{status:'not_installed'}};
 }

 const client=id=>state().clients.find(c=>c.id===id)||fail('Empresa não encontrada.');

 const asset=(cid,id)=>state().library.find(a=>a.clientId===cid&&a.id===id)||fail('Arquivo não encontrado nesta empresa.');

 const job=(cid,id)=>state().videoJobs.find(a=>a.clientId===cid&&a.id===id)||fail('Tarefa não encontrada nesta empresa.');

 function migrate(){const s=state();for(const k of ['library','videoJobs','commercialResults','publicationQueue'])if(!Array.isArray(s[k]))s[k]=[];for(const c of s.clients){if(!Array.isArray(c.dnaMemory))c.dnaMemory=[];if(!c.twin||typeof c.twin!=='object')c.twin={status:'Preparação',purpose:'',voice:'',visual:'',performance:'',restrictions:'',reviewRequired:true,sourceAssetIds:[],updatedAt:now()};if(!Array.isArray(c.twin.sourceAssetIds))c.twin.sourceAssetIds=[];if(!c.dnaMemory.length&&c.companyDna?.status==='Aprovado')c.dnaMemory.push({id:uid('dna'),kind:'fato confirmado',text:JSON.stringify(c.companyDna.data),source:'DNA aprovado v'+c.companyDna.version,at:now()});}s.contentSchemaVersion=2;save()}

 function source(a){let f;if(a.origin==='local')f=a.location;else if(a.origin==='internal')f=path.join(data,'media',path.basename(a.location));else fail('Fonte Drive referenciada. Relocalize para a pasta sincronizada do Drive no PC para processar sem baixar gigabytes.');if(!f||!fs.existsSync(f)||!fs.statSync(f).isFile())fail('Fonte não encontrada. Use Relocalizar para indicar o arquivo.');return f}

 function available(a){try{source(a);return 'Disponível'}catch{return a.origin==='drive'?'Referência Drive — acesso pendente':'Fonte não encontrada'}}

 function index(){for(const ct of state().contents){for(const [format,url] of Object.entries(ct.files||{})){if(!url||state().library.some(a=>a.contentId===ct.id&&a.url===url))continue;const location=url.startsWith('/files/')?'produced/'+url.slice(7):url.startsWith('/exports/')?'exports/'+url.slice(9):null;if(location)state().library.push({id:uid('asset'),clientId:ct.clientId,contentId:ct.id,name:ct.title+' ('+format+')',type:format==='mp4'?'video/mp4':format==='cover'?'image/jpeg':format,origin:'generated',location,url,theme:ct.goal||ct.title,createdAt:ct.createdAt||now(),versions:[],uses:[]})}}for(const c of state().clients)for(const m of c.media||[]){if(!state().library.some(a=>a.legacyId===m.id&&a.clientId===c.id))state().library.push({id:uid('asset'),legacyId:m.id,clientId:c.id,name:m.name,type:m.type,origin:'internal',location:path.basename(m.url||''),theme:m.category||'',product:m.productId||'',createdAt:m.createdAt||now(),versions:[],uses:[],url:m.url})}save()}

 function dnaBackup(c,force=false){c.dnaMemory=c.dnaMemory||[];const last=Date.parse(c.dnaBackupAt||'');if(!force&&Number.isFinite(last)&&Date.now()-last<7*864e5)return null;const f=`DNA_${c.id}_${now().replace(/[:.]/g,'-')}_${uid('v')}.md`;const text=`# DNA vivo — ${c.name}\n\nGerado: ${now()}\n\n## DNA cadastrado (${c.companyDna?.status||'Rascunho'})\n\n`+Object.entries(c.companyDna?.data||{}).map(([k,v])=>`- **${k}**: ${v}`).join('\n')+'\n\n## Memória classificada\n\n'+c.dnaMemory.map(x=>`### ${x.kind} · ${x.at}\n${x.text}\n\nOrigem: ${x.source||'Uso da plataforma'}\n`).join('\n');fs.writeFileSync(path.join(exportsDir,f),text,{flag:'wx'});c.dnaBackupAt=now();state().library.push({id:uid('dnafile'),clientId:c.id,name:f,type:'text/markdown',origin:'generated',location:'exports/'+f,url:'/exports/'+f,theme:'DNA vivo',createdAt:now(),versions:[],uses:[]});save();return '/exports/'+f}

 function weekly(){for(const c of state().clients)dnaBackup(c)}

 async function prepare(j){const a=asset(j.clientId,j.assetId),c=client(j.clientId),f=source(a);j.stage='Identificando arquivo';save();const fingerprint=await hash(f);const prior=state().videoJobs.find(x=>x.id!==j.id&&x.clientId===j.clientId&&x.fingerprint===fingerprint&&x.transcriptFile&&fs.existsSync(path.join(produced,x.id,'transcript.json')));const dir=path.join(produced,j.id);fs.mkdirSync(dir,{recursive:true});j.fingerprint=fingerprint;

  let t;if(prior){t=JSON.parse(fs.readFileSync(path.join(produced,prior.id,'transcript.json'),'utf8'));j.reusedFrom=prior.id;fs.writeFileSync(path.join(dir,'transcript.json'),JSON.stringify(t,null,2));}else{const health=transcriptionHealth();if(!health.ready)fail('Motor de transcrição incompleto: '+Object.entries(health.checks).filter(([,ok])=>!ok).map(([name])=>name).join(', ')+'. Abra o Editor de Vídeo e conclua a instalação local.');j.stage='Extraindo áudio';save();await run(ffmpeg,['-nostdin','-n','-i',f,'-vn','-ac','1','-ar','16000',path.join(dir,'audio.wav')]);j.stage='Transcrevendo em português';save();await run(python,[path.join(root,'workers','transcribe.py'),'--audio',path.join(dir,'audio.wav'),'--out',path.join(dir,'transcript.json'),'--models',models,'--model',health.model]);t=JSON.parse(fs.readFileSync(path.join(dir,'transcript.json'),'utf8'));}

  transcriptValid(t);j.transcriptFile=`/files/${j.id}/transcript.json`;j.transcriptMd=`/files/${j.id}/transcript.md`;j.transcriptTxt=`/files/${j.id}/transcript.txt`;const readable=t.segments.map(s=>`[${stamp(s.start)} → ${stamp(s.end)}] ${s.text}`).join('\n\n');fs.writeFileSync(path.join(dir,'transcript.md'),'# '+a.name+'\n\n'+readable);fs.writeFileSync(path.join(dir,'transcript.txt'),readable);j.cuts=curate(t,c);j.status='review';j.stage='Trechos prontos para revisão';j.finishedAt=now();a.transcript=j.transcriptFile;a.uses.push({at:now(),jobId:j.id,type:'transcrição'});save();}

 async function renderCut(j,cut){const a=asset(j.clientId,j.assetId),f=source(a);if(await hash(f)!==j.fingerprint)fail('O arquivo mudou desde a transcrição. Inicie nova análise para evitar cortes incorretos.');const t=JSON.parse(fs.readFileSync(path.join(produced,j.id,'transcript.json'),'utf8'));const duration=Number(t.duration)||t.segments.at(-1).end;if(!Number.isFinite(cut.start)||!Number.isFinite(cut.end)||cut.start<0||cut.end<=cut.start||cut.end>duration+.2||cut.end-cut.start>180)fail('Intervalo do corte inválido. Use até 180 segundos dentro do vídeo.');const cid=uid('video'),dir=path.join(produced,cid);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'captions.srt'),srt(t,cut.start,cut.end));j.stage='Gerando corte vertical com legenda';save();const vf="scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,subtitles=captions.srt:force_style='FontSize=18,Outline=2,MarginV=48'";

 const safeEnd=Math.min(duration,cut.end+.35);await run(ffmpeg,['-nostdin','-n','-ss',String(cut.start),'-i',f,'-t',String(safeEnd-cut.start),'-vf',vf,'-c:v','libx264','-preset','fast','-crf','23','-c:a','aac','-movflags','+faststart','final.mp4'],{cwd:dir});await run(ffmpeg,['-nostdin','-n','-i','final.mp4','-frames:v','1','cover.jpg'],{cwd:dir});const ct={id:cid,clientId:j.clientId,kind:'video',title:cut.theme,text:cut.text+'\n\n'+cut.cta,status:'Em revisão',createdAt:now(),updatedAt:now(),sourceAssetId:a.id,sourceJobId:j.id,commercial:{product:cut.product,objective:cut.objective,type:cut.type,cta:cut.cta},files:{mp4:`/files/${cid}/final.mp4`,srt:`/files/${cid}/captions.srt`,cover:`/files/${cid}/cover.jpg`}};state().contents.push(ct);state().library.push({id:uid('asset'),clientId:j.clientId,name:ct.title,type:'video/mp4',origin:'generated',location:'produced/'+cid+'/final.mp4',url:ct.files.mp4,createdAt:now(),theme:cut.theme,product:cut.product,versions:[],uses:[],sourceAssetId:a.id,contentId:cid});cut.contentId=cid;cut.status='Gerado';a.uses.push({at:now(),contentId:cid,type:'corte'});j.stage='Corte pronto na biblioteca';save();}

 async function pump(){if(busy)return;const j=state().videoJobs.find(j=>j.status==='queued');if(!j)return;busy=true;j.status='running';j.startedAt=now();save();try{if(j.renderCutId){const parent=job(j.clientId,j.parentJobId),cut=parent.cuts.find(c=>c.id===j.renderCutId)||fail('Trecho não encontrado.');await renderCut(parent,cut);j.status='done';j.stage='Vídeo pronto para revisão';}else await prepare(j);}catch(e){j.status='failed';j.error=String(e.message).slice(-1500);j.stage='Precisa de atenção';}finally{busy=false;save();setImmediate(pump)}}

 function companyExport(c){const s=state(),keys=['contents','library','videoJobs','commercialResults','publicationQueue','leads','links','campaigns','workSessions','events','opportunities','testimonials','usage','externalCosts','geminiUsage'];const pack={format:'smc-company',version:1,createdAt:now(),client:JSON.parse(JSON.stringify(c)),collections:{}};pack.client.ai={...pack.client.ai,keyEnc:'',mgmtKeyEnc:'',geminiKeyEnc:''};delete pack.client.integrations;for(const k of keys)pack.collections[k]=(s[k]||[]).filter(x=>x.clientId===c.id);const entries=[['company.json',JSON.stringify(pack,null,2)]];const media=new Set((c.media||[]).map(m=>path.basename(m.url||'')));for(const a of pack.collections.library)if(a.origin==='internal')media.add(path.basename(a.location));for(const f of media){const p=path.join(data,'media',f);if(fs.existsSync(p))entries.push(['media/'+f,fs.readFileSync(p)])}const folders=new Set([...pack.collections.contents,...pack.collections.videoJobs].map(x=>x.id));for(const f of folders)entries.push(...walk(path.join(produced,f),'produced/'+f));for(const a of pack.collections.library)if(a.location?.startsWith('exports/')){const p=path.join(data,a.location);if(fs.existsSync(p))entries.push([a.location,fs.readFileSync(p)])}return zipStore(entries)}

 async function route(req,res,u){const p=u.pathname,m=req.method;if(!p.startsWith('/api/content-engine/'))return false;try{const b=m==='GET'?Object.fromEntries(u.searchParams):await body(req);const action=p.slice('/api/content-engine/'.length);if(action==='capabilities'){const health=transcriptionHealth(),ff=health.checks.ffmpeg&&await run(ffmpeg,['-version']).then(()=>true,()=>false),wh=health.checks.python&&await run(python,['-c','import faster_whisper; print("ok")']).then(()=>true,()=>false);health.checks.ffmpeg=!!ff;health.checks.whisper=!!wh;health.ready=Object.values(health.checks).every(Boolean);json(req,res,200,{...health,ffmpeg:!!ff,whisper:!!wh,modelReady:health.checks.model,metricool:'Autorização da aplicação pendente',drive:'Referência ou pasta sincronizada',canva:'Complemento opcional'});return true}

 if(action==='install-transcription'){const selected=String(b.model||'small');if(!['small','medium'].includes(selected))fail('Modelo de transcrição inválido.');const health=transcriptionHealth();if(!health.checks.python||!health.checks.installer)fail('Não foi possível iniciar a instalação: Python portátil ou instalador ausente. Reinstale a Lite completa.');if(health.model===selected&&health.checks.model){json(req,res,200,{ok:true,message:'A transcrição local já está instalada.',health});return true}const current=state().transcription?.installation;if(current?.status==='installing')fail('Já há uma instalação de transcrição em andamento nesta cópia. Aguarde a conclusão.');state().transcription={...(state().transcription||{}),model:selected,installation:{status:'installing',model:selected,startedAt:now(),message:'Baixando o motor local de transcrição.'}};save();run(python,[path.join(root,'workers','install-transcription.py'),'--models',models,'--model',selected]).then(()=>{state().transcription={...(state().transcription||{}),model:selected,installation:{status:'ready',model:selected,finishedAt:now(),message:'Motor local instalado e verificado.'}};save()}).catch(e=>{state().transcription={...(state().transcription||{}),model:selected,installation:{status:'failed',model:selected,finishedAt:now(),message:String(e.message||e).slice(-1200)}};save()});json(req,res,202,{ok:true,message:'Instalação local iniciada. Esta tela mostrará o resultado.',health:transcriptionHealth()});return true}

 if(action==='import-company'){if(b.localPath&&(!path.isAbsolute(b.localPath)||!String(b.localPath).toLowerCase().endsWith('.zip')))fail('Selecione um pacote ZIP pelo caminho completo.');const files=unzipStore((b.localPath?fs.readFileSync(b.localPath):Buffer.from(String(b.data||''),'base64'))),pack=JSON.parse(String(files.get('company.json')||''));if(pack.format!=='smc-company'||!pack.client?.id||!Array.isArray(pack.collections?.contents))fail('Pacote da empresa inválido.');if(!/^[a-zA-Z0-9_-]+$/.test(pack.client.id))fail('Identificador da empresa inválido.');for(const [k,v] of Object.entries(pack.collections)){if(!Array.isArray(v))fail('Coleção inválida.');for(const item of v){if(item.id&&!/^[a-zA-Z0-9_-]+$/.test(item.id))fail('Identificador inválido.');if(item.clientId!==pack.client.id)fail('O pacote mistura empresas.')}}if(state().clients.some(c=>c.id===pack.client.id))fail('Esta empresa já existe. Importe em uma instância limpa para não duplicar ou substituir dados.');for(const [name] of files){if(name==='company.json')continue;if(!/^(media|produced|exports)\//.test(name))fail('Arquivo fora do pacote permitido.');const target=path.join(data,name);if(fs.existsSync(target))fail('Um arquivo do pacote já existe. Nada foi substituído.');}for(const [name,bytes] of files){if(name==='company.json')continue;const target=path.join(data,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}state().clients.push(pack.client);for(const [k,v] of Object.entries(pack.collections)){if(Array.isArray(state()[k])&&Array.isArray(v))state()[k].push(...v.filter(x=>x.clientId===pack.client.id))}migrate();json(req,res,200,{ok:true,clientId:pack.client.id,message:'Empresa importada. Conecte suas contas nesta instalação.'});return true}

 if(action==='metricool-callback'){await metricool.callback(b);send(req,res,200,'Metricool autorizado. Volte à Super Máquina e abra a Biblioteca.','text/plain; charset=utf-8');return true}

 const c=client(b.clientId);if(action==='metricool-connect'){json(req,res,200,await metricool.connect(c.id));}

 else if(action==='metricool-read'){json(req,res,200,await metricool.read(c.id,b.kind||'brands',b.args||{}));}

 else if(action==='pick-local'){if(process.platform!=='win32')fail('Informe o caminho do arquivo neste computador.');const selected=await run('powershell.exe',['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',path.join(root,'workers','pick-video.ps1')]);json(req,res,200,{path:selected.trim()});}

 else if(action==='list'){index();json(req,res,200,{assets:state().library.filter(a=>a.clientId===c.id).map(a=>({...a,availability:a.origin==='generated'?(fs.existsSync(path.join(data,a.location))?'Disponível':'Fonte não encontrada'):available(a)})),jobs:state().videoJobs.filter(j=>j.clientId===c.id),memory:c.dnaMemory||[],twin:c.twin,metricoolConnected:metricool.configured(c.id),publications:state().publicationQueue.filter(j=>j.clientId===c.id),results:state().commercialResults.filter(j=>j.clientId===c.id)});}

 else if(action==='source'){const origin=b.origin||'local',location=String(b.location||'').trim();if(!['local','drive'].includes(origin))fail('Origem inválida.');if(origin==='local'&&!path.isAbsolute(location))fail('Informe o caminho completo do arquivo.');if(origin==='local'&&!/\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|m4a)$/i.test(location))fail('Selecione um vídeo ou áudio.');if(origin==='drive'&&!/^https:\/\/(drive|docs)\.google\.com\//.test(location))fail('Informe um link do Google Drive.');let a={id:uid('asset'),clientId:c.id,name:String(b.name||path.basename(location)),type:'video',origin,location,theme:String(b.theme||''),product:String(b.product||''),createdAt:now(),versions:[],uses:[]};if(origin==='local')source(a);state().library.push(a);save();json(req,res,200,a);}

 else if(action==='relocalize'){const a=asset(c.id,b.assetId),location=String(b.location||'').trim();if(!path.isAbsolute(location))fail('Informe o caminho completo.');source({...a,origin:'local',location});a.versions.push({location:a.location,origin:a.origin,at:now()});a.origin='local';a.location=location;save();json(req,res,200,a);}

 else if(action==='forget-source'){const a=asset(c.id,b.assetId);if(a.origin==='generated')fail('Vídeo produzido deve ser removido na Biblioteca de conteúdos.');state().library=state().library.filter(x=>x.id!==a.id);state().videoJobs=state().videoJobs.filter(x=>x.assetId!==a.id);c.twin.sourceAssetIds=(c.twin.sourceAssetIds||[]).filter(x=>x!==a.id);save();json(req,res,200,{ok:true,message:'Referência removida da Biblioteca. O arquivo original foi preservado.'});}

 else if(action==='analyze'){const a=asset(c.id,b.assetId);source(a);const existing=state().videoJobs.find(j=>j.clientId===c.id&&j.assetId===a.id&&['queued','running'].includes(j.status));if(existing){json(req,res,200,existing);return true}const j={id:uid('job'),clientId:c.id,assetId:a.id,status:'queued',stage:'Na fila',createdAt:now(),cuts:[]};state().videoJobs.push(j);save();setImmediate(pump);json(req,res,202,j);}

 else if(action==='cut'){const j=job(c.id,b.jobId),savedCut=j.cuts?.find(x=>x.id===b.cutId)||fail('Trecho não encontrado.'),cut={...savedCut};for(const k of ['theme','product','objective','cta','type'])if(k in b)cut[k]=String(b[k]);if(b.start!=null)cut.start=Number(b.start);if(b.end!=null)cut.end=Number(b.end);if(!Number.isFinite(cut.start)||!Number.isFinite(cut.end)||cut.start<0||cut.end<=cut.start)fail('Intervalo inválido.');Object.assign(savedCut,cut);const prior=state().videoJobs.find(x=>x.parentJobId===j.id&&x.renderCutId===cut.id&&['queued','running'].includes(x.status));if(prior){json(req,res,200,prior);return true}const r={id:uid('render'),clientId:c.id,parentJobId:j.id,renderCutId:cut.id,status:'queued',stage:'Na fila',createdAt:now()};state().videoJobs.push(r);save();setImmediate(pump);json(req,res,202,r);}

 else if(action==='delete-cut'){const j=job(c.id,b.jobId),cut=j.cuts?.find(x=>x.id===b.cutId)||fail('Trecho não encontrado.');if(cut.contentId)fail('Este corte já gerou um vídeo. Remova o vídeo produzido na Biblioteca antes de excluir o trecho.');j.cuts=j.cuts.filter(x=>x.id!==cut.id);save();json(req,res,200,{ok:true});}

 else if(action==='twin-save'){const next=b.twin&&typeof b.twin==='object'?b.twin:{};for(const k of ['purpose','voice','visual','performance','restrictions'])c.twin[k]=String(next[k]||'').slice(0,4000);c.twin.reviewRequired=next.reviewRequired!==false;c.twin.sourceAssetIds=[...new Set((next.sourceAssetIds||[]).filter(x=>state().library.some(a=>a.id===x&&a.clientId===c.id)))];c.twin.status=c.twin.sourceAssetIds.length&&c.twin.purpose&&c.twin.voice?'Pronto para teste':'Preparação';c.twin.updatedAt=now();save();json(req,res,200,{ok:true,twin:c.twin});}

 else if(action==='memory'){const kind=String(b.kind||'hipótese');if(!['fato confirmado','preferência recorrente','decisão','hipótese','circunstância'].includes(kind))fail('Classificação inválida.');if(!String(b.text||'').trim())fail('Descreva a informação.');c.dnaMemory=c.dnaMemory||[];c.dnaMemory.push({id:uid('dna'),kind,text:String(b.text),source:String(b.source||'Registro do administrador'),at:now()});save();json(req,res,200,{ok:true});}

 else if(action==='dna-backup')json(req,res,200,{url:dnaBackup(c,true)});

 else if(action==='export-company'){send(req,res,200,companyExport(c),'application/zip',{'Content-Disposition':'attachment; filename="empresa.zip"'});}

 else if(action==='result'){const stages=['oportunidade','lead','conversa','proposta','venda'];if(!stages.includes(b.stage))fail('Etapa inválida.');const ct=state().contents.find(x=>x.id===b.contentId&&x.clientId===c.id);if(!ct)fail('Escolha um conteúdo desta empresa.');const value=Number(b.value||0);if(!Number.isFinite(value)||value<0)fail('Valor inválido.');const r={id:uid('result'),clientId:c.id,contentId:ct.id,stage:b.stage,value:b.stage==='venda'?value:0,evidence:String(b.evidence||''),at:now()};if(!r.evidence.trim())fail('Registre a origem ou evidência do resultado.');state().commercialResults.push(r);save();json(req,res,200,r);}

 else if(action==='publication'){const ct=state().contents.find(x=>x.id===b.contentId&&x.clientId===c.id)||fail('Conteúdo não encontrado.');if(ct.status!=='Aprovado')fail('Revise e aprove o conteúdo antes de publicar.');if(b.when&&(!Date.parse(b.when)||Date.parse(b.when)<Date.now()))fail('Escolha uma data futura.');const old=state().publicationQueue.find(x=>x.contentId===ct.id&&x.clientId===c.id&&x.status==='Aguardando conexão');if(old){json(req,res,200,old);return true}const q={id:uid('pub'),clientId:c.id,contentId:ct.id,network:String(b.network||''),when:String(b.when||''),status:'Aguardando conexão',createdAt:now(),message:'Solicitação salva. Ainda não publicada nem agendada no Metricool. Autorize a conexão própria da aplicação.'};state().publicationQueue.push(q);save();json(req,res,202,q);}

 else fail('Ação desconhecida.');return true;

 }catch(e){json(req,res,400,{error:e.message});return true}}

 migrate();index();for(const j of state().videoJobs)if(j.status==='running'){j.status='failed';j.error='Processamento interrompido ao fechar a aplicação. Inicie novamente; a transcrição concluída será reutilizada.'}save();weekly();const timer=setInterval(weekly,3600000);timer.unref();setImmediate(pump);

 return{route,weekly,migrate};

}

module.exports={createEngine,curate,srt,transcriptValid,hash,run};

