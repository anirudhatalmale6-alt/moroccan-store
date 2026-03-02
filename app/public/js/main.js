/* ============================================
   Moroccan Luxury E-Commerce — Main JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initNavbarScroll();
  initCheckoutForm();
  initFileUpload();
  initCopyButtons();
  initGalleryModal();
  initFeedbackForm();
  initStarRating();
  initReviewForm();
  initReviewStarRating();
  initHeroVideo();
  initFeedbackUploads();
  initVoiceRecorders();
  initQuantityControl();
  initDeliveryOptions();
  initImageProtection();
  initReviewImageSliders();
});

/* --- Image Protection --- */
function initImageProtection() {
  // Disable right-click on images
  document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      e.preventDefault();
    }
  });
  // Disable drag on images
  document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* --- Navbar Scroll Effect --- */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

/* --- Checkout Form Validation & Submission --- */
function initCheckoutForm() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearErrors();

    const fullName = document.getElementById('fullName');
    const phone = document.getElementById('phone');
    const receiptFile = document.getElementById('receiptUpload');

    let isValid = true;

    // Validate full name
    if (!fullName.value.trim()) {
      showFieldError(fullName, 'يرجى إدخال الاسم الكامل');
      isValid = false;
    }

    // Validate phone
    if (!phone.value.trim()) {
      showFieldError(phone, 'يرجى إدخال رقم الهاتف');
      isValid = false;
    } else if (!/^\d{9,10}$/.test(phone.value.trim().replace(/\s/g, ''))) {
      showFieldError(phone, 'رقم الهاتف غير صالح');
      isValid = false;
    }

    // Validate receipt upload
    if (!receiptFile || !receiptFile.files || !receiptFile.files.length) {
      const uploadZone = document.querySelector('.upload-zone');
      uploadZone.classList.add('upload-zone--error');
      document.getElementById('receiptError').classList.add('visible');
      isValid = false;
    }

    if (!isValid) {
      showToast('يرجى تعبئة جميع الحقول المطلوبة', 'error');
      return;
    }

    // Show loading
    showLoading();

    // Collect form data for server submission
    const qty = parseInt(document.getElementById('qtyValue')?.textContent) || 1;
    const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked')?.value || 'deposit';

    const submitData = new FormData();
    submitData.append('fullName', fullName.value.trim());
    submitData.append('phone', phone.value.trim());
    submitData.append('quantity', qty);
    submitData.append('deliveryOption', deliveryOption);
    if (receiptFile.files[0]) {
      submitData.append('receipt', receiptFile.files[0]);
    }

    // Determine the API endpoint from form action or page URL
    const slug = form.dataset.slug || window.location.pathname.split('/')[2];
    const endpoint = '/product/' + slug + '/order';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: submitData
      });
      const result = await response.json();

      if (result.success) {
        sessionStorage.setItem('orderRef', result.orderRef);
        sessionStorage.setItem('customerName', fullName.value.trim());
        window.location.href = '/thankyou';
      } else {
        hideLoading();
        showToast(result.error || 'حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
      }
    } catch (err) {
      hideLoading();
      console.error('Order submission error:', err);
      showToast('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى', 'error');
    }
  });
}

/* --- File Upload --- */
function initFileUpload() {
  const uploadInput = document.getElementById('receiptUpload');
  const uploadZone = document.querySelector('.upload-zone');
  const preview = document.querySelector('.upload-preview');
  const previewImg = document.querySelector('.upload-preview__img');
  const previewName = document.querySelector('.upload-preview__name');
  const removeBtn = document.querySelector('.upload-preview__remove');

  if (!uploadInput) return;

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('يرجى اختيار صورة أو ملف PDF', 'error');
      uploadInput.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('حجم الملف كبير جداً (الحد الأقصى 10MB)', 'error');
      uploadInput.value = '';
      return;
    }

    // Show preview
    uploadZone.classList.remove('upload-zone--error');
    uploadZone.classList.add('upload-zone--has-file');
    document.getElementById('receiptError')?.classList.remove('visible');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        previewImg.src = evt.target.result;
        previewImg.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.style.display = 'none';
    }

    previewName.textContent = '✅ ' + file.name;
    preview.classList.add('visible');

    // Update upload zone text
    uploadZone.querySelector('.upload-zone__text').textContent = 'تم اختيار الملف بنجاح';
    uploadZone.querySelector('.upload-zone__icon').textContent = '✅';
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadInput.value = '';
      preview.classList.remove('visible');
      uploadZone.classList.remove('upload-zone--has-file');
      uploadZone.querySelector('.upload-zone__text').textContent = 'اضغط لرفع صورة إيصال الدفع';
      uploadZone.querySelector('.upload-zone__icon').textContent = '📤';
    });
  }
}

/* --- Copy Buttons --- */
function initCopyButtons() {
  document.querySelectorAll('.bank-detail__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      if (!value) return;

      navigator.clipboard.writeText(value).then(() => {
        const original = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = 'var(--color-success)';
        btn.style.color = 'white';
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = '';
          btn.style.color = '';
        }, 1500);
      }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);

        const original = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = original; }, 1500);
      });
    });
  });
}

/* --- Gallery Modal (simple lightbox) --- */
function initGalleryModal() {
  const items = document.querySelectorAll('.gallery__item');
  if (!items.length) return;

  items.forEach(item => {
    item.addEventListener('click', () => {
      // Simple zoom effect
      item.style.transform = 'scale(1.05)';
      setTimeout(() => {
        item.style.transform = '';
      }, 300);
    });
  });
}

/* --- Utility Functions --- */

function showFieldError(input, message) {
  input.classList.add('form-input--error');
  const errorEl = input.closest('.form-group')?.querySelector('.form-error');
  if (errorEl) {
    errorEl.textContent = '⚠️ ' + message;
    errorEl.classList.add('visible');
  }
}

function clearErrors() {
  document.querySelectorAll('.form-input--error').forEach(el => {
    el.classList.remove('form-input--error');
  });
  document.querySelectorAll('.form-error').forEach(el => {
    el.classList.remove('visible');
  });
  document.querySelector('.upload-zone')?.classList.remove('upload-zone--error');
}

function showToast(message, type = 'error') {
  // Remove existing toast
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = (type === 'error' ? '⚠️ ' : '✅ ') + message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

function showLoading() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.classList.add('visible');
}

function hideLoading() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function generateOrderRef() {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* --- Hero Video --- */
function initHeroVideo() {
  const video = document.querySelector('.hero__video');
  const fallback = document.querySelector('.hero__video-fallback');
  if (!video || !fallback) return;

  // If video can play, hide fallback
  video.addEventListener('canplay', () => {
    fallback.style.display = 'none';
  });

  // If video fails to load, show fallback
  video.addEventListener('error', () => {
    video.style.display = 'none';
    fallback.style.display = 'flex';
  });

  // If no source or source fails, show fallback
  const source = video.querySelector('source');
  if (source) {
    source.addEventListener('error', () => {
      video.style.display = 'none';
      fallback.style.display = 'flex';
    });
  }

  // Fallback: if video hasn't loaded after 3s, show placeholder
  setTimeout(() => {
    if (video.readyState < 2) {
      fallback.style.display = 'flex';
    }
  }, 3000);
}

/* --- Quantity Control --- */
// UNIT_PRICE and DEPOSIT_AMOUNT may be set by the page template before this script loads
if (typeof UNIT_PRICE === 'undefined') var UNIT_PRICE = 200;
if (typeof DEPOSIT_AMOUNT === 'undefined') var DEPOSIT_AMOUNT = 50;

function initQuantityControl() {
  const minusBtn = document.getElementById('qtyMinus');
  const plusBtn = document.getElementById('qtyPlus');
  const qtyValueEl = document.getElementById('qtyValue');
  if (!minusBtn || !plusBtn || !qtyValueEl) return;

  minusBtn.addEventListener('click', () => {
    let qty = parseInt(qtyValueEl.textContent);
    if (qty > 1) {
      qty--;
      qtyValueEl.textContent = qty;
      updateCheckoutPrices();
    }
  });

  plusBtn.addEventListener('click', () => {
    let qty = parseInt(qtyValueEl.textContent);
    if (qty < 10) {
      qty++;
      qtyValueEl.textContent = qty;
      updateCheckoutPrices();
    }
  });
}

/* --- Delivery Options --- */
function initDeliveryOptions() {
  const radios = document.querySelectorAll('input[name="deliveryOption"]');
  if (!radios.length) return;

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateCheckoutPrices();
    });
  });

  // Initial calculation
  updateCheckoutPrices();
}

/* --- Update all checkout prices --- */
function updateCheckoutPrices() {
  const qtyValueEl = document.getElementById('qtyValue');
  if (!qtyValueEl) return;

  const qty = parseInt(qtyValueEl.textContent) || 1;
  const totalProductPrice = qty * UNIT_PRICE;
  const selectedOption = document.querySelector('input[name="deliveryOption"]:checked')?.value || 'deposit';
  const isDeposit = selectedOption === 'deposit';
  const paymentAmount = isDeposit ? DEPOSIT_AMOUNT : totalProductPrice;
  const remainingAmount = isDeposit ? totalProductPrice - DEPOSIT_AMOUNT : 0;

  // Quantity section
  const qtyPriceEl = document.getElementById('qtyPrice');
  const qtyDetailEl = document.getElementById('qtyDetail');
  const qtyCalcEl = document.getElementById('qtyCalc');
  if (qtyPriceEl) qtyPriceEl.textContent = totalProductPrice + ' درهم';
  if (qty > 1 && qtyDetailEl && qtyCalcEl) {
    qtyDetailEl.style.display = 'block';
    qtyCalcEl.textContent = qty + ' × ' + UNIT_PRICE + ' درهم = ' + totalProductPrice + ' درهم';
  } else if (qtyDetailEl) {
    qtyDetailEl.style.display = 'none';
  }

  // Delivery option prices
  const depositPriceEl = document.getElementById('depositPrice');
  const fullPriceEl = document.getElementById('fullPrice');
  if (depositPriceEl) depositPriceEl.textContent = DEPOSIT_AMOUNT + ' درهم';
  if (fullPriceEl) fullPriceEl.textContent = totalProductPrice + ' درهم';

  // Bank transfer amount
  const bankAmountEl = document.getElementById('bankAmount');
  if (bankAmountEl) bankAmountEl.textContent = paymentAmount + ' درهم';

  // Order summary
  const summaryQtyEl = document.getElementById('summaryQty');
  if (summaryQtyEl) summaryQtyEl.textContent = 'الكمية: ' + qty;

  const summaryQtyRow = document.getElementById('summaryQtyRow');
  const summaryQtyLabel = document.getElementById('summaryQtyLabel');
  const summarySubtotal = document.getElementById('summarySubtotal');
  if (qty > 1 && summaryQtyRow) {
    summaryQtyRow.style.display = '';
    if (summaryQtyLabel) summaryQtyLabel.textContent = qty + ' × ' + UNIT_PRICE + ' درهم';
    if (summarySubtotal) summarySubtotal.textContent = totalProductPrice + ' درهم';
  } else if (summaryQtyRow) {
    summaryQtyRow.style.display = 'none';
  }

  const summaryDeliveryEl = document.getElementById('summaryDelivery');
  if (summaryDeliveryEl) {
    if (isDeposit) {
      summaryDeliveryEl.textContent = 'خلال 48 ساعة';
      summaryDeliveryEl.style.color = 'var(--color-text-secondary)';
    } else {
      summaryDeliveryEl.textContent = 'مجاني — نفس اليوم';
      summaryDeliveryEl.style.color = 'var(--color-success)';
    }
  }

  const summaryOptionLabel = document.getElementById('summaryOptionLabel');
  const summaryOptionValue = document.getElementById('summaryOptionValue');
  if (summaryOptionLabel && summaryOptionValue) {
    if (isDeposit) {
      summaryOptionLabel.textContent = 'خيار الدفع';
      summaryOptionValue.textContent = 'عربون (' + DEPOSIT_AMOUNT + ' درهم)';
    } else {
      summaryOptionLabel.textContent = 'خيار الدفع';
      summaryOptionValue.textContent = 'الدفع الكامل';
    }
  }

  const summaryTotalEl = document.getElementById('summaryTotal');
  if (summaryTotalEl) summaryTotalEl.textContent = paymentAmount + ' درهم';

  const summaryRemaining = document.getElementById('summaryRemaining');
  const summaryRemainingAmount = document.getElementById('summaryRemainingAmount');
  if (summaryRemaining) {
    if (isDeposit) {
      summaryRemaining.style.display = 'block';
      if (summaryRemainingAmount) summaryRemainingAmount.textContent = remainingAmount + ' درهم';
    } else {
      summaryRemaining.style.display = 'none';
    }
  }
}

/* --- Star Rating --- */
function initStarRating() {
  const starsContainer = document.getElementById('feedbackStars');
  const ratingInput = document.getElementById('feedbackRating');
  if (!starsContainer || !ratingInput) return;

  const stars = starsContainer.querySelectorAll('.feedback-star');

  // Set default 5 stars
  updateStars(stars, 5);

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      ratingInput.value = rating;
      updateStars(stars, rating);
    });

    star.addEventListener('mouseenter', () => {
      const rating = parseInt(star.dataset.rating);
      highlightStars(stars, rating);
    });
  });

  starsContainer.addEventListener('mouseleave', () => {
    const currentRating = parseInt(ratingInput.value);
    updateStars(stars, currentRating);
  });
}

function updateStars(stars, rating) {
  stars.forEach(star => {
    const starRating = parseInt(star.dataset.rating);
    if (starRating <= rating) {
      star.textContent = '★';
      star.classList.add('active');
    } else {
      star.textContent = '☆';
      star.classList.remove('active');
    }
  });
}

function highlightStars(stars, rating) {
  stars.forEach(star => {
    const starRating = parseInt(star.dataset.rating);
    if (starRating <= rating) {
      star.textContent = '★';
      star.classList.add('active');
    } else {
      star.textContent = '☆';
      star.classList.remove('active');
    }
  });
}

/* --- Feedback Form --- */
function initFeedbackForm() {
  const form = document.getElementById('feedbackForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('feedbackName');
    const phone = document.getElementById('feedbackPhone');
    const message = document.getElementById('feedbackMessage');
    const rating = document.getElementById('feedbackRating');
    const submitBtn = document.getElementById('feedbackSubmitBtn');

    let isValid = true;

    // Name is required
    if (!name.value.trim()) {
      showFieldError(name, 'يرجى إدخال الاسم');
      isValid = false;
    }

    // Phone is required
    if (phone && !phone.value.trim()) {
      showFieldError(phone, 'يرجى إدخال رقم الهاتف');
      isValid = false;
    }

    if (!isValid) {
      showToast('يرجى تعبئة الحقول المطلوبة', 'error');
      return;
    }

    // Check at least one content type (text, images, or audio)
    const feedbackImage = document.getElementById('feedbackImage');
    const hasImages = feedbackImage && feedbackImage.files && feedbackImage.files.length > 0;
    const hasAudio = !!window._voiceBlob;
    const hasMessage = message && message.value.trim();

    if (!hasMessage && !hasImages && !hasAudio) {
      showToast('يرجى إضافة نص أو صورة أو تعليق صوتي على الأقل', 'error');
      return;
    }

    // Validate max 3 images
    if (hasImages && feedbackImage.files.length > 3) {
      showToast('الحد الأقصى 3 صور', 'error');
      return;
    }

    // Disable submit button and show sending text
    var originalText = submitBtn ? (submitBtn.dataset.originalText || submitBtn.textContent) : '';
    var sendingText = submitBtn ? (submitBtn.dataset.sendingText || 'جاري الإرسال...') : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = sendingText;
      submitBtn.style.opacity = '0.7';
    }

    // Submit feedback via fetch
    const slug = form.dataset.slug || window.location.pathname.split('/')[2];
    const endpoint = '/product/' + slug + '/review';

    const submitData = new FormData();
    submitData.append('name', name.value.trim());
    if (phone) submitData.append('phone', phone.value.trim());
    submitData.append('rating', rating.value);
    submitData.append('message', message ? message.value.trim() : '');

    // Add images if uploaded (up to 3)
    if (hasImages) {
      for (var fi = 0; fi < feedbackImage.files.length && fi < 3; fi++) {
        submitData.append('images', feedbackImage.files[fi]);
      }
    }

    // Add voice recording if available
    if (window._voiceBlob) {
      var ext = 'webm';
      var blobType = window._voiceBlob.type || '';
      if (blobType.indexOf('mp4') !== -1) ext = 'mp4';
      else if (blobType.indexOf('ogg') !== -1) ext = 'ogg';
      else if (blobType.indexOf('wav') !== -1) ext = 'wav';
      submitData.append('audio', window._voiceBlob, 'voice-recording.' + ext);
    }

    try {
      const response = await fetch(endpoint, { method: 'POST', body: submitData });
      const result = await response.json();

      if (result.success) {
        form.style.display = 'none';
        const success = document.getElementById('feedbackSuccess');
        success.classList.add('visible');
        showToast(submitBtn && submitBtn.dataset.successText ? submitBtn.dataset.successText : 'شكراً! تم إرسال تعليقك بنجاح', 'success');
      } else {
        showToast(result.error || 'حدث خطأ', 'error');
        // Re-enable submit button on error
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          submitBtn.style.opacity = '';
        }
      }
    } catch (err) {
      console.error('Feedback error:', err);
      showToast('حدث خطأ في الإرسال', 'error');
      // Re-enable submit button on error
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '';
      }
    }
  });
}

// Reset feedback form (called from HTML onclick)
function resetFeedbackForm() {
  const form = document.getElementById('feedbackForm');
  const success = document.getElementById('feedbackSuccess');
  if (form && success) {
    form.reset();
    form.style.display = '';
    success.classList.remove('visible');
    // Reset stars to 5
    const stars = document.querySelectorAll('.feedback-star');
    const ratingInput = document.getElementById('feedbackRating');
    if (ratingInput) ratingInput.value = 5;
    if (stars.length) updateStars(stars, 5);
  }
}

/* --- Review Page: Star Rating --- */
function initReviewStarRating() {
  const starsContainer = document.getElementById('reviewStars');
  const ratingInput = document.getElementById('reviewRating');
  if (!starsContainer || !ratingInput) return;

  const stars = starsContainer.querySelectorAll('.feedback-star');

  // Set default 5 stars
  updateStars(stars, 5);

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      ratingInput.value = rating;
      updateStars(stars, rating);
    });

    star.addEventListener('mouseenter', () => {
      const rating = parseInt(star.dataset.rating);
      highlightStars(stars, rating);
    });
  });

  starsContainer.addEventListener('mouseleave', () => {
    const currentRating = parseInt(ratingInput.value);
    updateStars(stars, currentRating);
  });
}

/* --- Review Form --- */
function initReviewForm() {
  const form = document.getElementById('reviewForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('reviewName');
    const phone = document.getElementById('reviewPhone');
    const message = document.getElementById('reviewMessage');
    const rating = document.getElementById('reviewRating');

    let isValid = true;

    if (!name.value.trim()) {
      showFieldError(name, 'يرجى إدخال الاسم');
      isValid = false;
    }

    if (!phone.value.trim()) {
      showFieldError(phone, 'يرجى إدخال رقم الهاتف');
      isValid = false;
    } else if (!/^\d{9,10}$/.test(phone.value.trim().replace(/\s/g, ''))) {
      showFieldError(phone, 'رقم الهاتف غير صالح');
      isValid = false;
    }

    if (!message.value.trim()) {
      showFieldError(message, 'يرجى كتابة تقييمك');
      isValid = false;
    }

    if (!isValid) {
      showToast('يرجى تعبئة الحقول المطلوبة', 'error');
      return;
    }

    // Submit review via fetch
    const slug = form.dataset.slug || window.location.pathname.split('/')[2];
    const endpoint = '/product/' + slug + '/review';

    const submitData = new FormData();
    submitData.append('name', name.value.trim());
    submitData.append('phone', phone.value.trim());
    submitData.append('rating', rating.value);
    submitData.append('message', message.value.trim());

    // Add image if uploaded
    const reviewImage = document.getElementById('reviewImage');
    if (reviewImage && reviewImage.files[0]) {
      submitData.append('image', reviewImage.files[0]);
    }

    try {
      const response = await fetch(endpoint, { method: 'POST', body: submitData });
      const result = await response.json();

      if (result.success) {
        form.style.display = 'none';
        const success = document.getElementById('reviewSuccess');
        success.classList.add('visible');
        showToast('شكراً! تم إرسال تقييمك بنجاح', 'success');
      } else {
        showToast(result.error || 'حدث خطأ', 'error');
      }
    } catch (err) {
      console.error('Review error:', err);
      showToast('حدث خطأ في الإرسال', 'error');
    }
  });
}

/* --- Feedback/Review Image Upload (supports multiple) --- */
function initFeedbackUploads() {
  // Multi-image preview for feedbackImage
  var feedbackImageInput = document.getElementById('feedbackImage');
  var feedbackImagePreviews = document.getElementById('feedbackImagePreviews');

  if (feedbackImageInput && feedbackImagePreviews) {
    feedbackImageInput.addEventListener('change', function() {
      // If inline onchange handler (previewFeedbackImages) already handled this, skip
      if (typeof previewFeedbackImages === 'function') return;

      feedbackImagePreviews.innerHTML = '';
      var zone = document.getElementById('feedbackImageZone');
      var zoneText = zone ? zone.querySelector('.feedback-upload-zone__text') : null;
      var zoneIcon = zone ? zone.querySelector('.feedback-upload-zone__icon') : null;
      var files = feedbackImageInput.files;
      if (files.length > 3) {
        showToast('الحد الأقصى 3 صور', 'error');
        feedbackImageInput.value = '';
        return;
      }
      var validCount = 0;
      for (var i = 0; i < files.length; i++) {
        if (!files[i].type.startsWith('image/')) continue;
        if (files[i].size > 10 * 1024 * 1024) {
          showToast('حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت)', 'error');
          continue;
        }
        validCount++;
        (function(file) {
          var reader = new FileReader();
          reader.onload = function(evt) {
            var div = document.createElement('div');
            div.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:2px solid var(--color-border,#e8e0d8); flex-shrink:0;';
            div.innerHTML = '<img src="' + evt.target.result + '" style="width:100%;height:100%;object-fit:cover;" alt="">';
            feedbackImagePreviews.appendChild(div);
          };
          reader.readAsDataURL(file);
        })(files[i]);
      }
      if (validCount > 0 && zoneText) {
        zoneText.textContent = 'تم اختيار ' + validCount + ' صورة — اضغط لتغيير';
        if (zoneIcon) zoneIcon.textContent = '✅';
      }
    });
  }

  // Legacy single image preview (for reviews.ejs page)
  document.querySelectorAll('.feedback-upload-zone').forEach(function(zone) {
    var input = zone.querySelector('input[type="file"]');
    if (!input || input.id === 'feedbackImage') return;

    var previewContainer = zone.parentElement.querySelector('.feedback-upload-preview');
    if (!previewContainer) return;

    var previewImg = previewContainer.querySelector('.feedback-upload-preview__img');
    var previewName = previewContainer.querySelector('.feedback-upload-preview__name');
    var removeBtn = previewContainer.querySelector('.feedback-upload-preview__remove');

    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('يرجى اختيار صورة فقط', 'error'); input.value = ''; return; }
      if (file.size > 5 * 1024 * 1024) { showToast('حجم الصورة كبير جداً', 'error'); input.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function(evt) {
        previewImg.src = evt.target.result;
        previewName.textContent = '✅ ' + file.name;
        previewContainer.classList.add('visible');
        zone.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        input.value = '';
        previewContainer.classList.remove('visible');
        zone.style.display = '';
      });
    }
  });
}

/* --- Voice Recorders --- */
function initVoiceRecorders() {
  // Initialize each voice recorder on the page
  const recorderConfigs = [
    { btn: 'voiceRecordBtn', status: 'voiceStatus', player: 'voicePlayer', audio: 'voiceAudio', remove: 'voiceRemoveBtn' },
    { btn: 'reviewVoiceRecordBtn', status: 'reviewVoiceStatus', player: 'reviewVoicePlayer', audio: 'reviewVoiceAudio', remove: 'reviewVoiceRemoveBtn' }
  ];

  recorderConfigs.forEach(config => {
    const btn = document.getElementById(config.btn);
    if (!btn) return;

    const statusEl = document.getElementById(config.status);
    const playerEl = document.getElementById(config.player);
    const audioEl = document.getElementById(config.audio);
    const removeBtn = document.getElementById(config.remove);

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordingTimer = null;
    let seconds = 0;

    btn.addEventListener('click', async () => {
      if (isRecording) {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        btn.classList.remove('recording');
        btn.querySelector('.voice-recorder__label').textContent = 'اضغط للتسجيل';
        btn.querySelector('.voice-recorder__icon').textContent = '🎙️';
        statusEl.classList.remove('recording');
        statusEl.textContent = '';
        clearInterval(recordingTimer);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Use the best supported MIME type
        var mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else if (MediaRecorder.isTypeSupported('audio/wav')) {
            mimeType = 'audio/wav';
          }
        }
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        } catch(e2) {
          mediaRecorder = new MediaRecorder(stream);
        }
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          audioEl.src = audioUrl;
          playerEl.classList.add('visible');
          btn.style.display = 'none';
          statusEl.textContent = '';

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());

          // Store blob globally for form submission
          window._voiceBlob = audioBlob;
          btn.closest('.voice-recorder').dataset.hasAudio = 'true';
        };

        mediaRecorder.start();
        isRecording = true;
        seconds = 0;
        btn.classList.add('recording');
        btn.querySelector('.voice-recorder__label').textContent = 'إيقاف التسجيل';
        btn.querySelector('.voice-recorder__icon').textContent = '⏹️';
        statusEl.classList.add('recording');
        statusEl.textContent = '🔴 جاري التسجيل... 0:00';

        recordingTimer = setInterval(() => {
          seconds++;
          const min = Math.floor(seconds / 60);
          const sec = String(seconds % 60).padStart(2, '0');
          statusEl.textContent = `🔴 جاري التسجيل... ${min}:${sec}`;

          // Auto-stop after 60 seconds
          if (seconds >= 60) {
            mediaRecorder.stop();
            isRecording = false;
            btn.classList.remove('recording');
            clearInterval(recordingTimer);
          }
        }, 1000);

      } catch (err) {
        console.warn('Microphone access denied:', err);
        if (err.name === 'NotAllowedError') {
          showToast('يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح', 'error');
        } else if (err.name === 'NotFoundError') {
          showToast('لم يتم العثور على ميكروفون', 'error');
        } else if (typeof MediaRecorder === 'undefined') {
          showToast('المتصفح لا يدعم التسجيل الصوتي. جرب Chrome أو Safari', 'error');
        } else {
          showToast('حدث خطأ في التسجيل. جرب متصفح آخر', 'error');
        }
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        audioEl.src = '';
        playerEl.classList.remove('visible');
        btn.style.display = '';
        window._voiceBlob = null;
        btn.closest('.voice-recorder').dataset.hasAudio = 'false';
      });
    }
  });
}

/* --- Thank You Page: Load Order Reference --- */
function loadOrderRef() {
  const refEl = document.getElementById('orderRef');
  const ref = sessionStorage.getItem('orderRef');
  if (refEl && ref) {
    refEl.textContent = ref;
  }
}

// Auto-init for thank you page
if (document.querySelector('.thankyou-page')) {
  loadOrderRef();
}

/* --- WhatsApp-style Audio Player --- */
var _waCurrentAudio = null;
var _waCurrentPlayer = null;

function initWaWaveforms() {
  document.querySelectorAll('.wa-waveform').forEach(function(wf) {
    if (wf.children.length > 0) return; // already initialized
    var barCount = 28;
    for (var i = 0; i < barCount; i++) {
      var bar = document.createElement('div');
      bar.className = 'wa-waveform-bar';
      var h = 4 + Math.floor(Math.random() * 20);
      bar.style.height = h + 'px';
      wf.appendChild(bar);
    }
  });
}

function toggleWaAudio(btn) {
  var player = btn.closest('.wa-audio-player');
  var src = player.dataset.src;
  if (!src) return;

  // Stop any other playing audio
  if (_waCurrentAudio && _waCurrentPlayer && _waCurrentPlayer !== player) {
    _waCurrentAudio.pause();
    _waCurrentAudio.currentTime = 0;
    _waCurrentPlayer.querySelector('.wa-play-btn').textContent = '▶';
    resetWaBars(_waCurrentPlayer);
    var t = Math.floor(_waCurrentAudio.duration || 0);
    _waCurrentPlayer.querySelector('.wa-time').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  var audio = player._audioEl;
  if (!audio) {
    audio = new Audio(src);
    player._audioEl = audio;

    audio.addEventListener('timeupdate', function() {
      if (!audio.duration) return;
      var pct = audio.currentTime / audio.duration;
      updateWaBars(player, pct);
      var s = Math.floor(audio.currentTime);
      player.querySelector('.wa-time').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    });

    audio.addEventListener('ended', function() {
      player.querySelector('.wa-play-btn').textContent = '▶';
      resetWaBars(player);
      var s = Math.floor(audio.duration || 0);
      player.querySelector('.wa-time').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      _waCurrentAudio = null;
      _waCurrentPlayer = null;
    });

    audio.addEventListener('loadedmetadata', function() {
      if (audio.duration && audio.duration !== Infinity) {
        var s = Math.floor(audio.duration);
        player.querySelector('.wa-time').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      }
    });
  }

  if (audio.paused) {
    audio.play().catch(function() {});
    btn.textContent = '⏸';
    _waCurrentAudio = audio;
    _waCurrentPlayer = player;
  } else {
    audio.pause();
    btn.textContent = '▶';
  }
}

function updateWaBars(player, pct) {
  var bars = player.querySelectorAll('.wa-waveform-bar');
  var playedCount = Math.floor(pct * bars.length);
  bars.forEach(function(bar, i) {
    if (i < playedCount) bar.classList.add('played');
    else bar.classList.remove('played');
  });
}

function resetWaBars(player) {
  player.querySelectorAll('.wa-waveform-bar').forEach(function(bar) { bar.classList.remove('played'); });
}

function seekWaAudio(e, wrap) {
  var player = wrap.closest('.wa-audio-player');
  var audio = player._audioEl;
  if (!audio || !audio.duration) return;
  var rect = wrap.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var pct = x / rect.width;
  if (document.dir === 'rtl' || document.documentElement.dir === 'rtl') pct = 1 - pct;
  audio.currentTime = Math.max(0, Math.min(1, pct)) * audio.duration;
}

// Initialize waveforms on page load
document.addEventListener('DOMContentLoaded', initWaWaveforms);

/* --- Review Image Sliders (swipeable multi-image reviews) --- */
function initReviewImageSliders() {
  var sliders = document.querySelectorAll('.review-img-slider');
  sliders.forEach(function(slider) {
    var track = slider.querySelector('.review-img-track');
    var dots = slider.querySelectorAll('.review-slider-dot');
    if (!track || dots.length < 2) return;

    var currentIdx = 0;
    var totalSlides = dots.length;
    var startX = 0;
    var startY = 0;
    var isDragging = false;
    var isHorizontal = null;

    function goTo(idx) {
      idx = Math.max(0, Math.min(totalSlides - 1, idx));
      currentIdx = idx;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      dots.forEach(function(d, i) {
        d.style.background = i === idx ? 'var(--color-primary)' : 'var(--color-border)';
      });
    }

    // Dot clicks
    dots.forEach(function(dot, i) {
      dot.addEventListener('click', function() { goTo(i); });
    });

    // Touch swipe
    track.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
      isHorizontal = null;
      track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      // Determine direction on first significant move
      if (isHorizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!isHorizontal) return; // Let vertical scroll through
      e.preventDefault();
      var pct = (dx / slider.offsetWidth) * 100;
      track.style.transform = 'translateX(' + (-currentIdx * 100 + pct) + '%)';
    }, { passive: false });

    track.addEventListener('touchend', function(e) {
      if (!isDragging || !isHorizontal) { isDragging = false; return; }
      isDragging = false;
      track.style.transition = 'transform 0.3s ease';
      var endX = e.changedTouches[0].clientX;
      var diff = endX - startX;
      var threshold = slider.offsetWidth * 0.2;
      if (diff < -threshold && currentIdx < totalSlides - 1) {
        goTo(currentIdx + 1);
      } else if (diff > threshold && currentIdx > 0) {
        goTo(currentIdx - 1);
      } else {
        goTo(currentIdx);
      }
    });
  });
}
