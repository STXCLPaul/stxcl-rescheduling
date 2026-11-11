async function conflictApi(gameNumber,date,signal){
 const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({method:'checkScheduleConflict',args:[gameNumber,date]}),signal});
 const packet=await response.json();
 if(!response.ok||!packet.ok)throw Error(packet.error||'Conflict check failed.');
 return packet.result;
}
const conflictState={initial:null,review:null};
const conflictSerial={initial:0,review:0};
const conflictInFlight={initial:false,review:false};
const conflictAbort={initial:null,review:null};
function conflictGame(prefix){return prefix==='review'?reviewData?.game:gameData;}
function conflictDate(prefix){return $(prefix==='review'?'reviewDate':'date').value;}
function deadlineDateInvalid(prefix){
 const game=conflictGame(prefix);
 const protectedRequest=prefix==='review'?!!reviewData?.deadlinePolicyActive:!!gameData?.deadlinePolicyActive;
 const old=game?toIso(game.date):'';
 return !!(protectedRequest && old && conflictDate(prefix) && conflictDate(prefix)<=old);
}
function conflictCheckReady(prefix){
 const state=conflictState[prefix],game=conflictGame(prefix),date=conflictDate(prefix);
 if(deadlineDateInvalid(prefix))return false;
 if(!state||!game||!date||conflictInFlight[prefix]||state.date!==date||
    state.gameNumber!==String(game.gameNumber))return false;
 if(state.result.status==='BLOCK')return false;
 if(state.result.status==='WARN')return conflictAcknowledged(prefix);
 return state.result.status==='CLEAR';
}
function updateConflictActions(prefix){
 const ready=conflictCheckReady(prefix);
 const buttons=prefix==='review'?['reviewApproveBtn','reviewCounterBtn']:['submitInitialBtn'];
 buttons.forEach(id=>{const button=$(id);if(button)button.disabled=!ready;});
 const retry=$(prefix==='review'?'reviewRetryBtn':'initialRetryBtn');
 if(retry)retry.disabled=!!conflictInFlight[prefix]||!conflictGame(prefix)||!conflictDate(prefix);
}
function conflictBox(prefix){return $(prefix==='review'?'reviewConflict':'initialConflict');}
function conflictAck(prefix){return $(prefix==='review'?'reviewConflictAck':'initialConflictAck');}
function resetConflict(prefix){
  conflictSerial[prefix]++;
  if(conflictAbort[prefix])conflictAbort[prefix].abort();
  conflictAbort[prefix]=null;
  conflictInFlight[prefix]=false;
  conflictState[prefix]=null;
  const box=conflictBox(prefix);box.replaceChildren();box.classList.add('hidden');
  updateConflictActions(prefix);
}
function conflictAcknowledged(prefix){return !!conflictAck(prefix)?.checked;}
function renderConflict(prefix,result){
 const box=conflictBox(prefix);box.replaceChildren();
 box.classList.remove('hidden');
 box.className='conflict-box '+(result.status==='BLOCK'?'conflict-block':'conflict-warning');
 if(result.status==='BLOCK'&&result.type==='CALENDAR'){
   box.append(el('strong','Proposed date not permitted — STXCL calendar'));
   box.append(el('p',result.reason||'The selected date is not available under the STXCL season or blackout rules. Please choose another date.'));
   return;
 }
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
   check.addEventListener('change',()=>updateConflictActions(prefix));
   box.append(label);
 }
}
async function checkConflicts(prefix,quiet=false){
 const game=conflictGame(prefix);
 const date=conflictDate(prefix);
 if(!game||!date){resetConflict(prefix);return null;}
 if(deadlineDateInvalid(prefix)){
   resetConflict(prefix);
   const result={status:'BLOCK',type:'CALENDAR',
       reason:'The proposed date must be later than the existing/original game date. Select a later day.'};
   conflictState[prefix]={gameNumber:String(game.gameNumber),date,result};
   renderConflict(prefix,result);
   updateConflictActions(prefix);
   return result;
 }
 // Starting another check invalidates and aborts the previous browser request.
 if(conflictAbort[prefix])conflictAbort[prefix].abort();
 const id=++conflictSerial[prefix];
 const controller=new AbortController();
 conflictAbort[prefix]=controller;
 conflictState[prefix]=null;
 conflictInFlight[prefix]=true;
 updateConflictActions(prefix);
 const box=conflictBox(prefix);box.classList.remove('hidden');box.className='conflict-box conflict-loading';
 const progress=document.createElement('div');progress.className='conflict-progress';progress.setAttribute('role','status');
 const spinner=document.createElement('span');spinner.className='conflict-spinner';spinner.setAttribute('aria-hidden','true');
 progress.append(spinner,el('strong','Checking existing games on this date…'));
 const disclaimer=el('p','Experimental feature: Clubs must independently verify their schedules and confirm the proposed arrangement is feasible. This check does not replace that responsibility.');
 disclaimer.className='conflict-disclaimer';
 box.replaceChildren(progress,disclaimer);
 try{
   const result=await conflictApi(game.gameNumber,date,controller.signal);
   if(id!==conflictSerial[prefix]||date!==conflictDate(prefix))return null;
   conflictState[prefix]={gameNumber:String(game.gameNumber),date,result};
   if(result.status==='CLEAR'){
     box.replaceChildren();box.classList.add('hidden');
   }else{
     renderConflict(prefix,result);
   }
   return result;
 }catch(e){
   if(id!==conflictSerial[prefix])return null;
   conflictState[prefix]=null;
   box.className='conflict-box conflict-block';
   box.replaceChildren(el('strong','Unable to verify same-day games'),el('p',e.message));
   if(!quiet)error('Scheduling conflict check failed: '+e.message);
   return null;
 }finally{
   if(id===conflictSerial[prefix]){
     conflictInFlight[prefix]=false;
     conflictAbort[prefix]=null;
     updateConflictActions(prefix);
   }
 }
}
function validateConflictAction(prefix){
 const result=conflictState[prefix]?.result;
 if(!conflictCheckReady(prefix)){
   if(conflictInFlight[prefix]){
     error('The schedule check is still running. Please wait for it to finish.');
   }else if(result?.status==='BLOCK'){
     error(result.type==='CALENDAR'?
       'This proposed date is prohibited by STXCL season or blackout rules. See the calendar details below the proposed date.':
       'This date is prohibited. See the conflicting game(s) below the proposed date.');
   }else if(result?.status==='WARN'&&!conflictAcknowledged(prefix)){
     error('Both clubs must acknowledge the double-header warning before proceeding.');
   }else{
     error('Please complete the schedule check for the selected date before continuing.');
   }
   return false;
 }
 return true;
}
