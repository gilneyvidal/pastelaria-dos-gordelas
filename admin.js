// ===== CONFIG DO REPOSITÓRIO =====
const GITHUB_OWNER = 'gilneyvidal';
const GITHUB_REPO = 'pastelaria-dos-gordelas';
const GITHUB_BRANCH = 'main';
const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/`;

// ===== ESTADO =====
let token = '';
let produtos = [];
let categorias = [];
let taxas = {};
let config = {};
let shaProdutos = '', shaCategorias = '', shaTaxas = '', shaConfig = '';
let fotoBase64 = null, fotoAtual = '';
let indiceEditando = -1, categoriaOriginal = '';

// ===== BASE64 UTF-8 =====
function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
function base64ToUtf8(b64) {
    const clean = b64.replace(/\n/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

// ===== GITHUB API =====
async function ghGet(path) {
    const res = await fetch(`${API_URL}${path}?ref=${GITHUB_BRANCH}&t=${Date.now()}`, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Erro ${res.status} ao ler ${path}`);
    const d = await res.json();
    return { content: base64ToUtf8(d.content), sha: d.sha };
}
async function ghPut(path, contentB64, sha, message) {
    const body = { message: message || 'Atualização via Painel Admin', content: contentB64, branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;
    const res = await fetch(`${API_URL}${path}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erro ao salvar'); }
    return res.json();
}

// ===== STATUS =====
function status(msg, tipo = 'info') {
    const el = document.getElementById('status-bar');
    el.textContent = msg;
    el.className = 'status-bar ativo ' + tipo;
    if (tipo === 'sucesso') setTimeout(() => el.className = 'status-bar', 4000);
}

// ===== LOGIN =====
function fazerLogin() {
    const t = document.getElementById('input-token').value.trim();
    if (!t) { alert('Cole o token!'); return; }
    token = t;
    localStorage.setItem('gh_token', token);
    iniciarPainel();
}
function fazerLogout() {
    if (!confirm('Sair do painel?')) return;
    localStorage.removeItem('gh_token');
    location.reload();
}

// ===== INICIAR =====
async function iniciarPainel() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('painel').classList.remove('painel-escondido');
    status('⏳ Carregando dados do GitHub...', 'info');
    try {
        const p = await ghGet('data/produtos.json');
        if (p) { produtos = JSON.parse(p.content); shaProdutos = p.sha; }
        
        const c = await ghGet('data/categorias.json');
        if (c) { categorias = JSON.parse(c.content); shaCategorias = c.sha; }
        else { categorias = [...new Set(produtos.map(x => x.categoria))]; }
        
        const t = await ghGet('data/taxas.json');
        if (t) { taxas = JSON.parse(t.content); shaTaxas = t.sha; }
        
        const cf = await ghGet('data/config.json');
        if (cf) { config = JSON.parse(cf.content); shaConfig = cf.sha; }
        else { config = { nomeLoja: 'Pastelaria dos Gordelas', whatsapp: '5511943184268' }; }
        
        renderizarTudo();
        status('✅ Dados carregados!', 'sucesso');
    } catch (e) {
        console.error(e);
        status('❌ Erro: ' + e.message, 'erro');
    }
}

// ===== RENDER =====
function renderizarTudo() {
    renderizarProdutos();
    renderizarCategoriasLista();
    renderizarTaxas();
    renderizarConfig();
    popularSelectCategorias();
}
function popularSelectCategorias() {
    const s = document.getElementById('prod-categoria');
    s.innerHTML = categorias.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('');
}
function renderizarProdutos() {
    const c = document.getElementById('lista-produtos');
    if (produtos.length === 0) { c.innerHTML = '<p style="text-align:center;color:#B0B0B0;padding:20px;">Nenhum produto.</p>'; return; }
    c.innerHTML = produtos.map((p, i) => `
        <div class="item-lista ${p.esgotado ? 'esgotado' : ''}">
            <img src="public/images/${p.foto || ''}" onerror="this.src='https://placehold.co/60x60/FFC107/000000?text=?'">
            <div class="info">
                <h3>${p.nome} ${p.esgotado ? '<span class="tag-esgotado">ESGOTADO</span>' : ''}</h3>
                <p>${p.descricao || ''}</p>
                <span class="preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="acoes">
                <button class="btn-icone editar" onclick="abrirModalProduto(${i})">✏️</button>
                <button class="btn-icone excluir" onclick="excluirProduto(${i})">🗑️</button>
            </div>
        </div>`).join('');
}
function renderizarCategoriasLista() {
    const c = document.getElementById('lista-categorias');
    c.innerHTML = categorias.map(cat => {
        const total = produtos.filter(p => p.categoria === cat).length;
        return `<div class="item-lista">
            <div class="info"><h3>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3><p>${total} produto(s)</p></div>
            <div class="acoes">
                <button class="btn-icone editar" onclick="abrirModalCategoria('${cat}')">✏️</button>
                <button class="btn-icone excluir" onclick="excluirCategoria('${cat}')">🗑️</button>
            </div>
        </div>`;
    }).join('') || '<p style="text-align:center;color:#B0B0B0;padding:20px;">Nenhuma categoria.</p>';
}
function renderizarTaxas() {
    const c = document.getElementById('lista-taxas');
    c.innerHTML = Object.entries(taxas).map(([b, v]) => `
        <div class="linha-taxa">
            <input type="text" class="bairro" value="${b}">
            <input type="number" class="valor" step="0.01" value="${v}">
            <button class="btn-remover" onclick="this.parentElement.remove()">×</button>
        </div>`).join('');
}
function adicionarLinhaTaxa() {
    const c = document.getElementById('lista-taxas');
    const div = document.createElement('div');
    div.className = 'linha-taxa';
    div.innerHTML = `<input type="text" class="bairro" placeholder="Nome do bairro"><input type="number" class="valor" step="0.01" placeholder="0.00"><button class="btn-remover" onclick="this.parentElement.remove()">×</button>`;
    c.appendChild(div);
}
function renderizarConfig() {
    document.getElementById('cfg-nome').value = config.nomeLoja || '';
    document.getElementById('cfg-whatsapp').value = config.whatsapp || '';
}

// ===== MODAL PRODUTO =====
function abrirModalProduto(i) {
    indiceEditando = (i !== undefined && i >= 0) ? i : -1;
    document.getElementById('modal-produto-titulo').textContent = indiceEditando >= 0 ? 'Editar Produto' : 'Novo Produto';
    fotoBase64 = null;
    
    if (indiceEditando >= 0) {
        const p = produtos[indiceEditando];
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-nome').value = p.nome;
        document.getElementById('prod-categoria').value = p.categoria;
        document.getElementById('prod-descricao').value = p.descricao || '';
        document.getElementById('prod-preco').value = p.preco;
        document.getElementById('prod-esgotado').checked = p.esgotado || false;
        fotoAtual = p.foto || '';
        const prev = document.getElementById('prod-foto-preview');
        if (p.foto) { prev.src = 'public/images/' + p.foto; prev.style.display = 'block'; } else prev.style.display = 'none';
        document.getElementById('prod-opcoes-monter').style.display = p.opcoes ? 'block' : 'none';
        if (p.opcoes) document.getElementById('prod-opcoes').value = p.opcoes.join(', ');
    } else {
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-nome').value = '';
        document.getElementById('prod-descricao').value = '';
        document.getElementById('prod-preco').value = '';
        document.getElementById('prod-esgotado').checked = false;
        document.getElementById('prod-foto').value = '';
        document.getElementById('prod-foto-preview').style.display = 'none';
        document.getElementById('prod-opcoes-monter').style.display = 'none';
        document.getElementById('prod-opcoes').value = '';
        fotoAtual = '';
    }
    document.getElementById('modal-produto').classList.add('ativo');
}

function previewFoto(input) {
    const file = input.files[0];
    if (!file) return;
    comprimirImagem(file).then(b64 => {
        fotoBase64 = b64;
        const prev = document.getElementById('prod-foto-preview');
        prev.src = b64;
        prev.style.display = 'block';
    });
}

function comprimirImagem(file, maxW = 800, quality = 0.8) {
    return new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxW) { h = (maxW / w) * h; w = maxW; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    const r2 = new FileReader();
                    r2.onloadend = () => resolve(r2.result);
                    r2.readAsDataURL(blob);
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        r.readAsDataURL(file);
    });
}

async function salvarProduto() {
    const nome = document.getElementById('prod-nome').value.trim();
    const categoria = document.getElementById('prod-categoria').value;
    const descricao = document.getElementById('prod-descricao').value.trim();
    const preco = parseFloat(document.getElementById('prod-preco').value);
    const esgotado = document.getElementById('prod-esgotado').checked;
    const opcoesTxt = document.getElementById('prod-opcoes').value.trim();
    
    if (!nome || !categoria || isNaN(preco)) { alert('Preencha nome, categoria e preço!'); return; }
    status('⏳ Salvando...', 'info');
    
    try {
        let id = document.getElementById('prod-id').value;
        let nomeFoto = fotoAtual;
        
        if (fotoBase64) {
            const b64 = fotoBase64.split(',')[1];
            nomeFoto = 'produto-' + Date.now() + '.jpg';
            const path = `public/images/${nomeFoto}`;
            const exist = await ghGet(path);
            await ghPut(path, b64, exist ? exist.sha : null, `Upload: ${nome}`);
        }
        if (!id) id = 'produto-' + Date.now().toString(36);
        
        const novo = { id, categoria, nome, descricao, preco: parseFloat(preco.toFixed(2)), foto: nomeFoto, esgotado };
        if (opcoesTxt) novo.opcoes = opcoesTxt.split(',').map(s => s.trim()).filter(Boolean);
        
        if (indiceEditando >= 0) produtos[indiceEditando] = novo;
        else produtos.push(novo);
        
        // Atualiza também categorias se for nova
        if (!categorias.includes(categoria)) {
            categorias.push(categoria);
            const rC = await ghPut('data/categorias.json', utf8ToBase64(JSON.stringify(categorias, null, 2)), shaCategorias, 'Nova categoria');
            shaCategorias = rC.content.sha;
        }
        
        const json = JSON.stringify(produtos, null, 2);
        const r = await ghPut('data/produtos.json', utf8ToBase64(json), shaProdutos, 'Atualizar produtos');
        shaProdutos = r.content.sha;
        
        fecharModal('modal-produto');
        renderizarTudo();
        status('✅ Produto salvo! Aguarde 2 min para atualizar no site.', 'sucesso');
    } catch (e) {
        console.error(e);
        status('❌ ' + e.message, 'erro');
    }
}

async function excluirProduto(i) {
    if (!confirm(`Excluir "${produtos[i].nome}"?`)) return;
    status('⏳ Excluindo...', 'info');
    try {
        produtos.splice(i, 1);
        const r = await ghPut('data/produtos.json', utf8ToBase64(JSON.stringify(produtos, null, 2)), shaProdutos, 'Excluir produto');
        shaProdutos = r.content.sha;
        renderizarTudo();
        status('✅ Excluído!', 'sucesso');
    } catch (e) { status('❌ ' + e.message, 'erro'); }
}

// ===== CATEGORIAS =====
function abrirModalCategoria(nome) {
    categoriaOriginal = nome || '';
    document.getElementById('modal-categoria-titulo').textContent = nome ? 'Editar Categoria' : 'Nova Categoria';
    document.getElementById('cat-nome').value = nome || '';
    document.getElementById('modal-categoria').classList.add('ativo');
}

async function salvarCategoria() {
    const novo = document.getElementById('cat-nome').value.trim().toLowerCase();
    if (!novo) { alert('Digite o nome!'); return; }
    status('⏳ Salvando...', 'info');
    try {
        if (categoriaOriginal) {
            const idx = categorias.indexOf(categoriaOriginal);
            if (idx >= 0) categorias[idx] = novo;
            produtos.forEach(p => { if (p.categoria === categoriaOriginal) p.categoria = novo; });
        } else {
            if (categorias.includes(novo)) { alert('Já existe!'); return; }
            categorias.push(novo);
        }
        const rC = await ghPut('data/categorias.json', utf8ToBase64(JSON.stringify(categorias, null, 2)), shaCategorias, 'Atualizar categorias');
        shaCategorias = rC.content.sha;
        const rP = await ghPut('data/produtos.json', utf8ToBase64(JSON.stringify(produtos, null, 2)), shaProdutos, 'Atualizar produtos');
        shaProdutos = rP.content.sha;
        fecharModal('modal-categoria');
        renderizarTudo();
        status('✅ Categoria salva!', 'sucesso');
    } catch (e) { status('❌ ' + e.message, 'erro'); }
}

async function excluirCategoria(nome) {
    const total = produtos.filter(p => p.categoria === nome).length;
    if (!confirm(`Excluir "${nome}"? ${total > 0 ? `(${total} produtos serão removidos)` : ''}`)) return;
    status('⏳ Excluindo...', 'info');
    try {
        categorias = categorias.filter(c => c !== nome);
        produtos = produtos.filter(p => p.categoria !== nome);
        const rC = await ghPut('data/categorias.json', utf8ToBase64(JSON.stringify(categorias, null, 2)), shaCategorias, 'Excluir categoria');
        shaCategorias = rC.content.sha;
        const rP = await ghPut('data/produtos.json', utf8ToBase64(JSON.stringify(produtos, null, 2)), shaProdutos, 'Excluir produtos');
        shaProdutos = rP.content.sha;
        renderizarTudo();
        status('✅ Categoria excluída!', 'sucesso');
    } catch (e) { status('❌ ' + e.message, 'erro'); }
}

// ===== TAXAS =====
async function salvarTaxas() {
    status('⏳ Salvando taxas...', 'info');
    try {
        const novas = {};
        document.querySelectorAll('#lista-taxas .linha-taxa').forEach(l => {
            const b = l.querySelector('.bairro').value.trim().toUpperCase();
            const v = parseFloat(l.querySelector('.valor').value);
            if (b && !isNaN(v)) novas[b] = v;
        });
        taxas = novas;
        const r = await ghPut('data/taxas.json', utf8ToBase64(JSON.stringify(taxas, null, 2)), shaTaxas, 'Atualizar taxas');
        shaTaxas = r.content.sha;
        renderizarTaxas();
        status('✅ Taxas salvas!', 'sucesso');
    } catch (e) { status('❌ ' + e.message, 'erro'); }
}

// ===== CONFIG =====
async function salvarConfig() {
    status('⏳ Salvando...', 'info');
    try {
        config.nomeLoja = document.getElementById('cfg-nome').value.trim();
        config.whatsapp = document.getElementById('cfg-whatsapp').value.trim();
        const r = await ghPut('data/config.json', utf8ToBase64(JSON.stringify(config, null, 2)), shaConfig, 'Atualizar config');
        shaConfig = r.content.sha;
        status('✅ Salvo!', 'sucesso');
    } catch (e) { status('❌ ' + e.message, 'erro'); }
}

// ===== UI =====
function mudarAba(nome, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativa'));
    btn.classList.add('ativa');
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('ativa'));
    document.getElementById('aba-' + nome).classList.add('ativa');
}
function fecharModal(id) { document.getElementById(id).classList.remove('ativo'); }

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
    const salvo = localStorage.getItem('gh_token');
    if (salvo) { token = salvo; iniciarPainel(); }
});
