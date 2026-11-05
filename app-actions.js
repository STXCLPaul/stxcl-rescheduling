async function lookup(){clearStatus();try{gameData=await call('findGame',$('game').value);renderGame($('gameDetails'),gameData);
 const d=toIso(gameData.date);await setProposal('',{date:d,time:gameData.time,complex:gameData.complex,field:gameData.field});}
 catch(e){gameData=null;$('gameDetails').classList.add('hidden');error(e.message);}}
function toIso(d){const m=String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0'):'';}
async function submitInitial(){clearStatus();if(!gameData){error('Look up the game number before submitting.');return;}
 const data={name:$('name').value,club:$('club').value,role:$('role').value,email:$('email').value,
   gameNumber:gameData.gameNumber,opponentEmails:$('opponents').value,proposal:proposal(''),certs:certs('initial')};
 if(!confirm('Send this request to the opposing club for review?'))return;
 try{const r=await call('submitRequest',data);$('initial').classList.add('hidden');success('Request '+r.id+' submitted. Status: '+r.status+'. No schedule changes have been made.');}
 catch(e){error(e.message);}}
async function loadReview(){try{reviewData=await call('getReview',RID,TOKEN);$('reviewMeta').textContent='Request '+reviewData.id+' | '+reviewData.status+' | You are reviewing as '+reviewData.actorEmail;
 renderGame($('reviewGame'),reviewData.game);await setProposal('review',reviewData.proposal);}
 catch(e){$('review').classList.add('hidden');error(e.message);}}
function proposalChangedFromReceived(){
 if(!reviewData)return false;
 const original=reviewData.proposal;
 const current=proposal('review');
 return ['date','time','complex','field'].some(key=>String(current[key]??'').trim()!==String(original[key]??'').trim());
}
async function reviewAction(action){clearStatus();if(!reviewData)return;
 if(action==='APPROVE'&&proposalChangedFromReceived()){
  error('You have modified the proposed schedule. Approval is only possible without changes. To submit your modifications, select "Send counterproposal," or restore the original values to approve the existing proposal.');
  return;
 }
 if(action==='REJECT'){if(!confirm('Reject and close this rescheduling request?'))return;}
 else if(!confirm(action==='APPROVE'?'Approve this exact proposal and forward it to STXCL for review?':'Send these four proposed scheduling values back to the other club?'))return;
 try{const out=await call('actOnRequest',{id:RID,token:TOKEN,action,proposal:action==='COUNTER'?proposal('review'):null,certs:certs('review')});
 $('review').classList.add('hidden');success('Request '+out.id+' updated: '+out.status+'. This link is now closed.');}
 catch(e){error(e.message);}}
async function init(){certHtml('initial');certHtml('review');timeOptions('time');timeOptions('reviewTime');
 if(RID&&TOKEN){$('initial').classList.add('hidden');$('review').classList.remove('hidden');}
 try{facilityData=await call('getFacilityOptions');fillComplex('complex');fillComplex('reviewComplex');
 if(RID&&TOKEN)await loadReview();}catch(e){error('Could not load facilities: '+e.message);}}
init();
