const CATEGORIES=['Food','Shopping','Travel','Bills','Education','Entertainment','Healthcare','Other'];
const NAV=[['dashboard','⌂','Dashboard'],['wallet','◈','My wallet'],['add','＋','Add money'],['transfer','↔','Transfer money'],['qr','▦','QR payment'],['bills','▣','Pay bills'],['transactions','☷','Transactions'],['insights','◔','Insights & reports'],['budgets','◉','Spending limits'],['recurring','◷','Recurring & reminders'],['groups','♧','Group expenses'],['profile','◎','Profile & bank']];
const $=s=>document.querySelector(s), app=$('#app');
const state={token:localStorage.getItem('walletx-token')||'',user:null,balance:0,view:'dashboard',month:new Date().toISOString().slice(0,7),dash:null,filters:{q:'',month:new Date().toISOString().slice(0,7),category:'',type:'',min:'',account:''},authMode:'login',mobile:false};
const rupees=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFmt=s=>s?new Date(`${s}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'';
async function api(path,opts={}){
  const headers={'Content-Type':'application/json',...(state.token?{Authorization:`Bearer ${state.token}`}:{})};
  let response;
  try {
    response=await fetch(`/api${path}`,{...opts,headers:{...headers,...opts.headers},body:opts.body?JSON.stringify(opts.body):undefined});
  } catch {
    throw new Error('WalletX server is not reachable. In VS Code, open the project terminal, run npm start, and keep it open while using the site.');
  }
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Request failed');
  return data;
}
function toast(message,error=false){const el=document.createElement('div');el.className=`toast${error?' error':''}`;el.textContent=message;$('#toast-region').append(el);setTimeout(()=>el.remove(),3600)}
function loading(){app.innerHTML='<div class="loader"><span class="brand-mark">₹</span><span>WalletX</span></div>'}
