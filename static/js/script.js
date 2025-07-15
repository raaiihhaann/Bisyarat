document.addEventListener('DOMContentLoaded', function () {
  // ========== MODAL ==========
  const modal = document.getElementById('modal-prediksi');
  const openButton = document.querySelector('.prediksi-button');
  const closeButton = document.getElementById('close-modal');
  const yesButton = document.getElementById('confirm-yes');
  const noButton = document.getElementById('confirm-no');

  openButton.addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'block';
  });

  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  noButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  yesButton.addEventListener('click', () => {
    window.location.href = "/prediksi";
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // ========== PAGINATION DOT + LABEL ==========
  const container = document.getElementById('videoScroll');
  const items = document.querySelectorAll('#videoScroll .video-item');
  const dotContainer = document.getElementById('videoDots');
  const labelBox = document.getElementById('videoLabelBox');
  const labelMap = ['A', 'I', 'U', 'E', 'O'];

  // Buat dot sesuai jumlah video
  items.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    if (index === 0) dot.classList.add('active');
    dotContainer.appendChild(dot);
  });

  const dots = dotContainer.querySelectorAll('.dot');

  container.addEventListener('scroll', () => {
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    const index = Math.round(scrollLeft / containerWidth);

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    if (labelBox && labelMap[index]) {
      labelBox.textContent = labelMap[index];
    }
  });

  // ========== ARROW NAVIGATION (Single Pair) ==========
  const prevArrow = document.getElementById('prevArrow');
  const nextArrow = document.getElementById('nextArrow');

  prevArrow.addEventListener('click', () => {
    container.scrollBy({
      left: -container.offsetWidth,
      behavior: 'smooth'
    });
  });

  nextArrow.addEventListener('click', () => {
    container.scrollBy({
      left: container.offsetWidth,
      behavior: 'smooth'
    });
  });
});
