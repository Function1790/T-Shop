const express = require('express')
const app = express()
const fs = require('fs')
const mysql = require('mysql')
const multer = require('multer');

//AES-256
const crypto = require('crypto');

const key = 'abcdefghabcdefghabcdefghabcdefgh';
const iv = '0123456701234567';

function encrypt(data) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypt = cipher.update(data, 'utf8', 'base64');
    encrypt += cipher.final('base64');
    return encrypt
}

function decrypt(data) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypt = decipher.update(data.replaceAll(" ", "+"), 'base64', 'utf8')
    decrypt += decipher.final('utf8')
    return decrypt
}

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

//<----------Function---------->
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
    return `<title>T SHOP</title><script>alert(\`${text}\`);window.location.href = "${url}"</script>`
}

function goBackWithAlertCode(text) {
    return `<title>T SHOP</title><script>alert("${text}");window.location.href = document.referrer</script>`
}

async function renderFile(req, path, replaceItems = {}) {
    var content = await readFile(path)

    if (req.session.isLogined == true) {
        content = content.replaceAll('{{loginStatus}}', 'MY')
        content = content.replaceAll('{{userName}}', req.session.name)
    } else {
        content = content.replaceAll('{{loginStatus}}', 'login')
        content = content.replaceAll('{{userName}}', 'login')
    }

    for (i in replaceItems) {
        content = content.replaceAll(`{{${i}}}`, replaceItems[i])
    }
    return content
}

async function sendRender(req, res, path, replaceItems) {
    res.send(await renderFile(req, path, replaceItems))
}

function isLogined(req, res) {
    if (req.session.uid == undefined) {
        res.send(forcedMoveWithAlertCode("로그인이 필요한 서비스입니다.", '/login'))
        return false
    }
    return true
}

function isAdmin(req, res) {
    if (req.session.uid !== "admin") {
        res.send(goBackWithAlertCode("접근 권한이 없습니다."))
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

function itemToJson(item, count) {
    return {
        num: item.num,
        name: item.name,
        price: item.price,
        count: count
    }
}

async function addReceipt(uid, items, counts) {
    var dataJson = []
    for (var i in items) {
    }

    dataJson = JSON.stringify(dataJson)

    await sqlQuery(`insert into receipt(buyer_uid, is_used, data) values ("${uid}", 0, '${dataJson}');`)
}

function getReceiptToHTML(column) {
    var data = JSON.parse(column.data)
    cost = 0
    for (var i in data) {
        cost += data[i].price
    }
    print()

    elseThing = ['', ` 외 ${data.length - 1}개`][Number(data.length - 1 > 0)]
    result = `<a href="/receipt/${column.num}">
    <div class="item">
            <div class="itemHeader">${column.num}</div>
            <div class="itemContainer">${data[0].name}${elseThing}</div>
            <div class="itemFooter">${cost}</div>
    </div>
    </a>`

    return result
}

async function loginGuest(req) {
    req.session.name = "guest"
    req.session.uid = "guest"
    req.session.num = 1
    req.session.isLogined = true
    await updateData(req)
}

function toFormatPoint(point) {
    return point.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

//<----------Web---------->
app.get('/', async (req, res) => {
    var sqlResult = await sqlQuery('select * from items')

    var itemListsHTML = ""
    for (var i in sqlResult) {
        itemListsHTML += `
        <a href="/items/${sqlResult[i].num}" class="sellitem-link">
        <div class="sellitem">
            <img src="img/${sqlResult[i].imgName}" alt="상품">
            <div class="sellitem-name">${sqlResult[i].name}</div>
            <div class="sellitem-price">${toFormatPoint(sqlResult[i].price)}P</div>
        </div>
        </a>`
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
    const uid = connection.escape(body.uid)
    const upw = connection.escape(body.upw)
    var sqlResult = await sqlQuery(`select * from customer where uid=${uid} and upw=${upw}`)
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
        var bucket = []
        if (result.bucket !== null) {
            bucket = JSON.parse(result.bucket)
        }
        const data = JSON.parse(body.data)
        bucket.push({ "num": data.num, "count": data.count })
        bucket = JSON.stringify(bucket)
        await sqlQuery(`update customer set bucket='${bucket}' where num=${req.session.num}`)
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
                    <div class="item-cost">${item.price}P × ${bucket[i].count}개 = ${toFormatPoint(item.price * bucket[i].count)}P</div>
                    <div class="item-hidden-data">
                        <span class="item-num">${item.num}</span>
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
    if (!isAdmin(req, res)) {
        return
    }
    await sendRender(req, res, "views/post.html", {})
})

app.post('/post-check', upload.single('itemImg'), async (req, res, next) => {
    if (!isAdmin(req, res)) {
        return
    }
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
    if (!isAdmin(req, res)) {
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
    if (!isAdmin(req, res)) {
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
    if (!isAdmin(req, res)) { return }
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
    const result = await sqlQuery(`select * from receipt where buyer_uid='${req.session.uid}';`)
    var receiptText = ''
    if (result.length != 0) {
        for (var i in result) {
            receiptText += getReceiptToHTML(result[i])
        }
    }


    await sendRender(req, res, "views/profile.html", {
        'name': req.session.name,
        'uid': req.session.uid,
        'points': toFormatPoint(req.session.points),
        'receiptList': receiptText
    })
})

app.get('/get-point', async (req, res) => {
    try {
        var add = Number(decrypt(req.query.point))
        var uid = decrypt(req.query.uid)
    } catch {
        res.send('Error')
        return
    }

    var sqlResult = await sqlQuery(`select * from customer where uid='${uid}'`)
    if (sqlResult.length == 0) {
        res.send("Error")
        return
    }
    var points = sqlResult[0].points + add

    await sqlQuery(`update customer set points=${points} where uid='${uid}'`)
    res.send("OK")
})

app.get('/buynow-check', async (req, res) => {
    if (!isLogined(req, res)) {
        return
    }

    const body = req.query
    const itemNum = body.num
    const itemCount = Number(body.count)

    var result = await sqlQuery(`select * from items where num=${itemNum}`)
    if (result.length == 0) {
        res.send(goBackWithAlertCode('해당 물품이 존재하지 않습니다.'))
        return
    }

    const cost = result[0].price * itemCount
    items = [{
        num: result[0].num,
        name: result[0].name,
        count: itemCount,
        price: cost
    }]
    await updateData(req)
    if (req.session.points >= cost) {
        const afterPoints = req.session.points - cost
        await sqlQuery(`update customer set points=${afterPoints} where uid='${req.session.uid}'`)
        await sqlQuery(`insert into receipt(buyer_uid, is_used, data) values ("${req.session.uid}", 0, '${JSON.stringify(items)}');`)
        var text = `'${result[0].name}' ${itemCount}개를 구매하셨습니다.`
        text += `\n가격 : ${toFormatPoint(cost)}P`
        text += `\n잔여 포인트: ${toFormatPoint(req.session.points)}P → ${toFormatPoint(afterPoints)}P`
        res.send(forcedMoveWithAlertCode(text, '/my'))
        await updateData(req)
        return
    }
    res.send(goBackWithAlertCode('포인트가 부족합니다.'))
    return
})

app.get('/buys-check', async (req, res) => {
    if (!isLogined(req, res)) {
        return
    }

    const body = req.query
    const receipt = JSON.parse(body.items)

    if (receipt == '') {
        res.send(goBackWithAlertCode('물품을 선택하지 않으셨습니다.'))
        return
    }

    var items = []
    var cost = 0
    for (var i in receipt) {
        var result = await sqlQuery(`select * from items where num=${receipt[i].num}`)
        if (result.length == 0) {
            res.send(goBackWithAlertCode('존재하지 않는 물품이 있습니다.'))
            return
        }
        var price = result[0].price * receipt[i].count
        items.push({
            num: receipt[i].num,
            name: result[0].name,
            count: receipt[i].count,
            price: price
        })
        cost += price
    }

    await updateData(req)
    if (req.session.points < cost) {
        res.send(goBackWithAlertCode('포인트가 부족합니다.'))
        return
    }

    const afterPoints = req.session.points - cost
    await sqlQuery(`update customer set points=${afterPoints} where uid='${req.session.uid}'`)
    await sqlQuery(`insert into receipt(buyer_uid, is_used, data) values ("${req.session.uid}", 0, '${JSON.stringify(items)}');`)
    var text = ''
    for (var i in items) {
        text += `'${items[i].name}' ${items[i].count}개\n`
    }
    text += `를 구매하셨습니다.\n가격 : ${cost}P`
    text += `\n잔여 포인트: ${req.session.points}P → ${afterPoints}P`
    res.send(forcedMoveWithAlertCode(text, '/my'))
    await updateData(req)
    return
})

app.get('/receipt/:index', async (req, res) => {
    const result = await sqlQuery(`select * from receipt where buyer_uid='${req.session.uid}' and num=${req.params.index};`)
    if (result.length == 0) {
        res.send(forcedMoveWithAlertCode("해당 주문서에 대한 권한이 없거나 주문서가 존재하지 않습니다.", "/my"))
        return
    }

    const data = JSON.parse(result[0].data)
    var itemsHTML = ""
    for (var i in data) {
        var imgName = await sqlQuery(`select imgName from items where num=${data[i].num}`)
        if (imgName.length == 0) {
            imgName = ""
        } else {
            imgName = imgName[0].imgName
        }
        itemsHTML += `<div class="item">
                    <div class="itemHeader"><img src="/img/${imgName}" alt="사진"></div>
                    <div class="itemContainer">${data[i].name}</div>
                    <div class="itemFooter">${data[i].count}</div>
                </div>`
    }

    await sendRender(req, res, "./views/receipt.html", {
        num: result[0].num,
        isused: ["미사용", "사용"][result[0].is_used],
        buyer: result[0].buyer_uid,
        items: itemsHTML
    })
})

//Error
app.get('/delete-bucket', async (req, res) => {
    if (!isLogined(req, res)) {
        return
    }
    const body = req.query
    const deleteItems = JSON.parse(body.items)
    if (deleteItems == '') {
        res.send(goBackWithAlertCode('삭제할 물품을 선택해주세요.'))
        return
    }
    deleteItems.sort()
    deleteItems.reverse()

    const result = await sqlQuery(`select * from customer where num=${req.session.num}`)
    var bucket = JSON.parse(result[0].bucket)

    for (var i in deleteItems) {
        bucket.pop(deleteItems[i])
    }

    const a = await sqlQuery(`update customer set bucket=${JSON.stringify(bucket)} where num=${req.session.num};`)
    res.send(forcedMoveCode('/bucket'))
})

app.get('/soldout/:num', async (req, res) => {
    if (!isAdmin(req, res)) { return }
    var sqlResult = await sqlQuery(`select * from items where num=${req.params.num}`)
    if (sqlResult.length == 0) {
        res.send(goBackWithAlertCode("해당 상품이 존재하지 않습니다."))
        return
    }

    await sqlQuery(`update items set soldout=1 where num=${req.params.num};`)
    res.send(forcedMoveCode(`/items/${req.params.num}`))
})

app.get('/soldout-cancel/:num', async (req, res) => {
    if (!isAdmin(req, res)) { return }
    var sqlResult = await sqlQuery(`select * from items where num=${req.params.num}`)
    if (sqlResult.length == 0) {
        res.send(goBackWithAlertCode("해당 상품이 존재하지 않습니다."))
        return
    }

    await sqlQuery(`update items set soldout=0 where num=${req.params.num};`)
    res.send(forcedMoveCode(`/items/${req.params.num}`))
})


app.listen(5500, () => console.log('Server run https://localhost:5500'))
