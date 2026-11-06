const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const db = new Database('tarefas.db');
db.exec (`CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    concluida INTEGER NOT NULL DEFAULT 0
)`);
db.exec(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL
)`);


const colunas = db.prepare('PRAGMA table_info(tarefas)').all();
const temUsuarioId = colunas.some(function (coluna){
    return coluna.name === 'usuario_id';
});

if(!temUsuarioId){
    db.exec('ALTER TABLE tarefas ADD COLUMN usuario_id INTEGER');
}



const app = express();
const porta = process.env.PORT || 3000;
const SEGREDO = process.env.JWT_SECRET || 'segredo-de-desenvolvimento';
app.use(express.json());

app.use(cors());



function autenticar(req, res, next){
    const cabecalho = req.headers.authorization;

    if(!cabecalho){
        res.status(401).json({ error: 'Token não informado.'});
        return;
    }

    const token = cabecalho.split(' ')[1];

    try {
        const dados = jwt.verify(token, SEGREDO);
        req.usuarioId = dados.id;
        next();
    } catch (erro){
        res.status(401).json({ error: 'Token inválido ou expirado.'});
    }
}



app.get('/', function (req, res){
    res.send('Servidor funcionando!');
});

app.get('/tarefas', autenticar, function (req, res){
    const linhas = db.prepare('SELECT * FROM tarefas WHERE usuario_id = ?').all(req.usuarioId);
    const tarefas = linhas.map(function (linha){
        return {
            id: linha.id,
            texto: linha.texto,
            concluida: linha.concluida === 1
        };
    });

    res.json(tarefas);
});



app.post('/tarefas', autenticar, function (req, res){
    const texto = req.body.texto;

    if(!texto){
        res.status(400).json({ error: 'O texto da tarefa é obrigatório.'});
        return;
    }   
    const resultado = db.prepare('INSERT INTO tarefas (texto, usuario_id) VALUES (?, ?)').run(texto, req.usuarioId);

    const novaTarefa = {
        id: resultado.lastInsertRowid,
        texto: texto,
        concluida: false
    };
    res.status(201).json(novaTarefa);
});



app.put('/tarefas/:id', autenticar, function (req, res){
    const id = req.params.id;

    const tarefa = db.prepare('SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?').get(id, req.usuarioId);

    if(!tarefa) {
        res.status(404).json({ error: 'Tarefa não encontrada.' });
        return;
    }

    const novoValor = tarefa.concluida === 1 ? 0 : 1;

    db.prepare('UPDATE tarefas SET concluida = ? WHERE id = ?').run(novoValor, tarefa.id);

    res.json({
        id: tarefa.id,
        texto: tarefa.texto,
        concluida: novoValor === 1
    });
});
    



app.delete('/tarefas/:id', autenticar, function (req, res){
    const id = req.params.id;

    const tarefa = db.prepare('SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?').get(id, req.usuarioId);
    if(!tarefa){
        res.status(404).json({ error: 'Tarefa não encontrada.'});
        return;
    }

    db.prepare('DELETE FROM tarefas WHERE id = ?').run(id);

    res.status(204).send();
});



app.post('/cadastro' , async function (req, res){
    const email = req.body.email;
    const senha = req.body.senha;

    if(!email || !senha){
        res.status(400).json({ error: 'Email e senha são obrigatórios.'});
        return;
    }
    const existente = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

    if(existente){
        res.status(409).json({ error: 'Email já cadastrado.'});
        return;

    }
    const senhaHash = await bcrypt.hash(senha, 10);
    

    const resultado = db.prepare('INSERT INTO usuarios (email, senha_hash) VALUES (? , ?)').run(email, senhaHash);

    res.status(201).json({ 
        id: resultado.lastInsertRowid,
        email: email
    });
});



app.post('/login', async function (req, res){
    const email = req.body.email;
    const senha = req.body.senha;

    if(!email || !senha){
        res.status(400).json({ error: 'E-mail e senha são obrigatórios.'});
        return;
    }

    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

    if(!usuario){
        res.status(401).json({ error: 'E-mail ou senha incorretos.'});
        return;
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if(!senhaCorreta){
        res.status(401).json({ error: 'E-mail ou senha incorretos.'});
        return;
    }

    const token = jwt.sign({ id: usuario.id }, SEGREDO, { expiresIn: '1h' });

    res.json({ token: token });
});



app.listen(porta, function (){
    console.log('Servidor rodando em http://localhost:' + porta);
});