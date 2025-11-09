const API_URL = "https://script.google.com/macros/s/AKfycbz7jl9xrzl85VGQZjAOnfzSH66kuXm4zA672tPhTetfRuJejvt1rKChPrpPQQcex3e4dA/exec"; // <--- JANGAN LUPA GANTI URL INI!
let currentAbsen = null;

document.addEventListener('DOMContentLoaded', initializeAbsensi);

function initializeAbsensi() {
    // Memastikan tombol dalam keadaan awal
    currentAbsen = null;
    setButtonState(false, true); // (checkIn: enabled, checkOut: disabled)
    document.getElementById('statusMessage').textContent = 'Status: Siap untuk Check In.';
    document.getElementById('inputNama').disabled = false;
    document.getElementById('inputNIM').disabled = false;
    
    // Panggil fungsi jam saat inisialisasi dan ulangi setiap detik
    updateClock();
    setInterval(updateClock, 1000); 
    
    // Tambahkan listener untuk membersihkan error saat pengguna mulai mengetik
    setupInputListeners();

    // BARU: Tambahkan listener untuk tombol Enter
    document.addEventListener('keypress', handleEnterKey);

    loadAbsensiHistory(); 
}

/** FUNGSI BARU: Memicu checkIn() ketika tombol Enter ditekan. */
function handleEnterKey(event) {
    // Pastikan tombol yang ditekan adalah Enter
    if (event.key === 'Enter' || event.keyCode === 13) {
        // Mencegah default action (seperti submit form jika ada)
        event.preventDefault(); 
        
        // Hanya picu checkIn jika tombol checkIn tidak disabled
        if (!document.getElementById('checkInBtn').disabled) {
            checkIn();
        } else if (!document.getElementById('checkOutBtn').disabled) {
             // Jika tombol Check Out aktif, kita bisa memicu checkOut()
             checkOut();
        }
    }
}

/** Fungsi untuk mengatur status DUA pasang tombol Check In/Out */
function setButtonState(checkInDisabled, checkOutDisabled) {
    // Tombol Atas
    document.getElementById('checkInBtn').disabled = checkInDisabled;
    document.getElementById('checkOutBtn').disabled = checkOutDisabled;
    
    // Tombol Bawah (Sticky Footer)
    document.getElementById('checkInBtnBottom').disabled = checkInDisabled;
    document.getElementById('checkOutBtnBottom').disabled = checkOutDisabled;
}

/** * Fungsi untuk menampilkan loading spinner pada SEMUA tombol Check In/Out. */
function setButtonLoadingState(originalButtonId, isLoading, originalText) {
    const isCheckIn = originalButtonId ? originalButtonId.includes('checkIn') : !currentAbsen;
    
    // Tentukan ID kedua tombol (atas dan bawah)
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
    } else {
        // Hanya perlu mengembalikan teks, status disabled diatur oleh setButtonState
        button1.innerHTML = originalText;
        button2.innerHTML = originalText;
    }
}

/** FUNGSI untuk membersihkan kelas error saat pengguna mulai mengetik */
function setupInputListeners() {
    const inputs = ['inputNama', 'inputNIM', 'inputKegiatan'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('input', () => {
            if (element.value.trim() !== '') {
                element.classList.remove('input-error');
            }
        });
    });
}

/** Validasi Input dan menampilkan error visual */
function validateInput() {
    const nama = document.getElementById('inputNama');
    const nim = document.getElementById('inputNIM');
    const kegiatan = document.getElementById('inputKegiatan');

    let isValid = true;
    let errorFields = [];

    // Cek Nama
    if (nama.value.trim() === '') {
        nama.classList.add('input-error');
        errorFields.push("Nama");
        isValid = false;
    } else {
        nama.classList.remove('input-error');
    }
    
    // Cek NIM
    if (nim.value.trim() === '') {
        nim.classList.add('input-error');
        errorFields.push("NIM");
        isValid = false;
    } else {
        nim.classList.remove('input-error');
    }
    
    // Cek Kegiatan
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


// === FUNGSI UTILITAS WAKTU SAMA SEPERTI SEBELUMNYA ===

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('realTimeClock').innerHTML = `
        <span class="date-display">${dateStr}</span>
        <span class="time-display">${timeStr}</span>
    `;
}

function formatDateTimeFromSheet(timestamp, type) {
    if (!timestamp) return null;
    
    try {
        const dateObj = new Date(timestamp);
        
        if (isNaN(dateObj.getTime()) || timestamp.startsWith("1899-12-30")) {
            const timePart = timestamp.split('T')[1].split('.')[0];
            
            if (type === 'time') {
                const hours = parseInt(timePart.split(':')[0]);
                const minutes = timePart.split(':')[1];
                const seconds = timePart.split(':')[2];
                
                return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
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

function formatTime(dateObj) {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function formatDate(dateObj) {
    return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


// === FUNGSI UTAMA (loadAbsensiHistory, sendDataToServer) SAMA SEPERUMYA ===

async function loadAbsensiHistory() {
    document.getElementById('absensiTableBody').innerHTML = '<tr><td colspan="7">Memuat riwayat absensi...</td></tr>';

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
            
            const data = serverResponse.data.reverse(); 
            
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

                const today = formatDate(new Date());
                if (!checkOutTime && date === today && !foundInProgress) {
                    currentAbsen = { date, checkInTime, nama, nim };
                    setButtonState(true, false); 
                    document.getElementById('statusMessage').textContent = `Status: Anda masih Check In sejak ${checkInTime}.`;
                    document.getElementById('inputNama').value = nama;
                    document.getElementById('inputNIM').value = nim;
                    document.getElementById('inputNama').disabled = true;
                    document.getElementById('inputNIM').disabled = true;
                    foundInProgress = true;
                }
            });
            
            if (tableBody.rows.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">Tidak ada riwayat absensi yang ditemukan.</td></tr>';
            }
            
        } else {
            tableBody.innerHTML = '<tr><td colspan="7">Tidak ada riwayat absensi yang ditemukan.</td></tr>';
        }
        
    } catch (error) {
        console.error("Kesalahan memuat riwayat:", error);
        document.getElementById('absensiTableBody').innerHTML = '<tr><td colspan="7" style="color: var(--danger-color);">Gagal memuat riwayat dari server.</td></tr>';
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
        document.getElementById('statusMessage').textContent = '❌ Gagal terhubung ke server. Cek koneksi internet.';
        return { result: "ERROR", message: "Gagal terhubung ke server." };
    }
}

async function checkIn() {
    // Gunakan nilai null/undefined untuk callerId jika dipicu oleh tombol Enter
    const callerId = event && event.currentTarget ? event.currentTarget.id : null; 
    
    if (!validateInput()) {
        return; 
    }

    const nama = document.getElementById('inputNama').value.trim();
    const nim = document.getElementById('inputNIM').value.trim();
    const kegiatan = document.getElementById('inputKegiatan').value.trim();

    if (currentAbsen) {
        document.getElementById('statusMessage').textContent = "⚠️ Anda sudah Check In. Harap Check Out terlebih dahulu.";
        return;
    }

    setButtonLoadingState(callerId, true, '✅ Check In');
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

    setButtonLoadingState(callerId, false, '✅ Check In');

    if (serverResponse.result === 'SUCCESS') {
        currentAbsen = formData;
        
        setButtonState(true, false); 
        document.getElementById('inputNama').disabled = true;
        document.getElementById('inputNIM').disabled = true;
        document.getElementById('statusMessage').textContent = `✅ Check In Berhasil pada ${checkInTimeStr}. Data tersimpan.`;
        
        loadAbsensiHistory(); 
        
    } else {
        document.getElementById('statusMessage').textContent = `❌ Check In Gagal: ${serverResponse.message}. Coba lagi.`;
        setButtonState(false, true); 
    }
}

async function checkOut() {
    const callerId = event && event.currentTarget ? event.currentTarget.id : null; 

    if (!currentAbsen) {
        document.getElementById('statusMessage').textContent = "⚠️ Anda belum Check In hari ini.";
        return;
    }

    setButtonLoadingState(callerId, true, '🚪 Check Out');
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

    setButtonLoadingState(callerId, false, '🚪 Check Out');

    if (serverResponse.result === 'SUCCESS') {
        currentAbsen = null;
        
        setButtonState(false, true); 
        document.getElementById('inputNama').disabled = false;
        document.getElementById('inputNIM').disabled = false;
        document.getElementById('statusMessage').textContent = `🚪 Check Out Berhasil pada ${checkOutTimeStr}. Data tersimpan.`;
        
        loadAbsensiHistory(); 

    } else {
        document.getElementById('statusMessage').textContent = `❌ Check Out Gagal: ${serverResponse.message}. Coba lagi.`;
        setButtonState(true, false); 
    }
}