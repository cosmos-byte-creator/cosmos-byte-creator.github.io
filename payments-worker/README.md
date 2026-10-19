# Pagamentos Cosmos Burguer

Worker Cloudflare para o Checkout Pro do Mercado Pago via Orders API. Ele recalcula os valores no servidor, cria a order, guarda o pedido por 30 dias, valida webhooks com HMAC e verifica o status no retorno do comprador.

## Publicar em teste

1. Autentique a conta Cloudflare com `npx wrangler login`.
2. Verifique a vinculação do KV `ORDERS` em `wrangler.toml` e a origem pública em `SITE_ORIGIN`.
3. Cadastre os segredos como tipo **Secret** no painel da Cloudflare ou via Wrangler; nunca os coloque no Git:

   ```bash
   npx wrangler secret put MP_ACCESS_TOKEN
   npx wrangler secret put MP_WEBHOOK_SECRET
   npx wrangler secret put ADMIN_TOKEN
   ```

   Use primeiro o Access Token de teste criado em Mercado Pago Developers. Cadastre `MP_WEBHOOK_SECRET` após salvar o webhook no painel do Mercado Pago.

4. Publique com `npx wrangler deploy`. O endereço atual é `https://cosmos-burguer-payments.cosmos-burguer-food.workers.dev`.
5. No Mercado Pago, em **Suas integrações > Webhooks**, cadastre no modo de teste:

   `https://cosmos-burguer-payments.cosmos-burguer-food.workers.dev/api/webhook/mercado-pago`

   Selecione o evento **Order (Mercado Pago)** e copie a chave secreta gerada para o Secret `MP_WEBHOOK_SECRET` na Cloudflare.

6. Teste uma compra completa com uma conta compradora e cartão de teste. Verifique o recebimento do webhook e o status da order.
7. Só depois dos testes e da troca para credenciais de produção, copie a URL do Worker para `CONFIG.pagamentosUrl` em `../index.html` e publique o site.

## Consultar pedidos

O painel privado está em `/gestao`. Configure um segredo `ADMIN_TOKEN` longo e aleatório no Worker para liberar a consulta. O painel não grava esse segredo no navegador; ele permanece apenas em memória até fechar ou recarregar a página. A lista contém nome, WhatsApp, endereço, itens, valor e status dos pedidos recentes.

## Antes de produção

- Faça compras de teste com credenciais de teste.
- Troque o segredo `MP_ACCESS_TOKEN` pelo token de produção e confira a configuração de webhook produtivo e sua chave secreta.
- Faça um pagamento real de baixo valor e confirme que o Worker recebeu o webhook.
- A confirmação de pagamento é o webhook validado; o retorno visual do Mercado Pago não deve liberar o pedido sozinho.

O KV é o registro técnico inicial do pedido. A próxima etapa recomendada é integrar o evento de pagamento aprovado ao painel/cozinha ou a uma API oficial de WhatsApp.
