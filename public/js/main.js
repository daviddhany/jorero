function toggleFilter(){
  document.getElementById('filter')?.classList.toggle('open');
}

(function(){
  const logo = document.getElementById('secretAdminLogo');
  const trigger = logo;
  if (!trigger) return;

  let clicks = 0;
  let timer;
  trigger.style.cursor = 'pointer';
  trigger.title = '';

  trigger.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();

    clicks += 1;
    clearTimeout(timer);

    timer = setTimeout(function(){
      clicks = 0;
    }, 7000);

    if (clicks >= 7) {
      clicks = 0;
      window.location.href = '/marly-dashboard/login';
    }
  }, true);
})();


// Auto moving hero carousel
(function(){
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;
  const slides = Array.from(carousel.querySelectorAll('.hero-slide'));
  const dots = Array.from(carousel.querySelectorAll('.hero-dots span'));
  if (slides.length <= 1) return;
  let current = 0;
  function showSlide(index){
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = index % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }
  setInterval(() => showSlide(current + 1), 3500);
})();

// Product gallery arrows + color photos
let productPhotoIndex = 0;
function productImagesList(){
  const gallery = document.querySelector('.product-gallery');
  if (!gallery) return [];
  try { return JSON.parse(gallery.dataset.images || '[]'); } catch (e) { return []; }
}
function updateThumbActive(src){
  const thumbs = document.querySelectorAll('#productThumbs img');
  thumbs.forEach(t => t.classList.toggle('active', t.getAttribute('data-img') === src || t.src === src));
}
function setProductPhoto(index){
  const images = productImagesList();
  if (!images.length) return;
  productPhotoIndex = (index + images.length) % images.length;
  const main = document.getElementById('mainImg');
  if (main) main.src = images[productPhotoIndex];
  const selectedImage = document.getElementById('selectedImage');
  if (selectedImage) selectedImage.value = images[productPhotoIndex];
  updateThumbActive(images[productPhotoIndex]);
}
function moveProductPhoto(direction){
  const images = productImagesList();
  if (!images.length) return;
  setProductPhoto(productPhotoIndex + direction);
}
function setSelectedColorValue(color){
  const select = document.getElementById('colorSelect') || document.getElementById('selectedColor');
  if (!select || !color) return;
  const cleanColor = String(color).trim();
  let option = Array.from(select.options).find(opt => String(opt.value).trim() === cleanColor || String(opt.textContent).trim() === cleanColor);
  if (!option) {
    option = new Option(cleanColor, cleanColor);
    select.add(option);
  }
  select.value = option.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}
function showColorPhoto(image, color){
  const main = document.getElementById('mainImg');
  if (main && image) main.src = image;
  const selectedImage = document.getElementById('selectedImage');
  if (selectedImage) selectedImage.value = image;
  if (color) setSelectedColorValue(color);
  updateThumbActive(image);
  document.querySelectorAll('.color-photo-options button').forEach(btn => {
    const isActive = (btn.dataset.image === image) || (String(btn.dataset.color || '').trim() === String(color || '').trim());
    btn.classList.toggle('active', isActive);
  });
}

// Color image buttons: keeps the customer's clicked color inside the real color select.
(function(){
  document.querySelectorAll('.color-photo-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      showColorPhoto(btn.dataset.image || '', btn.dataset.color || '');
    });
  });
})();

// Add to cart without leaving product page
(function(){
  const form = document.querySelector('.buy-box');
  if (!form) return;

  function showToast(message){
    let toast = document.querySelector('.cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__cartToastTimer);
    window.__cartToastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();

    const activeColorBtn = document.querySelector('.color-photo-btn.active');
    const colorSelect = document.getElementById('colorSelect') || document.getElementById('selectedColor');
    if (colorSelect && !colorSelect.value && activeColorBtn && activeColorBtn.dataset.color) {
      setSelectedColorValue(activeColorBtn.dataset.color);
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const btn = form.querySelector('button');
    const oldText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الإضافة...'; }
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        showToast(data.message || 'اختار المقاس واللون قبل إضافة المنتج للسلة');
        return;
      }
      showToast(data.message || 'تمت إضافة المنتج للسلة بنجاح');
    } catch (err) {
      showToast('حصلت مشكلة، جرب تاني');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldText; }
    }
  });
})();


// Mobile hamburger menu
(function(){
  const header = document.querySelector('.header');
  const btn = document.querySelector('.mobile-menu-btn');
  if (!header || !btn) return;

  btn.addEventListener('click', function(){
    const isOpen = header.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    btn.textContent = isOpen ? '×' : '☰';
  });

  header.querySelectorAll('.main-nav a, nav a').forEach(function(link){
    link.addEventListener('click', function(){
      header.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '☰';
    });
  });
})();
