function toFormatPoint(point) {
    return point.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}