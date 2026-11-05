
const query = new URLSearchParams(location.search);
const RID = query.get('rid')||history.state?.rid||'';
const TOKEN = query.get('token')||history.state?.token||'';
if(RID&&TOKEN)history.replaceState({rid:RID,token:TOKEN},'',location.pathname);
let gameData=null,reviewData=null,facilityData=[];
const $=id=>document.getElementById(id);
function error(msg){$('error').textContent=String(msg);$('error').classList.remove('hidden');$('ok').classList.add('hidden');window.scrollTo(0,0);}
function success(msg){$('ok').textContent=String(msg);$('ok').classList.remove('hidden');$('error').classList.add('hidden');window.scrollTo(0,0);}
function clearStatus(){$('ok').classList.add('hidden');$('error').classList.add('hidden');}
function busy(v){$('busy').classList.toggle('show',!!v);}
const API_URL='https://stxcl-request-api.sweet-bar-6418.workers.dev/';
async function call(server,...args){
busy(true);
try{
 const resp=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:server,args})});
 const packet=await resp.json();
 if(!resp.ok||!packet.ok)throw Error(packet.error||'Request failed.');
 return packet.result;
}finally{busy(false);}
}
function el(tag,text){const n=document.createElement(tag);n.textContent=String(text??'');return n;}
function renderGame(target,g){target.replaceChildren();
 [['Game #',g.gameNumber],['Division',g.division],['Flight',g.flight],['Home',g.home],['Away',g.away],
  ['Current date',g.date],['Current time',g.time],['Current complex',g.complex],['Current field',g.field],
  ['Status',g.status],['Competition',g.competition]].forEach(([k,v])=>{target.append(el('span',k),el('span',v));});target.classList.remove('hidden');}
