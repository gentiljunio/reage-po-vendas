const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa o Banco de Dados SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('⚡ Banco de Dados SQLite conectado com sucesso!');
  }
});

// Criar Tabelas se não existirem
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      estoque INTEGER NOT NULL,
      preco REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vendas (
      id TEXT PRIMARY KEY,
      cliente TEXT NOT NULL,
      produtoId TEXT NOT NULL,
      produtoNome TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      valorTotal REAL NOT NULL,
      data TEXT NOT NULL
    )
  `);
});

// --- ROTAS DA API ---

// 1. Listar Produtos
app.get('/api/produtos', (req, res) => {
  db.all('SELECT * FROM produtos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Cadastrar Produto
app.post('/api/produtos', (req, res) => {
  const { id, nome, estoque, preco } = req.body;
  const sql = 'INSERT INTO produtos (id, nome, estoque, preco) VALUES (?, ?, ?, ?)';
  db.run(sql, [id, nome, estoque, preco], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Produto adicionado', id });
  });
});

// 3. Excluir Produto
app.delete('/api/produtos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM produtos WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Produto removido' });
  });
});

// 4. Listar Vendas
app.get('/api/vendas', (req, res) => {
  db.all('SELECT * FROM vendas ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 5. Registrar Venda (Com abatimento no Estoque)
app.post('/api/vendas', (req, res) => {
  const { id, cliente, produtoId, produtoNome, quantidade, valorTotal, data } = req.body;

  db.get('SELECT estoque FROM produtos WHERE id = ?', [produtoId], (err, produto) => {
    if (err || !produto) return res.status(400).json({ error: 'Produto não encontrado' });
    if (produto.estoque < quantidade) return res.status(400).json({ error: 'Estoque insuficiente' });

    // Abater estoque
    const novoEstoque = produto.estoque - quantidade;
    db.run('UPDATE produtos SET estoque = ? WHERE id = ?', [novoEstoque, produtoId], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Inserir venda
      const sqlVenda = 'INSERT INTO vendas (id, cliente, produtoId, produtoNome, quantidade, valorTotal, data) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.run(sqlVenda, [id, cliente, produtoId, produtoNome, quantidade, valorTotal, data], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Venda realizada com sucesso!' });
      });
    });
  });
});

// 6. Cancelar Venda (Estornar Estoque)
app.delete('/api/vendas/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM vendas WHERE id = ?', [id], (err, venda) => {
    if (err || !venda) return res.status(404).json({ error: 'Venda não encontrada' });

    // Devolver quantidade ao estoque
    db.run('UPDATE produtos SET estoque = estoque + ? WHERE id = ?', [venda.quantidade, venda.produtoId], () => {
      db.run('DELETE FROM vendas WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Venda cancelada e estoque estornado' });
      });
    });
  });
});

// Adicione esta rota em server.js junto com as outras rotas de produtos:

// 7. Editar Produto
app.put('/api/produtos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, estoque, preco } = req.body;

  if (!nome || estoque === undefined || preco === undefined) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const sql = 'UPDATE produtos SET nome = ?, estoque = ?, preco = ? WHERE id = ?';
  db.run(sql, [nome, estoque, preco, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ message: 'Produto atualizado com sucesso!' });
  });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Acesse localmente em: http://localhost:${PORT}`);
});