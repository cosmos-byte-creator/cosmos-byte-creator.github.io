# Pagamentos Cosmos Burguer

O checkout online usa o Payment Brick do Mercado Pago dentro do site Cosmos. O Worker mantém a credencial privada, recalcula os preços com o catálogo confiável e cria pagamentos pela Payments API. O comprador não sai do site para escolher Pix ou cartão.

## Configuração do Worker

O Worker precisa dos segredos `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `ADMIN_TOKEN` e `MP_PUBLIC_KEY`. A chave pública é segura para expor ao navegador, mas o endpoint `/api/mp-config` só a entrega em JSON sem cache. Nunca coloque o Access Token ou o segredo do webhook no site ou no Git.

Configure os segredos no Cloudflare ou com Wrangler:

```sh
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put MP_PUBLIC_KEY
npx wrangler secret put MP_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TOKEN
```

Use primeiro credenciais de teste para validar. A aplicação precisa estar configurada para Checkout Bricks/Payments API. O token privado fica no Worker; somente `MP_PUBLIC_KEY` é enviada ao navegador.

## Webhook

No painel da aplicação Mercado Pago, configure o endpoint:

`https://cosmos-burguer-payments.cosmos-burguer-food.workers.dev/api/webhook/mercado-pago`

Selecione o evento **Pagamentos (payment)** e copie a assinatura secreta gerada para `MP_WEBHOOK_SECRET`. O Worker valida `x-signature` com HMAC-SHA256, responde rapidamente e consulta o pagamento diretamente à API antes de atualizar o pedido. Pagamento pendente nunca é marcado como pago.

## Testes e publicação

Rode os testes locais do Worker:

```sh
cd payments-worker
npm test
```

Antes de publicar, confirme que o segredo `MP_PUBLIC_KEY` está configurado e que o webhook **payment** está ativo para o mesmo ambiente/credenciais do Access Token. Depois faça o deploy do Worker e publique a raiz do repositório no GitHub Pages. Não faça cobranças reais como teste.

O endpoint `/api/brick/session` cria uma sessão de checkout a partir dos itens e dados do cliente. `/api/brick/payment` recebe o retorno tokenizado do Brick, mas ignora qualquer total enviado pelo navegador. O painel privado da loja permanece em `/gestao`.
