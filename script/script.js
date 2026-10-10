// ============================================================
// إعدادات وضع الذكاء الاصطناعي (يعمل بالكامل داخل المتصفح)
// ============================================================
// مكتبة Transformers.js تُحمَّل عند أول استخدام فقط (استيراد ديناميكي)
const TRANSFORMERS_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";
// النموذج: RMBG-1.4 من BRIA (ترخيصه لغير التجاري، راجع صفحة النموذج قبل الاستخدام التجاري)
const AI_MODEL_ID = "briaai/RMBG-1.4";
const AI_INPUT_SIZE = 1024; // الحجم الذي يعمل عليه النموذج
// كشف الهواتف والأجهزة اللوحية (ذاكرتها أقل: نستخدم نموذجاً أخف وصوراً أصغر)
const IS_MOBILE =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const AI_MAX_DIMENSION = IS_MOBILE ? 2048 : 3000; // أكبر بُعد للصورة الناتجة في وضع الذكاء الاصطناعي
const CLASSIC_MAX_DIMENSION = 2000; // الحد الأقصى في الوضعين القديمين
const DEFAULT_MODE = "ai";

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
const aiThresholdSlider = document.getElementById("aiThresholdSlider");
const aiThresholdValue = document.getElementById("aiThresholdValue");
const aiSoftnessSlider = document.getElementById("aiSoftnessSlider");
const aiSoftnessValue = document.getElementById("aiSoftnessValue");
const aiOptions = document.getElementById("aiOptions");
const classicSettings = document.getElementById("classicSettings");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
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

// متغيرات التطبيق
let uploadedImages = [];
let processedImages = [];
let removalMode = DEFAULT_MODE; // 'ai' أو 'background' أو 'color'
let selectedColor = null;
let colorTolerance = 20;
let currentModalImage = null;
let isBusy = false;

// ------------------------------------------------------------
// واجهة الأوضاع
// ------------------------------------------------------------
function applyModeUI() {
  colorPickerContainer.style.display = removalMode === "color" ? "block" : "none";
  aiOptions.style.display = removalMode === "ai" ? "block" : "none";
  classicSettings.style.display = removalMode === "ai" ? "none" : "block";
}
applyModeUI();

function setLoadingText(text) {
  loadingText.textContent = text;
}
const DEFAULT_LOADING_TEXT = "جاري معالجة الصورة...";

function setBusy(busy) {
  isBusy = busy;
  loading.style.display = busy ? "block" : "none";
  if (busy) setLoadingText(DEFAULT_LOADING_TEXT);
  const hasImages = uploadedImages.length > 0;
  removeBgBtn.disabled = busy || !hasImages;
  removeAllBgBtn.disabled = busy || !hasImages;
}

// السماح للمتصفح برسم الواجهة (مؤشر التحميل وشريط التقدم) بين الصور
const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 20));

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

// شرائح وضع الذكاء الاصطناعي
aiThresholdSlider.addEventListener("input", () => {
  aiThresholdValue.textContent = `${aiThresholdSlider.value}%`;
});
aiSoftnessSlider.addEventListener("input", () => {
  aiSoftnessValue.textContent = `${aiSoftnessSlider.value}%`;
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
    applyModeUI();
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

  files.forEach((file) => {
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
          aiMask: null, // قناع النموذج المخزَّن مؤقتاً لإعادة الضبط دون إعادة التشغيل
        };

        uploadedImages.push(imageObj);

        // إضافة الصورة إلى الشبكة
        addImageToGrid(imageObj);

        loadedCount++;

        // تفعيل الأزرار بعد تحميل الصور
        if (loadedCount === files.length) {
          removeBgBtn.disabled = isBusy;
          removeAllBgBtn.disabled = isBusy;
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
  const removed = uploadedImages.find((img) => img.id === id);
  if (removed) revokeResult(removed);

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

// ============================================================
// محرك الذكاء الاصطناعي (RMBG عبر Transformers.js)
// ============================================================
let aiEngine = null; // { model, processor, RawImage, device }
let aiEnginePromise = null;
let aiForceWasm = false; // يُفعَّل تلقائياً إذا فشل WebGPU
let aiStage = ""; // المرحلة الحالية (لتشخيص الأخطاء)

function loadAIEngine() {
  if (aiEngine) return Promise.resolve(aiEngine);
  if (aiEnginePromise) return aiEnginePromise;

  aiEnginePromise = (async () => {
    setLoadingText("جاري تحميل مكتبة الذكاء الاصطناعي...");
    aiStage = "تحميل المكتبة";
    const tf = await import(TRANSFORMERS_URL);
    const { AutoModel, AutoProcessor, RawImage, env } = tf;
    env.allowLocalModels = false;

    // حفظ النموذج في تخزين المتصفح (Cache API) وطلب عدم حذفه تلقائياً.
    // الحفظ لا يعمل إلا في سياق آمن: https أو localhost (وليس file:// ولا http://IP).
    env.useBrowserCache = true;
    env.useWasmCache = true; // يُتجاهل إن لم تدعمه النسخة
    if (window.isSecureContext && "caches" in window) {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
    } else {
      console.warn(
        "التخزين المؤقت غير متاح: افتح الصفحة عبر https أو localhost حتى يُحفظ النموذج."
      );
      batchStatus.textContent =
        "تنبيه: النموذج لن يُحفظ لأن الصفحة ليست على https أو localhost";
    }

    // حساب نسبة التحميل الإجمالية عبر ملفات النموذج
    const files = {};
    const progress_callback = (p) => {
      if (p.status === "progress" && p.total) {
        files[p.file] = { loaded: p.loaded, total: p.total };
        let loaded = 0;
        let total = 0;
        Object.values(files).forEach((f) => {
          loaded += f.loaded;
          total += f.total;
        });
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        setLoadingText(`جاري تحميل نموذج الذكاء الاصطناعي... ${pct}%`);
      } else if (p.status === "ready") {
        setLoadingText("جاري تهيئة النموذج...");
      }
    };

    // إعدادات المعالجة المسبقة الخاصة بنموذج RMBG-1.4
    aiStage = "تحميل إعدادات النموذج";
    const processor = await AutoProcessor.from_pretrained(AI_MODEL_ID, {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: AI_INPUT_SIZE, height: AI_INPUT_SIZE },
      },
    });

    // قائمة المحاولات بالترتيب:
    // - الحاسوب: WebGPU (الأسرع) ثم WASM في worker ثم WASM عادي
    // - الهاتف: WASM عادي فقط (WebGPU والـ worker غير مستقرين على كثير من الهواتف)
    const attempts = [];
    if (!IS_MOBILE && navigator.gpu && !aiForceWasm) {
      attempts.push({ device: "webgpu", dtype: "fp32", proxy: false });
    }
    if (!IS_MOBILE) attempts.push({ device: "wasm", dtype: "q8", proxy: true });
    attempts.push({ device: "wasm", dtype: "q8", proxy: false });

    let model = null;
    let device = null;
    let lastError = null;

    aiStage = "تحميل النموذج";
    for (const a of attempts) {
      try {
        if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
          env.backends.onnx.wasm.proxy = a.proxy;
          // خيط واحد على الهاتف لتوفير الذاكرة
          if (IS_MOBILE) env.backends.onnx.wasm.numThreads = 1;
        }
        model = await AutoModel.from_pretrained(AI_MODEL_ID, {
          config: { model_type: "custom" },
          device: a.device,
          dtype: a.dtype,
          progress_callback,
        });
        device = a.device + (a.proxy ? " (worker)" : "");
        break;
      } catch (err) {
        console.warn(`تعذّر تشغيل النموذج (${a.device}, proxy=${a.proxy})`, err);
        lastError = err;
      }
    }
    if (!model) throw lastError || new Error("تعذّر تحميل النموذج");

    aiEngine = { model, processor, RawImage, device };
    console.info(`نموذج الذكاء الاصطناعي جاهز (${device})`);
    return aiEngine;
  })().catch((err) => {
    aiEnginePromise = null; // السماح بإعادة المحاولة
    throw err;
  });

  return aiEnginePromise;
}

// تشغيل النموذج على صورة والحصول على القناع (0..255) بحجم مخرجات النموذج
async function runAIModel(engine, img) {
  const { model, processor, RawImage } = engine;
  aiStage = "تشغيل النموذج";

  // تصغير الصورة إلى حجم إدخال النموذج (الخلفية البيضاء تعالج الصور الشفافة)
  const c = document.createElement("canvas");
  c.width = c.height = AI_INPUT_SIZE;
  const cctx = c.getContext("2d", { willReadFrequently: true });
  cctx.fillStyle = "#ffffff";
  cctx.fillRect(0, 0, AI_INPUT_SIZE, AI_INPUT_SIZE);
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(img, 0, 0, AI_INPUT_SIZE, AI_INPUT_SIZE);
  const px = cctx.getImageData(0, 0, AI_INPUT_SIZE, AI_INPUT_SIZE);
  const raw = new RawImage(px.data, AI_INPUT_SIZE, AI_INPUT_SIZE, 4);

  const { pixel_values } = await processor(raw);
  const outputs = await model({ input: pixel_values });
  const out = outputs.output || Object.values(outputs)[0];

  const dims = out.dims;
  const h = dims[dims.length - 2];
  const w = dims[dims.length - 1];
  const values = out.getData ? await out.getData() : out.data;

  // نخزن القناع بدقة 8 بت لتوفير الذاكرة (1 ميجا لكل صورة)
  const data = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) {
    const v = values[i];
    data[i] = Math.round((v < 0 ? 0 : v > 1 ? 1 : v) * 255);
  }

  try {
    if (pixel_values.dispose) pixel_values.dispose();
    if (out.dispose) out.dispose();
  } catch (e) {
    /* تجاهل */
  }

  return { data, w, h };
}

// الحصول على القناع (من الذاكرة المؤقتة إن وُجد)
async function getAIMask(imageObj) {
  if (imageObj.aiMask) return imageObj.aiMask;

  let engine = await loadAIEngine();
  try {
    imageObj.aiMask = await runAIModel(engine, imageObj.img);
  } catch (err) {
    if (!String(engine.device).startsWith("webgpu")) throw err;
    // فشل WebGPU أثناء التشغيل: نعيد المحاولة على WASM
    console.warn("فشل WebGPU أثناء المعالجة، الرجوع إلى WASM", err);
    aiForceWasm = true;
    aiEngine = null;
    aiEnginePromise = null;
    engine = await loadAIEngine();
    imageObj.aiMask = await runAIModel(engine, imageObj.img);
  }
  return imageObj.aiMask;
}

// تطبيق القناع على الصورة الأصلية كقناة شفافية (Alpha)
function renderWithMask(img, mask) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min(1, AI_MAX_DIMENSION / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  // الصورة الأصلية بدقتها
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;

  // القناع: نرسمه على كانفاس صغير ثم نكبّره بنعومة لحجم الصورة
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = mask.w;
  maskCanvas.height = mask.h;
  const maskCtx = maskCanvas.getContext("2d");
  const maskImage = maskCtx.createImageData(mask.w, mask.h);
  for (let i = 0, j = 0; i < mask.data.length; i++, j += 4) {
    const v = mask.data[i];
    maskImage.data[j] = v;
    maskImage.data[j + 1] = v;
    maskImage.data[j + 2] = v;
    maskImage.data[j + 3] = 255;
  }
  maskCtx.putImageData(maskImage, 0, 0);

  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = w;
  scaledCanvas.height = h;
  const scaledCtx = scaledCanvas.getContext("2d", { willReadFrequently: true });
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = "high";
  scaledCtx.drawImage(maskCanvas, 0, 0, w, h);
  const maskPixels = scaledCtx.getImageData(0, 0, w, h).data;

  // جدول تحويل: قيمة القناع -> الشفافية، حسب "صرامة الإزالة" و"نعومة الحواف"
  const threshold = aiThresholdSlider.value / 100;
  const softness = aiSoftnessSlider.value / 100;
  const spread = 0.01 + 0.29 * softness;
  const lo = threshold - spread;
  const hi = threshold + spread;
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    let a = (v / 255 - lo) / (hi - lo);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    a = a * a * (3 - 2 * a); // smoothstep لحواف ناعمة
    lut[v] = Math.round(a * 255);
  }

  for (let i = 0; i < px.length; i += 4) {
    px[i + 3] = Math.round((px[i + 3] * lut[maskPixels[i]]) / 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ------------------------------------------------------------
// أدوات النتائج
// ------------------------------------------------------------
function canvasToUrl(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error("تعذّر إنشاء الصورة الناتجة"));
    }, "image/png");
  });
}

function revokeResult(imageObj) {
  if (imageObj.resultDataUrl && imageObj.resultDataUrl.startsWith("blob:")) {
    URL.revokeObjectURL(imageObj.resultDataUrl);
  }
}

async function storeResult(imageObj, canvas) {
  const url = await canvasToUrl(canvas);
  revokeResult(imageObj);
  imageObj.resultDataUrl = url;
  imageObj.processed = true;

  // إضافة إلى الصور المعالجة إذا لم تكن موجودة
  if (!processedImages.some((pImg) => pImg.id === imageObj.id)) {
    processedImages.push(imageObj);
  }
}

function showProcessingError(err) {
  console.error(err);
  if (removalMode === "ai") {
    const detail = (err && (err.message || String(err))) || "";
    alert(
      "تعذّر تشغيل نموذج الذكاء الاصطناعي.\n" +
        "تأكد من اتصالك بالإنترنت (مطلوب في أول استخدام فقط) ثم حاول مرة أخرى.\n\n" +
        `المرحلة: ${aiStage || "غير معروفة"}\n` +
        `التفاصيل: ${detail}`
    );
  } else {
    alert("حدث خطأ أثناء معالجة الصورة.");
  }
}

// ============================================================
// تنفيذ الإزالة
// ============================================================

// إزالة الخلفية من الصورة المحددة
async function removeBackground() {
  if (isBusy) return;

  const selectedItems = document.querySelectorAll(".image-item.active");
  if (selectedItems.length === 0) {
    alert("الرجاء تحديد صورة أولاً");
    return;
  }

  const queue = Array.from(selectedItems)
    .map((item) => uploadedImages[parseInt(item.dataset.id)])
    .filter(Boolean);

  setBusy(true);
  await yieldToUI();

  try {
    for (const imageObj of queue) {
      await processImage(imageObj);
    }
    // تحديث المعاينة
    updatePreviewGrid();
    closeSidebar();
  } catch (err) {
    showProcessingError(err);
  } finally {
    setBusy(false);
  }
}

// إزالة الخلفية من جميع الصور
async function removeAllBackgrounds() {
  if (isBusy || uploadedImages.length === 0) return;

  const queue = [...uploadedImages];
  const total = queue.length;

  setBusy(true);
  batchProgressBar.style.width = "0%";
  batchStatus.textContent = `جاري معالجة 0 من ${total} صورة`;
  await yieldToUI();

  try {
    // نحمّل النموذج مرة واحدة قبل البدء حتى لا يتكرر الخطأ مع كل صورة
    if (removalMode === "ai") {
      await loadAIEngine();
      setLoadingText(DEFAULT_LOADING_TEXT);
    }

    let failed = 0;

    // معالجة كل صورة واحدة تلو الأخرى (النموذج يستهلك ذاكرة كبيرة)
    for (let i = 0; i < total; i++) {
      batchStatus.textContent = `جاري معالجة ${i + 1} من ${total} صورة`;
      await yieldToUI();

      try {
        await processImage(queue[i]);
      } catch (err) {
        console.error(err);
        failed++;
      }

      batchProgressBar.style.width = `${((i + 1) / total) * 100}%`;
    }

    batchStatus.textContent = failed
      ? `تمت معالجة ${total - failed} من ${total} صورة، وفشلت ${failed}`
      : `تم معالجة جميع الصور (${total})`;

    // تحديث المعاينة
    updatePreviewGrid();
    closeSidebar();
  } catch (err) {
    batchStatus.textContent = "تعذّرت المعالجة";
    showProcessingError(err);
  } finally {
    setBusy(false);
  }
}

// معالجة صورة محددة حسب الوضع النشط
async function processImage(imageObj) {
  if (removalMode === "ai") {
    await processImageAI(imageObj);
  } else {
    await processImageClassic(imageObj);
  }
}

// وضع الذكاء الاصطناعي
async function processImageAI(imageObj) {
  const mask = await getAIMask(imageObj);
  setLoadingText(DEFAULT_LOADING_TEXT);
  const canvas = renderWithMask(imageObj.img, mask);
  await storeResult(imageObj, canvas);
}

// الوضعان القديمان (الخلفية الفاتحة / لون محدد)
async function processImageClassic(imageObj) {
  const img = imageObj.img;

  // ضبط أبعاد الكانفاس بناءً على جودة المعالجة
  const quality = parseInt(qualitySlider.value);
  const scaleFactor = quality;

  let width = img.width * scaleFactor;
  let height = img.height * scaleFactor;

  // تحديد أبعاد قصوى للحفاظ على الأداء
  if (width > CLASSIC_MAX_DIMENSION || height > CLASSIC_MAX_DIMENSION) {
    const ratio = Math.min(
      CLASSIC_MAX_DIMENSION / width,
      CLASSIC_MAX_DIMENSION / height
    );
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
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
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
  await storeResult(imageObj, tempCanvas);
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
  if (isBusy) return; // لا نعيد التعيين أثناء المعالجة
  uploadedImages.forEach(revokeResult);

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
  colorTolerance = 20;
  aiThresholdSlider.value = 50;
  aiThresholdValue.textContent = "50%";
  aiSoftnessSlider.value = 35;
  aiSoftnessValue.textContent = "35%";
  uploadedImages = [];
  processedImages = [];
  imagesGrid.innerHTML = "";
  previewGrid.innerHTML = "";
  previewGrid.appendChild(previewPlaceholder);
  previewPlaceholder.style.display = "block";
  batchProgressBar.style.width = "0%";
  batchStatus.textContent = "";
  loading.style.display = "none";
  isBusy = false;
  removalMode = DEFAULT_MODE;
  selectedColor = null;
  colorPreview.style.backgroundColor = "";
  modeButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === DEFAULT_MODE)
  );
  applyModeUI();
  colorOptions.forEach((opt) => opt.classList.remove("active"));
  imageModal.style.display = "none";
}
