document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('itemImgSelector').addEventListener('change', function (event) {
        const selectedFile = event.target.files[0];

        if (selectedFile) {
            const reader = new FileReader();

            reader.addEventListener('load', function () {
                const image = document.getElementById('itemImg');
                image.src = reader.result;
            });

            reader.readAsDataURL(selectedFile);
        }
    });
});

const priceInput = document.getElementById('price')
var lastPriceValue = ''
priceInput.addEventListener('keyup', (event) => {
    if (isNaN(Number(priceInput.value))) {
        priceInput.value = lastPriceValue
    } else {
        lastPriceValue = priceInput.value
        return
    }
})