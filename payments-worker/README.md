# Pagamentos Cosmos Burguer

O checkout online usa o Payment Brick do Mercado Pago dentro do site Cosmos. O Worker mantém a credencial privada, recalcula os preços com o catálogo confiável e cria pagamentos pela Payments API. O comprador não sai do site para escolher Pix ou cartão.

## Configuração do Worker

O Worker precisa dos segredos `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `ADMIN_TOKEN`, além da variável não secreta `MP_PUBLIC_KEY`. A chave pública é segura para expor ao navegador, mas o endpoint `/api/mp-config` só a entrega em JSON sem cache. Nunca coloque o Access Token ou o segredo do webhook no site ou no Git.

Configure `MP_PUBLIC_KEY` em Settings → Variables and Secrets como variável de texto. Configure os três segredos abaixo no Cloudflare ou com Wrangler:

```sh
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put MP_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TOKEN
```

Use primeiro credenciais de teste para validar. A aplicação precisa estar configurada para Checkout Bricks/Payments API. O token privado fica no Worker; somente `MP_PUBLIC_KEY` é enviada ao navegador.

## Webhook

No painel da aplicação Mercado Pago, configure o endpoint:

`https://cosmos-burguer-payments.cosmos-burguer-food.workers.dev/api/webhook/mercado-pago`

Selecione o evento **Pagamentos (payment)** e copie a assinatura secreta gerada para `MP_WEBHOOK_SECRET`. O Worker valida `x-signature` com HMAC-SHA256, responde rapidamente e consulta o pagamento diretamente à API antes de atualizar o pedido. Notificações repetidas são deduplicadas pelo ID do evento; cada pedido registra o horário e a ação do webhook validado e os campos do método de pagamento retornados pela API. Pagamento pendente nunca é marcado como pago.

## Testes e publicação

Rode os testes locais do Worker:

```sh
cd payments-worker
npm test
```

Antes de publicar, confirme que a variável `MP_PUBLIC_KEY` está configurada e que o webhook **payment** está ativo para o mesmo ambiente/credenciais do Access Token. Depois faça o deploy do Worker e publique a raiz do repositório no GitHub Pages. Não faça cobranças reais como teste.

O endpoint `/api/brick/session` cria uma sessão de checkout a partir dos itens e dados do cliente, preservando no pedido os adicionais, variantes de combos, bebidas e preparos escolhidos. `/api/brick/payment` recebe o retorno tokenizado do Brick, mas ignora qualquer total enviado pelo navegador. O item de teste de **R$ 0,01** permanece no catálogo público e no catálogo confiável do Worker conforme solicitado; retire-o antes de divulgar o cardápio a clientes. O painel privado da loja permanece em `/gestao`.

## Operação de pedidos e acompanhamento

O painel `/gestao` lista pedidos online e pedidos de dinheiro na entrega. O pagamento e o andamento são estados separados: a equipe pode iniciar o preparo de um pedido online somente depois da confirmação do Mercado Pago. Pedidos em dinheiro entram como **Aguardando confirmação da loja**; após aceitar, a equipe pode avançar por confirmado, em preparo, pronto, saiu para entrega e entregue, ou cancelar. Cada etapa fica registrada no histórico.

Cada compra recebe um link privado de acompanhamento em `/acompanhar/?token=...`. A página consulta o Worker a cada 15 segundos e mostra itens e etapas, sem expor nome, telefone ou endereço. No painel, **WhatsApp pronto** abre uma mensagem preenchida para revisão; uma pessoa da equipe ainda precisa tocar em **Enviar** no WhatsApp. Não há envio automático.

Nesta versão, os pedidos continuam armazenados no KV existente com expiração de 30 dias. Isso evita uma migração de dados para esta entrega, mas não serve como arquivo permanente, relatório histórico ou garantia de retenção além desse prazo. A migração para D1 deve ser uma etapa separada antes de depender do sistema para histórico de longo prazo.
