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