// 1) Cria admin padrão
if (!localStorage.getItem('users')) {
  localStorage.setItem('users',
    JSON.stringify([{ username: 'admin', password: '1234', active: false }]));
}
const ADMIN_SECRET = 'RYKELMY2025';

// 2) Referências DOM
const loginScreen       = document.getElementById('loginScreen');
const loginBtn          = document.getElementById('loginBtn');
const loginUserInput    = document.getElementById('loginUser');
const loginPassInput    = document.getElementById('loginPass');
const adminCodeInput    = document.getElementById('adminCode');
const loginError        = document.getElementById('loginError');
const loginSpinner      = document.getElementById('loginSpinner');
const loginBtnText      = document.getElementById('loginBtnText');

const app               = document.getElementById('app');
const tabContentBtn     = document.getElementById('tabContentBtn');
const tabAdminBtn       = document.getElementById('tabAdminBtn');
const logoutBtn         = document.getElementById('logoutBtn');
const contentTab        = document.getElementById('contentTab');
const adminTab          = document.getElementById('adminTab');

const newUserInput      = document.getElementById('newUserInput');
const newPassInput      = document.getElementById('newPassInput');
const createUserBtn     = document.getElementById('createUserBtn');
const userList          = document.getElementById('userList');

const fileInput         = document.getElementById('fileInput');
const searchInput       = document.getElementById('searchInput');
const categorySelect    = document.getElementById('categorySelect');
const baixarBtn         = document.getElementById('baixarListaBtn');
const loadSpinner       = document.getElementById('loadSpinner');
const contentDiv        = document.getElementById('content');
const loadMoreContainer = document.getElementById('loadMoreContainer');

const playerContainer   = document.getElementById('playerContainer');
const player            = document.getElementById('player');
const closePlayer       = document.getElementById('closePlayer');
const prevEpisodeBtn    = document.getElementById('prevEpisodeBtn');
const nextEpisodeBtn    = document.getElementById('nextEpisodeBtn');

const episodesModal     = document.getElementById('episodesModal');
const closeModal        = document.getElementById('closeModal');
const modalTitle        = document.getElementById('modalTitle');
const episodesList      = document.getElementById('episodesList');

// 3) Estado
let users        = JSON.parse(localStorage.getItem('users'));
let currentUser  = null;
let allItems     = [];
let filtered     = [];
let page         = 1;
const perPage    = 60;
let hls          = null;

// 4) Helpers usuários
function saveUsers() {
  localStorage.setItem('users', JSON.stringify(users));
}
function renderUsers() {
  userList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'flex justify-between bg-gray-800 p-2 rounded';
    li.innerHTML = `<span>${u.username}${u.active?' 🔴':''}</span>
      <button class="px-2 bg-red-600 rounded">Excluir</button>`;
    li.querySelector('button').onclick = () => {
      users = users.filter(x => x.username !== u.username);
      saveUsers(); renderUsers();
    };
    userList.append(li);
  });
}

// 5) Login
loginBtn.onclick = () => {
  loginSpinner.classList.remove('hidden');
  loginBtnText.classList.add('opacity-0');
  setTimeout(() => {
    const u = loginUserInput.value.trim();
    const p = loginPassInput.value.trim();
    const code = adminCodeInput.value.trim();
    const user = users.find(x => x.username===u && x.password===p);
    if(!user || user.active || (u==='admin'&&code!==ADMIN_SECRET)) {
      loginError.classList.remove('hidden');
      loginSpinner.classList.add('hidden');
      loginBtnText.classList.remove('opacity-0');
      return;
    }
    // sucesso
    user.active = true; saveUsers();
    currentUser = u;
    loginError.classList.add('hidden');
    loginScreen.classList.add('hidden');
    app.classList.remove('hidden');
    if(u==='admin') tabAdminBtn.classList.remove('hidden');
    renderUsers();
    loginSpinner.classList.add('hidden');
    loginBtnText.classList.remove('opacity-0');
  }, 500);
};

// 6) Logout
logoutBtn.onclick = () => {
  if(currentUser) {
    const usr = users.find(x=>x.username===currentUser);
    if(usr) { usr.active=false; saveUsers(); }
  }
  currentUser = null;
  loginUserInput.value = '';
  loginPassInput.value = '';
  adminCodeInput.value = '';
  app.classList.add('hidden');
  loginScreen.classList.remove('hidden');
};

// 7) Criação de usuário
createUserBtn.onclick = () => {
  const u = newUserInput.value.trim();
  const p = newPassInput.value.trim();
  if(!u||!p) return alert('Preencha usuário e senha.');
  if(users.find(x=>x.username===u)) return alert('Usuário já existe.');
  users.push({username:u,password:p,active:false});
  saveUsers(); newUserInput.value=''; newPassInput.value=''; renderUsers();
};

// 8) Tabs
tabContentBtn.onclick = () => {
  contentTab.classList.remove('hidden');
  adminTab.classList.add('hidden');
  tabContentBtn.classList.replace('bg-gray-700','bg-green-600');
  tabAdminBtn.classList.replace('bg-green-600','bg-gray-700');
};
tabAdminBtn.onclick = () => {
  contentTab.classList.add('hidden');
  adminTab.classList.remove('hidden');
  tabAdminBtn.classList.replace('bg-gray-700','bg-green-600');
  tabContentBtn.classList.replace('bg-green-600','bg-gray-700');
};

// 9) M3U / renderização / player / modal
// — reutilize suas funções parseM3U(), groupItems(), renderPage(), renderCard(), openSeries(), playEpisode(), openVideoLink(), etc.
// — ative: searchInput.oninput = filterItems; categorySelect.onchange = filterItems;
// — baixarBtn.onclick = () => loadList('fetch'); fileInput.onchange = () => loadList('file');

// Parse M3U
function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  const vodExt = /\.(mp4|mkv|mov|avi|webm|m3u8)$/i;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      const title = (lines[i].match(/,(.*)/) || [])[1]?.trim();
      const thumb = (lines[i].match(/tvg-logo="(.*?)"/) || [])[1] || 'https://dummyimage.com/300x169/444/fff.png&text=Sem+Imagem';
      const group = (lines[i].match(/group-title="(.*?)"/) || [])[1] || '';
      const url = lines[i+1]?.trim();
      if (url && url.startsWith('http') && group.toLowerCase() !== 'ao vivo' && vodExt.test(url)) {
        items.push({ title, url, thumb, group });
      }
    }
  }
  return items;
}

// Group items
function groupItems(items) {
  const series = {};
  const movies = [];
  items.forEach(item => {
    const match = item.title.match(/^(.*) S(\d+)E(\d+)/);
    if (match) {
      const name = match[1].trim();
      series[name] = series[name] || [];
      series[name].push(item);
    } else {
      movies.push(item);
    }
  });
  return { series, movies };
}

// Render page
function renderPage() {
  contentDiv.innerHTML = '';
  const { series, movies } = groupItems(filteredItems);
  const start = (currentPage - 1) * itemsPerPage;
  movies.slice(start, start + itemsPerPage).forEach(renderCard);
  loadMoreContainer.innerHTML = '';
  if (movies.length > currentPage * itemsPerPage) {
    const btn = document.createElement('button');
    btn.textContent = 'Carregar Mais';
    btn.className = 'px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 transition';
    btn.onclick = () => { currentPage++; renderPage(); };
    loadMoreContainer.appendChild(btn);
  }
  Object.entries(series).forEach(([name, eps]) => {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-2 rounded-xl cursor-pointer hover:scale-105 transition overflow-hidden';
    card.innerHTML = `<img src="${eps[0].thumb}" alt="${name}" class="aspect-video object-cover rounded-lg mb-2 w-full"/><h3 class="font-bold text-center">${name}</h3><p class="text-sm text-center">${eps.length} episódios</p>`;
    card.onclick = () => openSeries(name, eps);
    contentDiv.appendChild(card);
  });
}

function renderCard(item) {
  const card = document.createElement('div');
  card.className = 'bg-gray-800 p-2 rounded-xl cursor-pointer hover:scale-105 transition overflow-hidden';
  card.innerHTML = `<img src="${item.thumb}" alt="${item.title}" class="aspect-video object-cover rounded-lg mb-2 w-full"/><h3 class="text-sm truncate">${item.title}</h3>`;
  card.onclick = () => { openVideoLink(item); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  contentDiv.appendChild(card);
}

// Series modal
function openSeries(name, eps) {
  currentSeriesName = name;
  currentSeriesEps = eps;
  modalTitle.textContent = name;
  episodesList.innerHTML = '';
  const last = localStorage.getItem(`last_${name}`);
  eps.forEach((ep, idx) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-2 bg-gray-700 rounded hover:bg-gray-600 flex justify-between';
    btn.innerHTML = `<span>${ep.title}</span>${ep.title===last?'<span>🔴</span>':''}`;
    btn.onclick = () => playEpisode(idx);
    episodesList.appendChild(btn);
  });
  episodesModal.classList.remove('hidden');
}
closeModal.onclick = () => episodesModal.classList.add('hidden');

function playEpisode(idx) {
  currentEpIndex = idx;
  const ep = currentSeriesEps[idx];
  localStorage.setItem(`last_${currentSeriesName}`, ep.title);
  openVideoLink(ep);
  episodesModal.classList.add('hidden');
}

nextEpisodeBtn.onclick = () => { if (currentSeriesEps && currentEpIndex < currentSeriesEps.length - 1) playEpisode(currentEpIndex + 1); };
prevEpisodeBtn.onclick = () => { if (currentSeriesEps && currentEpIndex > 0) playEpisode(currentEpIndex - 1); };

function openVideoLink(item) {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  if (/\.m3u8$/i.test(item.url) && Hls.isSupported()) {
    hlsInstance = new Hls(); hlsInstance.loadSource(item.url); hlsInstance.attachMedia(player);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => player.play().catch(() => {}));
  } else {
    player.src = item.url;
    player.play().catch(() => {});
  }
  playerContainer.classList.remove('hidden');
}
closePlayer.onclick = () => { if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; } player.pause(); playerContainer.classList.add('hidden'); };

// Filtering
function filterItems() {
  const q = searchInput.value.toLowerCase();
  const cat = categorySelect.value;
  filteredItems = allItems.filter(i => i.title.toLowerCase().includes(q) && (!cat || i.group === cat));
  currentPage = 1;
  renderPage();
}
searchInput.oninput = filterItems;
categorySelect.onchange = filterItems;

// Update categories
function updateCategories() {
  const cats = [...new Set(allItems.map(i => i.group).filter(Boolean))].sort();
  categorySelect.innerHTML = '<option value="">Todas as Categorias</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; categorySelect.appendChild(o); });
}

// Load list
async function loadList(src) {
  loadSpinner.classList.remove('hidden');
  try {
    let text = '';
    if (src === 'fetch') {
      const res = await fetch('https://invictosplay.pro/get.php?username=875124068733&password=440327002313&type=m3u_plus&output=mpegts');
      text = await res.text();
    } else {
      const f = fileInput.files[0]; if (!f) return; text = await f.text();
    }
    allItems = parseM3U(text);
    updateCategories(); filterItems();
  } catch (e) { alert('Erro: '+e.message); }
  loadSpinner.classList.add('hidden');
}
baixarBtn.onclick = () => loadList('fetch');
fileInput.onchange = () => loadList('file');

// User/session management
function loadUsers() { return JSON.parse(localStorage.getItem('users')||'[]'); }
function saveUsers(list) { localStorage.setItem('users', JSON.stringify(list)); }

loginBtn.onclick = () => {
  loginSpinner.classList.remove('hidden'); loginBtnText.classList.add('opacity-0');
  const u=loginUserInput.value.trim(), p=loginPassInput.value.trim(), code=adminCodeInput.value.trim();
  const users=loadUsers(), user=users.find(x=>x.username===u&&x.password===p);
  const fail=!user||user.active||(u==='admin'&&code!==ADMIN_SECRET);
  if(fail){ setTimeout(()=>{loginSpinner.classList.add('hidden');loginBtnText.classList.remove('opacity-0');loginError.classList.remove('hidden');},500); return;}  
  user.active=true; saveUsers(users); currentUser=u;
  loginError.classList.add('hidden'); loginScreen.classList.add('hidden'); app.classList.remove('hidden');
  if(u==='admin') tabAdminBtn.classList.remove('hidden'); renderUserList();
  loginSpinner.classList.add('hidden'); loginBtnText.classList.remove('opacity-0');
};

logoutBtn.onclick = () => {
  const users=loadUsers(), user=users.find(x=>x.username===currentUser);
  if(user){user.active=false;saveUsers(users);} currentUser=null;
  app.classList.add('hidden'); loginScreen.classList.remove('hidden');
  loginUserInput.value=''; loginPassInput.value=''; adminCodeInput.value='';
};

createUserBtn.onclick = () => {
  const u=newUserInput.value.trim(), p=newPassInput.value.trim();
  if(!u||!p) return alert('Preencha usuário e senha.');
  const arr=loadUsers(); if(arr.find(x=>x.username===u)) return alert('Usuário já existe.');
  arr.push({username:u,password:p,active:false}); saveUsers(arr); renderUserList();
};

tabContentBtn.onclick=()=>{contentTab.classList.remove('hidden');adminTab.classList.add('hidden');tabContentBtn.classList.replace('bg-gray-700','bg-green-600');tabAdminBtn.classList.replace('bg-green-600','bg-gray-700');};
tabAdminBtn.onclick=()=>{contentTab.classList.add('hidden');adminTab.classList.remove('hidden');tabAdminBtn.classList.replace('bg-gray-700','bg-green-600');tabContentBtn.classList.replace('bg-green-600','bg-gray-700');};

tabContentBtn.click(); renderUserList();

// 10) Inicialização
tabContentBtn.click();
renderUsers();
