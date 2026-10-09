let db;
let selectedItem;
let previousSelectedItemDiv = null;
let currentEditItem = null;
let mediaRecorder;
let audioChunks = [];

const MAX_TOTAL_SIZE_MB = 80; // تم تغييرها من 200 إلى 80
const MAX_TOTAL_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const TOTAL_STORAGE_BYTES = 2.4 * 1024 * 1024 * 1024; // 2.4 جيجابايت

// ========== الدوال الجديدة المضافة ==========

function setupVideoControls(overlay, file) {
    const videoContainer = overlay.querySelector('.video-container');
    const video = overlay.querySelector('#jokr-video');
    const controlsContainer = overlay.querySelector('.xvideox');
    const playPauseBtn = overlay.querySelector('.playPauseBtn');
    const forwardBtn = overlay.querySelector('.forwardBtn');
    const rewindBtn = overlay.querySelector('.rewindBtn');
    const fullscreenBtn = overlay.querySelector('.fullscreenBtn');
    const muteBtn = overlay.querySelector('.muteBtn');
    const speedSelect = overlay.querySelector('.speedSelect');
    const progress = overlay.querySelector('.progress');
    const currentTimeDisplay = overlay.querySelector('.currentTime');
    const remainingTimeDisplay = overlay.querySelector('.remainingTime');
    const progressBar = overlay.querySelector('.progress-bar');

    // إعداد التحميل التدريجي للفيديو
    video.preload = "none"; // عدم تحميل الفيديو تلقائياً
    video.load(); // تحميل البيانات الأولية فقط

    // إضافة مستمع للأحداث لتحميل البيانات عند الحاجة
    video.addEventListener('play', function() {
        if (!this.isDataLoaded) {
            this.isDataLoaded = true;
            // يمكنك هنا إضافة أي منطق إضافي تحتاج إليه عند بدء التشغيل
        }
    });

    // إعداد تحميل البيانات التدريجي
    video.addEventListener('progress', function() {
        // يمكنك هنا تحديث شريط التحميل إذا كنت تريد عرض تقدم التحميل
    });

    // إعداد تحميل البيانات عند الاقتراب من نهاية الجزء المحمل
    video.addEventListener('timeupdate', function() {
        const bufferAhead = 10; // ثواني مقدماً لتحميلها
        if (this.buffered.length > 0 && this.currentTime > this.buffered.end(0) - bufferAhead) {
            // يقوم المتصفح تلقائياً بتحميل المزيد من البيانات هنا
        }
    });

    let controlsTimeout;
    let isControlsVisible = false;

    const showControls = () => {
        clearTimeout(controlsTimeout);
        controlsContainer.style.opacity = '1';
        isControlsVisible = true;
        
        controlsTimeout = setTimeout(() => {
            if (!video.paused) {
                controlsContainer.style.opacity = '0';
                isControlsVisible = false;
            }
        }, 1500);
    };

    const hideControls = () => {
        clearTimeout(controlsTimeout);
        if (!video.paused) {
            controlsContainer.style.opacity = '0';
            isControlsVisible = false;
        }
    };

    const togglePlayPause = () => {
        if (video.paused) {
            video.play();
            playPauseBtn.innerHTML = '<icon style="background-image: url(Icon/pause_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
        } else {
            video.pause();
            playPauseBtn.innerHTML = '<icon style="background-image: url(Icon/play_arrow_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
            showControls();
        }
    };

    const toggleMute = () => {
        video.muted = !video.muted;
        muteBtn.innerHTML = video.muted ? 
            '<icon style="background-image: url(Icon/volume_off_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>' : 
            '<icon style="background-image: url(Icon/volume_up_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
        showControls();
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<icon style="background-image: url(Icon/fullscreen_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
        } else {
            if (videoContainer.requestFullscreen) videoContainer.requestFullscreen();
            fullscreenBtn.innerHTML = '<icon style="background-image: url(Icon/fullscreen_exit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
        }
        showControls();
    };

    const formatTime = (time) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleKeyPress = (e) => {
        if (overlay.style.display !== "block") return;
        
        switch(e.key.toLowerCase()) {
            case ' ': e.preventDefault(); togglePlayPause(); break;
            case 'f': toggleFullscreen(); break;
            case 'm': toggleMute(); break;
            case 'z': case 'arrowleft': video.currentTime -= 5; showControls(); break;
            case 'x': case 'arrowright': video.currentTime += 10; showControls(); break;
            case 'd': downloadFile(file); break;
            case 'escape': hideOverlay(); break;
        }
    };

    // إعداد مستمعي الأحداث
    videoContainer.addEventListener('mousemove', showControls);
    videoContainer.addEventListener('touchstart', showControls);
    videoContainer.addEventListener('mouseenter', showControls);
    videoContainer.addEventListener('mouseleave', hideControls);
    videoContainer.addEventListener('touchmove', showControls);
    videoContainer.addEventListener('click', (e) => e.stopPropagation());

    video.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
        showControls();
    });

    videoContainer.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            togglePlayPause();
        }
    });

    playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
    });

    video.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<icon style="background-image: url(Icon/play_arrow_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
        showControls();
    });

    forwardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.currentTime += 10;
        showControls();
    });

    rewindBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.currentTime -= 5;
        showControls();
    });

    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMute();
    });

    fullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
    });

    speedSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        video.playbackRate = parseFloat(speedSelect.value);
        showControls();
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<icon style="background-image: url(Icon/fullscreen_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
        }
    });

    video.addEventListener('timeupdate', () => {
        const percent = (video.currentTime / video.duration) * 100;
        progress.style.width = percent + '%';
        currentTimeDisplay.textContent = formatTime(video.currentTime);
        remainingTimeDisplay.textContent = '-' + formatTime(video.duration - video.currentTime);
    });

    progressBar.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / progressBar.offsetWidth) * video.duration;
        video.currentTime = newTime;
        showControls();
    });

    document.addEventListener('keydown', handleKeyPress);
    overlay.addEventListener('hide', () => {
        document.removeEventListener('keydown', handleKeyPress);
        clearTimeout(controlsTimeout);
    });

    showControls();
    video.play().then(() => {
        playPauseBtn.innerHTML = '<icon style="background-image: url(Icon/pause_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon>';
    }).catch(error => {
        console.log("التشغيل التلقائي غير مسموح:", error);
        showControls();
    });
}

function setupDownloadButton(overlay, file) {
    const btn = overlay.querySelector('#downloadFileBtn');
    if (btn) {
        btn.onclick = function(e) {
            e.stopPropagation();
            
            // الحصول على اسم الحاوية الحالية
            const containerName = document.getElementById("currentName").textContent;
            
            // حساب حجم الملف بشكل مقروء
            let fileSize;
            if (file.size < 1024) {
                fileSize = file.size + " بايت";
            } else if (file.size < 1024 * 1024) {
                fileSize = (file.size / 1024).toFixed(1) + " كيلوبايت";
            } else {
                fileSize = (file.size / (1024 * 1024)).toFixed(1) + " ميجابايت";
            }
            
            // عرض رسالة التأكيد مع تفاصيل الملف (الحاوية أولاً)
            const userConfirmed = confirm(`تفاصيل التنزيل:
- الحاوية: ${containerName}
- اسم الملف: ${file.name}
- حجم الملف: ${fileSize}

هل تريد متابعة التنزيل؟`);
            
            if (userConfirmed) {
                downloadFile(file);
            }
        };
    }
}

// ========== نهاية الدوال الجديدة ==========

function generateRandomName() {
    const adjectives = [
        "منتج", "منظم", "مبدع", "محترف", "ذكي",
        "سريع", "دقيق", "مرن", "عملي", "متعاون",
        "هادئ", "مثابر", "متميز", "خبير", "مجتهد",
        "متفاني", "داعم", "مبادر", "متقن", "مركّز"
    ];

    const nouns = [
        "مطور", "مصمم", "مدير", "محرر", "كاتب",
        "مخطط", "منسق", "مساعد", "مبرمج", "محلل",
        "قائد", "مستشار", "مدرب", "مسوق", "مدقق",
        "مراقب", "فني", "مصور", "محقق", "مبتكر"
    ];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomNoun} ${randomAdj}`;
}

function initDB() {
    let request = indexedDB.open("FileManagerDB", 1);
    request.onupgradeneeded = function(event) {
        let db = event.target.result;
        if (!db.objectStoreNames.contains("items")) {
            db.createObjectStore("items", { keyPath: "name" });
        }
    };
    request.onsuccess = function(event) {
        db = event.target.result;
        renderItems();
        renderContainersSummary();
        updateTotalStorageProgress();
    };
}

function renderContainersSummary() {
    let transaction = db.transaction(["items"], "readonly");
    let store = transaction.objectStore("items");
    let request = store.getAll();
    
    request.onsuccess = function() {
        let items = request.result;
        let containersSummaryDiv = document.getElementById("containersSummary");
        
        if (!containersSummaryDiv) {
            containersSummaryDiv = document.createElement("div");
            containersSummaryDiv.id = "containersSummary";
            containersSummaryDiv.className = "containers-summary";
            document.body.insertBefore(containersSummaryDiv, document.getElementById("itemsList"));
        }
        
        containersSummaryDiv.innerHTML = "";
        
        items.forEach(item => {
            let totalSizeBytes = getTotalFilesSize(item.files);
            let percentage = Math.min((totalSizeBytes / MAX_TOTAL_BYTES) * 100, 100);
            
            let containerDiv = document.createElement("button");
            containerDiv.className = "container-item";
            
            let nameSpan = document.createElement("span");
            nameSpan.className = "container-name";
            nameSpan.textContent = item.name;
            
            let sizeLink = document.createElement("span");
            sizeLink.className = `container-percentage ${percentage >= 90 ? 'high' : percentage >= 70 ? 'medium' : 'low'}`;
            sizeLink.textContent = `${percentage.toFixed(1)}%`;
            
            let downloadBtn = document.createElement("button");
            downloadBtn.className = "download-container-btn";
            downloadBtn.innerHTML = '<icon class="download-icon"></icon>';
            downloadBtn.title = "تنزيل الحاوية كملف ZIP";
            downloadBtn.onclick = () => downloadContainerAsZip(item);
            
            containerDiv.appendChild(nameSpan);
            containerDiv.appendChild(sizeLink);
            containerDiv.appendChild(downloadBtn);
            containersSummaryDiv.appendChild(containerDiv);
        });
    };
}

async function downloadContainerAsZip(item) {
    const totalSizeMB = (getTotalFilesSize(item.files) / (1024 * 1024)).toFixed(2);
    
    const userConfirmed = confirm(`تفاصيل التنزيل:
- اسم الحاوية: ${item.name}
- عدد الملفات: ${item.files.length}
- الحجم الإجمالي: ${totalSizeMB} MB

هل تريد متابعة التنزيل؟`);
    
    if (!userConfirmed) {
        return;
    }

    if (item.password) {
        const enteredPassword = prompt("هذه الحاوية محمية بكلمة مرور. الرجاء إدخال كلمة المرور:");
        if (enteredPassword !== item.password) {
            alert("كلمة المرور غير صحيحة!");
            return;
        }
    }

    if (item.files.length === 0) {
        alert("الحاوية فارغة لا يوجد محتوى لتنزيله");
        return;
    }

    try {
        const loader = document.createElement('div');
        loader.className = 'zip-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <p>جاري تجهيز الملفات للتنزيل...</p>
                <div class="loader-progress">0/${item.files.length}</div>
            </div>
        `;
        document.body.appendChild(loader);

        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');

        const zip = new JSZip();
        const folder = zip.folder(item.name);
        let processedFiles = 0;

        for (const file of item.files) {
            try {
                if (file.type === "text") {
                    folder.file(file.name + '.txt', file.url);
                } else if (file.url.startsWith("data:") || file.url.startsWith("blob:")) {
                    const blob = await fetch(file.url).then(res => res.blob());
                    folder.file(file.name, blob);
                } else {
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    folder.file(file.name, blob);
                }
            } catch (error) {
                console.error(`خطأ في معالجة الملف ${file.name}:`, error);
            }

            processedFiles++;
            loader.querySelector('.loader-progress').textContent = 
                `${processedFiles}/${item.files.length}`;
        }

        const content = await zip.generateAsync({ type: 'blob' }, metadata => {
            loader.querySelector('.loader-progress').textContent = 
                `${metadata.percent.toFixed(1)}% تم الانتهاء`;
        });

        saveAs(content, `${item.name}.zip`);
        
        loader.remove();
        
    } catch (error) {
        console.error("حدث خطأ أثناء إنشاء ملف ZIP:", error);
        alert("حدث خطأ غير متوقع أثناء محاولة إنشاء ملف ZIP");
        document.querySelector('.zip-loader')?.remove();
    }
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function updateTotalStorageProgress() {
    let transaction = db.transaction(["items"], "readonly");
    let store = transaction.objectStore("items");
    let request = store.getAll();
    
    request.onsuccess = function() {
        let items = request.result;
        let totalSizeBytes = 0;
        
        items.forEach(item => {
            item.files.forEach(file => {
                totalSizeBytes += file.size || 0;
            });
        });
        
        const percentage = Math.min((totalSizeBytes / TOTAL_STORAGE_BYTES) * 100, 100);
        
        const progressBar = document.getElementById("totalStorageProgress");
        if (progressBar) {
            progressBar.style.width = percentage + "%";
        }
        
        const usedStorageMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);
        const usedStorageGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
        
        const usedStorageElement = document.getElementById("usedStorage");
        if (usedStorageElement) {
            usedStorageElement.textContent = 
                totalSizeBytes >= 1024 * 1024 * 1024 ? 
                `${usedStorageGB} جيجابايت` : 
                `${usedStorageMB} ميجابايت`;
        }
        
        if (progressBar) {
            if (percentage >= 90) {
                progressBar.style.backgroundColor = "#ff3b30";
                progressBar.style.boxShadow = "0 0 8px rgba(255, 59, 48, 0.3)";
            } else if (percentage >= 70) {
                progressBar.style.backgroundColor = "#ff9500";
                progressBar.style.boxShadow = "0 0 6px rgba(255, 149, 0, 0.3)";
            } else {
                progressBar.style.backgroundColor = "#34c759";
                progressBar.style.boxShadow = "0 0 4px rgba(52, 199, 89, 0.3)";
            }
        }
    };
}

function showInputDiv(isEdit = false) {
    const inputDivTitle = document.getElementById("inputDivTitle");
    if (isEdit) {
        inputDivTitle.textContent = "تعديل المعلومات";
    } else {
        inputDivTitle.textContent = "إنشاء حاوية جديدة";
        document.getElementById("nameInput").value = generateRandomName();
    }

    document.getElementById("overlayMessage").style.display = "none";
    document.getElementById("inputDiv").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    document.getElementById("inputDiv").setAttribute("data-edit", isEdit);

    history.pushState({ showingInputDiv: true }, null, window.location.pathname);

    const nameInput = document.getElementById("nameInput");
    if (nameInput) {
        nameInput.setAttribute("autofocus", "autofocus");
        nameInput.focus();
    }
}

function hideInputDiv() {
    currentEditItem = null;
    document.getElementById("inputDiv").style.display = "none";
    document.getElementById("overlay").style.display = "none";
    document.getElementById("nameInput").value = generateRandomName();
    document.getElementById("passwordInput").value = "";
    document.getElementById("cancelPasswordButton").style.display = "none";
    history.back();
}

function setupBackButtonHandler() {
    window.onpopstate = function(event) {
        const overlay = document.getElementById("overlay");
        const inputDiv = document.getElementById("inputDiv");
        const overlayMessage = document.getElementById("overlayMessage");

        if (overlay.style.display === "block") {
            if (inputDiv.style.display === "block") {
                hideInputDiv();
            } else if (overlayMessage.style.display === "block") {
                hideOverlayMessage();
            } else {
                hideOverlay();
            }
            history.pushState(null, null, window.location.pathname);
        }
    };

    history.pushState(null, null, window.location.pathname);
}

function getFileSizeInBytes(fileUrl, fileType) {
    if (fileUrl.startsWith("data:")) {
        let base64Index = fileUrl.indexOf('base64,');
        if (base64Index !== -1) {
            const base64 = fileUrl.substring(base64Index + 7);
            return Math.floor(base64.length * 3 / 4);
        } else {
            const dataIndex = fileUrl.indexOf(',');
            if (dataIndex !== -1) {
                let raw = decodeURIComponent(fileUrl.substring(dataIndex + 1));
                return raw.length;
            }
        }
    }
    if (fileUrl.startsWith("blob:")) {
        return fileType && fileType._size ? fileType._size : 0;
    }
    if (fileType === "text") {
        return new TextEncoder().encode(fileUrl).length;
    }
    return 0;
}

function getTotalFilesSize(files) {
    let total = 0;
    for (let file of files) {
        if (file.size != null) {
            total += file.size;
        } else {
            total += getFileSizeInBytes(file.url, file);
        }
    }
    return total;
}

function createItem(event) {
    if (event) {
        event.preventDefault();
    }

    const nameInput = document.getElementById("nameInput");
    const passwordInput = document.getElementById("passwordInput");
    const backupPasswordInput = document.getElementById("backupPasswordInput");
    const inputDiv = document.getElementById("inputDiv");

    if (!nameInput || !passwordInput || !backupPasswordInput || !inputDiv) {
        console.error("Required elements not found");
        return;
    }

    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    const backupPassword = backupPasswordInput.value.trim();
    const isEdit = inputDiv.getAttribute("data-edit") === "true";

    if (!name) {
        alert("لا يمكن إنشاء حاوية بدون اسم");
        return;
    }

    // إذا تم إدخال باسورد احتياطي يجب إدخال الباسورد الرئيسي
    if (backupPassword && !password) {
        alert("يجب إدخال كلمة المرور الرئيسية إذا قمت بإدخال كلمة مرور احتياطية");
        return;
    }

    // التحقق من أن الباسورد الاحتياطي لا يساوي الباسورد الرئيسي
    if (password && backupPassword && password === backupPassword) {
        alert("كلمة المرور الاحتياطية يجب أن تختلف عن كلمة المرور الرئيسية");
        return;
    }

    const transactionCheck = db.transaction(["items"], "readonly");
    const storeCheck = transactionCheck.objectStore("items");
    const countRequest = storeCheck.count();

    countRequest.onsuccess = function() {
        const itemCount = countRequest.result;
        
        if (itemCount >= 30 && !isEdit) {
            alert("لا يمكن إنشاء أكثر من 30 حاوية");
            return;
        }

        const transaction = db.transaction(["items"], "readwrite");
        const store = transaction.objectStore("items");

        if (isEdit) {
            if (!currentEditItem) {
                console.error("No item selected for editing");
                return;
            }

            const getRequest = store.get(currentEditItem.name);

            getRequest.onsuccess = function() {
                const originalItem = getRequest.result;
                if (!originalItem) {
                    alert("Original item not found in database");
                    return;
                }

                const updatedItem = {
                    name: name,
                    password: password || null,
                    backupPassword: backupPassword || null,
                    files: originalItem.files,
                    createdAt: originalItem.createdAt || Date.now()
                };

                if (currentEditItem.name !== name) {
                    store.delete(currentEditItem.name);
                }

                store.put(updatedItem);

                transaction.oncomplete = function() {
                    if (selectedItem === currentEditItem.name) {
                        selectedItem = name;
                        localStorage.setItem('selectedItem', name);
                    }

                    renderItems();
                    renderContainersSummary();
                    updateTotalStorageProgress();
                    hideInputDiv();
                    currentEditItem = null;
                };
            };

            getRequest.onerror = function() {
                console.error("Error retrieving item for editing");
            };
        } else {
            store.add({ 
                name: name, 
                password: password || null, 
                backupPassword: backupPassword || null,
                files: [], 
                createdAt: Date.now() 
            });

            transaction.oncomplete = function() {
                nameInput.value = "";
                passwordInput.value = "";
                backupPasswordInput.value = "";

                selectedItem = name;
                localStorage.setItem('selectedItem', name);

                renderItems();
                renderContainersSummary();
                updateTotalStorageProgress();
                hideInputDiv();

                setTimeout(() => {
                    showFiles(name);
                    const itemsList = document.getElementById("itemsList");
                    const newItemDiv = Array.from(itemsList.querySelectorAll('.item')).find(div =>
                        div.querySelector('.wave-button').textContent === name
                    );
                    if (newItemDiv) {
                        highlightItem(newItemDiv);
                        newItemDiv.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }, 100);
            };
        }
    };
}

function renderItems() {
    let transaction = db.transaction(["items"], "readonly");
    let store = transaction.objectStore("items");
    let request = store.getAll();
    request.onsuccess = function() {
        let itemsList = document.getElementById("itemsList");
        itemsList.innerHTML = "";
        let fragment = document.createDocumentFragment();
        let items = request.result;

        let containerCountSpan = document.getElementById("containerCount");
        if (containerCountSpan) {
            containerCountSpan.textContent = items.length;
        }

        items.sort((a, b) => {
            if (b.createdAt && a.createdAt) {
                return b.createdAt - a.createdAt;
            } else {
                if (!a.createdAt && b.createdAt) return 1;
                if (!b.createdAt && a.createdAt) return -1;
                return a.name.localeCompare(b.name);
            }
        });

        if (items.length === 0) {
            document.getElementById("filesSection").style.display = "none";
            const progressBar = document.getElementById("fileProgress");
            const fileCount = document.getElementById("fileCount");
            if (progressBar) progressBar.style.width = "0%";
            if (fileCount) fileCount.textContent = `0/${MAX_TOTAL_SIZE_MB}MB`;
        }

        let lastSelected = localStorage.getItem('selectedItem');
        let lastSelectedItemObj = items.find(i => i.name === lastSelected);
        let isFirstLoad = true;

        function openNextAvailableUnprotectedContainer() {
            let unprotected = items.find(i => !i.password);
            if (unprotected) {
                showFiles(unprotected.name);
                let itemDivs = Array.from(itemsList.getElementsByClassName('item'));
                let foundDiv = itemDivs.find(div => div.querySelector('.wave-button').textContent === unprotected.name);
                if (foundDiv) highlightItem(foundDiv);
            } else {
                showInputDiv(false);
            }
        }

        function processItems(startIndex) {
            const batchSize = 2;
            const endIndex = Math.min(startIndex + batchSize, items.length);

            for (let i = startIndex; i < endIndex; i++) {
                let item = items[i];

                let div = document.createElement("div");
                div.classList.add("item");

                div.innerHTML = `
                    <div class="click jaxon wave-button" title="${item.name}">
                        <div class="container-name-inside">${item.name}</div>
                    </div>
                    <div class="item-buttons">
                        <button class="edit-button"><icon style="background-image: url(Icon/edit_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon></button>
                        <button class="delete-button Wave-cloud"><icon style="background-image: url(Icon/delete_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon></button>
                    </div>
                `;

                let nameDiv = div.querySelector(".click");
                nameDiv.onclick = () => {
                    if (item.password) {
                        let enteredPassword = prompt("أدخل كلمة المرور لفتح الحاوية:");
                        if (!enteredPassword) {
                            alert("يجب إدخال كلمة المرور!");
                            return;
                        }
                        
                        if (enteredPassword === item.password || enteredPassword === item.backupPassword) {
                            showFiles(item.name);
                            highlightItem(div);
                            localStorage.setItem('selectedItem', item.name);
                        } else {
                            alert("كلمة المرور غير صحيحة!");
                            return;
                        }
                    } else {
                        showFiles(item.name);
                        highlightItem(div);
                        localStorage.setItem('selectedItem', item.name);
                    }
                };

                let deleteButton = div.querySelector(".delete-button");
                deleteButton.onclick = () => {
                    if (item.password) {
                        let enteredPassword = prompt("أدخل كلمة المرور للحذف:");
                        if (!enteredPassword) {
                            alert("يجب إدخال كلمة المرور!");
                            return;
                        }
                        
                        if (enteredPassword !== item.password && enteredPassword !== item.backupPassword) {
                            alert("كلمة المرور غير صحيحة!");
                            return;
                        }
                    }
                
                    // حساب عدد الملفات وحجمها
                    const fileCount = item.files.length;
                    const totalSizeBytes = getTotalFilesSize(item.files);
                    let totalSizeText;
                    
                    if (totalSizeBytes < 1024) {
                        totalSizeText = totalSizeBytes + " بايت";
                    } else if (totalSizeBytes < 1024 * 1024) {
                        totalSizeText = (totalSizeBytes / 1024).toFixed(1) + " كيلوبايت";
                    } else {
                        totalSizeText = (totalSizeBytes / (1024 * 1024)).toFixed(1) + " ميجابايت";
                    }
                
                    // رسالة التأكيد مع التفاصيل
                    const confirmDelete = confirm(`تفاصيل الحذف:
- اسم الحاوية: ${item.name}
- عدد الملفات: ${fileCount}
- الحجم الإجمالي: ${totalSizeText}

هل أنت متأكد أنك تريد حذف هذه الحاوية؟ سيتم حذف جميع محتوياتها بشكل دائم.`);
                
                    if (confirmDelete) {
                        deleteItem(item.name);
                    }
                };

                let editButton = div.querySelector(".edit-button");
                editButton.onclick = () => showEditDiv(item);

                fragment.appendChild(div);

                if (isFirstLoad && lastSelected && item.name === lastSelected) {
                    isFirstLoad = false;
                    setTimeout(() => {
                        if (item.password) {
                            let enteredPassword = prompt("أدخل كلمة المرور لفتح الحاوية:");
                            if (enteredPassword === item.password) {
                                showFiles(item.name);
                                highlightItem(div);
                                localStorage.setItem('selectedItem', item.name);
                            } else {
                                alert("كلمة المرور غير صحيحة!");
                                // البحث عن أول حاوية غير محمية وفتحها تلقائياً
                                let unprotected = items.find(i => !i.password);
                                if (unprotected) {
                                    showFiles(unprotected.name);
                                    // ابحث عن العنصر الخاص بها وقم بتمييزه
                                    let itemDivs = Array.from(itemsList.getElementsByClassName('item'));
                                    let foundDiv = itemDivs.find(div =>
                                        div.querySelector('.wave-button').textContent.trim() === unprotected.name
                                    );
                                    if (foundDiv) highlightItem(foundDiv);
                                    localStorage.setItem('selectedItem', unprotected.name);
                                } else {
                                    showInputDiv(false);
                                }
                            }
                        } else {
                            showFiles(item.name);
                            highlightItem(div);
                            localStorage.setItem('selectedItem', item.name);
                        }
                    }, 0);
                }
            }
            itemsList.appendChild(fragment);

            if (endIndex < items.length) {
                setTimeout(() => processItems(endIndex), 0);
            } else {
                if (isFirstLoad && lastSelected) {
                    isFirstLoad = false;
                    openNextAvailableUnprotectedContainer();
                }
            }
        }

        processItems(0);
    };
}

function highlightItem(div) {
    if (previousSelectedItemDiv) {
        previousSelectedItemDiv.classList.remove('selected-jokr');
    }
    div.classList.add('selected-jokr');
    previousSelectedItemDiv = div;

    localStorage.setItem('selectedItem', div.querySelector('.wave-button').textContent);
}

function deleteItem(name) {
    let transaction = db.transaction(["items"], "readwrite");
    let store = transaction.objectStore("items");
    store.delete(name);
    transaction.oncomplete = function() {
        if (localStorage.getItem('selectedItem') === name) {
            localStorage.removeItem('selectedItem');
        }

        let itemsList = document.getElementById("itemsList");
        let itemDivs = itemsList.getElementsByClassName("item");

        let nextItemDiv = null;

        for (let i = 0; i < itemDivs.length; i++) {
            if (itemDivs[i].querySelector('.wave-button').textContent !== name) {
                nextItemDiv = itemDivs[i];
                break;
            }
        }

        if (nextItemDiv) {
            let nextItemName = nextItemDiv.querySelector('.wave-button').textContent;

            let transaction = db.transaction(["items"], "readonly");
            let store = transaction.objectStore("items");
            let request = store.get(nextItemName);

            request.onsuccess = function() {
                let item = request.result;
                if (item.password) {
                    let enteredPassword = prompt("Enter password to view content:");
                    if (enteredPassword === item.password) {
                        showFiles(item.name);
                        highlightItem(nextItemDiv);
                    } else {
                        alert("Incorrect password!");
                        document.getElementById("filesSection").style.display = "none";
                        return;
                    }
                } else {
                    showFiles(item.name);
                    highlightItem(nextItemDiv);
                }
            };
        } else {
            document.getElementById("filesSection").style.display = "none";
        }

        renderItems();
        renderContainersSummary();
        updateTotalStorageProgress();
    };
}

function showEditDiv(item) {
    if (!item) {
        console.error("Item is null or undefined");
        return;
    }

    if (item.password) {
        let enteredPassword = prompt("أدخل كلمة المرور للتعديل:");
        if (!enteredPassword) {
            alert("يجب إدخال كلمة المرور!");
            return;
        }
        
        if (enteredPassword !== item.password && enteredPassword !== item.backupPassword) {
            alert("كلمة المرور غير صحيحة!");
            return;
        }
    }

    currentEditItem = {...item};

    document.getElementById("nameInput").value = item.name;
    document.getElementById("passwordInput").value = item.password || "";
    document.getElementById("backupPasswordInput").value = item.backupPassword || "";
    showInputDiv(true);

    document.getElementById("cancelPasswordButton").style.display = item.password ? "flex" : "none";
}

function cancelPassword() {
    if (currentEditItem) {
        document.getElementById("passwordInput").value = "";
        document.getElementById("backupPasswordInput").value = "";
        const cancelPasswordButton = document.getElementById("cancelPasswordButton");
        cancelPasswordButton.style.display = "none";

        currentEditItem.password = null;
        currentEditItem.backupPassword = null;

        let transaction = db.transaction(["items"], "readwrite");
        let store = transaction.objectStore("items");
        let getRequest = store.get(currentEditItem.name);
        getRequest.onsuccess = function() {
            let item = getRequest.result;
            if (item) {
                item.password = null;
                item.backupPassword = null;
                store.put(item);
            }
        };
    }
}

function showFiles(name) {
    document.getElementById("currentName").textContent = name;
    document.getElementById("filesSection").style.display = "block";
    selectedItem = name;
    renderFiles();
}

function uploadFiles() {
    let fileInput = document.getElementById("fileInput");
    const filesLoader = document.getElementById("filesLoader");
    const remainingCounter = document.getElementById("remainingItemsCounter");
    const fileList = document.getElementById("fileList");
    const filesSection = document.getElementById("filesSection");

    if ((filesLoader && filesLoader.style.display === "flex") ||
        (remainingCounter && remainingCounter.style.display === "block")) {
        alert("لا يمكن رفع محتوى جديد حتى يتم تحميل المحتوى الحالي بالكامل.");
        fileInput.value = "";
        return;
    }

    if (fileInput.files.length > 0 && selectedItem) {
        if (fileInput.files.length > 100) {
            alert("لا يمكن رفع أكثر من 100 ملف في المرة الواحدة");
            return;
        }

        let transaction = db.transaction(["items"], "readwrite");
        let store = transaction.objectStore("items");
        let request = store.get(selectedItem);

        request.onsuccess = function () {
            let item = request.result;
            let files = Array.from(fileInput.files);

            let currentTotalSize = getTotalFilesSize(item.files);
            let newFilesTotalSize = 0;
            for (const file of files) {
                newFilesTotalSize += file.size;
            }

            if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_BYTES) {
                showOverlayMessage();
                return;
            }

            if (item.files.length + files.length > 1000) {
                alert("لا يمكن تجاوز 1000 ملف في الحاوية الواحدة");
                return;
            }

            if (remainingCounter) {
                remainingCounter.style.display = "block";
                remainingCounter.textContent = `${files.length} عنصر متبقٍ`;
            }
            if (filesLoader) filesLoader.style.display = "flex";

            let processedCount = 0;
            const totalFiles = files.length;

            function processNextFile() {
                if (processedCount >= totalFiles) {
                    if (filesLoader) filesLoader.style.display = "none";
                    if (remainingCounter) remainingCounter.style.display = "none";
                    renderContainersSummary();
                    updateTotalStorageProgress();
                    return;
                }

                const file = files[processedCount];
                
                if (remainingCounter) {
                    remainingCounter.textContent = `${totalFiles - processedCount} عنصر متبقٍ`;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    const fileId = Date.now() + processedCount;
                    const fileObj = { 
                        id: fileId, 
                        name: file.name, 
                        url: e.target.result, 
                        size: file.size 
                    };

                    const realDiv = createFileDiv(fileObj);
                    fileList.appendChild(realDiv);

                    realDiv.style.opacity = '0';
                    setTimeout(() => {
                        realDiv.style.transition = 'opacity 0.3s ease';
                        realDiv.style.opacity = '1';
                    }, 10);

                    addFileToDatabase(fileObj, () => {
                        processedCount++;
                        processNextFile();
                    });
                };
                reader.readAsDataURL(file);
            }

            processNextFile();
        };
    }
}

function addFileToDatabase(fileObj, callback) {
    let transaction = db.transaction(["items"], "readwrite");
    let store = transaction.objectStore("items");
    let getRequest = store.get(selectedItem);

    getRequest.onsuccess = function() {
        let currentItem = getRequest.result;
        currentItem.files.push(fileObj);
        store.put(currentItem).onsuccess = function() {
            updateProgressBar(getTotalFilesSize(currentItem.files), true);
            updateFilesCount(currentItem.files.length);
            renderContainersSummary();
            callback();
        };
    };
}

function startRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            mediaRecorder.ondataavailable = function(e) {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = function() {
                let audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioChunks = [];
                let fileId = Date.now();
                let fileName = `Recording_${fileId}.wav`;
                let fileUrl = URL.createObjectURL(audioBlob);

                let blobSize = audioBlob.size;

                let transaction = db.transaction(["items"], "readwrite");
                let store = transaction.objectStore("items");
                let request = store.get(selectedItem);

                request.onsuccess = function () {
                    let item = request.result;
                    let totalSize = getTotalFilesSize(item.files);

                    if (totalSize + blobSize > MAX_TOTAL_BYTES) {
                        showOverlayMessage();
                        return;
                    }
                    item.files.push({ id: fileId, name: fileName, url: fileUrl, size: blobSize });
                    store.put(item);
                    transaction.oncomplete = function () {
                        renderFiles();
                        updateProgressBar(getTotalFilesSize(item.files), true);
                        updateFilesCount(item.files.length);
                        renderContainersSummary();
                        updateTotalStorageProgress();
                    };
                };
            };
        });
    } else {
        alert("Your browser does not support audio recording.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
}

function confirmDeleteAllFiles() {
    if (!selectedItem) {
        alert("لم يتم تحديد حاوية");
        return;
    }

    let transaction = db.transaction(["items"], "readonly");
    let store = transaction.objectStore("items");
    let request = store.get(selectedItem);

    request.onsuccess = function() {
        let item = request.result;
        if (!item) {
            alert("الحاوية غير موجودة");
            return;
        }

        if (item.files.length === 0) {
            alert("الحاوية فارغة، لا يوجد محتوى لحذفه");
            return;
        }

        if (item.password) {
            const enteredPassword = prompt("هذه الحاوية محمية بكلمة مرور. الرجاء إدخال كلمة المرور:");
            if (enteredPassword !== item.password) {
                alert("كلمة المرور غير صحيحة!");
                return;
            }
        }

        // حساب عدد الملفات وحجمها
        const fileCount = item.files.length;
        const totalSizeBytes = getTotalFilesSize(item.files);
        let totalSizeText;
        
        if (totalSizeBytes < 1024) {
            totalSizeText = totalSizeBytes + " بايت";
        } else if (totalSizeBytes < 1024 * 1024) {
            totalSizeText = (totalSizeBytes / 1024).toFixed(1) + " كيلوبايت";
        } else {
            totalSizeText = (totalSizeBytes / (1024 * 1024)).toFixed(1) + " ميجابايت";
        }

        // رسالة التأكيد مع التفاصيل
        const confirmDelete = confirm(`تفاصيل الحذف:
- اسم الحاوية: ${item.name}
- عدد الملفات: ${fileCount}
- الحجم الإجمالي: ${totalSizeText}

⚠️ تحذير: سيتم حذف جميع الملفات داخل الحاوية بشكل دائم.
هل أنت متأكد أنك تريد المتابعة؟`);

        if (confirmDelete) {
            deleteAllFiles();
        }
    };
}

function deleteAllFiles() {
    if (selectedItem) {
        let transaction = db.transaction(["items"], "readwrite");
        let store = transaction.objectStore("items");
        let request = store.get(selectedItem);

        request.onsuccess = function() {
            let item = request.result;
            item.files = [];
            store.put(item);
            transaction.oncomplete = function() {
                renderFiles();
                updateProgressBar(0, true);
                updateFilesCount(0);
                renderContainersSummary();
                updateTotalStorageProgress();
            };
        };
    }
}

function sendMessage() {
    const searchModeCheckbox = document.getElementById('searchModeCheckbox');
    const filesLoader = document.getElementById("filesLoader");
    const remainingCounter = document.getElementById("remainingItemsCounter");
    
    if (searchModeCheckbox && searchModeCheckbox.checked) {
        return;
    }
    
    if ((filesLoader && filesLoader.style.display === "flex") ||
        (remainingCounter && remainingCounter.style.display === "block")) {
        alert("الرجاء الانتظار حتى ينتهي تحميل المحتوى الحالي قبل إرسال رسالة جديدة");
        return;
    }

    const messageInput = document.getElementById("messageInput");
    const filesSection = document.getElementById("filesSection");
    const fileList = document.getElementById("fileList");
    const messageText = messageInput.textContent.trim();

    if (messageText.length > 1000) {
        alert("لا يمكن أن تتجاوز الرسالة 1000 حرف");
        return;
    }

    if (messageText && selectedItem) {
        let transaction = db.transaction(["items"], "readwrite");
        let store = transaction.objectStore("items");
        let request = store.get(selectedItem);

        request.onsuccess = function() {
            let item = request.result;
            let totalSize = getTotalFilesSize(item.files);
            let messageSize = new TextEncoder().encode(messageText).length;

            if (totalSize + messageSize > MAX_TOTAL_BYTES) {
                showOverlayMessage();
                return;
            }
            
            const messageId = Date.now();
            const messageObj = { 
                id: messageId, 
                name: "رسالة", 
                url: messageText, 
                type: "text", 
                size: messageSize 
            };
            
            item.files.push(messageObj);
            store.put(item);
            
            transaction.oncomplete = function() {
                const messageDiv = createFileDiv(messageObj);
                
                messageDiv.style.opacity = '0';
                fileList.appendChild(messageDiv);
                
                setTimeout(() => {
                    messageDiv.style.transition = 'opacity 0.3s ease';
                    messageDiv.style.opacity = '1';
                }, 10);
                
                updateProgressBar(getTotalFilesSize(item.files), true);
                updateFilesCount(item.files.length);
                renderContainersSummary();
                updateTotalStorageProgress();
                
                messageInput.textContent = "";
                messageInput.style.height = "21.5px";
                filesSection.style.marginBottom = "59px";
                
                messageDiv.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            };
        };
    }
}

function updateProgressBar(currentBytesOrFiles, bySize = false) {
    const maxBytes = MAX_TOTAL_BYTES;
    const progressBar = document.getElementById("fileProgress");
    const fileCount = document.getElementById("fileCount");

    let percentage;
    let displayValue;
    if (bySize) {
        percentage = (currentBytesOrFiles / maxBytes) * 100;
        displayValue = `${(currentBytesOrFiles / (1024 * 1024)).toFixed(1)}/${MAX_TOTAL_SIZE_MB}MB`;
    } else {
        percentage = (currentBytesOrFiles / 20) * 100;
        displayValue = `${currentBytesOrFiles}/20`;
    }

    progressBar.style.width = `${percentage}%`;
    fileCount.textContent = displayValue;

    if (percentage >= 90) {
        progressBar.style.backgroundColor = "#ff3b30";
        progressBar.style.boxShadow = "0 0 8px rgba(255, 59, 48, 0.6)";
    } else if (percentage >= 70) {
        progressBar.style.backgroundColor = "#ff9500";
        progressBar.style.boxShadow = "0 0 6px rgba(255, 149, 0, 0.5)";
    } else {
        progressBar.style.backgroundColor = "#34c759";
        progressBar.style.boxShadow = "0 0 4px rgba(52, 199, 89, 0.4)";
    }

    if (percentage > 85) {
        progressBar.style.animation = "shake 0.5s ease-in-out";
        setTimeout(() => {
            progressBar.style.animation = "";
        }, 500);
    }
}

function updateFilesCount(count) {
    const filesCountContainer = document.getElementById("filesCountContainer");
    const filesCount = document.getElementById("filesCount");
    
    if (filesCountContainer && filesCount) {
        filesCount.textContent = count;
        filesCountContainer.style.display = count > 0 ? "flex" : "flex";
    }
}

function renderFiles(newFiles = []) {
    const filesLoader = document.getElementById("filesLoader");
    const remainingCounter = document.getElementById("remainingItemsCounter");
    const fileList = document.getElementById("fileList");
    const filesSection = document.getElementById("filesSection");
    
    filesLoader.style.display = "none";
    remainingCounter.style.display = "none";

    let batchProgress = document.getElementById("batchProgressBar");
    if (!batchProgress) {
        batchProgress = document.createElement('span');
        batchProgress.id = "batchProgressBar";
        batchProgress.style.cssText = `
            display:none;
            position:fixed;
            left:0;
            top:0;
            height:4px;
            background:#34c759;
            z-index:2000;
            width:0%;
            transition:width 0.22s cubic-bezier(.4,1,.7,1);
        `;
        document.body.appendChild(batchProgress);
    }

    let transaction = db.transaction(["items"], "readonly");
    let store = transaction.objectStore("items");
    let request = store.get(selectedItem);

    request.onsuccess = function() {
        let files = request.result.files;
        updateProgressBar(getTotalFilesSize(files), true);
        updateFilesCount(files.length);

        if (newFiles.length > 0) {
            let fragment = document.createDocumentFragment();
            newFiles.forEach(file => {
                let div = createFileDiv(file);
                fragment.appendChild(div);
            });
            fileList.appendChild(fragment);
        } else {
            fileList.innerHTML = "";
            
            let totalFiles = files.length;
            let batchSize = 10;
            
            if (totalFiles > 100) batchSize = 20;
            if (totalFiles > 200) batchSize = 30;
            if (totalFiles > 300) batchSize = 40;
            if (totalFiles > 400) batchSize = 50;
            if (totalFiles > 500) batchSize = 60;
            if (totalFiles > 600) batchSize = 70;
            if (totalFiles > 700) batchSize = 80;
            if (totalFiles > 800) batchSize = 90;
            if (totalFiles > 900) batchSize = 100;
            if (totalFiles > 1000) batchSize = Math.ceil(totalFiles / 10);

            let currentIndex = 0;
            let isLoading = false;
            let allFilesLoaded = false;
            let itemCounter = 0;

            function updateUI() {
                const remaining = files.length - currentIndex;
                if (remaining > 0 && !allFilesLoaded) {
                    remainingCounter.textContent = `${remaining} عنصر متبقٍ`;
                    remainingCounter.style.display = "block";
                    filesLoader.style.display = "none";
                } else {
                    remainingCounter.style.display = "none";
                    filesLoader.style.display = "none";
                    allFilesLoaded = true;
                }
            }

            function loadNextBatch() {
                if (isLoading || currentIndex >= files.length) {
                    allFilesLoaded = true;
                    updateUI();
                    return;
                }

                isLoading = true;
                filesLoader.style.display = "flex";
                remainingCounter.style.display = "none";

                batchProgress.style.display = "block";
                batchProgress.style.width = "0%";

                let endIndex = Math.min(currentIndex + batchSize, files.length);
                let i = currentIndex;
                function loadOne() {
                    if (i >= endIndex) {
                        currentIndex = endIndex;
                        isLoading = false;
                        batchProgress.style.width = "100%";
                        setTimeout(() => {
                            batchProgress.style.display = "none";
                            batchProgress.style.width = "0%";
                        }, 300);
                        updateUI();
                        if (currentIndex < files.length) {
                            observeLastItem();
                        }
                        return;
                    }
                    
                    let file = files[i];
                    let div = createFileDiv(file);
                    fileList.appendChild(div);
                    
                    itemCounter++;
                    if (itemCounter % 10 === 0) {
                        let adDiv = document.createElement('div');
                        adDiv.className = 'Advertisement';
                        adDiv.innerHTML = `
                            <div class="ad-content">
                                <p>إعلان</p>
                                <small>مساحة إعلانية</small>
                            </div>
                        `;
                        fileList.appendChild(adDiv);
                    }
                    
                    updateFilesCount(i + 1);
                    let percent = Math.round(((i - currentIndex + 1) / (endIndex - currentIndex)) * 100);
                    batchProgress.style.width = percent + "%";
                    i++;
                    setTimeout(loadOne, 60);
                }
                loadOne();
            }

            function observeLastItem() {
                const items = fileList.querySelectorAll('.file, .Advertisement');
                if (items.length === 0) return;

                const lastItem = items[items.length - 1];
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !isLoading && !allFilesLoaded) {
                            observer.unobserve(entry.target);
                            loadNextBatch();
                        }
                    });
                }, { 
                    root: filesSection,
                    threshold: 0.5
                });

                observer.observe(lastItem);
            }

            loadNextBatch();
        }
    };
}

function createFileDiv(file) {
    let div = document.createElement("div");
    div.classList.add("file");

    let fileInfoDiv = document.createElement("div");
    fileInfoDiv.classList.add("file-info");
    
    let dateSpan = document.createElement("span");
    dateSpan.classList.add("file-date");
    let fileDate = new Date(file.id || Date.now());
    dateSpan.textContent = fileDate.toLocaleDateString();
    
    let sizeSpan = document.createElement("span");
    sizeSpan.classList.add("file-size");
    let sizeText = file.size < 1024 ? file.size + " بايت" : 
                  file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + " ك.ب" : 
                  (file.size / (1024 * 1024)).toFixed(1) + " م.ب";
    sizeSpan.textContent = sizeText;
    
    fileInfoDiv.appendChild(dateSpan);
    fileInfoDiv.appendChild(sizeSpan);

    let fileContentDiv = document.createElement("div");
    fileContentDiv.classList.add("file-content");
    fileContentDiv.onclick = () => showFileInOverlay(file);

    if (file.type === "text") {
        fileContentDiv.innerHTML = `
            <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 8 13"><title>tail-in</title><path opacity="0.13" fill="#0000000" d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"></path><path fill="currentColor" d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path></svg>
            <div class="message-text">${file.url}</div>
            <p class="file-name-text" title="${file.name}">${file.name}</p>
        `;

        fileContentDiv.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            let newContent = prompt("تعديل محتوى الرسالة:", file.url);
            if (newContent !== null && newContent !== file.url) {
                let transaction = db.transaction(["items"], "readwrite");
                let store = transaction.objectStore("items");
                let request = store.get(selectedItem);

                request.onsuccess = function() {
                    let item = request.result;
                    let targetFile = item.files.find(f => f.id === file.id);
                    if (targetFile) {
                        targetFile.url = newContent;
                        fileContentDiv.querySelector('.message-text').textContent = newContent;
                        file.url = newContent;
                        div.dataset.file = JSON.stringify(file);
                        store.put(item);
                    }
                };
            }
            return false;
        });
    } else if (file.url && file.url.startsWith("data:image")) {
        fileContentDiv.innerHTML = `
            <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 8 13"><title>tail-in</title><path opacity="0.13" fill="#0000000" d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"></path><path fill="currentColor" d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path></svg>
            <div class="gon"><img class="site-image" src="${file.url}" width="100" alt="${file.name}"></div>
            <p class="file-name-text" title="${file.name}">${file.name}</p>
        `;
    } else if (file.url && file.url.startsWith("data:video")) {
        fileContentDiv.innerHTML = `
            <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 8 13"><title>tail-in</title><path opacity="0.13" fill="#0000000" d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"></path><path fill="currentColor" d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path></svg>
            <div class="gon">
                <div class="video-thumbnail" data-video-url="${file.url}">
                    <img class="video-poster site-image" width="100" alt="${file.name}">
                    <div class="play-icon">▶</div>
                </div>
            </div>
            <p class="file-name-text" title="${file.name}">${file.name}</p>
        `;
        setTimeout(() => {
            const thumbnailDiv = fileContentDiv.querySelector('.video-thumbnail');
            if (thumbnailDiv) {
                const videoUrl = thumbnailDiv.getAttribute('data-video-url');
                const video = document.createElement('video');
                video.src = videoUrl;
                video.addEventListener('loadedmetadata', function() {
                    video.currentTime = 0.1;
                });
                video.addEventListener('seeked', function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const posterImg = thumbnailDiv.querySelector('.video-poster');
                    if (posterImg) {
                        posterImg.src = canvas.toDataURL();
                    }
                });
            }
        }, 100);
    } else if (file.url && file.url.startsWith("blob:")) {
        fileContentDiv.innerHTML = `
            <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 8 13"><title>tail-in</title><path opacity="0.13" fill="#0000000" d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"></path><path fill="currentColor" d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path></svg>
            <div class="gon"><audio controls>
                <source src="${file.url}" type="audio/wav">
            </audio></div>
            <p class="file-name-text" title="${file.name}">${file.name}</p>
        `;
    } else {
        fileContentDiv.innerHTML = `
            <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px" enable-background="new 0 0 8 13"><title>tail-in</title><path opacity="0.13" fill="#0000000" d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"></path><path fill="currentColor" d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path></svg>
            <a href="${file.url}" download title="${file.name}">${file.name}</a>
        `;
    }

    div.appendChild(fileInfoDiv);
    div.appendChild(fileContentDiv);

    let buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("zoon");
    buttonsDiv.innerHTML = `
        <button onclick="shareFile('${file.url}', '${file.name}')" class="buttone"><icon style="background-image: url(Icon/share_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon></button>
        <button onclick="confirmDeleteFile(${file.id})" class="buttone" style="margin-bottom: 0;"><icon style="background-image: url(Icon/delete_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg);"></icon></button>
    `;
    div.appendChild(buttonsDiv);

    div.dataset.file = JSON.stringify(file);

    div.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        let nameEl = div.querySelector('.file-name-text');
        if (!nameEl) {
            nameEl = div.querySelector('a[download]');
            if (!nameEl) return false;
        }
        let oldName = file.name;
        let newName = prompt("أدخل الاسم الجديد للملف:", oldName);
        if (newName && newName.trim() && newName !== oldName) {
            let transaction = db.transaction(["items"], "readwrite");
            let store = transaction.objectStore("items");
            let request = store.get(selectedItem);

            request.onsuccess = function() {
                let item = request.result;
                let targetFile = item.files.find(f => f.id === file.id);
                if (targetFile) {
                    targetFile.name = newName.trim();
                    nameEl.textContent = newName.trim();
                    nameEl.title = newName.trim();
                    let shareBtn = div.querySelector('button[onclick^="shareFile"]');
                    if (shareBtn) {
                        shareBtn.setAttribute('onclick', `shareFile('${file.url}', '${newName.trim()}')`);
                    }
                    file.name = newName.trim();
                    div.dataset.file = JSON.stringify(file);
                    store.put(item);
                }
            }
        }
        return false;
    });

    return div;
}

function renameFile(fileId, newName) {
    let transaction = db.transaction(["items"], "readwrite");
    let store = transaction.objectStore("items");
    let request = store.get(selectedItem);

    request.onsuccess = function() {
        let item = request.result;
        let file = item.files.find(f => f.id === fileId);
        if (file) {
            file.name = newName;
            store.put(item).onsuccess = function() {
                renderFiles();
            };
        }
    };
}

function showFileInOverlay(file) {
    const overlay = document.getElementById("overlay");
    overlay.style.display = "block";
    overlay.style.background = "#0000006b";

    history.pushState({ showingOverlay: true }, null, window.location.pathname);

    const overlayTemplate = document.getElementById('overlay-template').content.cloneNode(true);
    const contentContainer = overlayTemplate.querySelector('.content-container');
    
    let contentTemplate;
    if (file.url.startsWith("data:image")) {
        contentTemplate = document.getElementById('image-template').content.cloneNode(true);
        const img = contentTemplate.querySelector('img');
        img.src = file.url;
        img.alt = file.name;
    } else if (file.url.startsWith("data:video")) {
        contentTemplate = document.getElementById('video-template').content.cloneNode(true);
        const video = contentTemplate.querySelector('video');
        video.preload = "none"; // إضافة هذه السمة للتحميل التدريجي
        const source = contentTemplate.querySelector('source');
        source.src = file.url;
        video.load(); // تحميل البيانات الأولية فقط
    } else if (file.url.startsWith("blob:")) {
        contentTemplate = document.getElementById('audio-template').content.cloneNode(true);
        const audio = contentTemplate.querySelector('audio source');
        audio.src = file.url;
    } else {
        contentTemplate = document.getElementById('download-template').content.cloneNode(true);
        const link = contentTemplate.querySelector('a');
        link.href = file.url;
        link.querySelector('.filename').textContent = file.name;
    }

    contentContainer.appendChild(contentTemplate);
    overlay.innerHTML = '';
    overlay.appendChild(overlayTemplate);
    
    if (file.url.startsWith("data:video")) {
        setTimeout(() => setupVideoControls(overlay, file), 50);
    }

    setTimeout(() => setupDownloadButton(overlay, file), 50);
}

function downloadFile(file) {
    if (file.type === "text") {
        const blob = new Blob([file.url], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name + ".txt";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 100);
        return;
    }
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 100);
}

function hideOverlay() {
    const overlay = document.getElementById("overlay");
    overlay.style.display = "none";
    overlay.innerHTML = '';
    history.back();
}

function confirmDeleteFile(fileId) {
    if (window.confirm("هل أنت متأكد من أنك تريد حذف هذا الملف؟")) {
        deleteFile(fileId);
    }
}

function deleteFile(fileId) {
    let transaction = db.transaction(["items"], "readwrite");
    let store = transaction.objectStore("items");
    let request = store.get(selectedItem);

    request.onsuccess = function() {
        let item = request.result;
        let files = item.files;
        let index = files.findIndex(file => file.id === fileId);

        if (index !== -1) {
            files.splice(index, 1);
            store.put(item);
            updateProgressBar(getTotalFilesSize(files), true);
            updateFilesCount(files.length);
            renderContainersSummary();
            updateTotalStorageProgress();

            const fileElements = document.querySelectorAll('#fileList .file');
            fileElements.forEach(element => {
                const deleteButton = element.querySelector('button[onclick*="confirmDeleteFile(' + fileId + ')"]');
                if (deleteButton) {
                    element.remove();
                }
            });
        }
    };
}

function shareFile(url, name) {
    const phone = prompt("يرجى إدخال رقم الهاتف (مع رمز الدولة، مثال: 966XXXXXXXX):");
    if (!phone) return;
    const validated = phone.replace(/\D/g, "");
    if (!validated || validated.length < 8) {
        alert("رقم الهاتف غير صحيح!");
        return;
    }
    fetch(url)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], name, { type: blob.type });
            const fileURL = URL.createObjectURL(file);
            const whatsappUrl = `https://wa.me/${validated}?text=${encodeURIComponent(fileURL)}`;
            window.open(whatsappUrl, '_blank');
        });
}

function showOverlayMessage() {
    document.getElementById("inputDiv").style.display = "none";
    const overlayMessage = document.getElementById("overlayMessage");
    overlayMessage.style.display = "block";
    document.getElementById("overlay").style.display = "block";
}

function hideOverlayMessage() {
    const overlayMessage = document.getElementById("overlayMessage");
    overlayMessage.style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function() {
    initDB();
    setupBackButtonHandler();

    document.getElementById("fileInput").addEventListener("change", uploadFiles);

    document.body.insertAdjacentHTML('beforeend', '<div id="overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgb(0 0 0 / 49%) z-index: 1000;"></div>');

    document.addEventListener('click', function(event) {
        let inputDiv = document.getElementById('inputDiv');
        let overlay = document.getElementById('overlay');
        let overlayMessage = document.getElementById('overlayMessage');

        if (event.target === overlay) {
            if (inputDiv.style.display === "block") {
                hideInputDiv();
            }
            if (overlayMessage.style.display === "block") {
                hideOverlayMessage();
            }
            hideOverlay();
        }
    });

    const searchBox = document.getElementById('messageInput');
    const fileList = document.getElementById('fileList');
    const searchToggle = document.getElementById('searchModeCheckbox');
    const sendMessageButton = document.getElementById('sendMessageButton');
    let previousMessageInputHandler = null;

    let sendButtonOriginalContent = sendMessageButton ? sendMessageButton.innerHTML : "";

    function filterFileList(searchTerm) {
        const items = fileList.querySelectorAll('.file');
        const normalized = searchTerm.trim().toLowerCase();
        items.forEach(div => {
            let file;
            try {
                file = JSON.parse(div.dataset.file);
            } catch {
                file = { name: "" };
            }
            const name = (file && file.name) ? file.name.toLowerCase() : "";
            div.style.display = (normalized && !name.includes(normalized)) ? "none" : "";
        });
    }

    if (searchToggle && searchBox && fileList) {
        searchToggle.addEventListener('change', function() {
            if (searchToggle.checked) {
                previousMessageInputHandler = searchBox.onkeydown;
                searchBox.setAttribute('contenteditable', 'true');
                searchBox.textContent = "";
                searchBox.placeholder = "ابحث باسم العنصر...";
                searchBox.onkeydown = function(e) {
                    if (e.key === "Enter") {
                        e.preventDefault();
                    }
                };
                searchBox.oninput = function(e) {
                    filterFileList(searchBox.textContent);
                };
                filterFileList(searchBox.textContent);

                if (sendMessageButton) {
                    sendMessageButton.innerHTML = '<icon style="background-image: url(Icon/search.svg);"></icon>';
                    sendMessageButton.title = "بحث";
                }
            } else {
                searchBox.placeholder = "اكتب رسالة...";
                searchBox.textContent = "";
                searchBox.onkeydown = previousMessageInputHandler;
                searchBox.oninput = null;
                Array.from(fileList.querySelectorAll('.file')).forEach(div => div.style.display = "");

                if (sendMessageButton) {
                    sendMessageButton.innerHTML = sendButtonOriginalContent;
                    sendMessageButton.title = "إرسال";
                }
            }
        });
    }
});