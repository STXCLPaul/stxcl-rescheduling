function certHtml(prefix){
 const container=$(prefix+'Certs');container.replaceChildren();
 const terms=[
  'I am authorized to act on behalf of my club/team in this rescheduling process.',
  'I have verified and confirmed that the proposed field is available for the requested date and time.',
  'If the proposed game falls outside STXCL standard play dates and/or uses a facility not controlled by STXCL, I have contacted the local referee assignor and verified that referee coverage is feasible.',
  'I understand that I am fully responsible for reviewing my team’s schedule and verifying that the proposed change does not create a scheduling conflict or violate any league rule. If a conflict or rules violation results from this request, I understand that I will be required to use the Game Change Request (GCR) process to reschedule, including all applicable fees.',
  'Once both clubs agree and the request is submitted to STXCL, the agreement is final between the clubs. Any later change must use the GCR process and is subject to applicable fees.',
  'Agreement between clubs does not constitute STXCL approval. Every request remains subject to league review, applicable policies, field availability, and referee coverage; STXCL may deny or modify the request.'
 ];
 const list=document.createElement('ul');
 terms.forEach(term=>{const li=document.createElement('li');li.textContent=term;list.append(li);});
 container.append(list);
 const rainoutLabel=document.createElement('label');rainoutLabel.className='cert';
 const rainoutInput=document.createElement('input');rainoutInput.type='checkbox';rainoutInput.id=prefix+'_rainout';
 rainoutLabel.append(rainoutInput,el('span','I certify that this request concerns a game that was rained out and is eligible for rescheduling under STXCL policy. I understand this portal cannot be used for convenience changes, club scheduling mistakes, or other non-rainout reasons; those require a Game Change Request (GCR) through the league website.'));
 container.append(rainoutLabel);
 const label=document.createElement('label');label.className='cert';
 const input=document.createElement('input');input.type='checkbox';input.id=prefix+'_all';
 const span=el('span','I have read, understand, and certify all of the statements above.');
 label.append(input,span);container.append(label);
}
function certs(prefix){
 const accepted=$(prefix+'_all').checked;
 return {rainout:$(prefix+'_rainout').checked,authority:accepted,field:accepted,referee:accepted,finality:accepted,disclaimer:accepted,scheduleResponsibility:accepted};
}
function timeOptions(id){const s=$(id);s.replaceChildren(new Option('Select time',''));
 for(let min=7*60;min<=21*60+30;min+=15){const h=Math.floor(min/60),m=min%60,ampm=h<12?'AM':'PM',display=(h%12||12)+':'+String(m).padStart(2,'0')+' '+ampm;s.add(new Option(display,display));}}
function fillComplex(id){const s=$(id);s.replaceChildren(new Option('Select complex',''));
 facilityData.forEach(c=>s.add(new Option(c.complex,c.complex)));s.add(new Option('Other — enter a new complex','__OTHER__'));}
async function changeComplex(prefix,preferredField) {
 const cid=prefix?'reviewComplex':'complex',fid=prefix?'reviewField':'field';
 const otherWrap=prefix?'reviewOtherComplexWrap':'otherComplexWrap';
 const fieldWrap=prefix?'reviewOtherFieldWrap':'otherFieldWrap';
 const otherInput=prefix?'reviewOtherField':'otherField';
 const complex=$(cid).value,other=complex==='__OTHER__';
 $(otherWrap).classList.toggle('hidden',!other);
 const fs=$(fid);
 fs.replaceChildren(new Option(other?'Other — enter a field':'Select field',other?'__OTHER__':''));
 fs.disabled=!other && !complex;
 $(fieldWrap).classList.toggle('hidden',!other);
 if(other) {fs.disabled=false;return;}
 if(!complex)return;
 fs.disabled=true;
 fs.replaceChildren(new Option('Loading fields...',''));
 try{
   let fields=facilityData.find(x=>x.complex===complex)?.fields;
   if(!fields || !fields.length){
     fields=await call('getFacilityOptions',complex);
     const item=facilityData.find(x=>x.complex===complex);
     if(item)item.fields=fields;
   }
   if($(cid).value!==complex)return;
   fs.replaceChildren(new Option('Select field',''));
   (fields||[]).forEach(x=>fs.add(new Option(x,x)));
   fs.add(new Option('Other — enter a field','__OTHER__'));
   fs.disabled=false;
   if(preferredField){
     fs.value=[...fs.options].some(o=>o.value===preferredField)?preferredField:'__OTHER__';
     if(fs.value==='__OTHER__')$(otherInput).value=preferredField;
   }
   $(fieldWrap).classList.toggle('hidden',fs.value!=='__OTHER__');
   fs.onchange=()=>$(fieldWrap).classList.toggle('hidden',fs.value!=='__OTHER__');
 }catch(e){
   if($(cid).value===complex){
     fs.replaceChildren(new Option('Fields unavailable',''));
     fs.disabled=true;
     error('Unable to load fields for '+complex+': '+e.message);
   }
 }
}
