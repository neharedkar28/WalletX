const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'walletx.json');
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map();
const categories = ['Food','Shopping','Travel','Bills','Education','Entertainment','Healthcare','Other'];
fs.mkdirSync(DATA_DIR, { recursive: true });

function readDb() {
  if (!fs.existsSync(DB_FILE)) return { users: [], transactions: [], budgets: [], recurring: [], groups: [], reminders: [], banks: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
let db = readDb();
function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': 'same-origin' });
  res.end(JSON.stringify(body));
}
function bodyOf(req) { return new Promise((resolve, reject) => { let s=''; req.on('data', c => { s += c; if (s.length > 1e6) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function safeUser(user) { const { password, ...rest } = user; return rest; }
function userFor(req) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || ''; const id = sessions.get(token); return db.users.find(u => u.id === id); }
function id() { return crypto.randomUUID(); }
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) { return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') }; }
function categoryFor(text) {
  const s = text.toLowerCase();
  if (/restaurant|food|cafe|grocery|swiggy|zomato|dining/.test(s)) return 'Food';
  if (/amazon|shopping|store|clothes|mall|flipkart/.test(s)) return 'Shopping';
  if (/uber|ola|flight|train|metro|travel|fuel|petrol/.test(s)) return 'Travel';
  if (/electric|water|internet|recharge|rent|bill|gas/.test(s)) return 'Bills';
  if (/school|college|course|education|books|tuition/.test(s)) return 'Education';
  if (/movie|netflix|spotify|game|entertainment|subscription/.test(s)) return 'Entertainment';
  if (/medical|hospital|health|pharmacy|doctor/.test(s)) return 'Healthcare';
  return 'Other';
}
function calendarDate(year,month,day) { return new Date(Date.UTC(year,month,day)).toISOString().slice(0,10); }
function monthKey(date) { return String(date).slice(0, 7); }
function nextDueDate(reminder) { const [y,m,d]=reminder.dueDate.split('-').map(Number); const today=new Date();const start=new Date(y,m-1,d,12);if(start>=new Date(today.getFullYear(),today.getMonth(),today.getDate(),12))return reminder.dueDate;const date=new Date(start);for(let i=0;i<120&&date<new Date(today.getFullYear(),today.getMonth(),today.getDate(),12);i++){if(reminder.frequency==='weekly')date.setDate(date.getDate()+7);else if(reminder.frequency==='yearly')date.setFullYear(date.getFullYear()+1);else{const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+1);date.setDate(Math.min(day,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));}}return date.toISOString().slice(0,10); }
function bankAccount(userId, bankId) { return db.banks.find(b => b.userId === userId && b.id === bankId); }
function accountName(userId, bankId) { const bank = bankId ? bankAccount(userId, bankId) : null; return bank ? `${bank.bankName} ···· ${bank.last4}` : 'WalletX wallet'; }
function bankEffect(t) { if (Number.isFinite(t.bankEffect)) return t.bankEffect; if (!t.bankId) return 0; return t.description === 'Wallet top-up' ? -t.amount : t.type === 'credit' ? t.amount : -t.amount; }
function walletEffect(t) { if (Number.isFinite(t.walletEffect)) return t.walletEffect; if (t.bankId) return t.description === 'Wallet top-up' ? t.amount : 0; return t.type === 'credit' ? t.amount : -t.amount; }
function bankBalance(userId, bankId) { const bank=bankAccount(userId,bankId);if(!bank)return 0;return db.transactions.filter(t=>t.userId===userId&&t.bankId===bankId).reduce((sum,t)=>sum+bankEffect(t),Number(bank.openingBalance||0)); }
function accountBalance(userId) { return db.transactions.filter(t => t.userId === userId).reduce((sum,t) => sum + walletEffect(t),0); }
function monthSummary(userId, month, accountId = 'all') {
  const tx = db.transactions.filter(t => t.userId === userId && monthKey(t.date) === month && (accountId === 'all' || (accountId === 'wallet' ? (!t.bankId && (!t.accountName || t.accountName === 'WalletX wallet')) : t.bankId === accountId)));
  if (accountId !== 'all') {
    const effects=tx.map(t=>({t,effect:accountId==='wallet'?walletEffect(t):bankEffect(t)}));
    const credits=effects.filter(x=>x.effect>0),debits=effects.filter(x=>x.effect<0),credit=credits.reduce((n,x)=>n+x.effect,0),debit=debits.reduce((n,x)=>n+Math.abs(x.effect),0);
    return {month,credit,debit,net:credit-debit,creditCount:credits.length,debitCount:debits.length};
  }
  const credits = tx.filter(t => t.type === 'credit'); const debits = tx.filter(t => t.type === 'debit');
  const credit = credits.reduce((n,t) => n + t.amount,0), debit = debits.reduce((n,t) => n + t.amount,0);
  return { month, credit, debit, net: credit-debit, creditCount: credits.length, debitCount: debits.length };
}
function sendFile(req, res, pathname) {
  const route = pathname === '/' ? '/index.html' : pathname;
  const full = path.resolve(PUBLIC, '.' + route);
  if (!full.startsWith(PUBLIC + path.sep) && full !== path.join(PUBLIC, 'index.html')) return json(res,404,{error:'Not found'});
  fs.readFile(full, (err, data) => {
    if (err) return json(res,404,{error:'Not found'});
    const type = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'}[path.extname(full)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }); res.end(data);
  });
}
async function handle(req,res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`), route = url.pathname;
  if (!route.startsWith('/api/')) return sendFile(req,res,route);
  try {
    const input = ['POST','PUT','PATCH'].includes(req.method) ? await bodyOf(req) : {};
    if (req.method === 'POST' && route === '/api/auth/register') {
      const name = String(input.name || '').trim(), email = String(input.email || '').trim().toLowerCase(), phone = String(input.phone || '').trim(), password = String(input.password || '');
      if (!name || !email || password.length < 6) return json(res,400,{error:'Enter your name and email, and use a password with at least 6 characters.'});
      if (db.users.some(u => u.email === email)) return json(res,409,{error:'An account with this email already exists.'});
      const u = {id:id(),name,email,phone,...passwordHash(password),createdAt:new Date().toISOString()}; db.users.push(u); save();
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token,u.id); return json(res,201,{token,user:safeUser(u)});
    }
    if (req.method === 'POST' && route === '/api/auth/demo') {
      let u=db.users.find(x=>x.email==='demo@walletx.app');
      if(!u){u={id:id(),name:'Aarav Sharma',email:'demo@walletx.app',phone:'9876543210',...passwordHash(crypto.randomBytes(24).toString('hex')),createdAt:new Date().toISOString()};db.users.push(u);const now=new Date();const examples=[['Salary credit',52000,'credit','Other',1],['Monthly rent',14500,'debit','Bills',2],['Grocery store',2380,'debit','Food',4],['Metro card recharge',850,'debit','Travel',6],['Online purchase',3199,'debit','Shopping',8],['Electricity bill',1240,'debit','Bills',10],['Pharmacy',460,'debit','Healthcare',12],['Streaming subscription',649,'debit','Entertainment',14],['Restaurant dinner',1860,'debit','Food',17],['Freelance payment',8200,'credit','Other',19],['Books and stationery',970,'debit','Education',21],['Coffee shop',390,'debit','Food',23]];for(const [description,amount,type,category,days] of examples){const date=calendarDate(now.getFullYear(),now.getMonth(),days);db.transactions.push({id:id(),userId:u.id,description,amount,type,category,date,createdAt:new Date(date+'T12:00:00').toISOString()});}for(const [category,limit] of [['Food',5000],['Shopping',3000],['Travel',4000],['Bills',5000]])db.budgets.push({id:id(),userId:u.id,category,limit});const due=calendarDate(now.getFullYear(),now.getMonth()+1,5);db.recurring.push({id:id(),userId:u.id,title:'Home internet',amount:799,category:'Bills',dueDate:due,frequency:'monthly',active:true});save();}
      const token=crypto.randomBytes(32).toString('hex');sessions.set(token,u.id);return json(res,200,{token,user:safeUser(u)});
    }
    if (req.method === 'POST' && route === '/api/auth/login') {
      const key = String(input.email || '').trim().toLowerCase(), password = String(input.password || '');
      const u = db.users.find(v => v.email === key || v.phone === key);
      if (!u || passwordHash(password,u.salt).hash !== u.hash) return json(res,401,{error:'Email or password is incorrect.'});
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token,u.id); return json(res,200,{token,user:safeUser(u)});
    }
    const user = userFor(req);
    if (route === '/api/health') return json(res,200,{status:'ok'});
    if (!user) return json(res,401,{error:'Please log in to continue.'});
    if (req.method === 'GET' && route === '/api/me') return json(res,200,{user:safeUser(user),balance:accountBalance(user.id)});
    if (req.method === 'POST' && route === '/api/auth/logout') { sessions.delete(req.headers.authorization?.replace(/^Bearer\s+/i,'') || ''); return json(res,200,{ok:true}); }
    if (req.method === 'GET' && route === '/api/dashboard') {
      const month = url.searchParams.get('month') || new Date().toISOString().slice(0,7);
      const summary = monthSummary(user.id,month);
      const chart = Array.from({length:6},(_,i)=>{const d=new Date(`${month}-01T12:00:00`);d.setMonth(d.getMonth()-5+i);const key=d.toISOString().slice(0,7);return monthSummary(user.id,key);});
      const banks=db.banks.filter(b=>b.userId===user.id).map(b=>({...b,balance:bankBalance(user.id,b.id)}));
      const accountSummaries=[{bankId:'wallet',accountName:'WalletX wallet',balance:accountBalance(user.id),...monthSummary(user.id,month,'wallet')},...banks.map(b=>({bankId:b.id,accountName:`${b.bankName} ···· ${b.last4}`,balance:bankBalance(user.id,b.id),...monthSummary(user.id,month,b.id)}))];
      const transactions=db.transactions.filter(t=>t.userId===user.id).sort((a,b)=>b.date.localeCompare(a.date));
      const monthDebit=transactions.filter(t=>t.type==='debit'&&monthKey(t.date)===month);
      const categoriesList=categories.map(category=>({category,spent:monthDebit.filter(t=>t.category===category).reduce((n,t)=>n+t.amount,0)})).filter(x=>x.spent>0).sort((a,b)=>b.spent-a.spent);
      const budgets=db.budgets.filter(b=>b.userId===user.id).map(b=>({...b,spent:monthDebit.filter(t=>t.category===b.category).reduce((n,t)=>n+t.amount,0)}));
      const alerts=budgets.filter(b=>b.spent>=b.limit*.9).map(b=>({category:b.category,spent:b.spent,limit:b.limit,percent:Math.round(b.spent/b.limit*100),exceeded:b.spent>b.limit}));
      const recurring=db.recurring.filter(r=>r.userId===user.id);
      const reminders=[...db.reminders.filter(r=>r.userId===user.id),...recurring.filter(r=>r.active).map(r=>({id:r.id,title:r.title,amount:r.amount,dueDate:nextDueDate(r),category:r.category,accountName:r.accountName||accountName(user.id,r.bankId),recurringId:r.id}))];
      const upcoming=reminders.filter(r=>{const days=Math.ceil((new Date(`${r.dueDate}T23:59:00`)-new Date())/86400000);return days>=0&&days<=7;});
      return json(res,200,{user:safeUser(user),balance:accountBalance(user.id),summary,chart,categories:categoriesList,budgets,alerts,transactions:transactions.slice(0,8),upcoming,recurring:recurring.filter(r=>r.active),banks,accountSummaries});
    }
    if (req.method === 'GET' && route === '/api/transactions') {
      const q=(url.searchParams.get('q')||'').toLowerCase(), month=url.searchParams.get('month')||'', category=url.searchParams.get('category')||'', type=url.searchParams.get('type')||'', min=Number(url.searchParams.get('min')||0),account=url.searchParams.get('account')||'';
      const rows=db.transactions.filter(t=>t.userId===user.id&&(!q||`${t.description} ${t.category} ${t.note||''} ${t.accountName||accountName(user.id,t.bankId)}`.toLowerCase().includes(q))&&(!month||monthKey(t.date)===month)&&(!category||t.category===category)&&(!type||t.type===type)&&t.amount>=min&&(!account||(account==='wallet'?(!t.bankId&&(!t.accountName||t.accountName==='WalletX wallet')):t.bankId===account))).sort((a,b)=>b.date.localeCompare(a.date)).map(t=>({...t,accountName:t.accountName||accountName(user.id,t.bankId)}));
      return json(res,200,{transactions:rows,monthly:month?monthSummary(user.id,month,account||'all'):null,categories,banks:db.banks.filter(b=>b.userId===user.id)});
    }
    if (req.method === 'POST' && route === '/api/transactions') {
      const amount=Number(input.amount),type=input.type==='credit'?'credit':'debit',description=String(input.description||'').trim(),date=String(input.date||new Date().toISOString().slice(0,10));
      if(!description||!Number.isFinite(amount)||amount<=0)return json(res,400,{error:'Add a description and an amount greater than zero.'});
      const bankId=String(input.bankId||'');if(bankId&&!bankAccount(user.id,bankId))return json(res,400,{error:'Select a bank account linked to this WalletX profile.'});
      const value=Number(amount.toFixed(2)),isTopUp=description==='Wallet top-up';if(bankId&&(type==='debit'||isTopUp)&&bankBalance(user.id,bankId)<value)return json(res,400,{error:`${accountName(user.id,bankId)} does not have enough available balance.`});if(type==='debit'&&!bankId&&accountBalance(user.id)<value)return json(res,400,{error:'Your WalletX wallet balance is too low for this payment.'});
      const t={id:id(),userId:user.id,amount:value,type,description,date,category:categories.includes(input.category)?input.category:categoryFor(description),note:String(input.note||'').trim(),bankId:bankId||null,accountName:accountName(user.id,bankId),walletEffect:isTopUp?value:bankId?0:type==='credit'?value:-value,bankEffect:bankId?(isTopUp?-value:type==='credit'?value:-value):0,createdAt:new Date().toISOString()};db.transactions.push(t);save();return json(res,201,{transaction:t,balance:accountBalance(user.id)});
    }
    if (req.method === 'POST' && route === '/api/transfers') {const amount=Number(input.amount),recipient=String(input.recipient||'').trim().toLowerCase(),to=db.users.find(u=>u.id!==user.id&&(u.email===recipient||u.phone===recipient||u.name.toLowerCase()===recipient)),bankId=String(input.bankId||'');if(!to)return json(res,404,{error:'No WalletX user found with that name, email, or phone.'});if(!Number.isFinite(amount)||amount<=0)return json(res,400,{error:'Enter an amount greater than zero.'});if(bankId&&!bankAccount(user.id,bankId))return json(res,400,{error:'Select a bank account linked to this WalletX profile.'});if(bankId?bankBalance(user.id,bankId)<amount:accountBalance(user.id)<amount)return json(res,400,{error:bankId?`${accountName(user.id,bankId)} does not have enough available balance.`:'Your WalletX wallet balance is too low for this transfer.'});const date=new Date().toISOString().slice(0,10),note=`Transfer to ${to.name}`;db.transactions.push({id:id(),userId:user.id,type:'debit',amount,description:`Transfer to ${to.name}`,category:'Other',date,note,bankId:bankId||null,accountName:accountName(user.id,bankId),walletEffect:bankId?0:-amount,bankEffect:bankId?-amount:0,createdAt:new Date().toISOString()},{id:id(),userId:to.id,type:'credit',amount,description:`Transfer from ${user.name}`,category:'Other',date,note:`Transfer from ${user.name}`,bankId:null,accountName:'WalletX wallet',walletEffect:amount,bankEffect:0,createdAt:new Date().toISOString()});save();return json(res,201,{ok:true,balance:accountBalance(user.id),recipient:safeUser(to)});}
    if (req.method === 'DELETE' && route.startsWith('/api/transactions/')) {const tid=route.split('/').pop(),t=db.transactions.find(t=>t.id===tid&&t.userId===user.id);if(!t)return json(res,404,{error:'Transaction not found.'});db.transactions=db.transactions.filter(x=>x.id!==tid);save();return json(res,200,{ok:true,balance:accountBalance(user.id)});}
    if (route === '/api/budgets' && req.method === 'GET') return json(res,200,{budgets:db.budgets.filter(b=>b.userId===user.id),categories});
    if (route === '/api/budgets' && req.method === 'POST') {
      const category=String(input.category||''),limit=Number(input.limit);if(!categories.includes(category)||!Number.isFinite(limit)||limit<=0)return json(res,400,{error:'Choose a category and a monthly limit greater than zero.'});
      let b=db.budgets.find(x=>x.userId===user.id&&x.category===category);if(b)b.limit=limit;else{b={id:id(),userId:user.id,category,limit};db.budgets.push(b);}save();return json(res,200,{budget:b});
    }
    if (route.startsWith('/api/budgets/') && req.method === 'DELETE') {const bid=route.split('/').pop();db.budgets=db.budgets.filter(b=>!(b.userId===user.id&&b.id===bid));save();return json(res,200,{ok:true});}
    if (route === '/api/recurring' && req.method === 'GET') {const manual=db.recurring.filter(r=>r.userId===user.id).map(r=>({...r,dueDate:nextDueDate(r),accountName:r.accountName||accountName(user.id,r.bankId)}));const tx=db.transactions.filter(t=>t.userId===user.id&&t.type==='debit').sort((a,b)=>a.date.localeCompare(b.date));const buckets=new Map();for(const t of tx){const key=t.description.trim().toLowerCase();if(!key)continue;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(t);}const detected=[];for(const rows of buckets.values()){if(rows.length<2)continue;const first=rows[0],last=rows.at(-1),gap=(new Date(last.date)-new Date(first.date))/86400000;if(gap>=25&&gap<=100&&!manual.some(r=>r.title.toLowerCase()===first.description.toLowerCase()))detected.push({id:`detected-${first.id}`,title:first.description,amount:last.amount,category:last.category,accountName:last.accountName||accountName(user.id,last.bankId),frequency:gap<10?'weekly':'monthly',detected:true,occurrences:rows.length,lastPaid:last.date});}return json(res,200,{recurring:manual,detected,categories,banks:db.banks.filter(b=>b.userId===user.id)});}
    if (route === '/api/recurring' && req.method === 'POST') {
      const amount=Number(input.amount),title=String(input.title||'').trim(),dueDate=String(input.dueDate||''),bankId=String(input.bankId||'');if(!title||!Number.isFinite(amount)||amount<=0||!/\d{4}-\d{2}-\d{2}/.test(dueDate))return json(res,400,{error:'Enter a name, amount, and next due date.'});if(bankId&&!bankAccount(user.id,bankId))return json(res,400,{error:'Select a bank account linked to this WalletX profile.'});
      const r={id:id(),userId:user.id,title,amount,category:categories.includes(input.category)?input.category:categoryFor(title),dueDate,bankId:bankId||null,accountName:accountName(user.id,bankId),frequency:['weekly','monthly','yearly'].includes(input.frequency)?input.frequency:'monthly',active:true};db.recurring.push(r);save();return json(res,201,{recurring:r});
    }
    if (route.startsWith('/api/recurring/') && req.method === 'DELETE') {const rid=route.split('/').pop();db.recurring=db.recurring.filter(r=>!(r.userId===user.id&&r.id===rid));save();return json(res,200,{ok:true});}
    if (route === '/api/groups' && req.method === 'GET') return json(res,200,{groups:db.groups.filter(g=>g.userId===user.id)});
    if (route === '/api/groups' && req.method === 'POST') {
      const title=String(input.title||'').trim(),total=Number(input.total),paidBy=String(input.paidBy||user.name).trim(),people=Array.isArray(input.people)?input.people.map(String).map(s=>s.trim()).filter(Boolean):[];
      if(!title||!Number.isFinite(total)||total<=0||people.length<1)return json(res,400,{error:'Add a group title, total amount, and at least one other person.'});
      const all=[...new Set([paidBy,...people])],perPerson=Number((total/all.length).toFixed(2)),g={id:id(),userId:user.id,title,total,paidBy,people:all,perPerson,balances:all.filter(p=>p!==paidBy).map(person=>({from:person,to:paidBy,amount:perPerson})),date:new Date().toISOString().slice(0,10)};db.groups.push(g);save();return json(res,201,{group:g});
    }
    if (route.startsWith('/api/groups/') && req.method === 'DELETE') {const gid=route.split('/').pop();db.groups=db.groups.filter(g=>!(g.userId===user.id&&g.id===gid));save();return json(res,200,{ok:true});}
    if (route === '/api/profile' && req.method === 'GET') return json(res,200,{user:safeUser(user),banks:db.banks.filter(b=>b.userId===user.id).map(b=>({...b,balance:bankBalance(user.id,b.id)}))});
    if (route === '/api/profile' && req.method === 'PUT') {user.name=String(input.name||user.name).trim();user.phone=String(input.phone||'').trim();save();return json(res,200,{user:safeUser(user)});}
    if (route === '/api/banks' && req.method === 'GET') return json(res,200,{banks:db.banks.filter(b=>b.userId===user.id).map(b=>({...b,balance:bankBalance(user.id,b.id)}))});
    if (route === '/api/banks' && req.method === 'POST') {const name=String(input.bankName||'').trim(),last4=String(input.accountNumber||'').replace(/\D/g,'').slice(-4),openingBalance=Number(input.openingBalance);if(!name||last4.length!==4||!Number.isFinite(openingBalance)||openingBalance<0)return json(res,400,{error:'Enter a bank name, valid account number, and balance of zero or more.'});const bank={id:id(),userId:user.id,bankName:name,last4,openingBalance};db.banks.push(bank);save();return json(res,201,{bank:{...bank,balance:bankBalance(user.id,bank.id)}});}
    if (route.startsWith('/api/banks/') && req.method === 'PUT') {const bid=route.split('/').pop(),bank=bankAccount(user.id,bid),currentBalance=Number(input.currentBalance);if(!bank)return json(res,404,{error:'Bank account not found.'});if(!Number.isFinite(currentBalance)||currentBalance<0)return json(res,400,{error:'Enter a balance of zero or more.'});const recordedEffects=db.transactions.filter(t=>t.userId===user.id&&t.bankId===bid).reduce((sum,t)=>sum+bankEffect(t),0);bank.openingBalance=Number((currentBalance-recordedEffects).toFixed(2));save();return json(res,200,{bank:{...bank,balance:bankBalance(user.id,bid)}});}
    if (route.startsWith('/api/banks/') && req.method === 'DELETE') {const bid=route.split('/').pop();db.banks=db.banks.filter(b=>!(b.userId===user.id&&b.id===bid));save();return json(res,200,{ok:true});}
    return json(res,404,{error:'API route not found.'});
  } catch (error) { return json(res,400,{error:error.message||'Request could not be completed.'}); }
}
http.createServer((req,res)=>{Promise.resolve(handle(req,res)).catch(()=>json(res,500,{error:'Something went wrong. Please try again.'}));}).listen(PORT,()=>console.log(`WalletX running at http://localhost:${PORT}`));
