const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');

let startX = 0;
let isDragging = false;

// إظهار القائمة
function openSidebar() {
    sidebar.classList.add("show");
    overlay.style.display = "block";
}

// إخفاء القائمة
function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.style.display = "none";
}

openBtn.onclick = openSidebar;
closeBtn.onclick = closeSidebar;
overlay.onclick = closeSidebar;

/* ===========================
   السحب من اليسار لإظهار القائمة
   =========================== */

document.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 480) return;

    startX = e.touches[0].clientX;

    // السماح بالسحب فقط من أول 50px من اليسار
    if (startX < 50 && !sidebar.classList.contains("show")) {
        isDragging = true;
    }
});

/* أثناء السحب */
document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;

    let currentX = e.touches[0].clientX;

    // إذا سحب لمسافة كافية أظهر القائمة
    if (currentX > 120) {
        openSidebar();
        isDragging = false;
    }
});

/* عند إنهاء اللمس */
document.addEventListener("touchend", () => {
    isDragging = false;
});


/* ===========================
   السحب لليسار لإخفاء القائمة
   =========================== */

sidebar.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
});

sidebar.addEventListener("touchmove", (e) => {
    let currentX = e.touches[0].clientX;
    let diff = currentX - startX;

    // سحب لليسار diff يكون سالب
    if (diff < -80) {
        closeSidebar();
    }
});
