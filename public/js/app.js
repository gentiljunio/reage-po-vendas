let produtos = [];
let vendas = [];

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Systema de Pop-up (Toast Notification)
function mostrarToast(mensagem, tipo = 'sucesso') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const corBg = tipo === 'sucesso' ? '#10b981' : tipo === 'erro' ? '#ef4444' : '#3b82f6';
  
  toast.style.cssText = `
    background-color: ${corBg};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
  `;
  toast.innerText = mensagem;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Estilo CSS da Animação do Pop-up
const styleAnim = document.createElement('style');
styleAnim.innerHTML = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .btn-edit {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    margin-right: 6px;
  }
  .btn-edit:hover { background-color: #2563eb; }
  .modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
  }
  .modal-card {
    background: white; border-radius: 12px; padding: 24px; width: 100%; max-width: 450px;
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .btn-close { background: none; border: none; font-size: 20px; cursor: pointer; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
`;
document.head.appendChild(styleAnim);

// Carregar Dados do Servidor
async function carregarDados() {
  try {
    const resProdutos = await fetch('/api/produtos');
    produtos = await resProdutos.json();

    const resVendas = await fetch('/api/vendas');
    vendas = await resVendas.json();

    atualizarInterface();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    mostrarToast('Erro ao conectar ao servidor', 'erro');
  }
}

function atualizarInterface() {
  const totalFaturado = vendas.reduce((acc, v) => acc + v.valorTotal, 0);
  const totalEstoquePecas = produtos.reduce((acc, p) => acc + p.estoque, 0);

  document.getElementById('stat-faturado').innerText = formatarMoeda(totalFaturado);
  document.getElementById('stat-vendas').innerText = vendas.length;
  document.getElementById('stat-estoque').innerText = totalEstoquePecas + " un.";
  document.getElementById('stat-produtos').innerText = produtos.length;

  // Dropdown de Vendas
  const selectProduto = document.getElementById('venda-produto');
  selectProduto.innerHTML = '<option value="">Selecione o produto...</option>';
  produtos.forEach(p => {
    if (p.estoque > 0) {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.nome} (${p.estoque} disponíve${p.estoque > 1 ? 'is' : 'l'}) - ${formatarMoeda(p.preco)}`;
      selectProduto.appendChild(option);
    }
  });

  // Tabela de Estoque com Botões de Editar e Excluir
  const tbodyEstoque = document.getElementById('tabela-estoque');
  if (produtos.length === 0) {
    tbodyEstoque.innerHTML = `<tr><td colspan="4" class="empty-state">Nenhum produto cadastrado no estoque.</td></tr>`;
  } else {
    tbodyEstoque.innerHTML = produtos.map(p => `
      <tr>
        <td style="font-weight: 600;">${p.nome}</td>
        <td>${p.estoque} un.</td>
        <td>${formatarMoeda(p.preco)}</td>
        <td style="text-align: right;">
          <button class="btn-edit" onclick="abrirModalEdicao('${p.id}')">Editar</button>
          <button class="btn-delete" onclick="excluirProduto('${p.id}')">Excluir</button>
        </td>
      </tr>
    `).join('');
  }

  // Tabela do Histórico de Vendas
  const tbodyHistorico = document.getElementById('tabela-historico');
  if (vendas.length === 0) {
    tbodyHistorico.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma venda registrada no histórico.</td></tr>`;
  } else {
    tbodyHistorico.innerHTML = vendas.map(v => `
      <tr>
        <td style="color: #94a3b8; font-size: 13px;">${v.data}</td>
        <td style="font-weight: 500;">${v.cliente}</td>
        <td>${v.produtoNome}</td>
        <td>${v.quantidade}</td>
        <td style="font-weight: 600; color: #10b981;">${formatarMoeda(v.valorTotal)}</td>
        <td style="text-align: right;">
          <button class="btn-delete" onclick="excluirVenda('${v.id}')">Cancelar</button>
        </td>
      </tr>
    `).join('');
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Adicionar Produto
document.getElementById('form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('prod-nome').value.trim();
  const estoque = parseInt(document.getElementById('prod-qtd').value);
  const preco = parseFloat(document.getElementById('prod-preco').value);

  const res = await fetch('/api/produtos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Date.now().toString(), nome, estoque, preco })
  });

  if (res.ok) {
    document.getElementById('form-produto').reset();
    carregarDados();
    mostrarToast(`Produto "${nome}" adicionado com sucesso!`, 'sucesso');
  } else {
    mostrarToast('Erro ao adicionar produto', 'erro');
  }
});

// Modal de Edição
function abrirModalEdicao(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  document.getElementById('edit-prod-id').value = produto.id;
  document.getElementById('edit-prod-nome').value = produto.nome;
  document.getElementById('edit-prod-qtd').value = produto.estoque;
  document.getElementById('edit-prod-preco').value = produto.preco;

  document.getElementById('modal-editar').style.display = 'flex';
}

function fecharModalEdicao() {
  document.getElementById('modal-editar').style.display = 'none';
}

// Salvar Edição do Produto
document.getElementById('form-editar-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-prod-id').value;
  const nome = document.getElementById('edit-prod-nome').value.trim();
  const estoque = parseInt(document.getElementById('edit-prod-qtd').value);
  const preco = parseFloat(document.getElementById('edit-prod-preco').value);

  const res = await fetch(`/api/produtos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, estoque, preco })
  });

  if (res.ok) {
    fecharModalEdicao();
    carregarDados();
    mostrarToast(`Produto "${nome}" atualizado com sucesso!`, 'info');
  } else {
    mostrarToast('Erro ao atualizar produto', 'erro');
  }
});

// Excluir Produto
async function excluirProduto(id) {
  const produto = produtos.find(p => p.id === id);
  const nome = produto ? produto.nome : 'Produto';

  if (confirm(`Tem certeza que deseja excluir "${nome}"?`)) {
    const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      carregarDados();
      mostrarToast(`Produto "${nome}" excluído com sucesso!`, 'erro');
    } else {
      mostrarToast('Erro ao excluir produto', 'erro');
    }
  }
}

// Registrar Venda
document.getElementById('form-venda').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cliente = document.getElementById('venda-cliente').value.trim();
  const produtoId = document.getElementById('venda-produto').value;
  const quantidade = parseInt(document.getElementById('venda-qtd').value);

  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) return mostrarToast('Selecione um produto válido!', 'erro');

  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const res = await fetch('/api/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: Date.now().toString(),
      cliente,
      produtoId: produto.id,
      produtoNome: produto.nome,
      quantidade,
      valorTotal: quantidade * produto.preco,
      data
    })
  });

  if (res.ok) {
    document.getElementById('form-venda').reset();
    carregarDados();
    mostrarToast('Venda registrada com sucesso!', 'sucesso');
  } else {
    const err = await res.json();
    mostrarToast(err.error || 'Erro ao registrar venda', 'erro');
  }
});

// Cancelar Venda
async function excluirVenda(id) {
  if (confirm('Deseja cancelar esta venda? O estoque será estornado.')) {
    const res = await fetch(`/api/vendas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      carregarDados();
      mostrarToast('Venda cancelada e estoque estornado!', 'info');
    } else {
      mostrarToast('Erro ao cancelar venda', 'erro');
    }
  }
}

carregarDados();