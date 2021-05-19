'use strict';
require('dotenv').config()
const mercadopago = require ('mercadopago');

mercadopago.configure({
    access_token: process.env.PRIVATE_TOKEN ? process.env.PRIVATE_TOKEN : 'TEST-6188657700128088-031322-e40c11401b9eb52036c76f27c0cd640a-178227978'
});

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async create(ctx) {
        // Initial verifications
        if (ctx.is('multipart')) {
            return {
                status: 406,
                message: "Multipart not accepted"
            }
        }
        if(!(ctx.request.body.address && ctx.request.body.order)) {
            return {
                status: 406,
                message: "Incomplete preference"
            }
        }
        console.log('FLAG 1')
        // Populate Itens with queryied itens data
        const Itens = await Promise.all(ctx.request.body.order.map(async (line) => {
            const data = await strapi.query('produto').findOne({ slug: line.slug })
            return {
                ...line,
                titulo: data.titulo,
                preco: data.preco
            }
        }))
        
        console.log('FLAG 2')
        // Mount preference
        let preference = {
            items: Itens.map(line => ({
                title: `${line.titulo} na cor ${line.cor} tamanho ${line.tamanho}`,
                unit_price: (Number(line.preco)/100),
                quantity: 1
            })),
        }
        
        console.log('FLAG 3')
        // Mount order data
        let strapiPedido = {
            itens: preference.items.map(line => `${line.title}     ${(line.unit_price.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}))}`).join('\n'),
            endereco: Object.keys(ctx.request.body.address).map(key => `${key}:  ${ctx.request.body.address[key]}`).join('\n'),
            total: preference.items.reduce((acum, curr) => acum + curr.unit_price, 0) + ''
        }
        console.log(strapiPedido)

        console.log('FLAG 4')
        // Save order data
        const createdPedido = await strapi.services.pedido.create(strapiPedido);

        console.log('FLAG 5')
        // Add strapiId to preference.external_identifier
        preference.external_reference = createdPedido.id.toString()
        
        console.log('FLAG 6')
        // Fetch preference
        const mercadoPagoRes = await mercadopago.preferences.create(preference)
        
        console.log('FLAG 7')
        // Return payment link
        return JSON.stringify({PaymentLink: mercadoPagoRes.body.init_point})
    }
};
