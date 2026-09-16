let produtos = [];
let carrinho = [];
let selecionados = [];
let taxasEntrega = {};
let taxaAtual = 0;

const NUMERO_WHATSAPP = '5511943184268'; // Número do seu lead

// 1. Carregar dados iniciais
async function iniciar() {
    try {
        const [resProdutos, resTaxas] = await Promise.all([
            fetch('./data/produtos.json'),
            fetch('./data/taxas.json')
        ]);
        produtos = await resProdutos.json();
        taxasEntrega = await resTaxas.json();
        
        renderizarCategorias();
        renderizarProdutos('tradicionais');
        popularBairros();
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
        document.getElementById('cardapio').innerHTML = '<p style="text-align:center; padding:20px;">Erro ao carregar o cardápio. Recarregue a página.</p>';
    }
}

function popularBairros() {
    const select = document.getElementById('cli-bairro');
    Object.keys(taxasEntrega).forEach(bairro => {
        const opt = document.createElement('option');
        opt.value = bairro;
        opt.textContent = `${bairro} - R$ ${taxasEntrega[bairro].toFixed(2).replace('.', ',')}`;
        select.appendChild(opt);
    });
}

// 2. Categorias
function renderizarCategorias() {
    const categorias = [...new Set(produtos.map(p => p.categoria))];
    const nav = document.getElementById('categorias');
    nav.innerHTML = '';
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'aba';
        btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ');
        btn.onclick = () => {
            document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
            btn.classList.add('ativa');
            renderizarProdutos(cat);
        };
        nav.appendChild(btn);
    });
    if (nav.firstChild) nav.firstChild.classList.add('ativa');
}

// 3. Produtos
function renderizarProdutos(categoria) {
    const container = document.getElementById('cardapio');
    container.innerHTML = '';
    const filtrados = produtos.filter(p => p.categoria === categoria);
    
    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'produto-card' + (p.esgotado ? ' esgotado' : '');
        const isMonte = p.id === 'monte-o-seu';
        const acao = isMonte ? `abrirModalMonte()` : `adicionarAoCarrinho('${p.id}')`;
        const textoBotao = p.esgotado ? 'Esgotado' : (isMonte ? 'Montar' : 'Adicionar');
        const imgSrc = p.foto ? `public/images/${p.foto}` : 'https://placehold.co/85x85/FFC107/000000?text=Pastel';

        card.innerHTML = `
            <img src="${imgSrc}" alt="${p.nome}" onerror="this.src='https://placehold.co/85x85/FFC107/000000?text=Pastel'">
            <div class="produto-info">
                <div>
                    <h3>${p.nome}</h3>
                    <p>${p.descricao}</p>
                </div>
                <div class="preco-linha">
                    <span class="preco">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
                    <button class="btn-add" onclick="${acao}" ${p.esgotado ? 'disabled' : ''}>${textoBotao}</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. Carrinho
function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto || produto.esgotado) return;
    const itemExistente = carrinho.find(i => i.id === id);
    if (itemExistente) itemExistente.quantidade++;
    else carrinho.push({ ...produto, quantidade: 1 });
    atualizarCarrinho();
    mostrarFeedback(`${produto.nome} adicionado!`);
}

function atualizarCarrinho() {
    const qtdTotal = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
    const subtotal = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    
    document.getElementById('qtd-itens').textContent = qtdTotal;
    document.getElementById('total-carrinho').textContent = subtotal.toFixed(2).replace('.', ',');
    
    // Atualiza resumo do checkout também
    document.getElementById('resumo-subtotal').textContent = subtotal.toFixed(2).replace('.', ',');
    atualizarTotalCheckout();

    const container = document.getElementById('itens-carrinho');
    if (carrinho.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:15px; font-size:12px; color:var(--cinza-texto);">Seu carrinho está vazio.</p>';
        return;
    }

    container.innerHTML = carrinho.map((item, index) => `
        <div class="item-carrinho">
            <div class="item-info">
                <span class="item-nome">${item.nome}</span>
                <span class="item-preco">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="item-controles">
                <button class="btn-qtd" onclick="diminuirQuantidade(${index})">−</button>
                <span class="item-qtd">${item.quantidade}</span>
                <button class="btn-qtd" onclick="aumentarQuantidade(${index})">+</button>
                <button class="btn-remover" onclick="removerItem(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function aumentarQuantidade(i) { carrinho[i].quantidade++; atualizarCarrinho(); }
function diminuirQuantidade(i) { 
    if (carrinho[i].quantidade > 1) carrinho[i].quantidade--; 
    else carrinho.splice(i, 1);
    atualizarCarrinho(); 
}
function removerItem(i) { carrinho.splice(i, 1); atualizarCarrinho(); }
function toggleCarrinho() { document.getElementById('carrinho-fixo').classList.toggle('carrinho-fechado'); }

// 5. Monte o Seu
function abrirModalMonte() {
    selecionados = [];
    const produto = produtos.find(p => p.id === 'monte-o-seu');
    if (!produto) return;
    const lista = document.getElementById('lista-opcoes');
    lista.innerHTML = produto.opcoes.map(op => `
        <label class="opcao-ingrediente">
            <input type="checkbox" value="${op}" onchange="atualizarSelecao(this)"> ${op}
        </label>
    `).join('');
    document.getElementById('contador-sabores').textContent = '0 / 5';
    document.getElementById('modal-monter').classList.add('ativo');
}

function atualizarSelecao(cb) {
    if (cb.checked) {
        if (selecionados.length >= 5) { alert('Você já escolheu 5 sabores!'); cb.checked = false; return; }
        selecionados.push(cb.value);
    } else selecionados = selecionados.filter(s => s !== cb.value);
    document.getElementById('contador-sabores').textContent = `${selecionados.length} / 5`;
}

function adicionarMonteAoCarrinho() {
    if (selecionados.length === 0) { alert('Escolha pelo menos 1 sabor!'); return; }
    const produto = produtos.find(p => p.id === 'monte-o-seu');
    const item = { ...produto, nome: `Monte o Seu (${selecionados.join(', ')})`, quantidade: 1 };
    const existente = carrinho.find(i => i.nome === item.nome);
    if (existente) existente.quantidade++;
    else carrinho.push(item);
    atualizarCarrinho();
    fecharModal('modal-monter');
}

function fecharModal(id) { document.getElementById(id).classList.remove('ativo'); }

// 6. Checkout
function abrirCheckout() {
    if (carrinho.length === 0) { alert('Seu carrinho está vazio!'); return; }
    toggleCarrinho(); // Fecha o carrinho
    atualizarTotalCheckout();
    document.getElementById('modal-checkout').classList.add('ativo');
}

function toggleEndereco() {
    const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
    const campos = document.getElementById('campos-endereco');
    campos.style.display = modalidade === 'entrega' ? 'block' : 'none';
    calcularTaxa();
}

function calcularTaxa() {
    const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
    const bairro = document.getElementById('cli-bairro').value;
    
    if (modalidade === 'entrega' && bairro && taxasEntrega[bairro]) {
        taxaAtual = taxasEntrega[bairro];
    } else {
        taxaAtual = 0;
    }
    atualizarTotalCheckout();
}

function atualizarTotalCheckout() {
    const subtotal = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    document.getElementById('resumo-subtotal').textContent = subtotal.toFixed(2).replace('.', ',');
    document.getElementById('resumo-taxa').textContent = taxaAtual.toFixed(2).replace('.', ',');
    document.getElementById('linha-taxa').style.display = taxaAtual > 0 ? 'flex' : 'none';
    document.getElementById('resumo-total').textContent = (subtotal + taxaAtual).toFixed(2).replace('.', ',');
}

// 7. Enviar Pedido
function enviarPedidoWhatsApp() {
    const nome = document.getElementById('cli-nome').value.trim();
    const telefone = document.getElementById('cli-telefone').value.trim();
    const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
    const pagamento = document.querySelector('input[name="pagamento"]:checked').value;
    const obs = document.getElementById('cli-obs').value.trim();
    
    if (!nome) { alert('Por favor, preencha seu nome.'); return; }
    if (!telefone) { alert('Por favor, preencha seu telefone.'); return; }
    
    let enderecoTexto = '';
    if (modalidade === 'entrega') {
        const endereco = document.getElementById('cli-endereco').value.trim();
        const bairro = document.getElementById('cli-bairro').value;
        const complemento = document.getElementById('cli-complemento').value.trim();
        if (!endereco || !bairro) { alert('Preencha o endereço e o bairro.'); return; }
        enderecoTexto = `\n*Endereço:* ${endereco}${complemento ? ', ' + complemento : ''}\n*Bairro:* ${bairro}`;
    }
    
    const idPedido = 'GORDELA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const itensTexto = carrinho.map(i => `• ${i.quantidade}x ${i.nome} — R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`).join('\n');
    const subtotal = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2).replace('.', ',');
    const total = (parseFloat(subtotal.replace(',', '.')) + taxaAtual).toFixed(2).replace('.', ',');
    
    const modalidadeTexto = modalidade === 'entrega' ? '🛵 Entrega' : (modalidade === 'retirada' ? '🏃 Retirada' : '🍽️ Consumo no Local');
    
    let mensagem = `*🟡 NOVO PEDIDO — PASTELARIA DOS GORDELAS*\n`;
    mensagem += `*ID:* ${idPedido}\n\n`;
    mensagem += `*👤 Cliente:* ${nome}\n`;
    mensagem += `*📞 Telefone:* ${telefone}\n`;
    mensagem += `*📦 Modalidade:* ${modalidadeTexto}\n`;
    if (enderecoTexto) mensagem += enderecoTexto + '\n';
    mensagem += `\n*🛒 Itens:*\n${itensTexto}\n\n`;
    mensagem += `*Subtotal:* R$ ${subtotal}\n`;
    if (taxaAtual > 0) mensagem += `*Taxa de Entrega:* R$ ${taxaAtual.toFixed(2).replace('.', ',')}\n`;
    mensagem += `*💰 TOTAL: R$ ${total}*\n\n`;
    mensagem += `*💳 Pagamento:* ${pagamento}\n`;
    if (obs) mensagem += `*📝 Obs:* ${obs}\n`;
    mensagem += `\n_Obrigado pela preferência!_ ❤️`;
    
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    // Limpar carrinho após enviar
    carrinho = [];
    atualizarCarrinho();
    fecharModal('modal-checkout');
}

// 8. Feedback visual (toast)
function mostrarFeedback(msg) {
    const toast = document.createElement('div');
    toast.textContent = '✅ ' + msg;
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: var(--verde); color: white; padding: 10px 20px; border-radius: 20px;
        font-weight: 600; font-size: 13px; z-index: 300; animation: fadeIn 0.3s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
}

// Iniciar
iniciar();
