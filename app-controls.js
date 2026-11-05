function certHtml(prefix){const container=$(prefix+'Certs');container.replaceChildren();
 const items=[['field','I certify that I have verified and confirmed the requested field is available for the proposed date and time.'],
  ['referee','I certify that, if the proposed date/time is outside STXCL standard play dates and/or the requested field is not at an STXCL-controlled facility, I have contacted the local referee assignor and verified that referee coverage is feasible.'],
  ['finality','I acknowledge that once both clubs agree and the request is submitted to STXCL, the request is final between the clubs. Subsequent changes must be made through the Game Change Request (GCR) process, with all applicable fees.'],
  ['disclaimer','I understand that club agreement and submission do not constitute STXCL approval. All requests remain subject to league review, applicable rescheduling policies, field availability, and referee coverage. STXCL reserves the right to deny or modify any request.']];
 items.forEach(([key,text])=>{const label=el('label','');label.className='cert';const input=document.createElement('input');input.type='checkbox';input.id=prefix+'_'+key;label.append(input,el('span',text));container.append(label);});}
function certs(prefix){return {field:$(prefix+'_field').checked,referee:$(prefix+'_referee').checked,finality:$(prefix+'_finality').checked,disclaimer:$(prefix+'_disclaimer').checked};}
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
