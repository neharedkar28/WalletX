function dashboardPage(){
  return `${pageIntro('WALLETX · PERSONAL FINANCE','Welcome to WalletX.','A simple digital wallet management system to help you see where your money goes, plan for upcoming costs, and keep everyday expenses organized.')}
    <section class="dashboard-welcome card">
      <div>
        <p class="eyebrow">ONE WALLET. A CLEARER PICTURE.</p>
        <h2 class="section-title">Make your money easier to understand.</h2>
        <p class="welcome-copy">Record wallet activity, review monthly trends, set category limits, and keep recurring payments in view — all from one place.</p>
      </div>
      <div class="welcome-mark" aria-hidden="true">₹</div>
    </section>
    <section class="space-top">
      <div class="card-head"><div><p class="eyebrow">WHAT YOU CAN DO</p><h2 class="section-title">Your tools, all in the sidebar.</h2></div></div>
      <div class="grid three">
        <button class="card info-card" data-view="transactions"><span class="info-icon">☷</span><strong>Track wallet activity</strong><span>Record credits and payments, then search transactions by month, category, or amount.</span><b>Open transactions →</b></button>
        <button class="card info-card" data-view="insights"><span class="info-icon">◔</span><strong>Understand monthly trends</strong><span>Compare total credits and debits, net flow, and category spending over time.</span><b>Open insights →</b></button>
        <button class="card info-card" data-view="budgets"><span class="info-icon">◉</span><strong>Plan your spending</strong><span>Set a monthly limit for each category and see a reminder as spending nears the limit.</span><b>Open spending limits →</b></button>
        <button class="card info-card" data-view="recurring"><span class="info-icon">◷</span><strong>Remember upcoming costs</strong><span>Add regular payments and due dates. WalletX highlights reminders coming soon.</span><b>Open reminders →</b></button>
        <button class="card info-card" data-view="groups"><span class="info-icon">♧</span><strong>Share group expenses</strong><span>Split a shared cost evenly and see the suggested settlements for each person.</span><b>Open group expenses →</b></button>
        <button class="card info-card" data-view="profile"><span class="info-icon">◎</span><strong>Manage your account</strong><span>Update your profile and keep masked bank account details alongside your wallet.</span><b>Open profile →</b></button>
      </div>
    </section>
    <section class="space-top">
      <p class="eyebrow">GETTING STARTED</p><h2 class="section-title">How WalletX works</h2>
      <div class="grid three space-top">
        <article class="card how-card"><span class="step-num">01</span><h3>Create your account</h3><p>Register or open the demo account to start using your personal wallet.</p></article>
        <article class="card how-card"><span class="step-num">02</span><h3>Add your activity</h3><p>Use Add Money, Transfer, QR Payment, or Pay Bills to record wallet activity.</p></article>
        <article class="card how-card"><span class="step-num">03</span><h3>Review and plan</h3><p>Open the sidebar tools to review monthly reports, plan budgets, and remember bills.</p></article>
      </div>
    </section>
    <section class="card dashboard-note space-top"><strong>About this project</strong><p>WalletX is a personal finance prototype. Wallet entries are saved locally with this app. Bank links and QR payment entries are for demonstration and do not connect to real payment networks.</p></section>`;
}
