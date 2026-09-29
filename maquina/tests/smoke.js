'use strict';

const assert=require('assert');
const {srt,transcriptValid}=require('../lib/content-engine');

const transcript=transcriptValid({duration:2,segments:[{start:0,end:1,text:'Olá mundo.',words:[{start:0,end:.4,word:'Olá'},{start:.4,end:1,word:' mundo.'}]}]});
assert.match(srt(transcript,0,1),/Olá mundo\./);
assert.throws(()=>transcriptValid({segments:[]}),/Nenhuma fala/);
console.log('SMOKE OK v0.5.0');
