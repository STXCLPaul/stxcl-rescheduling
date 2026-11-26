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
function invalidateLookup(){
 // Changing the game number invalidates prior game data and its date check.
 gameData=null;
 resetConflict('initial');
 $('gameDetails').classList.add('hidden');
 applyExistingRequestState(null);
}
function applyExistingRequestState(existing){
 const panel=$('existingRequestPanel'),wrap=$('existingAccessWrap');
 const exists=Boolean(existing);
 panel.classList.toggle('hidden',!exists);
 if(exists){
   $('existingRequestMessage').textContent=String(existing.message||'A request already exists for this game. Contact STXCL for assistance.');
   wrap.classList.toggle('hidden',existing.canRequestAccess!==true);
   $('existingAccessEmail').value=$('email').value.trim();
 }else{
   wrap.classList.add('hidden');
   $('existingRequestMessage').textContent='';
 }
 // Keep the original initial-request controls intact, but never offer a
 // second form when the backend reports an existing request for this cycle.
 document.querySelectorAll('#initial > .panel').forEach((part,i)=>{
   if(i>=2)part.classList.toggle('hidden',exists);
 });
}
async function sendExistingAccessLink(){
 clearStatus();
 const existing=gameData&&gameData.existingRequest;
 if(!existing||existing.canRequestAccess!==true){error('This request cannot be revised through the portal. Contact STXCL.');return;}
 const email=$('existingAccessEmail').value.trim();
 if(!email||!$('existingAccessEmail').checkValidity()){error('Enter a valid authorized club contact email.');return;}
 const btn=$('existingAccessButton');
 btn.disabled=true;
 try{
   await call('requestExistingAccess',gameData.gameNumber,email);
   success('If that email is an authorized contact for the existing request, a secure access link will be sent. Please check your inbox.');
 }catch(e){error(e.message);}
 finally{btn.disabled=false;}
}
async function lookup(){clearStatus();resetConflict('initial');gameData=null;applyExistingRequestState(null);
 const requestedGame=$('game').value.trim();
 try{
   const found=await call('findGame',requestedGame);
   // A delayed lookup must not restore stale game details after input changes.
   if($('game').value.trim()!==requestedGame)return;
   gameData=found;renderGame($('gameDetails'),gameData);
   applyExistingRequestState(gameData.existingRequest||null);
   if(gameData.existingRequest)return;
   const d=toIso(gameData.date);$('date').min=followingDayIso(d);
   const initialDate=''; // A new request must propose a future date, never the existing game date.
   await setProposal('',{date:initialDate,time:gameData.time,complex:gameData.complex,field:gameData.field});
   updateConflictActions('initial');
 }catch(e){gameData=null;$('gameDetails').classList.add('hidden');applyExistingRequestState(null);error(e.message);}
}
function toIso(d){const m=String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0'):'';}
// Policy-tagged requests can only propose dates AFTER the original game date.
function followingDayIso(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
async function submitInitial(){clearStatus();if(!gameData){error('Look up the game number before submitting.');return;}
 if(gameData.existingRequest){error('This game already has a request for the current scheduling cycle. Use its secure access link or contact STXCL; do not create another request.');return;}
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
 const amendment=reviewData.amendmentOnly===true;
 $('revisionAmendmentHint').classList.toggle('hidden',!amendment);
 $('reviewApproveBtn').classList.toggle('hidden',amendment);
 $('reviewRejectBtn').classList.toggle('hidden',amendment);
 $('reviewCounterBtn').textContent=amendment?'Propose revised terms':'Send counterproposal';
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
 if(reviewData.amendmentOnly===true && action!=='COUNTER'){
  error('This secure revision link is for proposing new terms only. The other club must approve the revision.');return;
 }
 if(reviewData.amendmentOnly===true && action==='COUNTER' && !proposalChangedFromReceived()){
  error('Change at least one of the four proposed schedule fields before submitting revised terms.');return;
 }
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
 else if(!confirm(action==='APPROVE'?'Approve this exact proposal and forward it to STXCL for review?':reviewData.amendmentOnly?'Send revised terms to the other club for fresh approval?':'Send these four proposed scheduling values back to the other club?'))return;
 try{const out=await call('actOnRequest',{id:RID,token:TOKEN,action,representativeName,representativeRole,proposal:action==='REJECT'?null:proposal('review'),certs:certs('review'),doubleHeaderAcknowledged:conflictAcknowledged('review')});
 $('review').classList.add('hidden');success('Request '+out.id+' updated: '+out.status+'. This link is now closed.');showCompletedActions();}
 catch(e){error(e.message);}}
async function init(){certHtml('initial');certHtml('review');timeOptions('time');timeOptions('reviewTime');
 if(RID&&TOKEN){$('initial').classList.add('hidden');$('review').classList.remove('hidden');}
 try{facilityData=await call('getFacilityOptions');fillComplex('complex');fillComplex('reviewComplex');
 if(RID&&TOKEN)await loadReview();}catch(e){error('Could not load facilities: '+e.message);}}
init();
