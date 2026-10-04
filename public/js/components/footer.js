function footerLink(label,target,loggedIn){
  if(loggedIn&&target.startsWith('view:'))return `<button class="footer-link" data-view="${target.slice(5)}">${label}</button>`;
  if(!loggedIn&&target==='login')return `<button class="footer-link" data-action="login">${label}</button>`;
  return `<a class="footer-link" href="${target}"${target.startsWith('/')?' target="_blank" rel="noopener"':''}>${label}</a>`;
}

function footerMarkup(loggedIn=false){
  const menus=[
    {title:'WALLETX',links:[['Overview',loggedIn?'view:dashboard':'#home'],['About WalletX',loggedIn?'view:dashboard':'#about'],['How it works',loggedIn?'view:dashboard':'#how']]},
    {title:'MONEY TOOLS',links:[['Transaction history',loggedIn?'view:transactions':'login'],['Monthly insights',loggedIn?'view:insights':'login'],['Spending limits',loggedIn?'view:budgets':'login'],['Payment reminders',loggedIn?'view:recurring':'login']]},
    {title:'PAYMENTS',links:[['My wallet',loggedIn?'view:wallet':'login'],['Add money',loggedIn?'view:add':'login'],['Transfer money',loggedIn?'view:transfer':'login'],['Pay bills',loggedIn?'view:bills':'login']]},
    {title:'PROJECT',links:[['Categories',loggedIn?'view:insights':'#services'],['Account & bank',loggedIn?'view:profile':'login'],['API status','/api/health']]}
  ];
  return `<footer class="site-footer"><div class="footer-inner"><div class="footer-main"><div class="footer-about"><a class="footer-brand" href="${loggedIn?'#':'#home'}"><span class="brand-icon">₹</span><span>WalletX</span></a><p>Everyday money management, made easier to follow.</p><span class="footer-tag">TRACK · PLAN · REVIEW</span></div><div class="footer-menus">${menus.map(menu=>`<nav class="footer-menu" aria-label="${menu.title}"><h2>${menu.title}</h2>${menu.links.map(([label,target])=>footerLink(label,target,loggedIn)).join('')}</nav>`).join('')}<div class="footer-cta"><span class="footer-cta-icon">↗</span><strong>Make your next money move with clarity.</strong><p>Open your wallet overview and explore your tools.</p>${loggedIn?'<button class="footer-cta-button" data-view="dashboard">Back to overview <span>→</span></button>':'<button class="footer-cta-button" data-action="register">Get started <span>→</span></button>'}</div></div></div><div class="footer-bottom"><span>₹ &nbsp; WalletX <i>·</i> Digital Wallet Management System</span><span>Personal finance project <i>·</i> INR ₹</span></div></div></footer>`;
}
