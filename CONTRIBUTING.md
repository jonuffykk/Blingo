# Contribuir com o Blingo

O Blingo recebe sugestões e correções de qualquer colaborador. Use as [issues](https://github.com/jonuffykk/blingo/issues) para contar o que aconteceu ou propor uma mudança maior. Em erros de conteúdo, informe a lição e a frase. Em erros de interface, inclua o navegador ou o modelo do dispositivo.

1. Faça um fork e crie uma branch a partir de `main`.
2. Rode `npm ci` e `npm run dev` para testar sua mudança.
3. Rode `npm run build` antes de abrir o pull request. Se a mudança envolver a janela nativa, teste também com `npm run desktop:build` no Windows.
4. No pull request, explique a mudança e diga o que testou. Se houver mudança visual, coloque uma captura.

As lições estão em `src/course.ts`, as artes em `public/mascots/` e a janela do Windows em `desktop/`. Use português brasileiro nas instruções e inglês nas frases do curso. Ao trocar ilustrações ou áudio, use material próprio ou com licença compatível e registre a origem.

## Permissões

Um repositório público aceita contribuições por fork e pull request. Para dar acesso de escrita a um mantenedor de confiança, o proprietário pode convidá-lo em **Settings → Collaborators**. Uma regra para `main` pode exigir pull request e os checks do workflow antes de incorporar alterações. O arquivo [CODEOWNERS](.github/CODEOWNERS) aponta quem revisa mudanças na automação de releases. [Permissões e revisão no GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

## Preparar um release

Mantenedores podem subir a versão com `npm version patch --no-git-tag-version`. Para versões maiores, use `minor` ou `major`. O comando atualiza o npm e o Cargo. Escreva a seção correspondente no [changelog](CHANGELOG.md) com o formato `## [2.2.1] - AAAA-MM-DD` e abra um pull request com as alterações.

Quando uma versão inédita chega a `main`, o GitHub Actions compila os executáveis Windows x64 e ARM64 e publica os arquivos, os hashes SHA-256 e as notas de atualização em Releases. Também é possível reexecutar o workflow manualmente em `main`.

## Demo na Vercel

Importe o repositório como um projeto na Vercel. O [vercel.json](vercel.json) define o preset Vite, o comando de build e a pasta de saída. A demo roda inteiramente no navegador e usa o armazenamento de cada visitante. [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite)
