# Study Timer
[🇺🇸 English](README.md)

Plugin para o [Obsidian](https://obsidian.md) que registra seu tempo de estudo direto na barra lateral: cronômetro, Pomodoro, assuntos coloridos, estatísticas e um heatmap dos últimos dias. Inspirado no app **YPT (Yeolpumta)**.

## Funcionalidades
- **Cronômetro**: o relógio principal mostra o total estudado no dia.
- **Pomodoro**: foco e descanso com durações configuráveis (padrão 25/5) e um beep ao final de cada fase (pode ser desligado).
- **Assuntos personalizados**: crie e remova assuntos e escolha uma cor para cada um. Abaixo do relógio aparece o tempo de hoje do assunto selecionado.
- **Estatísticas**: total de hoje, da semana e do mês, e o tempo de hoje por assunto.
- **Heatmap** estilo GitHub com os últimos 84 dias.
- **Calendário e agenda**: abra uma visão mensal com bolinhas coloridas mostrando quais assuntos você estudou em cada dia, mais uma agenda simples por dia (adicionar, marcar como feito e remover itens planejados) - clique em qualquer dia para ver o detalhamento e planejar o que vem por aí.
- **Cores do Obsidian**: o destaque do plugin segue a cor de destaque do Obsidian e o tema claro/escuro.
- **Idiomas**: a interface está disponível em português, inglês e espanhol, à escolha em Configurações -> Study Timer -> Idioma.

## Instalação

### Manualmente (a partir de uma Release)
1. Baixe `main.js`, `manifest.json` e `styles.css` na [última Release](../../releases/latest).
2. Copie os três arquivos para `SEU_VAULT/.obsidian/plugins/study-timer/`.
3. No Obsidian, abra **Configurações -> Plugins da comunidade**, recarregue a lista e ative **Study Timer**.

Requer Obsidian **1.4.4** ou superior.

### Para desenvolver

```bash
npm install
npm run dev     # recompila a cada alteração
npm run build   # build de produção (gera o main.js)
```

Copie `main.js`, `manifest.json` e `styles.css` para a pasta do plugin no seu vault.

## Como usar
1. Clique no ícone de relógio na barra lateral esquerda.
2. Digite um assunto em *Novo assunto*, escolha a cor e clique em **Adicionar**. Clique num assunto para selecioná-lo, na bolinha para trocar a cor e no **×** para removê-lo (o histórico já registrado é mantido).
3. Aperte ▶ para começar e ❚❚ para pausar. Só minutos completos são gravados.
4. Alterne entre **Cronômetro** e **Pomodoro** no topo do painel.


## Dados e privacidade
Tudo fica no seu computador: o histórico em `data.json` (na pasta do plugin) e, se a Nota Diária de hoje existir, o total do dia no frontmatter dela. O plugin não faz requisições de rede e não envia nada para fora.

## Roadmap
- Botão de reset manual do dia.
- Exportar o histórico completo em CSV.

## Créditos
Criado por **Miel Velazquez**.

Inspirado no app YPT (Yeolpumta). Este projeto é independente e não tem relação com o YPT nem com seus criadores.

## Licença
[MIT](LICENSE)