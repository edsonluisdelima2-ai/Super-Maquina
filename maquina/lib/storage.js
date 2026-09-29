'use strict';
const fs=require('fs');
const path=require('path');
let DatabaseSync;
try{({DatabaseSync}=require('node:sqlite'));}catch(e){
  throw new Error('A Super Máquina v0.4.0 precisa do Node.js 22 ou superior para usar o banco local SQLite.');
}

function clone(x){return JSON.parse(JSON.stringify(x));}
function ensureDir(p){fs.mkdirSync(p,{recursive:true});}

class LocalStore{
  constructor(dataDir,defaults){
    this.dataDir=dataDir;
    this.dbPath=path.join(dataDir,'state.sqlite');
    this.legacyPath=path.join(dataDir,'state.json');
    this.defaults=defaults;
    ensureDir(dataDir);
    this.open();
    this.init();
  }
  open(){
    this.db=new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
  }
  init(){
    this.db.exec(`CREATE TABLE IF NOT EXISTS app_state(
      id INTEGER PRIMARY KEY CHECK(id=1),
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
    const row=this.db.prepare('SELECT json FROM app_state WHERE id=1').get();
    if(row)return;
    let initial=clone(this.defaults);
    if(fs.existsSync(this.legacyPath)){
      const raw=fs.readFileSync(this.legacyPath,'utf8');
      try{initial=JSON.parse(raw);}catch(e){
        const bad=this.legacyPath+'.corrupt-'+Date.now();
        fs.renameSync(this.legacyPath,bad);
        throw new Error('O state.json antigo está corrompido. Ele foi preservado como '+path.basename(bad)+' e nenhum banco vazio foi criado por cima dele.');
      }
    }
    this.db.prepare('INSERT INTO app_state(id,json,updated_at) VALUES(1,?,?)').run(JSON.stringify(initial),new Date().toISOString());
    this.db.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)').run('migrated_from_json',fs.existsSync(this.legacyPath)?'yes':'no');
  }
  load(){
    const row=this.db.prepare('SELECT json FROM app_state WHERE id=1').get();
    if(!row)throw new Error('Banco local sem estado principal.');
    try{return JSON.parse(row.json);}catch(e){throw new Error('O estado armazenado no SQLite está corrompido. A inicialização foi interrompida para evitar perda de dados.');}
  }
  save(state){
    const raw=JSON.stringify(state);
    this.db.exec('BEGIN IMMEDIATE');
    try{
      this.db.prepare('UPDATE app_state SET json=?,updated_at=? WHERE id=1').run(raw,new Date().toISOString());
      this.db.exec('COMMIT');
    }catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e;}
  }
  exportJson(){return JSON.stringify(this.load(),null,2)}
  replaceState(state){this.save(state)}
  checkpoint(){try{this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)')}catch{}}
  snapshot(dest){this.checkpoint();fs.copyFileSync(this.dbPath,dest)}
  close(){if(this.db){this.checkpoint();this.db.close();this.db=null}}
}
module.exports={LocalStore};
