const express = require('express')
const app = express()
const fs = require('fs')
const mysql = require('mysql')
const multer = require('multer');

//Express Setting
app.use(express.static('public'))
app.use('/views', express.static('views'))

//Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/img/')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    },
})

const upload = multer({ storage })

//Mysql
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1790',
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
const { count } = require('console')

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
    return `<title>T SHOP</title><script>alert("${text}");window.location.href = "${url}"</script>`
}

async function renderFile(req, path, replaceItems = {}) {
    var content = await readFile(path)

    if (req.session.isLogined == true) {
        content = content.replaceAll('{{loginStatus}}', 'MY')
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

function needToLoginCheck(req) {
    if (req.session.isLogined) {
        return true
    }
    return false
}

function isLogined(req, res) {
    if (req.session.uid == undefined) {
        res.send(forcedMoveWithAlertCode("로그인이 필요한 서비스입니다.", '/login'))
        return false
    }
    return true
}

async function updateData(req) {
    var sqlResult = await sqlQuery(`select * from customer where num='${req.session.num}'`)
    if (sqlResult.length == 0) {
        return false
    }
    req.session.name = sqlResult[0].name
    req.session.uid = sqlResult[0].uid
    req.session.points = sqlResult[0].points
}

//Web
app.get('/', async (req, res) => {
    var sqlResult = await sqlQuery('select * from items')

    var itemListsHTML = ""
    for (var i in sqlResult) {
        itemListsHTML += `
        <a href="/items/${sqlResult[i].num}" class="sellitem-link">
        <div class="sellitem">
            <img src="img/${sqlResult[i].imgName}" alt="상품">
            <div class="sellitem-name">${sqlResult[i].name}</div>
            <div class="sellitem-price">${sqlResult[i].price}P</div>
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

    var ownerController = ""
    if (sqlResult[0].seller == req.session.uid || req.session.uid == "admin") {
        ownerController = `
        <a href="/modify/${req.params.num}">
            <div class="modifyBtn">수정하기</div>
        </a>
        `
    }

    await sendRender(req, res, 'views/item-info.html', {
        itemName: item.name,
        itemPrice: item.price,
        itemNum: item.num,
        imgName: item.imgName,
        ownerController: ownerController
    })
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
    req.session.uid = sqlResult[0].uid
    req.session.points = sqlResult[0].points
    req.session.num = sqlResult[0].num
    req.session.isLogined = true
    res.send(forcedMoveWithAlertCode(`${sqlResult[0].name}님 환영합니다.`, "/"))
})

app.get('/logout', async (req, res) => {
    req.session.name = null
    req.session.isLogined = false
    req.session.num = null
    res.send(forcedMoveWithAlertCode(`로그아웃 되셨습니다.`, "/"))
})

app.post('/insert-bucket', async (req, res) => {
    try {
        if (!isLogined(req, res)) {
            return
        }
        const body = req.body

        const result = (await sqlQuery(`select * from customer where num=${req.session.num}`))[0]
        var bucket = {}
        if (result.bucket !== null) {
            bucket = JSON.parse(result.bucket)
        }
        const data = JSON.parse(body.data)
        bucket[Object.keys(bucket).length] = { "num": data.num, "count": data.count }
        bucket = JSON.stringify(bucket)
        sqlQuery(`update customer set bucket='${bucket}' where num=${req.session.num}`)
        res.send("OK")
    } catch (err) {
        console.log(err)
        res.send("ERROR").status(500)
    }
})

app.get('/bucket', async (req, res) => {
    if (!isLogined(req, res)) {
        return
    }
    const result = await sqlQuery(`select * from customer where num=${req.session.num}`)
    const bucket = JSON.parse(result[0].bucket)
    var itemListHTML = ""
    for (var i in bucket) {
        var sqlResult = await sqlQuery(`select * from items where num=${bucket[i].num}`)
        var item = sqlResult[0]
        itemListHTML += `<div class="bucketitem">
            <div class="item-ui">
                <img src="img/${item.imgName}" alt="상품">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-cost">${item.price}P × ${bucket[i].count}개 = ${item.price * bucket[i].count}P</div>
                    <div class="item-hidden-data">
                        <span class="item-price">${item.price}</span>
                        <span class="item-count">${bucket[i].count}</span>
                    </div>
                </div>
            </div>
            <div class="selectBtn"></div>
        </div>`
    }
    await sendRender(req, res, "views/bucket.html", { bucketItemList: itemListHTML })
})

app.get('/post', async (req, res) => {
    if (!isLogined(req, res)) {
        return
    }
    await sendRender(req, res, "views/post.html", {})
})

app.post('/post-check', upload.single('itemImg'), async (req, res, next) => {
    const { originalname, filename, size } = req.file;
    const body = req.body
    if (body.name == undefined || body.price == undefined || originalname == undefined) {
        res.send(forcedMoveWithAlertCode("입력란에 빈칸이 없어야 합니다.", '/post'))
        return
    } else if (!isLogined(req, res)) {
        return
    }
    const result = await sqlQuery(`insert into items (name, price, imgName, seller) values ('${body.name}', '${body.price}', '${originalname}', '${req.session.uid}')`)
    res.send(forcedMoveCode('/'))
})

app.get('/modify/:num', async (req, res) => {
    if (req.session.isLogined !== true) {
        res.send(forcedMoveWithAlertCode('로그인이 필요한 서비스입니다.', '/login'))
        return
    }
    var sqlResult = await sqlQuery(`select * from items where num=${req.params.num}`)
    if (sqlResult.length == 0) {
        sendRender(res, 'public/error', { errorCode: "404", errorMsg: "Not Found" })
        return
    }

    var item = sqlResult[0]
    if (item.seller !== req.session.uid && req.session.uid !== "admin") {
        res.send(forcedMoveWithAlertCode('접근이 금지되었습니다.', '/'))
        return
    }
    await sendRender(req, res, 'views/modify.html', {
        itemName: item.name,
        itemPrice: item.price,
        itemNum: item.num,
        imgName: item.imgName
    })
})

app.post('/modify-check', async (req, res) => {
    const body = req.body

    //접근 거부
    if (!isLogined(req, res)) {
        return
    } else if (body.name == undefined || body.price == undefined || body.num == undefined) {
        res.send(forcedMoveWithAlertCode("입력란에 빈칸이 없어야 합니다.", '/modify/' + body.num))
        return
    } else if (body.name == '' || body.price == '' || body.num == '') {
        res.send(forcedMoveWithAlertCode("입력란에 빈칸이 없어야 합니다.", '/modify/' + body.num))
        return
    }
    const sqlResult = await sqlQuery(`select * from items where num=${body.num}`)

    if (sqlResult.length == 0) {
        sendRender(res, 'public/error', { errorCode: "404", errorMsg: "Not Found" })
        return
    }
    const item = sqlResult[0]
    if (item.seller !== req.session.uid && req.session.uid !== "admin") {
        res.send(forcedMoveWithAlertCode('접근이 금지되었습니다.', '/'))
        return
    }

    sqlQuery(`update items set name='${body.name}', price=${body.price} where num=${body.num}`)
    res.send(forcedMoveWithAlertCode('변경사항이 저장되었습니다.', '/'))
})

app.get('/delete/:num', async (req, res) => {
    if (!isLogined(req, res)) { return }
    const sqlResult = await sqlQuery(`select * from items where num=${req.params.num}`)

    if (sqlResult.length == 0) {
        sendRender(res, 'public/error', { errorCode: "404", errorMsg: "Not Found" })
        return
    }
    const item = sqlResult[0]
    if (item.seller !== req.session.uid && req.session.uid !== "admin") {
        res.send(forcedMoveWithAlertCode('접근이 금지되었습니다.', '/'))
        return
    } else if (isNaN(Number(req.params.num))) {
        res.send(forcedMoveWithAlertCode('접근이 금지되었습니다.', '/'))
        return
    }
    sqlQuery(`delete from items where num=${req.params.num}`)
    res.send(forcedMoveWithAlertCode('해당 게시물이 삭제되었습니다.', '/'))
})

app.get('/my', async (req, res) => {
    if (!isLogined(req, res)) {
        return
    }
    await updateData(req)
    await sendRender(req, res, "views/profile.html", {
        'name': req.session.name,
        'uid': req.session.uid,
        'points': req.session.points,
    })
})

app.get('/Z2l2ZSBwb2ludA', async (req, res) => {
    //post일땐 qeury -> body
    var add = Number(req.query.points)
    var uid = req.query.uid

    var sqlResult = await sqlQuery(`select * from customer where uid='${uid}'`)
    if (sqlResult.length == 0) {
        res.send("Error")
        return
    }
    var points = sqlResult[0].points + add

    await sqlQuery(`update customer set points=${points} where uid='${uid}'`)
    res.send("OK")
})

app.listen(5500, () => console.log('Server run https://localhost:5500'))