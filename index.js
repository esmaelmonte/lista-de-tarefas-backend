const express = require('express');
const Database = require('better-sqlite3');
const db = new Database('tarefas.db');
db.exec (`CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    concluida INTEGER NOT NULL DEFAULT 0
)`);
const app = express();
const porta = 3000;
app.use(express.json());

let tarefas = [];

app.get('/', function (req, res){
    res.send('Servidor funcionando!');
});

app.get('/tarefas', function (req, res){
    const linhas = db.prepare('SELECT * FROM tarefas').all();

    const tarefas = linhas.map(function (linha){
        return {
            id: linha.id,
            texto: linha.texto,
            concluida: !!linha.concluida === 1
        };
    });

    res.json(tarefas);
});

app.post('/tarefas', function (req, res){
    const texto = req.body.texto;

    if(!texto){
        res.status(400).json({ error: 'O texto da tarefa é obrigatório.'});
        return;
    }   
    const resultado = db.prepare('INSERT INTO tarefas (texto) VALUES (?)').run(texto);

    const novaTarefa = {
        id: resultado.lastInsertRowid,
        texto: texto,
        concluida: false
    };
    res.status(201).json(novaTarefa);
});

app.put('/tarefas/:id', function (req, res){
    const id = req.params.id;

    const tarefa = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id);

    if(!tarefas) {
        res.status(404);res.json({ error: 'Tarefa não encontrada.'});
        return;
    }

    const novoValor = tarefa.concluida === 1 ? 0 : 1;

    db.prepare('UPDATE tarefas SET concluida = ? WHERE id = ?').run(novoValor, tarefa.id);

    res.json({
        id: tarefa.id,
        texto: tarefa.texto,
        concluida: novoValor === 1
    });

    tarefas[id].concluida = !tarefas[id].concluida;

    res.json(tarefas[id]);
});

app.delete('/tarefas/:id', function (req, res){
    const id = req.params.id;

    const tarefa = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id);

    if(!tarefas){
        res.status(404).json({ error: 'Tarefa não encontrada.'});
        return;
    }

    db.prepare('DELETE FROM tarefas WHERE id = ?').run(id);

    res.status(204).send();
});

app.listen(porta, function (){
    console.log('Servidor rodando em http://localhost:' + porta);
});