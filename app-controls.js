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
function changeComplex(prefix,preferredField){const cid=prefix? 'reviewComplex':'complex';const fid=prefix?'reviewField':'field';
 const value=$(cid).value;const other=value==='__OTHER__';
 $(prefix? 'reviewOtherComplexWrap':'otherComplexWrap').classList.toggle('hidden',!other);
 $(prefix? 'reviewOtherFieldWrap':'otherFieldWrap').classList.toggle('hidden',!other);
 const fs=$(fid);fs.replaceChildren(new Option('Select field',''));
 if(!other){const match=facilityData.find(x=>x.complex===value);(match?.fields||[]).forEach(x=>fs.add(new Option(x,x)));
 fs.add(new Option('Other — enter a field','__OTHER__'));}
 else fs.add(new Option('Other — enter a field','__OTHER__'));
 if(preferredField){const match=[...fs.options].find(o=>o.value===preferredField);fs.value=match?preferredField:'__OTHER__';}
 if(!other){const otherField=prefix?'reviewOtherFieldWrap':'otherFieldWrap';
 $(otherField).classList.toggle('hidden',fs.value==='__OTHER__');}
 fs.onchange=()=>{$(prefix?'reviewOtherFieldWrap':'otherFieldWrap').classList.toggle('hidden',fs.value!=='__OTHER__');};
}
