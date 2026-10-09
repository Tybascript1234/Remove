// عناصر DOM
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const removeBgBtn = document.getElementById("removeBgBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const downloadSelectedBtn = document.getElementById("downloadSelectedBtn");
const resetBtn = document.getElementById("resetBtn");
const removeAllBgBtn = document.getElementById("removeAllBgBtn");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValue = document.getElementById("qualityValue");
const toleranceSlider = document.getElementById("toleranceSlider");
const toleranceValue = document.getElementById("toleranceValue");
const loading = document.getElementById("loading");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const imagesGrid = document.getElementById("imagesGrid");
const previewGrid = document.getElementById("previewGrid");
const batchProgressBar = document.getElementById("batchProgressBar");
const batchStatus = document.getElementById("batchStatus");
const colorPickerContainer = document.getElementById("colorPickerContainer");
const colorPreview = document.getElementById("colorPreview");
const modeButtons = document.querySelectorAll(".mode-btn");
const colorOptions = document.querySelectorAll(".color-option");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeModal = document.getElementById("closeModal");
const modalDownload = document.getElementById("modalDownload");

// عناصر القائمة الجانبية (وضع الهاتف)
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const MOBILE_QUERY = window.matchMedia("(max-width: 768px)");

// أيقونة SVG من مكتبة الأيقونات الموجودة في index.html
const icon = (name) => `<svg class="icon"><use href="#i-${name}"/></svg>`;

function openSidebar() {
  document.body.classList.add("sidebar-open");
  menuBtn.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", openSidebar);
closeSidebarBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSidebar();
    imageModal.style.display = "none";
  }
});
// عند التوسيع إلى وضع الحاسوب نغلق حالة الدرج
MOBILE_QUERY.addEventListener("change", (e) => {
  if (!e.matches) closeSidebar();
});

// سياق الرسوم للكانفاس
const originalCanvas = document.createElement("canvas");
const originalCtx = originalCanvas.getContext("2d");
const resultCanvas = document.createElement("canvas");
const resultCtx = resultCanvas.getContext("2d");

// متغيرات التطبيق
let uploadedImages = [];
let processedImages = [];
let removalMode = "background"; // 'background' أو 'color'
let selectedColor = null;
let colorTolerance = 20;
let currentModalImage = null;

// أحداث تحميل الملف
uploadArea.addEventListener("click", () => fileInput.click());
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleImageUpload();
  }
});

fileInput.addEventListener("change", handleImageUpload);

// تحديث قيمة الحساسية والدقة والتسامح
sensitivitySlider.addEventListener("input", () => {
  sensitivityValue.textContent = `${sensitivitySlider.value}%`;
});

qualitySlider.addEventListener("input", () => {
  const qualityLevels = {
    1: "منخفضة (100%)",
    2: "متوسطة (200%)",
    3: "عالية (300%)",
  };
  qualityValue.textContent = qualityLevels[qualitySlider.value];
});

toleranceSlider.addEventListener("input", () => {
  toleranceValue.textContent = `${toleranceSlider.value}%`;
  colorTolerance = parseInt(toleranceSlider.value);
});

// أحداث الأزرار
removeBgBtn.addEventListener("click", removeBackground);
downloadAllBtn.addEventListener("click", downloadAllResults);
downloadSelectedBtn.addEventListener("click", downloadSelectedResults);
resetBtn.addEventListener("click", resetApp);
removeAllBgBtn.addEventListener("click", removeAllBackgrounds);

// أحداث أوضاع الإزالة
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    removalMode = btn.dataset.mode;

    if (removalMode === "color") {
      colorPickerContainer.style.display = "block";
    } else {
      colorPickerContainer.style.display = "none";
    }
  });
});

// أحداث اختيار الألوان
colorOptions.forEach((option) => {
  option.addEventListener("click", () => {
    colorOptions.forEach((opt) => opt.classList.remove("active"));
    option.classList.add("active");
    selectedColor = option.dataset.color;
    colorPreview.style.backgroundColor = selectedColor;
  });
});

// أحداث النافذة المنبثقة
closeModal.addEventListener("click", () => {
  imageModal.style.display = "none";
});

modalDownload.addEventListener("click", () => {
  if (currentModalImage) {
    const link = document.createElement("a");
    link.download = `صورة_بدون_خلفية_${currentModalImage.id + 1}.png`;
    link.href = currentModalImage.resultDataUrl;
    link.click();
  }
});

// إغلاق النافذة المنبثقة بالنقر خارجها
imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    imageModal.style.display = "none";
  }
});

// معالجة تحميل الصور المتعددة
function handleImageUpload() {
  if (!fileInput.files.length) return;

  const files = Array.from(fileInput.files);

  // التحقق من عدد الملفات
  if (files.length > 50) {
    alert("يمكنك تحميل 50 صورة كحد أقصى في المرة الواحدة");
    return;
  }

  // إعادة تعيين الصور السابقة إذا كانت هذه عملية تحميل جديدة
  if (uploadedImages.length === 0) {
    uploadedImages = [];
    processedImages = [];
    imagesGrid.innerHTML = "";
  }

  let loadedCount = 0;

  files.forEach((file, index) => {
    if (!file.type.match("image.*")) {
      alert("الرجاء تحميل ملفات صورة فقط");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // إضافة الصورة إلى المصفوفة
        const imageObj = {
          id: uploadedImages.length,
          file: file,
          src: e.target.result,
          img: img,
          processed: false,
          resultDataUrl: null,
        };

        uploadedImages.push(imageObj);

        // إضافة الصورة إلى الشبكة
        addImageToGrid(imageObj);

        loadedCount++;

        // تفعيل الأزرار بعد تحميل الصور
        if (loadedCount === files.length) {
          removeBgBtn.disabled = false;
          removeAllBgBtn.disabled = false;
          downloadAllBtn.disabled = false;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// إضافة صورة إلى شبكة العرض
function addImageToGrid(imageObj) {
  const imageItem = document.createElement("div");
  imageItem.className = "image-item";
  imageItem.dataset.id = imageObj.id;

  const img = document.createElement("img");
  img.src = imageObj.src;
  img.alt = `صورة ${imageObj.id + 1}`;

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.innerHTML = icon("x");
  removeBtn.title = "إزالة الصورة";
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    removeImage(imageObj.id);
  };

  imageItem.appendChild(img);
  imageItem.appendChild(removeBtn);

  imageItem.addEventListener("click", () => {
    // إزالة التحديد من جميع الصور
    document.querySelectorAll(".image-item").forEach((item) => {
      item.classList.remove("active");
    });

    // تحديد الصورة المختارة
    imageItem.classList.add("active");
  });

  imagesGrid.appendChild(imageItem);
}

// إزالة صورة من القائمة
function removeImage(id) {
  // إزالة الصورة من المصفوفة
  uploadedImages = uploadedImages.filter((img) => img.id !== id);
  processedImages = processedImages.filter((img) => img.id !== id);

  // إزالة الصورة من الشبكة
  const imageItem = document.querySelector(`.image-item[data-id="${id}"]`);
  if (imageItem) {
    imageItem.remove();
  }

  // إزالة الصورة من المعاينة
  const previewItem = document.querySelector(`.preview-item[data-id="${id}"]`);
  if (previewItem) {
    previewItem.remove();
  }

  // إعادة تعيين معرفات الصور
  uploadedImages.forEach((img, index) => {
    img.id = index;
    const imageItem = document.querySelector(
      `.image-item[data-id="${img.id}"]`
    );
    if (imageItem) {
      imageItem.dataset.id = index;
    }

    const previewItem = document.querySelector(
      `.preview-item[data-id="${img.id}"]`
    );
    if (previewItem) {
      previewItem.dataset.id = index;
    }
  });

  // تحديث حالة الأزرار
  if (uploadedImages.length === 0) {
    removeBgBtn.disabled = true;
    removeAllBgBtn.disabled = true;
    downloadAllBtn.disabled = true;
    downloadSelectedBtn.disabled = true;
  }

  // تحديث المعاينة
  updatePreviewGrid();
}

// إزالة الخلفية من الصورة المحددة
function removeBackground() {
  const selectedItems = document.querySelectorAll(".image-item.active");
  if (selectedItems.length === 0) {
    alert("الرجاء تحديد صورة أولاً");
    return;
  }

  loading.style.display = "block";
  removeBgBtn.disabled = true;

  // استخدام setTimeout لمحاكاة المعالجة غير المتزامنة
  setTimeout(() => {
    selectedItems.forEach((item) => {
      const id = parseInt(item.dataset.id);
      processImage(id);
    });

    // إخفاء مؤشر التحميل
    loading.style.display = "none";
    removeBgBtn.disabled = false;

    // تحديث المعاينة
    updatePreviewGrid();
    closeSidebar();
  }, 1000);
}

// إزالة الخلفية من جميع الصور
function removeAllBackgrounds() {
  if (uploadedImages.length === 0) return;

  loading.style.display = "block";
  removeAllBgBtn.disabled = true;
  removeBgBtn.disabled = true;
  batchProgressBar.style.width = "0%";
  batchStatus.textContent = `جاري معالجة 0 من ${uploadedImages.length} صورة`;

  let processedCount = 0;

  // معالجة كل صورة واحدة تلو الأخرى
  const processNextImage = () => {
    if (processedCount < uploadedImages.length) {
      const index = processedCount;
      batchStatus.textContent = `جاري معالجة ${processedCount + 1} من ${
        uploadedImages.length
      } صورة`;

      processImage(index);

      processedCount++;
      const progress = (processedCount / uploadedImages.length) * 100;
      batchProgressBar.style.width = `${progress}%`;

      // معالجة الصورة التالية بعد تأخير قصير
      setTimeout(processNextImage, 300);
    } else {
      // الانتهاء من المعالجة
      loading.style.display = "none";
      removeAllBgBtn.disabled = false;
      removeBgBtn.disabled = false;
      batchStatus.textContent = `تم معالجة جميع الصور (${uploadedImages.length})`;

      // تحديث المعاينة
      updatePreviewGrid();
      closeSidebar();
    }
  };

  processNextImage();
}

// معالجة صورة محددة
function processImage(index) {
  const imageObj = uploadedImages[index];
  const img = imageObj.img;

  // ضبط أبعاد الكانفاس بناءً على جودة المعالجة
  const quality = parseInt(qualitySlider.value);
  const scaleFactor = quality;

  let width = img.width * scaleFactor;
  let height = img.height * scaleFactor;

  // تحديد أبعاد قصوى للحفاظ على الأداء
  const maxDimension = 2000;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width *= ratio;
    height *= ratio;
  }

  // إنشاء كانفاس مؤقت للمعالجة
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");

  // رسم الصورة على الكانفاس المؤقت
  tempCtx.drawImage(img, 0, 0, width, height);

  // الحصول على بيانات الصورة
  const imageData = tempCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (removalMode === "background") {
    // تطبيق خوارزمية إزالة الخلفية المحسنة
    const sensitivity = sensitivitySlider.value / 100;

    // خوارزمية محسنة لإزالة الخلفية
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // حساب القيم المختلفة للكشف عن الخلفية
      const avg = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // تحسين الكشف عن الخلفية باستخدام معايير متعددة
      const isBackground =
        avg > 220 * sensitivity ||
        (avg > 180 * sensitivity && saturation < 0.2) ||
        (r > 200 * sensitivity &&
          g > 200 * sensitivity &&
          b > 200 * sensitivity);

      if (isBackground) {
        data[i + 3] = 0; // جعل البكسل شفافاً
      }
    }
  } else if (removalMode === "color" && selectedColor) {
    // إزالة اللون المحدد
    const targetRgb = hexToRgb(selectedColor);
    if (targetRgb) {
      const tolerance = (colorTolerance / 100) * 255;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // حساب الفرق بين لون البكسل واللون المحدد
        const diff = Math.sqrt(
          Math.pow(r - targetRgb.r, 2) +
            Math.pow(g - targetRgb.g, 2) +
            Math.pow(b - targetRgb.b, 2)
        );

        // إذا كان الفرق ضمن نطاق التسامح، نجعل البكسل شفافاً
        if (diff <= tolerance) {
          data[i + 3] = 0;
        }
      }
    }
  }

  // وضع البيانات المعالجة على الكانفاس المؤقت
  tempCtx.putImageData(imageData, 0, 0);

  // حفظ النتيجة
  imageObj.resultDataUrl = tempCanvas.toDataURL();
  imageObj.processed = true;

  // إضافة إلى الصور المعالجة إذا لم تكن موجودة
  if (!processedImages.some((pImg) => pImg.id === imageObj.id)) {
    processedImages.push(imageObj);
  }
}

// تحويل اللون من HEX إلى RGB
function hexToRgb(hex) {
  // إذا كان اللون بصيغة rgb
  if (hex.startsWith("rgb")) {
    const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      };
    }
  }

  // إذا كان اللون بصيغة hex
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// تحديث شبكة المعاينة
function updatePreviewGrid() {
  // إخفاء النص التوضيحي إذا كانت هناك صور معالجة
  if (processedImages.length > 0) {
    previewPlaceholder.style.display = "none";
    downloadSelectedBtn.disabled = false;
  } else {
    previewPlaceholder.style.display = "block";
    downloadSelectedBtn.disabled = true;
  }

  // مسح الشبكة الحالية
  previewGrid.innerHTML = "";
  if (processedImages.length === 0) {
    previewGrid.appendChild(previewPlaceholder);
    return;
  }

  // إضافة الصور المعالجة إلى الشبكة
  processedImages.forEach((imageObj) => {
    const previewItem = document.createElement("div");
    previewItem.className = "preview-item";
    previewItem.dataset.id = imageObj.id;

    const img = document.createElement("img");
    img.src = imageObj.resultDataUrl;
    img.alt = `صورة ${imageObj.id + 1} بدون خلفية`;

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "download-btn";
    downloadBtn.innerHTML = icon("download");
    downloadBtn.title = "تحميل الصورة";
    downloadBtn.onclick = (e) => {
      e.stopPropagation();
      downloadSingleImage(imageObj);
    };

    previewItem.appendChild(img);
    previewItem.appendChild(downloadBtn);

    previewItem.addEventListener("click", () => {
      openImageModal(imageObj);
    });

    previewGrid.appendChild(previewItem);
  });
}

// فتح الصورة في نافذة منبثقة
function openImageModal(imageObj) {
  currentModalImage = imageObj;
  modalImage.src = imageObj.resultDataUrl;
  modalImage.alt = `صورة ${imageObj.id + 1} بدون خلفية`;
  imageModal.style.display = "flex";
}

// تحميل صورة واحدة
function downloadSingleImage(imageObj) {
  const link = document.createElement("a");
  link.download = `صورة_بدون_خلفية_${imageObj.id + 1}.png`;
  link.href = imageObj.resultDataUrl;
  link.click();
}

// تحميل جميع الصور المعالجة
function downloadAllResults() {
  if (processedImages.length === 0) return;

  processedImages.forEach((image, index) => {
    const link = document.createElement("a");
    link.download = `صورة_بدون_خلفية_${index + 1}.png`;
    link.href = image.resultDataUrl;
    link.click();
  });
}

// تحميل الصور المحددة فقط
function downloadSelectedResults() {
  if (processedImages.length === 0) return;

  processedImages.forEach((image, index) => {
    const link = document.createElement("a");
    link.download = `صورة_بدون_خلفية_${index + 1}.png`;
    link.href = image.resultDataUrl;
    link.click();
  });
}

// إعادة تعيين التطبيق
function resetApp() {
  fileInput.value = "";
  removeBgBtn.disabled = true;
  downloadAllBtn.disabled = true;
  downloadSelectedBtn.disabled = true;
  removeAllBgBtn.disabled = true;
  sensitivitySlider.value = 100;
  sensitivityValue.textContent = "100%";
  qualitySlider.value = 3;
  qualityValue.textContent = "عالية (300%)";
  toleranceSlider.value = 20;
  toleranceValue.textContent = "20%";
  uploadedImages = [];
  processedImages = [];
  imagesGrid.innerHTML = "";
  previewGrid.innerHTML = "";
  previewGrid.appendChild(previewPlaceholder);
  previewPlaceholder.style.display = "block";
  batchProgressBar.style.width = "0%";
  batchStatus.textContent = "";
  loading.style.display = "none";
  removalMode = "background";
  selectedColor = null;
  colorPreview.style.backgroundColor = "";
  modeButtons[0].classList.add("active");
  modeButtons[1].classList.remove("active");
  colorPickerContainer.style.display = "none";
  colorOptions.forEach((opt) => opt.classList.remove("active"));
  imageModal.style.display = "none";
}
