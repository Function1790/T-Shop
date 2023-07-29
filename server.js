const express = require('express')
const app = express()
const fs = require('fs')

//Express Setting
app.use(express.static('public'))

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

function forcedMoveJS(url) {
    return `<script>window.location.href = "${url}"</script>`
}

async function renderFile(path, replaceItems = {}) {
    var content = await readFile(path)
    for (i in replaceItems) {
        content = content.replace(`{{${i}}}`, replaceItems[i])
    }
    return content
}

async function sendRender(res, path, replaceItems){
    res.send(await renderFile(path, replaceItems))
}

//Web
app.get('/', async (req, res) => {
    await sendRender(res, 'public/index.html', {test:"it is test"})
})

app.get('/t', async (req, res) => {
    await sendRender(res, 'public/index.html', {test:"it is test"})
})

app.listen(5500, () => console.log('Server run https://localhost:5500'))