let produtos = [];
let carrinho = [];

// 1. Carregar os produtos do arquivo JSON
async function carregarProdutos() {
    try {
        const resposta = await fetch('./data/produtos.json');
        produtos = await resposta.json();
        renderizarCategorias();
        renderizarProdutos('tradicionais'); // Aba inicial
    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        document.getElementById('cardapio').innerHTML = '<p>Erro ao carregar o cardápio. Tente novamente.</p>';
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
        btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        btn.onclick = () => {
            document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
            btn.classList.add('ativa');
            renderizarProdutos(cat);
        };
        nav.appendChild(btn);
    });
    // Ativar a primeira aba
    if (nav.firstChild) nav.firstChild.classList.add('ativa');
}

// 3. Renderizar os produtos da categoria selecionada
function renderizarProdutos(categoria) {
    const container = document.getElementById('cardapio');
    container.innerHTML = '';
    const filtrados = produtos.filter(p => p.categoria === categoria);
    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'produto-card' + (p.esgotado ? ' esgotado' : '');
        
        // Verifica se é o "Monte o Seu" para abrir modal
        const acao = p.id === 'monte-o-seu' ? `abrirModalMonte()'` : `adicionarAoCarrinho('${p.id}')'`;
        const textoBotao = p.esgotado ? 'Esgotado' : (p.id === 'monte-o-seu' ? 'Montar' : 'Adicionar');

        card.innerHTML = `
            <img src="public/images/${p.foto}" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/80?text=Pastel'">
            <div class="produto-info">
                <h3>${p.nome}</h3>
                <p>${p.descricao}</p>
                <div class="preco">R$ ${p.preco.toFixed(2).replace('.', ',')}</div>
                <button onclick="${acao}" ${p.esgotado ? 'disabled' : ''} style="margin-top:8px; padding:6px 12px; background:var(--amarelo); border:none; border-radius:5px; font-weight:bold; cursor:pointer;">
                    ${textoBotao}
                </button>
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
}

function atualizarCarrinho() {
    const qtdTotal = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    
    document.getElementById('qtd-itens').textContent = qtdTotal;
    document.getElementById('total-carrinho').textContent = total.toFixed(2).replace('.', ',');

    const container = document.getElementById('itens-carrinho');
    container.innerHTML = carrinho.map(item => `
        <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #ccc;">
            <span>${item.quantidade}x ${item.nome}</span>
            <span>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
        </div>
    `).join('');
}

function toggleCarrinho() {
    document.getElementById('carrinho-fixo').classList.toggle('carrinho-fechado');
}

// 5. Lógica do "Monte o Seu"
let selecionados = [];

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

function adicionarMonteAoCarinho() { // Corrigido o nome da função
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
    carrinho.push(item);
    atualizarCarrinho();
    fecharModal();
}

function fecharModal() {
    document.getElementById('modal-monter').classList.remove('ativo');
}

// 6. Finalizar Pedido (Checkout WhatsApp)
function finalizarPedido() {
    if (carrinho.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    // Aqui vamos coletar os dados do cliente. Por enquanto, mensagem simples.
    const itensTexto = carrinho.map(i => `${i.quantidade}x ${i.nome} - R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`).join('\n');
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2).replace('.', ',');
    
    const mensagem = `*NOVO PEDIDO - PASTELARIA DOS GORDELAS*\n\n` +
                     `*Itens:*\n${itensTexto}\n\n` +
                     `*Total:* R$ ${total}`;
    
    const telefone = '5511999999999'; // <--- COLOQUE O NÚMERO DO SEU LEAD AQUI (DDI+DDD+Número)
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// Iniciar
carregarProdutos();
