# Blingo

Aprenda inglês do zero com lições curtas, áudio offline, revisão espaçada e uma trilha feita para brasileiros.

[Estudar no navegador](https://jonuffykk.github.io/blingo/) · [Baixar a versão mais recente](https://github.com/jonuffykk/blingo/releases/latest) · [Notas de atualização](CHANGELOG.md)

São 16 lições em quatro trechos, dos primeiros cumprimentos a conversas na cidade e relatos no passado. Os 96 exercícios juntam escuta, tradução e produção de frases, com áudio em velocidade normal e reduzida.

A aba **Trilha** mostra onde você parou. Em **Praticar**, a revisão prioriza frases no dia em que voltam a vencer, e o treino de escuta e a revisão de erros ficam sempre à mão. O progresso é salvo no dispositivo. Abra **Configurações → Backup de progresso** para mover perfis entre o navegador e o aplicativo de Windows.

A atualização mantém os perfis locais da edição anterior e inicia a trilha de inglês do zero. O histórico de espanhol fica guardado separadamente no armazenamento da edição anterior.

## Abrir e instalar

| Dispositivo | Como abrir |
| --- | --- |
| Windows x64 | [Baixar Blingo-Windows-x64.exe](https://github.com/jonuffykk/blingo/releases/latest/download/Blingo-Windows-x64.exe) |
| Windows ARM64 | [Baixar Blingo-Windows-arm64.exe](https://github.com/jonuffykk/blingo/releases/latest/download/Blingo-Windows-arm64.exe) |
| Android | Abra o [Blingo no Chrome](https://jonuffykk.github.io/blingo/) e use **Adicionar à tela inicial** ou **Instalar** no menu. |
| iPhone e iPad | Abra o [Blingo no Safari](https://jonuffykk.github.io/blingo/), toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. |
| macOS, Linux e Chromebook | Use o [Blingo no navegador](https://jonuffykk.github.io/blingo/). Quando disponível, instale pelo menu do navegador. |

Os executáveis do Windows usam o [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/), funcionam offline e estão sem assinatura digital. A instalação web fica disponível offline depois que a primeira visita online termina de baixar os arquivos. Para hospedar a aplicação em outro endereço, extraia [Blingo-Web.zip](https://github.com/jonuffykk/blingo/releases/latest/download/Blingo-Web.zip) em um servidor HTTPS.

## Executar a partir do código

Use Node.js 22.12 ou superior.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

A saída web fica em `dist/`. Para gerar o aplicativo de Windows, use Rust 1.88 ou superior com as ferramentas MSVC e execute `npm run desktop:build`. O executável será criado em `desktop/target/release/Blingo.exe`.

| Caminho | Conteúdo |
| --- | --- |
| `src/course.ts`, `src/audio-timings.ts` | Lições, explicações e tempos do áudio |
| `src/study.ts` | Perfis, progresso, corações e revisão espaçada |
| `src/main.ts`, `src/views.ts`, `src/style.css` | Trilha, exercícios e interface responsiva |
| `public/` | Áudio offline, fontes, ícones e personagens em SVG |
| `desktop/` | Janela nativa do Windows com Rust e WebView2 |

[Vite 8.3.8](https://github.com/vitejs/vite/releases/tag/v8.3.8) gera o build estático e [TypeScript 7.0.2](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) verifica o código. O navegador carrega a aplicação sem pacotes JavaScript de terceiros. [Tao](https://docs.rs/tao/0.37.2/tao/) e [Wry](https://docs.rs/wry/0.57.2/wry/) integram a janela nativa ao WebView do sistema.

## Publicar em jonuffykk/blingo

1. Crie o [repositório público vazio](https://github.com/new) com o nome `blingo` na conta `jonuffykk`.
2. Envie a branch `main` com `git push -u origin main`.
3. Em **Settings → Pages**, selecione **GitHub Actions** em **Source**. Se a primeira execução já tiver terminado, rode a publicação novamente em **Actions** ou envie outra alteração para `main`. [Configuração do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

O workflow compila o app nos pull requests e na branch principal. Em `main`, ele publica o site e, quando encontra uma versão inédita, cria a tag e o release com as notas do [changelog](CHANGELOG.md), os dois executáveis, o ZIP web e a lista de hashes SHA-256.

Para preparar a próxima versão, rode `npm version patch --no-git-tag-version`, acrescente a seção correspondente em `CHANGELOG.md` e envie os arquivos alterados para `main`. O comando sincroniza os arquivos do npm e do Cargo. O site recebe a nova versão quando todas as abas e janelas abertas do Blingo forem fechadas e o usuário voltar a abrir o app.

## Personagens e áudio

Pip, Dot, Moxie, Pebble e Echo têm poses de espera, fala, acerto, incentivo e conclusão. Dot acompanha as atividades de escuta e faz as próprias reações. Na galeria, toque no botão de um personagem encontrado para rever sua comemoração. As ilustrações respeitam a preferência de movimento reduzido. [Cenas do Pip](design/pip-scenes.webp) · [Referência original da turma](design/crew-reference.webp)

A pronúncia usa três vozes de inglês americano produzidas com [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) sob licença Apache 2.0 e com o fonemizador [Misaki](https://github.com/hexgrad/misaki). O MP3 final já vem no app. Bricolage Grotesque e Instrument Sans acompanham suas licenças SIL Open Font em `public/fonts/`.

O Blingo surgiu do [Lingo de Sanidhya Kumar Verma](https://github.com/sanidhyy/duolingo-clone). Consulte a [licença](LICENSE).
