// ============================================================
// عناصر القائمة الجانبية + كشف الهاتف (يجب أن يسبق الثوابت)
// ============================================================
const MOBILE_QUERY = window.matchMedia("(max-width: 768px)");
const IS_MOBILE =
  MOBILE_QUERY.matches ||
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)); // iPad

// ============================================================
// إعدادات وضع الذكاء الاصطناعي (يعمل بالكامل داخل المتصفح)
// ============================================================
const TRANSFORMERS_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";
// النموذج: RMBG-1.4 من BRIA (ترخيصه لغير التجاري، راجع صفحة النموذج قبل الاستخدام التجاري)
const AI_MODEL_ID = "briaai/RMBG-1.4";

// حجم إدخال النموذج حسب الجهاز والمحرك (كلما صغر كان أسرع)
const AI_INPUT_SIZES = IS_MOBILE
  ? { webgpu: 512, wasm: 384 }
  : { webgpu: 1024, wasm: 768 };
const AI_MAX_DIMENSION = IS_MOBILE ? 1280 : 3000; // أكبر بُعد للصورة الناتجة
const CLASSIC_MAX_DIMENSION = IS_MOBILE ? 1200 : 2000;
const MAX_FILES = IS_MOBILE ? 10 : 50;
const PREVIEW_MAX = 640; // أكبر بُعد لصورة المعاينة (ترميزها سريع)
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

// السماح للمتصفح برسم الواجهة بين الصور
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
    preloadAIEngine();
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
    saveImage(
      currentModalImage,
      `صورة_بدون_خلفية_${currentModalImage.id + 1}.png`
    );
  }
});

imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    imageModal.style.display = "none";
  }
});

// معالجة تحميل الصور المتعددة
function handleImageUpload() {
  if (!fileInput.files.length) return;

  const files = Array.from(fileInput.files);

  if (files.length > MAX_FILES) {
    alert(`يمكنك تحميل ${MAX_FILES} صور كحد أقصى في المرة الواحدة`);
    return;
  }

  if (uploadedImages.length === 0) {
    uploadedImages = [];
    processedImages = [];
    imagesGrid.innerHTML = "";
  }

  files.forEach((file) => {
    if (!file.type.startsWith("image/")) {
      alert("الرجاء تحميل ملفات صورة فقط");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const imageObj = {
        id: uploadedImages.length,
        file: file,
        src: url,
        img: img,
        processed: false,
        resultDataUrl: null, // رابط المعاينة الصغيرة
        resultCanvas: null, // النتيجة بالدقة الكاملة (يُرمَّز PNG عند الحاجة فقط)
        fullBlobPromise: null,
        fullUrl: null,
        aiMask: null,
      };

      uploadedImages.push(imageObj);
      addImageToGrid(imageObj);

      removeBgBtn.disabled = isBusy;
      removeAllBgBtn.disabled = isBusy;
      downloadAllBtn.disabled = false;

      preloadAIEngine();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
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
    document.querySelectorAll(".image-item").forEach((item) => {
      item.classList.remove("active");
    });
    imageItem.classList.add("active");
  });

  imagesGrid.appendChild(imageItem);
}

// إزالة صورة من القائمة
function removeImage(id) {
  const removed = uploadedImages.find((img) => img.id === id);
  if (removed) {
    revokeResult(removed);
    if (removed.src && removed.src.startsWith("blob:")) {
      URL.revokeObjectURL(removed.src);
    }
  }

  uploadedImages = uploadedImages.filter((img) => img.id !== id);
  processedImages = processedImages.filter((img) => img.id !== id);

  const imageItem = document.querySelector(`.image-item[data-id="${id}"]`);
  if (imageItem) {
    imageItem.remove();
  }

  const previewItem = document.querySelector(`.preview-item[data-id="${id}"]`);
  if (previewItem) {
    previewItem.remove();
  }

  const gridItems = Array.from(imagesGrid.querySelectorAll(".image-item"));
  uploadedImages.forEach((img, index) => {
    img.id = index;
    if (gridItems[index]) gridItems[index].dataset.id = index;
  });

  if (uploadedImages.length === 0) {
    removeBgBtn.disabled = true;
    removeAllBgBtn.disabled = true;
    downloadAllBtn.disabled = true;
    downloadSelectedBtn.disabled = true;
  }

  updatePreviewGrid();
}

// ============================================================
// محرك الذكاء الاصطناعي (RMBG عبر Transformers.js)
// ============================================================
let aiEngine = null; // { model, Tensor, device, size }
let aiEnginePromise = null;
let aiForceWasm = false; // يُفعَّل تلقائياً إذا فشل WebGPU

// تحميل مسبق في وقت الخمول (عند فتح الصفحة أو رفع أول صورة)
function preloadAIEngine() {
  if (removalMode !== "ai" || aiEngine || aiEnginePromise) return;
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType))) return; // لا نستهلك بيانات المستخدم
  const run = () => loadAIEngine().catch(() => {});
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 800);
  }
}
// نبدأ التحميل فور فتح الصفحة ليكون النموذج جاهزاً عند رفع الصور
window.addEventListener("load", preloadAIEngine);

// هل يتوفر WebGPU فعلياً؟
async function hasWebGPU() {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

function loadAIEngine() {
  if (aiEngine) return Promise.resolve(aiEngine);
  if (aiEnginePromise) return aiEnginePromise;

  aiEnginePromise = (async () => {
    setLoadingText("جاري تحميل مكتبة الذكاء الاصطناعي...");
    const tf = await import(TRANSFORMERS_URL);
    const { AutoModel, Tensor, env } = tf;
    env.allowLocalModels = false;

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

    // نجرّب WebGPU أولاً (حتى على الهاتف) ثم WASM كاحتياط
    const devices = !aiForceWasm && (await hasWebGPU()) ? ["webgpu", "wasm"] : ["wasm"];
    let model = null;
    let device = null;
    let size = 0;

    for (const d of devices) {
      try {
        if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
          const wasm = env.backends.onnx.wasm;
          wasm.proxy = d === "wasm";
          wasm.numThreads = self.crossOriginIsolated
            ? Math.min(4, navigator.hardwareConcurrency || 2)
            : 1;
        }
        const m = await AutoModel.from_pretrained(AI_MODEL_ID, {
          config: { model_type: "custom" },
          device: d,
          dtype: d === "webgpu" ? "fp32" : "q8",
          progress_callback,
        });

        // تشغيل تجريبي (إحماء): يُجمِّع الـ shaders مسبقاً ويكشف فشل WebGPU مبكراً
        setLoadingText("جاري تهيئة النموذج...");
        const s = AI_INPUT_SIZES[d];
        const dummy = new Tensor("float32", new Float32Array(3 * s * s), [1, 3, s, s]);
        const warm = await m({ input: dummy });
        const warmOut = warm.output || Object.values(warm)[0];
        if (warmOut && warmOut.getData) await warmOut.getData();
        try {
          if (warmOut && warmOut.dispose) warmOut.dispose();
        } catch (e) {
          /* تجاهل */
        }

        model = m;
        device = d;
        size = s;
        break;
      } catch (err) {
        console.warn(`تعذّر تشغيل النموذج على ${d}`, err);
        if (d === "wasm") throw err;
      }
    }

    aiEngine = { model, Tensor, device, size };
    console.info(`نموذج الذكاء الاصطناعي جاهز (${device} - ${size}px)`);
    return aiEngine;
  })().catch((err) => {
    aiEnginePromise = null; // السماح بإعادة المحاولة
    throw err;
  });

  return aiEnginePromise;
}

// كانفاس واحد يُعاد استخدامه لتجهيز الإدخال (أقل تخصيصاً للذاكرة)
let prepCanvas = null;

// تشغيل النموذج على صورة والحصول على القناع (0..255)
async function runAIModel(engine, img) {
  const { model, Tensor, size: S } = engine;

  // تصغير الصورة إلى حجم إدخال النموذج (الخلفية البيضاء تعالج الصور الشفافة)
  if (!prepCanvas) prepCanvas = document.createElement("canvas");
  if (prepCanvas.width !== S) prepCanvas.width = prepCanvas.height = S;
  const cctx = prepCanvas.getContext("2d", { willReadFrequently: true });
  cctx.fillStyle = "#ffffff";
  cctx.fillRect(0, 0, S, S);
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(img, 0, 0, S, S);
  const px = cctx.getImageData(0, 0, S, S).data;

  // تجهيز مباشر بصيغة CHW: (v/255 - 0.5) / 1  — نفس إعدادات RMBG-1.4
  const plane = S * S;
  const f32 = new Float32Array(3 * plane);
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    f32[i] = px[p] / 255 - 0.5;
    f32[plane + i] = px[p + 1] / 255 - 0.5;
    f32[2 * plane + i] = px[p + 2] / 255 - 0.5;
  }
  const input = new Tensor("float32", f32, [1, 3, S, S]);

  const outputs = await model({ input });
  const out = outputs.output || Object.values(outputs)[0];

  const dims = out.dims;
  const h = dims[dims.length - 2];
  const w = dims[dims.length - 1];
  const values = out.getData ? await out.getData() : out.data;

  // نخزن القناع بدقة 8 بت لتوفير الذاكرة
  const data = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) {
    const v = values[i];
    data[i] = Math.round((v < 0 ? 0 : v > 1 ? 1 : v) * 255);
  }

  try {
    if (input.dispose) input.dispose();
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
    if (engine.device !== "webgpu") throw err;
    console.warn("فشل WebGPU أثناء المعالجة، الرجوع إلى WASM", err);
    aiForceWasm = true;
    aiEngine = null;
    aiEnginePromise = null;
    engine = await loadAIEngine();
    imageObj.aiMask = await runAIModel(engine, imageObj.img);
  }
  return imageObj.aiMask;
}

// تطبيق القناع على الصورة الأصلية كقناة شفافية (Alpha) بدون حلقات على بكسلات الصورة الكبيرة
function renderWithMask(img, mask) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min(1, AI_MAX_DIMENSION / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

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

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = mask.w;
  maskCanvas.height = mask.h;
  const maskCtx = maskCanvas.getContext("2d");
  const maskImage = maskCtx.createImageData(mask.w, mask.h);
  for (let i = 0, j = 3; i < mask.data.length; i++, j += 4) {
    maskImage.data[j] = lut[mask.data[i]];
  }
  maskCtx.putImageData(maskImage, 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(maskCanvas, 0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  maskCanvas.width = maskCanvas.height = 0;
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

// معاينة صغيرة (ترميزها سريع جداً مقارنة بالصورة الكاملة)
async function makePreviewUrl(canvas) {
  const s = Math.min(1, PREVIEW_MAX / Math.max(canvas.width, canvas.height));
  if (s >= 1) return canvasToUrl(canvas);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(canvas.width * s));
  c.height = Math.max(1, Math.round(canvas.height * s));
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  const url = await canvasToUrl(c);
  c.width = c.height = 0;
  return url;
}

// ترميز PNG الكامل عند الحاجة فقط (ويُخزَّن)
function getFullBlob(imageObj) {
  if (!imageObj.fullBlobPromise) {
    const canvas = imageObj.resultCanvas;
    if (!canvas) return Promise.reject(new Error("لا توجد نتيجة"));
    imageObj.fullBlobPromise = new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("تعذّر إنشاء الصورة الناتجة"));
      }, "image/png");
    });
  }
  return imageObj.fullBlobPromise;
}

async function getFullUrl(imageObj) {
  if (!imageObj.fullUrl) {
    const blob = await getFullBlob(imageObj);
    if (!imageObj.fullUrl) imageObj.fullUrl = URL.createObjectURL(blob);
  }
  return imageObj.fullUrl;
}

// ترميز النتائج الكاملة في الخلفية ليكون التنزيل/المشاركة فورياً
async function prewarmBlobs(list) {
  for (const o of list) {
    try {
      if (o.resultCanvas) await getFullBlob(o);
    } catch (e) {
      /* تجاهل */
    }
    await yieldToUI();
  }
}

function revokeResult(imageObj) {
  if (imageObj.resultDataUrl && imageObj.resultDataUrl.startsWith("blob:")) {
    URL.revokeObjectURL(imageObj.resultDataUrl);
  }
  if (imageObj.fullUrl) URL.revokeObjectURL(imageObj.fullUrl);
  if (imageObj.resultCanvas) imageObj.resultCanvas.width = imageObj.resultCanvas.height = 0;
  imageObj.resultDataUrl = null;
  imageObj.fullUrl = null;
  imageObj.resultCanvas = null;
  imageObj.fullBlobPromise = null;
}

async function storeResult(imageObj, canvas) {
  const previewUrl = await makePreviewUrl(canvas);
  revokeResult(imageObj);
  imageObj.resultCanvas = canvas;
  imageObj.resultDataUrl = previewUrl;
  imageObj.processed = true;

  if (!processedImages.some((pImg) => pImg.id === imageObj.id)) {
    processedImages.push(imageObj);
  }
}

function showProcessingError(err) {
  console.error(err);
  if (removalMode === "ai") {
    alert(
      "تعذّر تشغيل نموذج الذكاء الاصطناعي.\n" +
        "تأكد من اتصالك بالإنترنت (مطلوب في أول استخدام فقط) ثم حاول مرة أخرى."
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
    updatePreviewGrid();
    closeSidebar();
    prewarmBlobs(queue);
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
    if (removalMode === "ai") {
      await loadAIEngine();
      setLoadingText(DEFAULT_LOADING_TEXT);
    }

    let failed = 0;

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

    updatePreviewGrid();
    closeSidebar();
    prewarmBlobs(queue);
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

  const quality = parseInt(qualitySlider.value);
  const scaleFactor = quality;

  let width = img.width * scaleFactor;
  let height = img.height * scaleFactor;

  if (width > CLASSIC_MAX_DIMENSION || height > CLASSIC_MAX_DIMENSION) {
    const ratio = Math.min(
      CLASSIC_MAX_DIMENSION / width,
      CLASSIC_MAX_DIMENSION / height
    );
    width *= ratio;
    height *= ratio;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.max(1, Math.round(width));
  tempCanvas.height = Math.max(1, Math.round(height));
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

  tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  if (removalMode === "background") {
    const sensitivity = sensitivitySlider.value / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const avg = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      const isBackground =
        avg > 220 * sensitivity ||
        (avg > 180 * sensitivity && saturation < 0.2) ||
        (r > 200 * sensitivity &&
          g > 200 * sensitivity &&
          b > 200 * sensitivity);

      if (isBackground) {
        data[i + 3] = 0;
      }
    }
  } else if (removalMode === "color" && selectedColor) {
    const targetRgb = hexToRgb(selectedColor);
    if (targetRgb) {
      const tolerance = (colorTolerance / 100) * 255;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          Math.pow(r - targetRgb.r, 2) +
            Math.pow(g - targetRgb.g, 2) +
            Math.pow(b - targetRgb.b, 2)
        );

        if (diff <= tolerance) {
          data[i + 3] = 0;
        }
      }
    }
  }

  tempCtx.putImageData(imageData, 0, 0);

  await storeResult(imageObj, tempCanvas);
}

// تحويل اللون من HEX إلى RGB
function hexToRgb(hex) {
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
  if (processedImages.length > 0) {
    previewPlaceholder.style.display = "none";
    downloadSelectedBtn.disabled = false;
  } else {
    previewPlaceholder.style.display = "block";
    downloadSelectedBtn.disabled = true;
  }

  previewGrid.innerHTML = "";
  if (processedImages.length === 0) {
    previewGrid.appendChild(previewPlaceholder);
    return;
  }

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

// فتح الصورة في نافذة منبثقة (المعاينة فوراً ثم الدقة الكاملة)
async function openImageModal(imageObj) {
  currentModalImage = imageObj;
  modalImage.src = imageObj.resultDataUrl;
  modalImage.alt = `صورة ${imageObj.id + 1} بدون خلفية`;
  imageModal.style.display = "flex";
  try {
    const full = await getFullUrl(imageObj);
    if (currentModalImage === imageObj && imageModal.style.display === "flex") {
      modalImage.src = full;
    }
  } catch (e) {
    /* نبقي المعاينة */
  }
}

// ------------------------------------------------------------
// التنزيل (مع دعم المشاركة/الحفظ في الصور على الهاتف)
// ------------------------------------------------------------
function anchorDownload(url, name) {
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function imageToFile(imageObj, name) {
  const blob = await getFullBlob(imageObj);
  return new File([blob], name, { type: "image/png" });
}

// حفظ صورة واحدة
async function saveImage(imageObj, name) {
  if (IS_MOBILE && navigator.canShare) {
    try {
      const file = await imageToFile(imageObj, name);
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  try {
    anchorDownload(await getFullUrl(imageObj), name);
  } catch (e) {
    console.error(e);
    alert("تعذّر حفظ الصورة");
  }
}

// حفظ عدة صور
async function saveMany(images) {
  if (images.length === 0) return;

  if (IS_MOBILE && navigator.canShare) {
    try {
      const files = await Promise.all(
        images.map((img, i) => imageToFile(img, `صورة_بدون_خلفية_${i + 1}.png`))
      );
      if (navigator.canShare({ files })) {
        await navigator.share({ files });
        return;
      }
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }

  for (let i = 0; i < images.length; i++) {
    try {
      anchorDownload(await getFullUrl(images[i]), `صورة_بدون_خلفية_${i + 1}.png`);
    } catch (e) {
      console.error(e);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

// تحميل صورة واحدة
function downloadSingleImage(imageObj) {
  saveImage(imageObj, `صورة_بدون_خلفية_${imageObj.id + 1}.png`);
}

// تحميل جميع الصور المعالجة
function downloadAllResults() {
  saveMany(processedImages);
}

// تحميل الصور المحددة فقط
function downloadSelectedResults() {
  saveMany(processedImages);
}

// إعادة تعيين التطبيق
function resetApp() {
  if (isBusy) return;
  uploadedImages.forEach((img) => {
    revokeResult(img);
    if (img.src && img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  });

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
  currentModalImage = null;
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
