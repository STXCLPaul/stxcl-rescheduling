function proposal(prefix){const ids={Date:'date',Time:'time',Complex:'complex',Field:'field',OtherComplex:'otherComplex',OtherField:'otherField'};const v=(name)=>$(prefix?'review'+name:ids[name]).value.trim();
 const c=v('Complex'),f=v('Field');return {date:v('Date'),time:v('Time'),
 complex:c==='__OTHER__'?v('OtherComplex'):c,field:f==='__OTHER__'||c==='__OTHER__'?v('OtherField'):f};}
function setProposal(prefix,p){const dateId=prefix?'reviewDate':'date',timeId=prefix?'reviewTime':'time';
 $(dateId).value=/^\d{4}-\d{2}-\d{2}$/.test(p.date)?p.date:'';$(timeId).value=p.time;
 const cid=prefix?'reviewComplex':'complex';const has=facilityData.some(x=>x.complex===p.complex);
 $(cid).value=has?p.complex:'__OTHER__';
 if(!has)$(prefix?'reviewOtherComplex':'otherComplex').value=p.complex;
 changeComplex(prefix,p.field);
 if(!has||$(prefix?'reviewField':'field').value==='__OTHER__')$(prefix?'reviewOtherField':'otherField').value=p.field;
}
