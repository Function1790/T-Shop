const mysql = require('mysql')

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

function toForm(n) {
    strN = `${n}`
    result = `${n}`
    for (var i = 0; i < 3 - strN.length; i++) {
        result = '0' + result
    }
    return result
}

for (var i = 0; i < 280; i++) {
    sqlQuery(`insert into customer(uid, upw, name, points) values ("sr22_${toForm(i + 1)}","sr1234","sr${i}", 0);`)
}

for (var i = 0; i < 260; i++) {
    sqlQuery(`insert into customer(uid, upw, name, points) values ("sr23_${toForm(i + 1)}","sr1234","sr${i}", 0);`)
}