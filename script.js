let produtos = [];
let carrinho = [];
let selecionados = [];

// 1. Carregar os produtos do arquivo JSON
async function carregarProdutos() {
    try {
        const resposta = await fetch('./data/produtos.json');
        produtos = await resposta.json();
        renderizarCategorias();
        renderizarProdutos('tradicionais'); // Aba inicial
    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        document.getElementById('cardapio').innerHTML = '<p style="text-align:center; padding:20px;">Erro ao carregar o cardápio. Recarregue a página.</p>';
    }
}

// 2. Renderizar as abas de categorias
function renderizarCategorias() {
    const categorias = [...new Set(produtos.map(p => p.categoria))];
    const nav = document.getElementById('categorias');
    nav.innerHTML = '';
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'aba';
        // Deixa a primeira letra maiúscula e troca '-' por espaço
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

// 3. Renderizar os produtos
function renderizarProdutos(categoria) {
    const container = document.getElementById('cardapio');
    container.innerHTML = '';
    const filtrados = produtos.filter(p => p.categoria === categoria);
    
    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'produto-card' + (p.esgotado ? ' esgotado' : '');
        
        // 👇 CORREÇÃO DO BUG AQUI: Removida a aspa extra e ajustada a lógica
        const isMonte = p.id === 'monte-o-seu';
        const acao = isMonte ? `abrirModalMonte()` : `adicionarAoCarrinho('${p.id}')`;
        const textoBotao = p.esgotado ? 'Esgotado' : (isMonte ? 'Montar' : 'Adicionar');

        // Fallback para imagem quebrada
        const imgSrc = p.foto ? `public/images/${p.foto}` : 'https://placehold.co/80x80/FFD700/000000?text=Pastel';

        card.innerHTML = `
            <img src="${imgSrc}" alt="${p.nome}" onerror="this.src='https://placehold.co/80x80/FFD700/000000?text=Pastel'">
            <div class="produto-info">
                <h3>${p.nome}</h3>
                <p>${p.descricao}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                    <span class="preco">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
                    <button class="btn-add" onclick="${acao}" ${p.esgotado ? 'disabled' : ''}>
                        ${textoBotao}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. Lógica do Carrinho
function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto || produto.esgotado) return;

    const itemExistente = carrinho.find(i => i.id === id);
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({ ...produto, quantidade: 1 });
    }
    atualizarCarrinho();
    // Feedback visual rápido (pode ser um toast depois)
    // alert(`${produto.nome} adicionado!`); 
}

function atualizarCarrinho() {
    const qtdTotal = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    
    document.getElementById('qtd-itens').textContent = qtdTotal;
    document.getElementById('total-carrinho').textContent = total.toFixed(2).replace('.', ',');

    const container = document.getElementById('itens-carrinho');
    if (carrinho.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:10px; font-size:12px;">Seu carrinho está vazio.</p>';
        return;
    }

    container.innerHTML = carrinho.map(item => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #ccc; font-size:14px;">
            <span>${item.quantidade}x ${item.nome}</span>
            <span style="font-weight:bold;">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
        </div>
    `).join('');
}

function toggleCarrinho() {
    document.getElementById('carrinho-fixo').classList.toggle('carrinho-fechado');
}

// 5. Lógica do "Monte o Seu"
function abrirModalMonte() {
    selecionados = [];
    const produto = produtos.find(p => p.id === 'monte-o-seu');
    if (!produto) return;
    
    const lista = document.getElementById('lista-opcoes');
    lista.innerHTML = produto.opcoes.map(op => `
        <label class="opcao-ingrediente">
            <input type="checkbox" value="${op}" onchange="atualizarSelecao(this)">
            ${op}
        </label>
    `).join('');
    
    document.getElementById('contador-sabores').textContent = '0 / 5';
    document.getElementById('modal-monter').classList.add('ativo');
}

function atualizarSelecao(checkbox) {
    if (checkbox.checked) {
        if (selecionados.length >= 5) {
            alert('Você já escolheu 5 sabores!');
            checkbox.checked = false;
            return;
        }
        selecionados.push(checkbox.value);
    } else {
        selecionados = selecionados.filter(s => s !== checkbox.value);
    }
    document.getElementById('contador-sabores').textContent = `${selecionados.length} / 5`;
}

// 👇 CORREÇÃO DO BUG: Nome da função corrigido (Carrinho com 2 R's)
function adicionarMonteAoCarrinho() {
    if (selecionados.length === 0) {
        alert('Escolha pelo menos 1 sabor!');
        return;
    }
    const produto = produtos.find(p => p.id === 'monte-o-seu');
    const item = {
        ...produto,
        nome: `Monte o Seu (${selecionados.join(', ')})`,
        quantidade: 1
    };
    
    // Verifica se já tem um "Monte o Seu" com os mesmos ingredientes
    const itemExistente = carrinho.find(i => i.nome === item.nome);
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push(item);
    }
    
    atualizarCarrinho();
    fecharModal();
}

function fecharModal() {
    document.getElementById('modal-monter').classList.remove('ativo');
}

// 6. Finalizar Pedido (Checkout WhatsApp - Versão Simples Provisória)
function finalizarPedido() {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    const itensTexto = carrinho.map(i => `${i.quantidade}x ${i.nome} - R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`).join('\n');
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2).replace('.', ',');
    
    const mensagem = `*NOVO PEDIDO - PASTELARIA DOS GORDELAS*\n\n` +
                     `*Itens:*\n${itensTexto}\n\n` +
                     `*Total:* R$ ${total}`;
    
    // ⚠️ COLOQUE O NÚMERO DO SEU LEAD AQUI (DDI+DDD+Número)
    const telefone = '5511999999999'; 
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// Iniciar
carregarProdutos();
