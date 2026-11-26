function showCompletedActions(){$('completedActions').classList.remove('hidden');}
function startNewForm(){
 // A fresh navigation also clears any approval link parameters/state.
 window.location.assign(window.location.origin+window.location.pathname);
}
function closePortalWindow(){
 window.close();
 // Most browsers do not permit closing a tab opened manually.
 $('closeHint').classList.remove('hidden');
}
let lookupSerial=0;
function clearExistingRequestNotice(){
 const notice=$('existingRequestNotice');if(notice)notice.remove();
}
function renderExistingRequestNotice(game){
 clearExistingRequestNotice();
 const existing=game.existingRequest;if(!existing)return;
 const panel=document.createElement('div');panel.id='existingRequestNotice';panel.className='panel';
 panel.append(el('strong','Existing rescheduling request'),el('p',existing.message||'Contact STXCL about the existing request.'));
 if(existing.canRequestAccess===true && existing.legacy===false){
   const label=el('label','Authorized club email');label.htmlFor='existingRequestEmail';
   const input=document.createElement('input');input.id='existingRequestEmail';input.type='email';input.autocomplete='email';input.value=$('email').value;
   const button=el('button','Request secure access link');button.type='button';
   button.onclick=async()=>{if(gameData!==game)return;const addr=input.value.trim();
     if(!addr||!input.checkValidity()){error('Enter a valid email address.');return;}
     button.disabled=true;try{const result=await call('requestExistingAccess',game.gameNumber,addr);
       if(gameData===game)success(result.message);}
     catch(e){if(gameData===game)error(e.message);}finally{button.disabled=false;}};
   panel.append(label,input,button);
 }
 $('gameDetails').after(panel);
}
function invalidateLookup(){
 // Changing the game number invalidates prior game data and its date check.
 ++lookupSerial;clearExistingRequestNotice();
 if(!gameData)return;
 gameData=null;
 resetConflict('initial');
 $('gameDetails').classList.add('hidden');
}
async function lookup(){const serial=++lookupSerial;clearExistingRequestNotice();clearStatus();gameData=null;resetConflict('initial');try{const result=await call('findGame',$('game').value);
 if(serial!==lookupSerial)return;
 gameData=result;renderGame($('gameDetails'),gameData);
 if(gameData.existingRequest){renderExistingRequestNotice(gameData);updateConflictActions('initial');return;}
 const d=toIso(gameData.date);$('date').min=followingDayIso(d);
 const initialDate='';
 await setProposal('',{date:initialDate,time:gameData.time,complex:gameData.complex,field:gameData.field});updateConflictActions('initial');}
 catch(e){if(serial!==lookupSerial)return;gameData=null;clearExistingRequestNotice();$('gameDetails').classList.add('hidden');error(e.message);}}
function toIso(d){const m=String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0'):'';}
// Policy-tagged requests can only propose dates AFTER the original game date.
function followingDayIso(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
async function submitInitial(){clearStatus();if(!gameData){error('Look up the game number before submitting.');return;}
 if(gameData.existingRequest){error('Use the existing request or contact STXCL. A new request cannot be submitted for this game.');return;}
 if(!$('initial_rainout').checked){error('This portal is for eligible rainouts only. You must separately certify rainout eligibility. For other changes, use the STXCL Game Change Request form.');return;}
 if(!$('initial_all').checked){error('Read and accept the required certifications and acknowledgments.');return;}
 if(!validateConflictAction('initial'))return;
 const data={name:$('name').value,club:$('club').value,role:$('role').value,email:$('email').value,
   gameNumber:gameData.gameNumber,opponentEmails:$('opponents').value,proposal:proposal(''),certs:certs('initial'),doubleHeaderAcknowledged:conflictAcknowledged('initial')};
 if(!confirm('Send this request to the opposing club for review?'))return;
 try{const r=await call('submitRequest',data);$('initial').classList.add('hidden');success('Request '+r.id+' submitted. Status: '+r.status+'. No schedule changes have been made.');showCompletedActions();}
 catch(e){error(e.message);}}
async function loadReview(){try{reviewData=await call('getReview',RID,TOKEN);$('reviewMeta').textContent='Request '+reviewData.id+' | '+reviewData.status+' | You are reviewing as '+reviewData.actorEmail;
 renderGame($('reviewGame'),reviewData.game);
 $('reviewDate').min=(reviewData.deadlinePolicyActive||reviewData.revisionPolicyActive)?followingDayIso(toIso(reviewData.game.date)):'';
 if(reviewData.amendmentOnly===true){
   $('reviewApproveBtn').classList.add('hidden');$('reviewRejectBtn').classList.add('hidden');
   $('reviewMeta').append(document.createTextNode(' | You may propose revised terms only; the other club must approve them.'));
 }
 await setProposal('review',reviewData.proposal);await checkConflicts('review',true);
 if(reviewData.actorRole==='REQUESTOR'){$('reviewName').value=reviewData.requestorName||'';$('reviewRole').value=reviewData.requestorRole||'';}}
 catch(e){$('review').classList.add('hidden');error(e.message);}}
function proposalChangedFromReceived(){
 if(!reviewData)return false;
 const original=reviewData.proposal;
 const current=proposal('review');
 return ['date','time','complex','field'].some(key=>String(current[key]??'').trim()!==String(original[key]??'').trim());
}
async function reviewAction(action){clearStatus();if(!reviewData)return;
 if(reviewData.amendmentOnly===true&&action!=='COUNTER'){error('This link permits revised proposals only.');return;}
 const representativeName=$('reviewName').value.trim(),representativeRole=$('reviewRole').value;
 if(!representativeName||!representativeRole){error('Enter your full name and role before responding to this request.');return;}
 if(action!=='REJECT'&&!$('review_rainout').checked){error('You must certify that this game was rained out and is eligible for rainout rescheduling under STXCL policy.');return;}
 if(action!=='REJECT'&&!$('review_all').checked){error('Read and accept the required certifications and acknowledgments.');return;}
 if(action==='APPROVE'&&proposalChangedFromReceived()){
  error('You have modified the proposed schedule. Approval is only possible without changes. To submit your modifications, select "Send counterproposal," or restore the original values to approve the existing proposal.');
  return;
 }
 if(action!=='REJECT'&&!validateConflictAction('review'))return;
 if(action==='REJECT'){if(!confirm('Reject and close this rescheduling request?'))return;}
 else if(!confirm(action==='APPROVE'?'Approve this exact proposal and forward it to STXCL for review?':'Send these four proposed scheduling values back to the other club?'))return;
 try{const out=await call('actOnRequest',{id:RID,token:TOKEN,action,representativeName,representativeRole,proposal:action==='REJECT'?null:proposal('review'),certs:certs('review'),doubleHeaderAcknowledged:conflictAcknowledged('review')});
 $('review').classList.add('hidden');success('Request '+out.id+' updated: '+out.status+'. This link is now closed.');showCompletedActions();}
 catch(e){error(e.message);}}
async function init(){certHtml('initial');certHtml('review');timeOptions('time');timeOptions('reviewTime');
 if(RID&&TOKEN){$('initial').classList.add('hidden');$('review').classList.remove('hidden');}
 try{facilityData=await call('getFacilityOptions');fillComplex('complex');fillComplex('reviewComplex');
 if(RID&&TOKEN)await loadReview();}catch(e){error('Could not load facilities: '+e.message);}}
init();
