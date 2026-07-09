# Ronda de Produção 🏭

Checklist de rondas de chão de fábrica, 100% local: tudo é salvo no
armazenamento do próprio aparelho (`localStorage`), sem precisar de banco
de dados ou servidor.

Stack: **Vite + React 18**, deploy estático (Vercel ou qualquer host de arquivos).

## Funcionalidades

- **Setores → Máquinas → Estações de trabalho** (estações são um subconjunto opcional de cada máquina)
- Três status por item: **Produzindo** ✅ / **Parada** 🟡 / **Pendência** 🔴
- Clicar de novo no status ativo desmarca o item
- Ao marcar **pendência** ou **parada**, abre campo de **observação** de manutenção
- **Salvamento automático** no aparelho a cada alteração (sem precisar clicar em "Salvar")
- Registra **quem marcou e o horário** de cada checagem (campo opcional)
- Modo **⚙ Gerenciar** para criar/excluir setores, máquinas e estações
- **Relatório formatado para WhatsApp** ao final da ronda, com botão de copiar e link direto `wa.me`
- **Nova ronda** limpa todas as marcações mantendo a estrutura, e guarda um histórico local
- **Histórico de rondas** consultável a qualquer momento, salvo no mesmo aparelho

## Onde os dados ficam salvos

Tudo fica em uma única chave do `localStorage` do navegador
(`ronda-db-v1`), definida em `src/db.js`. Isso significa:

- **Não há sincronização entre aparelhos/navegadores.** Cada dispositivo
  (ou cada navegador) tem sua própria cópia dos dados.
- Se o usuário limpar os dados de navegação/cache do navegador para este
  site, o conteúdo salvo é apagado.
- Se o app for aberto em duas abas do **mesmo** navegador/aparelho, as
  abas se mantêm sincronizadas automaticamente.

`src/db.js` também expõe `exportarJson()` e `importarJson()`, úteis caso
queira implementar um botão de backup/restauração manual no futuro.

## Estrutura do projeto

```
ronda/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json            # rewrite SPA
└── src/
    ├── principal.jsx      # ponto de entrada
    ├── App.jsx            # estado global, relatório
    ├── db.js               # armazenamento local (localStorage), substitui o backend
    ├── constantes.js      # definição dos status
    ├── estilos.css
    └── componentes/
        ├── Setor.jsx
        ├── Grupo.jsx
        ├── Maquina.jsx
        ├── Estacao.jsx
        ├── BotoesStatus.jsx
        ├── CaixaObs.jsx
        ├── Andon.jsx
        ├── AdicionarInline.jsx
        ├── RelatorioModal.jsx
        └── HistoricoModal.jsx
```

## Como rodar

```bash
npm install
npm run dev
```

Não é necessário configurar nenhuma variável de ambiente, chave de API
ou banco de dados — o app funciona assim que instalado.

### Deploy (opcional)

Por ser um app estático, pode ser hospedado em qualquer serviço de
arquivos (Vercel, Netlify, GitHub Pages, ou até aberto localmente via
`npm run build` + `npm run preview`). Lembre-se de que, como os dados
ficam no aparelho de cada pessoa, cada usuário verá apenas o que foi
preenchido no próprio navegador.

## Observação sobre segurança

Como não há mais backend, não existe mais chave de API para proteger.
A senha de acesso ao modo **⚙ Gerenciar** continua definida em
`src/componentes/LoginAdmin.jsx` (ou pela variável `VITE_ADMIN_SENHA`),
apenas para evitar edições acidentais na estrutura — não é uma proteção
de segurança forte, já que roda inteiramente no navegador.
