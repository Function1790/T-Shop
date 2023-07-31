const counter = document.getElementsByClassName('count')[0]
const countUp = document.getElementsByClassName('countUp')[0]
const countDown = document.getElementsByClassName('countDown')[0]
const costResult = document.getElementsByClassName('cost-result')[0];

const price = Number(document.getElementsByClassName('info-itemPrice')[0].innerText)
let _count = 1

function updateCount() {
    counter.value = `${_count}`
    costResult.innerText = `${_count}개 × ${price}원 = ${_count * price}원`
}

countUp.addEventListener('click', (e) => {
    if (_count >= 9999) {
        returns
    }
    _count += 1
    updateCount()
})

countDown.addEventListener('click', (e) => {
    if (_count <= 1) {
        return
    }
    _count -= 1
    updateCount()
})

counter.addEventListener("keyup", (e) => {
    _count = Number(counter.value)
    updateCount()
})
