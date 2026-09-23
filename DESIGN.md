# Cosmos Burguer — direção de arte

## Leitura da referência

- **Composição:** abertura central e escura, seguida por uma faixa de navegação planetária e blocos de produto. A hierarquia é clara, mas a referência ainda depende demais de cartões e deixa áreas vazias no cardápio.
- **Proporções:** marca e título têm peso alto; o conteúdo útil começa cedo. O redesign mantém essa objetividade, mas transforma a primeira dobra em uma cena editorial com produto em escala dominante.
- **Iluminação:** fundo quase preto, horizonte âmbar e pequenos pontos quentes. A nova página usa luz somente para criar foco, profundidade e continuidade entre seções.
- **Tipografia:** títulos largos, curtos e em caixa alta; textos auxiliares compactos. A escala passa a variar fortemente entre títulos, rótulos e corpo para evitar aparência de template.
- **Ritmo:** alternância entre momentos amplos e blocos densos. Seções ganham números, filetes e legendas editoriais em vez de caixas repetidas.
- **Planetas:** deixam de ser esferas CSS e passam a usar um atlas raster realista, com foco central, redução progressiva nas laterais e scroll-snap.
- **Cards:** fotos grandes e conteúdo diretamente sobre a composição. Bordas e painéis são usados apenas quando ajudam leitura ou interação.

## Sistema visual

- Fundo: `#050506`, `#09090b`, `#111012`.
- Texto: creme quente `#f5eee4`; texto secundário `#a99f95`.
- Acentos: ouro `#ffc45f`, cobre `#ed6a1d`, brasa `#9e2b0d`.
- Tipografia: Archivo variável com larguras diferentes para títulos, navegação e corpo.
- Raio: pequeno ou médio; formas circulares reservadas a planetas, botões e controles.
- Movimento: transições curtas, parallax mínimo e escalonamento por foco; respeita `prefers-reduced-motion`.

## Estrutura

1. Header translúcido e compacto.
2. Hero cinematográfico assimétrico com fotografia autoral, mensagem e CTA.
3. Navegador do sistema solar com planetas realistas e foco central.
4. Combos como faixa editorial horizontal.
5. Cardápio com primeiro produto em destaque e grade assimétrica.
6. Acompanhamentos e bebidas com densidade crescente.
7. Rodapé com fechamento de marca e informações operacionais.

## Assets produzidos

- `images/generated/cosmos-hero-v1.webp`: fotografia hero sem texto, 1672×941, 175 KB.
- `images/generated/planetas-atlas-v1.webp`: atlas transparente de sete planetas, 1774×887, 255 KB.

## Regras preservadas

- Mesmos produtos, preços, descrições, WhatsApp, carrinho, cashback, combos e popups.
- HTML/CSS/JavaScript nativos e hospedagem estática.
- Imagens abaixo da dobra com carregamento preguiçoso.
- Contraste, foco visível, navegação por teclado e redução de movimento.

## Registro de iteração

| Ciclo | Desktop | Mobile | Correções principais |
|---|---|---|---|
| 1 | hero com hierarquia forte e produto dominante | produto ampliado demais e pouco respiro | limitar a mídia à metade superior no mobile; melhorar o recorte e manter o conteúdo em fundo sólido |
| 2 | hero equilibrado; seletor com boa cena orbital; card destaque legível | enquadramento do hero resolvido; Terra ainda não centralizava antes da captura | centralização instantânea, maior contraste entre foco e laterais, bloco orbital mais compacto e correção do título Mercúrio |
| 3 | Terra centralizada e seletor mais coeso; card destaque validado | navegação mostra Terra no centro e mantém vizinhos como contexto | ampliar ainda mais o foco; equilibrar colunas para evitar quebra em “Mercúrio”; neutralizar o antigo roxo dos popups |
| 4 | hero e cardápio aprovados visualmente; Mercúrio em uma linha | hero, CTA e card destaque mantêm leitura | foco planetário ainda parecia menor durante a transição da captura; substituir escala por diâmetros explícitos |
| 5 | Terra dominante, vizinhos em progressão e card destaque equilibrado | Terra central com leitura imediata e vizinhos como contexto | estado final; transições desativadas apenas no modo interno de captura |
