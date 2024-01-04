const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');
const BodyParser = require('body-parser');
const { default: puppeteer } = require('puppeteer');

const app = express();
app.use(BodyParser.json());
const PORT = process.env.PORT;
const secretKey = process.env.SECRET_KEY;
const hash = process.env.HASH;
const headless = 'new';

const authenticateBearer = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Remove Bearer do início do token
    const tokenBearer = token.split(' ')[1];

    try {
        // Verifica o token usando a chave secreta
        const decoded = jwt.verify(tokenBearer, secretKey);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    };
};

const scrapping = (link) => new Promise( async (resolve, reject) => {
    const browser = await puppeteer.launch({headless});
    try{
        const page = await browser.newPage();
        await page.setViewport({width: 1920, height: 1080});
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
        await page.goto(link)

        let dados = await page.evaluate(() => {
            for(let a of document.querySelectorAll('style')){
                a.innerHTML = ''
            }
            for(let a of document.querySelectorAll('script')){
                a.innerHTML = ''
            }

            let linksImagens = [];
            for(let a of document.querySelectorAll('img')){
                if(a.src != ""){

                    linksImagens.push(a.src+'#');
                }
            };

            return {
                namespace: new URL(location.href).hostname,
                text: document.querySelector('body').textContent,
                imgs: linksImagens,
                status: 200
            };
        });

        resolve(dados)

    }catch(err){
        reject(err.toString())
    }
    await browser.close()
})

app.post('/scrapping', authenticateBearer, (req, res) => {
    scrapping(req.body.link).then(a => {
        res.json(a)
    }).catch(err => {
        return res.status(400).json({
            error: err,
        });
    });
});

app.post('/gerartoken', (req, res) => {

    if(req.headers.password == undefined){
        return res.status(401).send('Token não fornecido');
    }

    bcrypt.compare(req.headers.password, hash, function (err, result) {
        if(err){
            return;
        };

        // se não houver erros, retorna o resultado true ou false
        if(result){
             // Dados do usuário para incluir no token
            const user = {
                role: 'consultor'
            };

            // Gera o token com uma validade de 1 hora
            const token = jwt.sign(user, secretKey, { expiresIn: '1h' });
        
            res.json({ token });
        }else{
            return res.status(401).send('Senha Incorreta');
        };
    });
    
});
  
  // Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});