const cfg = window.STORE_CONFIG;
const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
const loginPage = location.pathname.endsWith('/admin/') || location.pathname.endsWith('/admin/index.html');
const adminHome = './dashboard.html';
const loginHome = './index.html';

async function authorizedUser() {
  const {data: {user}, error} = await db.auth.getUser();
  if (error || !user) return null;
  const {data, error: adminError} = await db.from('administradores')
    .select('id,nome,nivel,ativo').eq('id',user.id).eq('ativo',true).eq('nivel','admin').maybeSingle();
  if (adminError || !data) return null;
  return {user, profile:data};
}
async function signOut() {
  await db.auth.signOut();
  location.replace(loginHome);
}
function showError(message) {
  const el = document.querySelector('#feedback');
  if (el) {el.textContent=message;el.hidden=false;}
}
async function initializeLogin() {
  const form=document.querySelector('#loginForm');
  const submit=document.querySelector('#submitLogin');
  const existing=await authorizedUser();
  if(existing){location.replace(adminHome);return;}
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();submit.disabled=true;
    document.querySelector('#feedback').hidden=true;
    const email=document.querySelector('#email').value.trim();
    const password=document.querySelector('#password').value;
    try {
      const {error}=await db.auth.signInWithPassword({email,password});
      if(error) throw new Error('E-mail ou senha inválidos.');
      const result=await authorizedUser();
      if(!result){await db.auth.signOut();throw new Error('Sua conta não tem acesso administrativo.');}
      location.replace(adminHome);
    }catch(err){showError(err.message||'Não foi possível entrar.');}
    finally{submit.disabled=false;}
  });
}
async function initializeDashboard() {
  const result=await authorizedUser();
  if(!result){location.replace(loginHome);return;}
  document.querySelector('#adminName').textContent=result.profile.nome||result.user.email;
  document.querySelector('#logout').addEventListener('click',signOut);
  const tables=[['produtos','productsCount'],['pedidos','ordersCount'],['leads','leadsCount'],['clientes','clientsCount']];
  await Promise.all(tables.map(async ([table,id])=>{
    const {count,error}=await db.from(table).select('id',{count:'exact',head:true});
    document.getElementById(id).textContent=error?'Indisponível':String(count??0);
  }));
}
if(loginPage) initializeLogin(); else initializeDashboard();
