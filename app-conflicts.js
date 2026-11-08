async function conflictApi(gameNumber,date){
 const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({method:'checkScheduleConflict',args:[gameNumber,date]})});
 const packet=await response.json();
 if(!response.ok||!packet.ok)throw Error(packet.error||'Conflict check failed.');
 return packet.result;
}
const conflictState={initial:null,review:null};
const conflictSerial={initial:0,review:0};
function conflictBox(prefix){return $(prefix==='review'?'reviewConflict':'initialConflict');}
function conflictAck(prefix){return $(prefix==='review'?'reviewConflictAck':'initialConflictAck');}
function resetConflict(prefix){
  conflictSerial[prefix]++;
  conflictState[prefix]=null;
  const box=conflictBox(prefix);box.replaceChildren();box.classList.add('hidden');
}
function conflictAcknowledged(prefix){return !!conflictAck(prefix)?.checked;}
function renderConflict(prefix,result){
 const box=conflictBox(prefix);box.replaceChildren();
 box.classList.remove('hidden');
 box.className='conflict-box '+(result.status==='BLOCK'?'conflict-block':'conflict-warning');
 const h=el('strong',result.status==='BLOCK'?'Scheduling conflict — request cannot proceed':'Double-header warning — acknowledgement required');
 box.append(h);
 box.append(el('p','One or both teams already have a game scheduled on the requested date.'));
 (result.conflicts||[]).forEach(g=>{
   const item=document.createElement('div');item.className='conflict-game';
   item.append(el('strong','Game #'+g.gameNumber+' — '+(g.affectedTeams||[]).join(' / ')));
   item.append(el('div',g.home+' vs '+g.away));
   item.append(el('div',[g.date,g.time,g.complex,g.field].filter(Boolean).join(' | ')));
   box.append(item);
 });
 box.append(el('p',result.reason||''));
 if(result.status==='WARN'){
   const label=document.createElement('label');label.className='cert';
   const check=document.createElement('input');check.type='checkbox';
   check.id=prefix==='review'?'reviewConflictAck':'initialConflictAck';
   label.append(check,el('span','I understand that the proposed date creates a double-header, have reviewed the existing game(s), and accept responsibility for confirming that the requested schedule is feasible. I understand that a failure to participate may result in a forfeit or require a Game Change Request (GCR) with applicable fees.'));
   box.append(label);
 }
}
async function checkConflicts(prefix,quiet=false){
 const game=prefix==='review'?reviewData?.game:gameData;
 const date=$(prefix==='review'?'reviewDate':'date').value;
 if(!game||!date){resetConflict(prefix);return null;}
 const id=++conflictSerial[prefix];
 const previous=conflictState[prefix];
 const ack=previous?.date===date&&previous?.result?.status==='WARN'&&conflictAcknowledged(prefix);
 const box=conflictBox(prefix);box.classList.remove('hidden');box.className='conflict-box';
 box.replaceChildren(el('span','Checking existing games on this date…'));
 try{
   const result=await conflictApi(game.gameNumber,date);
   if(id!==conflictSerial[prefix])return null;
   conflictState[prefix]={date,result};
   if(result.status==='CLEAR'){box.replaceChildren();box.classList.add('hidden');return result;}
   renderConflict(prefix,result);
   if(ack&&result.status==='WARN')conflictAck(prefix).checked=true;
   return result;
 }catch(e){
   if(id!==conflictSerial[prefix])return null;
   conflictState[prefix]=null;
   box.className='conflict-box conflict-block';box.replaceChildren(el('strong','Unable to verify same-day games'),el('p',e.message));
   if(!quiet)error('Scheduling conflict check failed: '+e.message);
   return null;
 }
}
async function validateConflictAction(prefix){
 const result=await checkConflicts(prefix,true);
 if(!result){error('Unable to validate the proposed date against the live schedule. Please try again.');return false;}
 if(result.status==='BLOCK'){error('This proposed date is prohibited. See the conflicting game(s) shown below the date field.');return false;}
 if(result.status==='WARN'&&!conflictAcknowledged(prefix)){
   error('Both clubs must acknowledge a permitted double-header. Please review the conflict details and check the additional acknowledgement box.');
   return false;
 }
 return true;
}
