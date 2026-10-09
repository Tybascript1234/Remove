// ------------------------------------------------------------------------------------------------





// ------------------------------------------------------------------------------------------------





// // repply

// window.addEventListener("load", function () {
//     setTimeout(() => {
//         // تأكد من أنه لا توجد رسائل JavaScript قبل تنفيذ الموجة
//         if (!window.alertOpen) {
//             initializeWaveButtons();
//         }
//     }, 100); // تأخير بسيط للتأكد من تحميل العناصر

//     function initializeWaveButtons() {
//         const elements = document.querySelectorAll('.wave-button');

//         elements.forEach(element => {
//             let isRippleActive = false;

//             function createRipple(e) {
//                 if (isRippleActive) return;

//                 isRippleActive = true;

//                 const ripple = document.createElement('span');
//                 const rect = element.getBoundingClientRect();
//                 const size = Math.max(rect.width, rect.height);

//                 let x, y;
//                 if (e.clientX && e.clientY) {
//                     x = e.clientX - rect.left - size / 2;
//                     y = e.clientY - rect.top - size / 2;
//                 } else if (e.touches && e.touches[0]) {
//                     x = e.touches[0].clientX - rect.left - size / 2;
//                     y = e.touches[0].clientY - rect.top - size / 2;
//                 }

//                 ripple.style.width = ripple.style.height = `${size}px`;
//                 ripple.style.left = `${x}px`;
//                 ripple.style.top = `${y}px`;
//                 ripple.classList.add('ripple');

//                 element.appendChild(ripple);

//                 setTimeout(() => {
//                     ripple.remove();
//                     isRippleActive = false;
//                 }, 600);
//             }

//             element.addEventListener('mousedown', createRipple);
//             element.addEventListener('touchstart', createRipple);
//         });
//     }
// });


// ---------------------------------------------------------------------------------


document.addEventListener('DOMContentLoaded', function () {
    const toggleBtns = [document.getElementById('btn1')];
    const toggleDivs = [document.getElementById('div1')];
  
    toggleBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', function(event) {
          event.stopPropagation();
          const targetId = btn.getAttribute('data-target');
          const targetDiv = document.getElementById(targetId);
  
          if (targetDiv) {
            toggleDivs.forEach(div => {
              if (div && div !== targetDiv) {
                div.style.display = 'none';
              }
            });
  
            targetDiv.style.display = targetDiv.style.display === 'block' ? 'none' : 'block';
          } else {
            console.error(`الـ div مع الـ id "${targetId}" غير موجود.`);
          }
        });
      }
    });
  
    document.addEventListener('click', function() {
      toggleDivs.forEach(div => {
        if (div) {
          div.style.display = 'none';
        }
      });
    });
  });  

// --------------------------------------------------------------------------------------------------------



document.addEventListener("DOMContentLoaded", function () {
  const codars = document.querySelectorAll(".codar");
  const toggleButtons = document.querySelectorAll(".toggleBtn");

  if (!codars.length || !toggleButtons.length) return;

  function checkScreenSize() {
    const activeElement = document.activeElement;
    // تجاهل تنفيذ checkScreenSize إذا كان التركيز على input أو textarea
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA")
    ) {
      return;
    }

    codars.forEach((codar) => {
      const shouldBeClosed = codar.getAttribute("data-initial") === "closed";
      if (window.innerWidth <= 800 || shouldBeClosed) {
        codar.classList.remove("opened");
        codar.classList.add("closed");
      } else {
        codar.classList.remove("closed");
        codar.classList.add("opened");
      }
    });
  }

  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);

  // بديل: التعامل مع visualViewport لتجاهل تغييرات ارتفاع الشاشة عند ظهور الكيبورد
  if (window.visualViewport) {
    let lastHeight = window.innerHeight;
    window.visualViewport.addEventListener("resize", () => {
      const currentHeight = window.innerHeight;
      if (Math.abs(currentHeight - lastHeight) > 100) {
        lastHeight = currentHeight;
        return; // تجاهل تغيير الحجم الناتج عن الكيبورد
      }
      checkScreenSize();
    });
  }

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const targetId = btn.getAttribute("data-target");
      const codar = document.getElementById(targetId);
      if (!codar) return;

      const isClosed = codar.classList.contains("closed");

      if (isClosed) {
        // إغلاق أي codar مفتوح له data-initial="closed"
        let openCodar = null;
        codars.forEach((other) => {
          if (
            other.getAttribute("data-initial") === "closed" &&
            other !== codar &&
            other.classList.contains("opened")
          ) {
            openCodar = other;
            other.classList.remove("opened");
            other.classList.add("closed");
          }
        });

        setTimeout(() => {
          codar.classList.remove("closed");
          codar.classList.add("opened");
        }, openCodar ? 300 : 0);
      } else {
        codar.classList.remove("opened");
        codar.classList.add("closed");
      }
    });
  });

  function hideCodarsIfClickedOutside(event) {
    if (
      (event.target.tagName === "INPUT" && event.target.type === "text") ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    if (window.innerWidth <= 800) {
      toggleButtons.forEach((btn) => {
        const targetId = btn.getAttribute("data-target");
        const codar = document.getElementById(targetId);
        if (!codar) return;

        if (!codar.contains(event.target) && !btn.contains(event.target)) {
          codar.classList.remove("opened");
          codar.classList.add("closed");
        }
      });
    }
  }

  document.addEventListener("touchstart", hideCodarsIfClickedOutside);
  document.addEventListener("click", hideCodarsIfClickedOutside);
});
 


  


document.addEventListener("DOMContentLoaded", function () {
  const messageInputs = document.querySelectorAll(".message-input");
  const searchModeCheckbox = document.getElementById("searchModeCheckbox");

  // النص الأصلي للـ placeholder
  const originalPlaceholder = "اكتب رسالتك هنا...";
  const searchPlaceholder = "ابحث هنا بإسم العنصر...";

  messageInputs.forEach((messageInput) => {
    // عند إدخال أو فقدان التركيز، لا نغير الـ placeholder أبداً تلقائياً
    // لأن المطلوب تغييره فقط عند تغيير حالة الـ checkbox

    // تحديث placeholder عند تغيير حالة الـ checkbox فقط
    searchModeCheckbox.addEventListener("change", function () {
      if (this.checked) {
        messageInput.setAttribute("data-placeholder", searchPlaceholder);
      } else {
        messageInput.setAttribute("data-placeholder", originalPlaceholder);
      }
    });
  });

  // عند تحميل الصفحة، نضع الـ placeholder حسب حالة الـ checkbox
  messageInputs.forEach((messageInput) => {
    if (searchModeCheckbox.checked) {
      messageInput.setAttribute("data-placeholder", searchPlaceholder);
    } else {
      messageInput.setAttribute("data-placeholder", originalPlaceholder);
    }
  });
});


setInterval(() => {
    const filesSection = document.getElementById("filesSection");
    const x0xDiv = document.querySelector(".x0x");

    if (filesSection && x0xDiv) {
        x0xDiv.style.display = (filesSection.style.display === "none") ? "none" : "block";
    }
}, 0); // التحقق كل نصف ثانية

document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("messageInput");
  const filesSection = document.getElementById("filesSection");

  if (messageInput && filesSection) {
    messageInput.addEventListener("input", () => {
      messageInput.style.height = "auto";

      const textHeight = messageInput.scrollHeight;
      const isEmpty = messageInput.textContent.trim() === "";
      const newHeight = isEmpty
        ? 21.5
        : Math.min(Math.max(21.5, textHeight), 168);

      messageInput.style.height = newHeight + "px";

      let marginBottom;
      if (isEmpty) {
        marginBottom = 66;
      } else {
        const heightDifference = newHeight - 21.5;
        marginBottom = 66 + heightDifference * (146 / 147);
        marginBottom = Math.min(213, marginBottom);
      }

      filesSection.style.marginBottom = marginBottom + "px";
    });
  } else {
    console.error("الـ div أو textarea غير موجودين.");
  }
});


document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".Wave-cloud").forEach((btn) => {
    let ripple = null;

    const create = (e) => {
      if (ripple) return;

      const r = btn.getBoundingClientRect();
      const s = Math.max(r.width, r.height) * 0.5;

      // دعم إحداثيات اللمس
      let clientX = e.clientX,
        clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      // تعديل هنا لجعل الموجة تبدأ من 80% من الارتفاع
      const startFromTopPercentage = 0.8; // 80%
      ripple = Object.assign(document.createElement("span"), {
        className: "ripple",
        style: `width:${s}px;height:${s}px;left:${
          clientX - r.left - s / 2
        }px;top:${(clientY - r.top - s / 2) * startFromTopPercentage}px`,
      });

      btn.appendChild(ripple);
      requestAnimationFrame(() => ripple.classList.add("expand"));
    };

    const release = () => {
      if (!ripple) return;
      const current = ripple;
      ripple = null;
      setTimeout(() => {
        current.classList.add("fade-out");
        current.addEventListener(
          "transitionend",
          () => {
            if (current.parentNode) current.remove();
          },
          { once: true }
        );
      }, 400);
    };

    ["mousedown", "touchstart"].forEach((e) => btn.addEventListener(e, create));
    ["mouseup", "touchend", "mouseleave", "touchcancel"].forEach((e) =>
      btn.addEventListener(e, release)
    );
  });
});



document.addEventListener("DOMContentLoaded", function () {
  const openBtn = document.getElementById("openSearchBtn");
  const popup = document.getElementById("popup");
  const overlay = document.getElementById("customOverlay");
  const imageInput = document.getElementById("imageInput");
  const uploadedImage = document.getElementById("uploadedImage");
  const toggleRadio = document.getElementById("toggleSearchRadio");

  const isVisible = localStorage.getItem("searchBtnVisible") === "true";
  openBtn.style.display = isVisible ? "flex" : "none";
  toggleRadio.checked = isVisible;

  toggleRadio.addEventListener("change", () => {
    const visible = toggleRadio.checked;
    openBtn.style.display = visible ? "flex" : "none";
    localStorage.setItem("searchBtnVisible", visible);
  });

  openBtn.onclick = () => {
    popup.style.display = "block";
    overlay.style.display = "block";
  };

  overlay.onclick = () => {
    window.closePopup();
  };

  window.closePopup = function () {
    popup.style.display = "none";
    overlay.classList.add("hidden");
    setTimeout(() => {
      overlay.style.display = "none";
      overlay.classList.remove("hidden");
    }, 500);
    uploadedImage.src = "";
    imageInput.value = "";
  };

  imageInput.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      uploadedImage.src = e.target.result;
      compareWithImages(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  function getImageData(src, size = 32, callback) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      callback(data);
    };
    img.onerror = () => callback(null);
  }

  function isSameImageData(data1, data2) {
    if (!data1 || !data2 || data1.length !== data2.length) return false;
    for (let i = 0; i < data1.length; i++) {
      if (Math.abs(data1[i] - data2[i]) > 5) return false; // تسامح بسيط
    }
    return true;
  }

  function compareWithImages(uploadedSrc) {
    getImageData(uploadedSrc, 32, (uploadedData) => {
      if (!uploadedData) {
        alert("فشل تحميل الصورة المرفوعة.");
        return;
      }

      const images = document.querySelectorAll(".imagesContainer .site-image");
      let found = false;
      let pending = images.length;

      if (pending === 0) {
        alert("لا توجد صور للمقارنة.");
        return;
      }

      images.forEach((img) => {
        getImageData(img.src, 32, (siteData) => {
          pending--;

          if (!found && isSameImageData(uploadedData, siteData)) {
            found = true;
            img.scrollIntoView({ behavior: "smooth", block: "center" });
            img.classList.add("highlighted");
            setTimeout(() => img.classList.remove("highlighted"), 1500);
            window.closePopup();
          }

          if (pending === 0 && !found) {
            alert("لم يتم العثور على صورة مشابهة.");
          }
        });
      });
    });
  }
});




document.addEventListener("DOMContentLoaded", function () {
  const radios = document.querySelectorAll('input[name="theme"]');

  function applyTheme(theme) {
    // إزالة الوضع الليلي فقط
    document.body.classList.remove('dark-theme');

    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.body.classList.add('dark-theme');
      }
    }
    // إذا "light" فلا نضيف أي class (الوضع الافتراضي)
  }

  // عند تحميل الصفحة، نطبق "auto"
  applyTheme('auto');

  // عند تغيير الاختيار
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      applyTheme(radio.value);
    });
  });

  // نراقب تغيّر إعدادات النظام في حالة "auto"
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const selected = document.querySelector('input[name="theme"]:checked');
    if (selected && selected.value === 'auto') {
      applyTheme('auto');
    }
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const myDiv34 = document.querySelector(".myDiv34");
  const className = "highlightedewe";
  const radios = document.querySelectorAll('input[name="toggleClass"]');

  const updateDivClass = (action) => {
    myDiv34.classList.toggle(className, action === "add");
    localStorage.setItem("divClassState", action);
  };

  radios.forEach((radio) => {
    radio.addEventListener("click", () => updateDivClass(radio.value));
  });

  window.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("divClassState");
    if (saved) {
      updateDivClass(saved);
      document.querySelector(`input[value="${saved}"]`).checked = true;
    }
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const eyeClosedSVG = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" style="opacity: .5;cursor: pointer;" viewBox="0 0 512 512"><circle cx="256" cy="256" r="64"/><path d="M490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96c-42.52 0-84.33 12.15-124.27 36.11-40.73 24.43-77.63 60.12-109.68 106.07a31.92 31.92 0 00-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416c46.71 0 93.81-14.43 136.2-41.72 38.46-24.77 72.72-59.66 99.08-100.92a32.2 32.2 0 00-.1-34.76zM256 352a96 96 0 1196-96 96.11 96.11 0 01-96 96z"/></svg>`
  );
  const eyeSlashSVG = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" style="opacity: .5;cursor: pointer;" viewBox="0 0 512 512"><path d="M432 448a15.92 15.92 0 01-11.31-4.69l-352-352a16 16 0 0122.62-22.62l352 352A16 16 0 01432 448zM248 315.85l-51.79-51.79a2 2 0 00-3.39 1.69 64.11 64.11 0 0053.49 53.49 2 2 0 001.69-3.39zM264 196.15L315.87 248a2 2 0 003.4-1.69 64.13 64.13 0 00-53.55-53.55 2 2 0 00-1.72 3.39z"/><path d="M491 273.36a32.2 32.2 0 00-.1-34.76c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.68 96a226.54 226.54 0 00-71.82 11.79 4 4 0 00-1.56 6.63l47.24 47.24a4 4 0 003.82 1.05 96 96 0 01116 116 4 4 0 001.05 3.81l67.95 68a4 4 0 005.4.24 343.81 343.81 0 0067.24-77.4zM256 352a96 96 0 01-93.3-118.63 4 4 0 00-1.05-3.81l-66.84-66.87a4 4 0 00-5.41-.23c-24.39 20.81-47 46.13-67.67 75.72a31.92 31.92 0 00-.64 35.54c26.41 41.33 60.39 76.14 98.28 100.65C162.06 402 207.92 416 255.68 416a238.22 238.22 0 0072.64-11.55 4 4 0 001.61-6.64l-47.47-47.46a4 4 0 00-3.81-1.05A96 96 0 01256 352z"/></svg>`
  );

  document.querySelectorAll(".passwordInput").forEach((input) => {
    input.dataset.visible = "false"; // البداية تكون مخفية

    input.addEventListener("click", function (e) {
      const rect = input.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      if (clickX > rect.width - 40) {
        const visible = input.dataset.visible === "true";
        input.type = visible ? "password" : "text";
        input.dataset.visible = visible ? "false" : "true";

        input.style.backgroundImage = visible
          ? `url("data:image/svg+xml;utf8,${eyeClosedSVG}")`
          : `url("data:image/svg+xml;utf8,${eyeSlashSVG}")`;
      }
    });

    // تأكد من تعيين صورة العين المغلقة في البداية
    input.style.backgroundImage = `url("data:image/svg+xml;utf8,${eyeClosedSVG}")`;
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const checkbox = document.getElementById("fontSizeToggle");
  const body = document.body;
  const originalSize = getComputedStyle(body).fontSize;
  if (localStorage.getItem("fontSize") === "16px") {
    body.style.fontSize = "16px";
    checkbox.checked = true;
  }
  checkbox.onchange = () => {
    if (checkbox.checked) {
      body.style.fontSize = "16px";
      localStorage.setItem("fontSize", "16px");
    } else {
      body.style.fontSize = originalSize;
      localStorage.removeItem("fontSize");
    }
  };
});


function subscribe() {
  alert("هاذه الميزة مدفوعة قم بتفعيلها من المتجر.");
}


document.addEventListener("DOMContentLoaded", function () {
  const textInputs = document.querySelectorAll('input[type="text"], textarea');

  // دالة لتحديد إذا كان النص عربي
  const isArabicText = (text) =>
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
      text
    );

  // دالة لتطبيق الاتجاه بناءً على النص
  const applyTextDirection = (element) => {
    const text = element.value || element.placeholder;
    const isArabic = isArabicText(text);

    element.style.direction = isArabic ? "rtl" : "ltr";
    element.style.textAlign = isArabic ? "right" : "left";
  };

  textInputs.forEach((input) => {
    // تطبيق الاتجاه عند التحميل (للـ placeholder)
    applyTextDirection(input);

    // تغيير الاتجاه عند إدخال نص
    input.addEventListener("input", function () {
      applyTextDirection(this);
    });

    // تغيير الاتجاه عند تغيير الـ placeholder (إذا كان ذلك متاحًا)
    if ("placeholder" in input) {
      input.addEventListener("change", function () {
        applyTextDirection(this);
      });
    }
  });
});


  function showDiv(id) {
    const divs = document.querySelectorAll(".content");
    divs.forEach((div) => {
      div.style.display = "none";
    });
    document.getElementById(id).style.display = "block";
  }

  function closeDiv(id) {
    document.getElementById(id).style.display = "none";
  }


  

// -------------------------------------------------------------------------------------


document.addEventListener("DOMContentLoaded", function () {
  function showOfflineAlert() {
  const alertDiv = document.getElementById("offline-alert");
  if (alertDiv) {
      alertDiv.style.display = "flex";

      setTimeout(() => {
      alertDiv.style.display = "none";
      }, 5000);
  }
  }

  function openNetworkSettings() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // لمستخدمي الجوال
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // iOS
      alert("الرجاء فتح الإعدادات ثم الانتقال إلى Wi-Fi لإعادة الاتصال");
      } else if (/Android/i.test(navigator.userAgent)) {
      // أندرويد
      try {
        // محاولة فتح إعدادات الشبكة على أندرويد
          window.open("intent://settings/network/wifi#Intent;scheme=android-settings;end;");
      } catch (e) {
          alert("الرجاء فتح الإعدادات ثم الانتقال إلى اتصال الشبكة لإعادة الاتصال");
      }
      }
  } else {
    // لمستخدمي الكمبيوتر
      try {
      // Windows 10/11
      if (navigator.platform.includes('Win')) {
          window.open("ms-settings:network");
      } 
      // MacOS
      else if (navigator.platform.includes('Mac')) {
          window.open("x-apple.systempreferences:com.apple.preference.network");
      }
      // أنظمة أخرى
      else {
      alert("الرجاء فتح إعدادات الشبكة يدوياً من جهازك");
      }
  } catch (e) {
      alert("تعذر فتح إعدادات الشبكة، الرجاء فتحها يدوياً");
  }
  }
}

  const btn = document.getElementById("network-settings-btn");
  if (btn) {
  btn.addEventListener("click", openNetworkSettings);
  }

  window.addEventListener("offline", showOfflineAlert);

// التحقق من حالة الاتصال عند التحميل
  if (!navigator.onLine) {
  showOfflineAlert();
  }
});




document.addEventListener("DOMContentLoaded", function () {
  function updateOfflineMessage() {
    const msg = document.getElementById("offlineMessage");
    msg.style.display = navigator.onLine ? "none" : "block";
  }

  // تحميل العناصر عندما يتوفر الإنترنت
  function loadDeferredResources() {
    if (!navigator.onLine) return;

    // تحميل الصور
    document.querySelectorAll("img[data-src]").forEach((img) => {
      img.src = img.getAttribute("data-src");
      img.removeAttribute("data-src");
    });

    // تحميل الفيديوهات
    document.querySelectorAll("video[data-src]").forEach((video) => {
      const src = document.createElement("source");
      src.src = video.getAttribute("data-src");
      video.appendChild(src);
      video.load();
      video.removeAttribute("data-src");
    });

    // تحميل السكربتات
    document.querySelectorAll("div[data-src]").forEach((div) => {
      const script = document.createElement("script");
      script.src = div.getAttribute("data-src");
      document.body.appendChild(script);
      div.removeAttribute("data-src");
    });
  }

  // مراقبة اتصال الإنترنت
  window.addEventListener("online", () => {
    updateOfflineMessage();
    loadDeferredResources();
  });
  window.addEventListener("offline", updateOfflineMessage);

  // عند التحميل الأولي
  document.addEventListener("DOMContentLoaded", () => {
    updateOfflineMessage();
    if (navigator.onLine) {
      loadDeferredResources();
    }
  });
});



document.addEventListener("DOMContentLoaded", function () {
  
});



// document.addEventListener("DOMContentLoaded", function () {
//   const btn = document.getElementById("toggleBtn234");
//   const div1 = document.getElementById("div1");
//   const scriptSrc = "https://tybascript1234.github.io/Languag/embed.js";

//   function toggleContent(show) {
//     if (show) {
//       const script = Object.assign(document.createElement("script"), {
//         src: scriptSrc,
//         id: "dynamicScript",
//       });
//       const targetDiv = Object.assign(document.createElement("div"), {
//         id: "target-container",
//       });
//       div1.append(script, targetDiv);
//     } else {
//       ["dynamicScript", "target-container"].forEach((id) =>
//         document.getElementById(id)?.remove()
//       );
//     }
//     btn.innerHTML = show
//       ? '<icon style="background-image: url(Icon/remove.svg);animation: online 0.3s;"></icon>'
//       : '<icon style="background-image: url(Icon/add.svg);animation: online 0.3s;"></icon>';
//     localStorage.setItem("contentShown", show);
//   }

//   btn.onclick = (e) => {
//     e.stopPropagation(); // تأكد أن النقر لا يتسرب
//     const newState = localStorage.getItem("contentShown") !== "true";
//     toggleContent(newState);
//     // الرسائل تظهر فقط عند النقر على الزر
//     if (newState) {
//       alert("تم تفعيل الترجمة ");
//     } else {
//       alert("تم إلغاء الترجمة");
//     }
//   };

//   // منع أي تأثير للنقر داخل div1
//   div1.onclick = (e) => {
//     e.stopPropagation(); // لا تفعل شيئًا عند النقر على div1
//   };

//   window.onload = () =>
//     toggleContent(localStorage.getItem("contentShown") === "true");
  
// });
