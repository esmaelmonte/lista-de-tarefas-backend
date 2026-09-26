const express = require('express');
const app = express();
const porta = 3000;
app.use(express.json());

let tarefas = [];

app.get('/', function (req, res){
    res.send('Servidor funcionando!');
});

app.get('/tarefas', function (req, res){
    res.json(tarefas);
});

app.post('/tarefas', function (req, res){
    const texto = req.body.texto;

    if(!texto){
        res.status(400).json({ error: 'O texto da tarefa é obrigatório.'});
        return;
    }   
    const novaTarefa = { texto: texto, concluida: false };
    tarefas.push(novaTarefa);
    res.status(201).json(novaTarefa);
});

app.put('/tarefas/:index', function (req, res){
    const indice = req.params.index;

    if(!tarefas[indice]) {
        res.status(404);res.json({ error: 'Tarefa não encontrada.'});
        return;
    }

    tarefas[indice].concluida = !tarefas[indice].concluida;

    res.json(tarefas[indice]);
});

app.delete('/tarefas/:index', function (req, res){
    const indice = req.params.index;

    if(!tarefas[indice]){
        res.status(404);res.json({ error: 'Tarefa não encontrada.'})
        return;
    }

    tarefas.splice(indice, 1);

    res.status(204).send();
});

app.listen(porta, function (){
    console.log('Servidor rodando em http://localhost:' + porta);
});