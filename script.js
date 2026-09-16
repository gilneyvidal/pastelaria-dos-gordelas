let produtos = [];
let carrinho = [];
let selecionados = [];
let taxaAtual = 0;

const TAXAS_PADRAO = {
  "PARQUE OLÍMPICO": 4.00,
  "VILA MUNICIPAL": 4.00,
  "JARDIM UNIVERSO": 6.00,
  "JD AEROPORTO 2": 7.00,
  "JD AEROPORTO 3": 6.00,
  "SANTO ANGELO": 9.00,
  "CENTRO": 15.00,
  "JUNDIAPEBA": 15.00,
  "CÉZAR": 20.00,
  "JD APOLLO": 7.00,
  "JD ESPERANÇA": 6.00,
  "JD IVETE": 7.00,
  "SANTA TERESA": 7.00
};

let taxasEntrega = { ...TAXAS_PADRAO };
const NUMERO_WHATSAPP = '5511943184268';

async function iniciar() {
    try {
        const resTaxas = await fetch('./data/taxas.json');
        if (resTaxas.ok) {
            taxasEntrega = await resTaxas.json();
            console.log('✅ Taxas carregadas do arquivo.');
        }
    } catch (e) {
        console.warn('⚠️ taxas.json não encontrado, usando taxas padrão.');
    }

    try {
        const resProdutos = await fetch('./data/produtos.json');
        if (!resProdutos.ok) throw new Error('Arquivo produtos.json não encontrado');
        produtos = await resProdutos.json();
        console.log('✅ Produtos carregados:', produtos.length);
        
        renderizarCategorias();
        renderizarProdutos(produtos[0]?.categoria || 'tradicionais');
        popularBairros();
    } catch (erro) {
        console.error('❌ Erro ao carregar produtos:', erro);
        document.getElementById('cardapio').innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <p style="color:#E53935; font-weight:bold; margin-bottom:10px;">Erro ao carregar o cardápio 😢</p>
                <p style="font-size:12px; color:#B0B0B0;">Verifique se o arquivo <strong>data/produtos.json</strong> existe.</p>
                <p style="font-size:11px; color:#666; margin-top:10px;">Detalhe: ${erro.message}</p>
            </div>
        `;
    }
}

function popularBairros() {
    const select = document.getElementById('cli-bairro');
    select.innerHTML = '<option value="">Selecione o bairro</option>';
    Object.keys(taxasEntrega).forEach(bairro => {
        const opt = document.createElement('option');
        opt.value = bairro;
        opt.textContent = `${bairro} - R$ ${taxasEntrega[bairro].toFixed(2).replace('.', ',')}`;
        select.appendChild(opt);
    });
}

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

function renderizarProdutos(categoria) {
    const container = document.getElementById('cardapio');
    container.innerHTML = '';
    const filtrados = produtos.filter(p => p.categoria === categoria);
    
    if (filtrados.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#B0B0B0;">Nenhum produto nesta categoria ainda.</p>';
        return;
    }
    
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
    
    const elSub = document.getElementById('resumo-subtotal');
    if (elSub) elSub.textContent = subtotal.toFixed(2).replace('.', ',');
    if (typeof atualizarTotalCheckout === 'function') atualizarTotalCheckout();

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

function abrirCheckout() {
    if (carrinho.length === 0) { alert('Seu carrinho está vazio!'); return; }
    toggleCarrinho();
    atualizarTotalCheckout();
    document.getElementById('modal-checkout').classList.add('ativo');
}

function toggleEndereco() {
    const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
    const campos = document.getElementById('campos-endereco');
    campos.style.display = modalidade === 'entrega' ? 'block' : 'none';
    calcularTaxa();
}

function toggleSubPagamento() {
    const pagamento = document.querySelector('input[name="pagamento"]:checked').value;
    document.getElementById('sub-pagamento-cartao').style.display = pagamento === 'Cartão' ? 'block' : 'none';
    document.getElementById('sub-pagamento-dinheiro').style.display = pagamento === 'Dinheiro' ? 'block' : 'none';
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
    const elSub = document.getElementById('resumo-subtotal');
    const elTaxa = document.getElementById('resumo-taxa');
    const elLinhaTaxa = document.getElementById('linha-taxa');
    const elTotal = document.getElementById('resumo-total');
    if (!elSub) return;
    elSub.textContent = subtotal.toFixed(2).replace('.', ',');
    elTaxa.textContent = taxaAtual.toFixed(2).replace('.', ',');
    elLinhaTaxa.style.display = taxaAtual > 0 ? 'flex' : 'none';
    elTotal.textContent = (subtotal + taxaAtual).toFixed(2).replace('.', ',');
}

function enviarPedidoWhatsApp() {
    const nome = document.getElementById('cli-nome').value.trim();
    const telefone = document.getElementById('cli-telefone').value.trim();
    const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
    const pagamentoBase = document.querySelector('input[name="pagamento"]:checked').value;
    const obs = document.getElementById('cli-obs').value.trim();
    
    if (!nome) { alert('Por favor, preencha seu nome.'); return; }
    if (!telefone) { alert('Por favor, preencha seu telefone.'); return; }
    
    // ===== MONTA O TEXTO DO PAGAMENTO COM SUB-OPÇÕES =====
    let pagamento = pagamentoBase;
    if (pagamentoBase === 'Cartão') {
        const tipoCartao = document.querySelector('input[name="tipo-cartao"]:checked').value;
        pagamento = `Cartão (${tipoCartao})`;
    } else if (pagamentoBase === 'Dinheiro') {
        const troco = document.getElementById('cli-troco').value.trim();
        if (troco) pagamento = `Dinheiro (troco para R$ ${troco})`;
    }
    
    let enderecoTexto = '';
    let enderecoParam = '';
    let bairroParam = '';
    if (modalidade === 'entrega') {
        const endereco = document.getElementById('cli-endereco').value.trim();
        const bairro = document.getElementById('cli-bairro').value.trim();
        const complemento = document.getElementById('cli-complemento').value.trim();
        if (!endereco || !bairro) { alert('Preencha o endereço e o bairro.'); return; }
        enderecoTexto = `\n*Endereço:* ${endereco}${complemento ? ', ' + complemento : ''}\n*Bairro:* ${bairro}`;
        enderecoParam = endereco + (complemento ? ', ' + complemento : '');
        bairroParam = bairro;
    }
    
    const idPedido = 'GORDELA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const itensTexto = carrinho.map(i => `• ${i.quantidade}x ${i.nome} — R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`).join('\n');
    const subtotalNum = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    const subtotal = subtotalNum.toFixed(2).replace('.', ',');
    const total = (subtotalNum + taxaAtual).toFixed(2).replace('.', ',');
    
    const modalidadeTexto = modalidade === 'entrega' ? '🛵 Entrega' : (modalidade === 'retirada' ? '🏃 Retirada' : '🍽️ Consumo no Local');
    
    const itensParam = carrinho.map(i => 
        `${i.quantidade}x ${i.nome}:${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`
    ).join('|');
    
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '').replace(/\/$/, '');
    const linkImpressao = `${baseUrl}/imprimir.html?id=${idPedido}` +
        `&nome=${encodeURIComponent(nome)}` +
        `&tel=${encodeURIComponent(telefone)}` +
        `&mod=${encodeURIComponent(modalidadeTexto)}` +
        `&end=${encodeURIComponent(enderecoParam)}` +
        `&bai=${encodeURIComponent(bairroParam)}` +
        `&itens=${encodeURIComponent(itensParam)}` +
        `&sub=${subtotal}` +
        `&taxa=${taxaAtual.toFixed(2).replace('.', ',')}` +
        `&tot=${total}` +
        `&pag=${encodeURIComponent(pagamento)}` +
        `&obs=${encodeURIComponent(obs)}`;
    
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
    mensagem += `\n*🖨️ IMPRIMIR PEDIDO:*\n${linkImpressao}\n`;
    mensagem += `\n_Obrigado pela preferência!_ ❤️`;
    
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    carrinho = [];
    atualizarCarrinho();
    fecharModal('modal-checkout');
}

function mostrarFeedback(msg) {
    const toast = document.createElement('div');
    toast.textContent = '✅ ' + msg;
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: #25D366; color: white; padding: 10px 20px; border-radius: 20px;
        font-weight: 600; font-size: 13px; z-index: 300;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
}

iniciar();
