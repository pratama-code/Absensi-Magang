const API_URL = "https://script.google.com/macros/s/AKfycbz7jl9xrzl85VGQZjAOnfzSH66kuXm4zA672tPhTetfRuJejvt1rKChPrpPQQcex3e4dA/exec"; // <--- JANGAN LUPA GANTI URL INI!
let currentAbsen = null; // Menyimpan data absensi yang sedang berlangsung
let html5QrCode = null; // Objek untuk pemindai QR
let currentScannerState = 'closed'; // Status pemindai QR

document.addEventListener('DOMContentLoaded', initializeAbsensi);

function initializeAbsensi() {
    // 1. Inisialisasi Tema Gelap/Terang
    initializeTheme();
    
    // 2. Atur Status Awal
    currentAbsen = null;
    setButtonState(false, true, false); // CheckIn ON, CheckOut OFF, QR Scan ON
    document.getElementById('statusMessage').textContent = 'Status: Siap untuk Check In.';
    
    // 3. Auto Focus pada Nama
    document.getElementById('inputNama').focus(); 
    document.getElementById('inputNama').disabled = false;
    document.getElementById('inputNIM').disabled = false;
    
    // 4. Inisialisasi Jam
    updateClock();
    setInterval(updateClock, 1000); 
    
    // 5. Setup Listeners (Validasi Input, Enter Key, Theme Toggle)
    setupInputListeners();
    document.addEventListener('keypress', handleEnterKey);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // 6. Muat Riwayat Absensi
    loadAbsensiHistory(); 
    
    // 7. PWA Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('ServiceWorker registration failed: ', registrationError);
                });
        });
    }
}

// === FUNGSI TEMA GELAP ===

function initializeTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (prefersDark) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

function setTheme(theme) {
    const root = document.documentElement;
    const toggleButton = document.getElementById('themeToggle');
    
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'dark') {
        toggleButton.innerHTML = '☀️ Light Mode';
    } else {
        toggleButton.innerHTML = '🌙 Dark Mode';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// === FUNGSI VALIDASI DAN INPUT ===

function handleEnterKey(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault(); 
        
        if (!document.getElementById('checkInBtn').disabled) {
            checkIn('manual');
        } else if (!document.getElementById('checkOutBtn').disabled) {
             checkOut();
        }
    }
}

function setupInputListeners() {
    const namaInput = document.getElementById('inputNama');
    const nimInput = document.getElementById('inputNIM');
    const kegiatanInput = document.getElementById('inputKegiatan');

    // LISTENER KHUSUS: Hanya izinkan Angka dan HURUF pada NIM
    nimInput.addEventListener('input', () => {
        // Hapus semua karakter yang bukan angka (0-9) atau huruf (a-z, A-Z)
        nimInput.value = nimInput.value.replace(/[^a-zA-Z0-9]/g, '');
        if (nimInput.value.trim() !== '') {
            nimInput.classList.remove('input-error');
        }
    });
    
    // LISTENER KHUSUS: Hanya izinkan Huruf dan Spasi pada Nama dan Kegiatan
    [namaInput, kegiatanInput].forEach(element => {
        element.addEventListener('input', () => {
            // Hapus semua karakter yang BUKAN huruf (a-z, A-Z) atau spasi
            element.value = element.value.replace(/[^a-zA-Z\s]/g, '');
            
            if (element.value.trim() !== '') {
                element.classList.remove('input-error');
            }
        });
    });
}

function validateInput() {
    const nama = document.getElementById('inputNama');
    const nim = document.getElementById('inputNIM');
    const kegiatan = document.getElementById('inputKegiatan');

    let isValid = true;
    let errorFields = [];

    if (nama.value.trim() === '') {
        nama.classList.add('input-error');
        errorFields.push("Nama");
        isValid = false;
    } else {
        nama.classList.remove('input-error');
    }
    
    if (nim.value.trim() === '') {
        nim.classList.add('input-error');
        errorFields.push("NIM");
        isValid = false;
    } else {
        nim.classList.remove('input-error');
    }
    
    if (kegiatan.value.trim() === '') {
        kegiatan.classList.add('input-error');
        errorFields.push("Kegiatan");
        isValid = false;
    } else {
        kegiatan.classList.remove('input-error');
    }

    if (!isValid) {
        document.getElementById('statusMessage').textContent = `⚠️ Harap isi semua kolom: ${errorFields.join(', ')}.`;
    }
    
    return isValid;
}

// === FUNGSI UTILITIES TAMPILAN ===

function setButtonState(checkInDisabled, checkOutDisabled, qrScanDisabled) {
    document.getElementById('checkInBtn').disabled = checkInDisabled;
    document.getElementById('checkOutBtn').disabled = checkOutDisabled;
    document.getElementById('scanQrBtn').disabled = qrScanDisabled;
    
    // Bottom buttons
    document.getElementById('checkInBtnBottom').disabled = checkInDisabled;
    document.getElementById('checkOutBtnBottom').disabled = checkOutDisabled;
    document.getElementById('scanQrBtnBottom').disabled = qrScanDisabled;
}

function setButtonLoadingState(isCheckIn, isLoading, originalText) {
    const buttonId1 = isCheckIn ? 'checkInBtn' : 'checkOutBtn';
    const buttonId2 = isCheckIn ? 'checkInBtnBottom' : 'checkOutBtnBottom';
    
    const button1 = document.getElementById(buttonId1);
    const button2 = document.getElementById(buttonId2);
    
    if (isLoading) {
        const loadingHtml = `<span class="spinner"></span> MENGIRIM...`;
        button1.innerHTML = loadingHtml;
        button2.innerHTML = loadingHtml;
        button1.disabled = true;
        button2.disabled = true;
        document.getElementById('scanQrBtn').disabled = true;
        document.getElementById('scanQrBtnBottom').disabled = true;
    } else {
        button1.innerHTML = originalText;
        button2.innerHTML = originalText;
    }
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('realTimeClock').innerHTML = `
        <span class="date-display">${dateStr}</span>
        <span class="time-display">${timeStr}</span>
    `;
}

function formatTime(dateObj) {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function formatDate(dateObj) {
    return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTimeFromSheet(timestamp, type) {
    if (!timestamp) return null;
    
    try {
        const dateObj = new Date(timestamp);
        
        // Cek jika Apps Script mengembalikan format waktu yang aneh (misalnya '1899-12-30T...')
        if (isNaN(dateObj.getTime()) || timestamp.startsWith("1899-12-30")) {
            // Asumsi ini adalah kasus waktu/date-only Apps Script yang diformat
            if (type === 'time') {
                return String(timestamp).split('T')[1].split('.')[0]; // Coba ambil format HH:MM:SS
            }
        }
        
        if (type === 'date') {
            return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        
        return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    } catch (e) {
        console.error("Gagal memformat timestamp:", timestamp, e);
        return timestamp;
    }
}


// === FUNGSI QR CODE SCANNER ===

function openQrScanner() {
    if (!html5QrCode) {
        // Inisialisasi hanya sekali
        html5QrCode = new Html5Qrcode("reader");
    }
    
    if (!navigator.onLine) {
        document.getElementById('statusMessage').textContent = '❌ Koneksi terputus. Scan QR memerlukan koneksi internet untuk Check In otomatis.';
        return;
    }

    const scannerCard = document.getElementById('qr-scanner-card');
    scannerCard.style.display = 'block';
    currentScannerState = 'open';
    document.getElementById('themeToggle').style.display = 'none'; // Sembunyikan toggle

    setButtonState(true, true, true); // Nonaktifkan tombol lain saat scan

    // Konfigurasi kamera
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };

    html5QrCode.start(
        { facingMode: "environment" }, // Prioritaskan kamera belakang
        config,
        onScanSuccess,
        (errorMessage) => { /* Diabaikan agar tidak spam di console */ }
    ).catch(err => {
        document.getElementById('statusMessage').textContent = '❌ Gagal akses kamera: Pastikan Anda memberikan izin kamera.';
        console.error("Gagal memulai QR scanner:", err);
        closeQrScanner();
    });
    
    document.getElementById('statusMessage').textContent = 'Status: Pemindai QR terbuka. Arahkan ke QR Code Anda.';
}

function closeQrScanner() {
    if (currentScannerState === 'open' && html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('qr-scanner-card').style.display = 'none';
            currentScannerState = 'closed';
            document.getElementById('themeToggle').style.display = 'block'; 
            
            // Kembalikan status tombol berdasarkan currentAbsen
            if (currentAbsen) {
                 setButtonState(true, false, false);
                 document.getElementById('statusMessage').textContent = `Status: Anda masih Check In sejak ${currentAbsen.checkInTime}.`;
            } else {
                 setButtonState(false, true, false);
                 document.getElementById('statusMessage').textContent = 'Status: Pemindai ditutup. Siap untuk Check In.';
            }

        }).catch(err => {
            console.error("Gagal menghentikan QR scanner:", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (currentScannerState === 'closed') return;

    closeQrScanner(); // Hentikan pemindai setelah berhasil
    document.getElementById('statusMessage').textContent = `✅ QR Code terdeteksi. Memproses absensi...`;
    
    try {
        // Harap pastikan QR Code berisi JSON: {"nim": "123", "nama": "Budi"}
        const data = JSON.parse(decodedText);
        
        if (data.nim && data.nama) {
            // Isi form input otomatis
            document.getElementById('inputNIM').value = data.nim.trim();
            document.getElementById('inputNama').value = data.nama.trim();
            
            // Lakukan Check In otomatis
            checkIn('qr'); 
            
        } else {
            document.getElementById('statusMessage').textContent = '❌ Data QR Code tidak valid (Format NIM/Nama hilang).';
        }
    } catch (e) {
        document.getElementById('statusMessage').textContent = '❌ Format QR Code tidak dapat dibaca (bukan format JSON yang valid).';
        console.error("Kesalahan parsing QR Code:", e);
    }
}


// === FUNGSI UTAMA SERVER/ABSENSI ===

async function loadAbsensiHistory() {
    document.getElementById('absensiTableBody').innerHTML = '<tr><td colspan="7">Memuat riwayat absensi...</td></tr>';

    if (!navigator.onLine) {
         document.getElementById('absensiTableBody').innerHTML = '<tr><td colspan="7" style="color: var(--danger-color);">Anda sedang OFFLINE. Riwayat tidak dapat dimuat.</td></tr>';
         document.getElementById('statusMessage').textContent = '❌ Anda sedang OFFLINE. Cek koneksi internet Anda.';
         return; 
    }

    try {
        const fullUrl = `${API_URL}?action=GET_HISTORY`;
        const response = await fetch(fullUrl, { method: 'GET' });
        const text = await response.text();
        const jsonText = text.replace(/<pre>/g, '').replace(/<\/pre>/g, '');
        const serverResponse = JSON.parse(jsonText);

        const tableBody = document.getElementById('absensiTableBody');
        tableBody.innerHTML = ''; 
        let foundInProgress = false; 

        if (serverResponse.result === 'SUCCESS' && serverResponse.data && serverResponse.data.length > 0) {
            
            const data = serverResponse.data.reverse(); // Data terbaru di atas
            const today = formatDate(new Date());

            data.forEach(item => {
                const dateRaw = item[0];
                const checkInTimeRaw = item[1];
                const checkOutTimeRaw = item[2];
                
                const date = formatDateTimeFromSheet(dateRaw, 'date');
                const checkInTime = checkInTimeRaw ? formatDateTimeFromSheet(checkInTimeRaw, 'time') : null;
                const checkOutTime = checkOutTimeRaw ? formatDateTimeFromSheet(checkOutTimeRaw, 'time') : null;
                
                const nama = item[3];
                const nim = item[4];
                const kegiatan = item[5];
                
                const statusText = checkOutTime ? 'SELESAI' : 'IN PROGRESS';
                const statusColor = checkOutTime ? 'var(--main-accent-color)' : 'var(--success-color)';
                
                const newRow = tableBody.insertRow();
                newRow.innerHTML = `
                    <td>${date || dateRaw}</td>
                    <td>${checkInTime || checkInTimeRaw || '--:--:--'}</td>
                    <td>${checkOutTime || checkOutTimeRaw || '--:--:--'}</td>
                    <td>${nama}</td>
                    <td>${nim}</td>
                    <td>${kegiatan}</td>
                    <td style="color: ${statusColor}; font-weight: 600;">${statusText}</td>
                `;

                // Cek status absensi yang sedang berjalan
                if (!checkOutTime && date === today && !foundInProgress) {
                    currentAbsen = { date, checkInTime, nama, nim };
                    setButtonState(true, false, false); // Check In & Scan OFF, Check Out ON
                    document.getElementById('statusMessage').textContent = `Status: Anda masih Check In sejak ${checkInTime}.`;
                    document.getElementById('inputNama').value = nama;
                    document.getElementById('inputNIM').value = nim;
                    document.getElementById('inputNama').disabled = true;
                    document.getElementById('inputNIM').disabled = true;
                    foundInProgress = true;
                }
            });
            
            if (!foundInProgress) {
                 setButtonState(false, true, false); // Check In & Scan ON, Check Out OFF
                 document.getElementById('inputNama').disabled = false;
                 document.getElementById('inputNIM').disabled = false;
            }

        } else {
            document.getElementById('statusMessage').textContent = `❌ Gagal memuat riwayat: ${serverResponse.message || 'Error tidak diketahui'}.`;
            tableBody.innerHTML = '<tr><td colspan="7">Tidak ada riwayat absensi yang ditemukan.</td></tr>';
            setButtonState(false, true, false);
        }
        
    } catch (error) {
        console.error("Kesalahan memuat riwayat:", error);
        document.getElementById('absensiTableBody').innerHTML = '<tr><td colspan="7" style="color: var(--danger-color);">Gagal memuat riwayat dari server (Mungkin koneksi terputus).</td></tr>';
        setButtonState(true, true, true); // Semua mati jika ada error parah
    }
}

async function sendDataToServer(formData) {
    const params = new URLSearchParams(formData).toString();
    const fullUrl = `${API_URL}?${params}`;

    try {
        const response = await fetch(fullUrl, { method: 'POST' });
        const text = await response.text();
        const jsonText = text.replace(/<pre>/g, '').replace(/<\/pre>/g, '');
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Kesalahan koneksi:", error);
        document.getElementById('statusMessage').textContent = '❌ Gagal terhubung ke server. Cek koneksi internet atau URL Apps Script.';
        return { result: "ERROR", message: "Gagal terhubung ke server." };
    }
}

async function checkIn(source = 'manual') { 
    const isManual = (source === 'manual');
    
    if (!navigator.onLine) {
        document.getElementById('statusMessage').textContent = '❌ Koneksi terputus. Harap cek internet Anda sebelum Check In.';
        return;
    }
    
    // Validasi hanya jika Check In dilakukan manual
    if (isManual && !validateInput()) { 
        return; 
    }

    const nama = document.getElementById('inputNama').value.trim();
    const nim = document.getElementById('inputNIM').value.trim(); 
    const kegiatan = document.getElementById('inputKegiatan').value.trim();
    
    // Pengecekan data untuk QR: pastikan NIM dan Nama sudah terisi
    if (source === 'qr' && (nama === '' || nim === '' || kegiatan === '')) {
        document.getElementById('statusMessage').textContent = "⚠️ Absensi QR gagal. Pastikan data NIM dan Nama di QR sudah benar, dan kolom Kegiatan sudah diisi.";
        document.getElementById('inputKegiatan').classList.add('input-error');
        return;
    }

    if (currentAbsen) {
        document.getElementById('statusMessage').textContent = "⚠️ Anda sudah Check In. Harap Check Out terlebih dahulu.";
        return;
    }

    setButtonLoadingState(true, true, '✅ Check In Manual'); // Set loading state
    document.getElementById('statusMessage').textContent = 'Status: Mengirim data Check In... Mohon tunggu.';
    
    const now = new Date();
    const checkInTimeStr = formatTime(now);
    const dateStr = formatDate(now);
    
    const formData = {
        action: "CHECK_IN",
        date: dateStr,
        checkInTime: checkInTimeStr,
        nama: nama,
        nim: nim,
        kegiatan: kegiatan
    };

    const serverResponse = await sendDataToServer(formData);

    setButtonLoadingState(true, false, '✅ Check In Manual'); // Hapus loading state

    if (serverResponse.result === 'SUCCESS') {
        currentAbsen = formData;
        
        // Atur status tombol baru: Check In OFF, Check Out ON
        setButtonState(true, false, false); 
        document.getElementById('inputNama').disabled = true;
        document.getElementById('inputNIM').disabled = true;
        
        const type = isManual ? 'Manual' : 'QR Code';
        document.getElementById('statusMessage').textContent = `✅ Check In ${type} Berhasil pada ${checkInTimeStr}. Data tersimpan.`;
        
        loadAbsensiHistory(); 
        
    } else {
        document.getElementById('statusMessage').textContent = `❌ Check In Gagal: ${serverResponse.message}. Coba lagi.`;
        // Kembalikan ke state awal jika gagal
        setButtonState(false, true, false); 
    }
}

async function checkOut() {
    
    if (!navigator.onLine) {
        document.getElementById('statusMessage').textContent = '❌ Koneksi terputus. Harap cek internet Anda sebelum Check Out.';
        return;
    }

    if (!currentAbsen) {
        document.getElementById('statusMessage').textContent = "⚠️ Anda belum Check In hari ini.";
        return;
    }

    setButtonLoadingState(false, true, '🚪 Check Out'); // Set loading state
    document.getElementById('statusMessage').textContent = 'Status: Mengirim data Check Out... Mohon tunggu.';

    const now = new Date();
    const checkOutTimeStr = formatTime(now);
    
    const formData = {
        action: "CHECK_OUT",
        date: currentAbsen.date, 
        checkOutTime: checkOutTimeStr,
        nim: currentAbsen.nim
    };

    const serverResponse = await sendDataToServer(formData);

    setButtonLoadingState(false, false, '🚪 Check Out'); // Hapus loading state

    if (serverResponse.result === 'SUCCESS') {
        currentAbsen = null;
        
        // Atur status tombol baru: Check In ON, Check Out OFF
        setButtonState(false, true, false); 
        document.getElementById('inputNama').disabled = false;
        document.getElementById('inputNIM').disabled = false;
        document.getElementById('inputKegiatan').value = ''; // Kosongkan kegiatan setelah Check Out
        document.getElementById('inputNama').value = ''; // Kosongkan nama
        document.getElementById('inputNIM').value = ''; // Kosongkan NIM

        document.getElementById('statusMessage').textContent = `🚪 Check Out Berhasil pada ${checkOutTimeStr}. Data tersimpan.`;
        
        loadAbsensiHistory(); 

    } else {
        document.getElementById('statusMessage').textContent = `❌ Check Out Gagal: ${serverResponse.message}. Coba lagi.`;
        // Tetap di state Check Out ON jika gagal
        setButtonState(true, false, false); 
    }
}