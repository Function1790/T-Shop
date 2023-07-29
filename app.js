const express = require('express')
const app = express()
const fs = require('fs')
const mysql = require('mysql')

//Express Setting
app.use(express.static('public'))
app.use('/views', express.static('views'))

//Mysql
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodejs'
})
connection.connect();

async function sqlQuery(query) {
    let promise = new Promise((resolve, reject) => {
        const rows = connection.query(query, (error, rows, fields) => {
            resolve(rows)
        })
    })
    let result = await promise
    return result
}

//body Parser
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }))

//Session
const session = require('express-session')
const Memorystore = require('memorystore')
const cookieParser = require("cookie-parser");

app.use(cookieParser('TMOLE'))

app.use(session({
    secure: true,
    secret: 'SECRET',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        Secure: true
    },
    name: 'data-session',
}))

const cookieConfig = {
    maxAge: 30000,
    path: '/',
    httpOnly: true,
    signed: true
}

//Function
const print = (data) => console.log(data)

async function readFile(path) {
    return await new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        })
    })
}

function forcedMoveCode(url) {
    return `<script>window.location.href = "${url}"</script>`
}

function forcedMoveWithAlertCode(text, url) {
    return `<script>alert("${text}");window.location.href = "${url}"</script>`
}

async function renderFile(req, path, replaceItems = {}) {
    var content = await readFile(path)

    if (req.session.isLogined == true) {
        content = content.replaceAll('{{loginStatus}}', 'logout')
    } else {
        content = content.replaceAll('{{loginStatus}}', 'login')
    }

    for (i in replaceItems) {
        content = content.replaceAll(`{{${i}}}`, replaceItems[i])
    }
    return content
}

async function sendRender(req, res, path, replaceItems) {
    res.send(await renderFile(req, path, replaceItems))
}

function needToLoginCheck(req, res) {
    if (req.session.isLogined) {
        res.send(forcedMoveWithAlertCode('이 서비스는 로그인 후에 이용 가능합니다.', '/login'))
        return false
    }
    return true
}

//Web
app.get('/', async (req, res) => {
    var sqlResult = await sqlQuery('select * from items')

    var itemListsHTML = ""
    for (var i in sqlResult) {
        itemListsHTML += `
        <a href="/items/${sqlResult[i].num}" class="sellitem-link">
        <div class="sellitem">
            <img src="img/${sqlResult[i].name}.jpg" alt="상품">
            <div class="sellitem-name">${sqlResult[i].name}</div>
            <div class="sellitem-price">${sqlResult[i].price}원</div>
        </div>
        </a>
        `
    }

    await sendRender(req, res, 'views/index.html', { itemlist: itemListsHTML })
})

app.get('/items/:num', async (req, res) => {
    var sqlResult = await sqlQuery(`select * from items where num=${req.params.num}`)
    if (sqlResult.length == 0) {
        sendRender(res, 'public/error', { errorCode: "404", errorMsg: "Not Found" })
        return
    }
    var item = sqlResult[0]
    await sendRender(req, res, 'views/item-info.html', { itemName: item.name, itemPrice: item.price })
})

app.get('/login', async (req, res) => {
    await sendRender(req, res, 'views/login.html')
})

app.post('/login-check', async (req, res) => {
    var body = req.body
    const uid = body.uid
    const upw = body.upw
    var sqlResult = await sqlQuery(`select * from customer where uid='${uid}' and upw='${upw}'`)
    if (sqlResult.length == 0) {
        res.send(forcedMoveWithAlertCode("아이디/비밀번호가 틀렸습니다.", "/login"))
        return
    }
    req.session.name = sqlResult[0].name
    req.session.isLogined = true
    res.send(forcedMoveWithAlertCode(`${sqlResult[0].name}님 환영합니다.`, "/"))
})

app.get('/logout', async (req, res) => {
    req.session.name = null
    req.isLogined = false
    res.send(forcedMoveWithAlertCode(`로그아웃 되셨습니다.`, "/"))
})

app.post('/add-bucket', async (req, res) => {
    if (needToLoginCheck() == false) {
        return
    }
    const body=req.body

})

app.listen(5500, () => console.log('Server run https://localhost:5500'))