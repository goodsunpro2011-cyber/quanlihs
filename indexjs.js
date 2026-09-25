// ==========================================
// 1. CHÌA KHÓA KẾT NỐI SUPABASE CLOUD
// ==========================================
const SUPABASE_URL = 'https://grgoseaoavefkcflfnna.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G0KXCxStbLCT6Wh5CHsAkQ_6g0Ni1cM';

let _supabaseClient = null;
function getSupabase() {
    if (!_supabaseClient && window.supabase) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _supabaseClient;
}

// Bắt các phần tử HTML
const tableBody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");
const ontimeFilter = document.getElementById("ontimeFilter");
const lateFilter = document.getElementById("lateFilter");
const dateFilter = document.getElementById("dateFilter");
const downloadButton = document.getElementById("downloadButton");

let students = [];
let checkins = [];

// ==========================================
// 2. TẢI DỮ LIỆU HỌC SINH (LOCAL + SUPABASE)
// ==========================================
async function fetchStudents() {
    const list = [];
    
    // A. Quét LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("HS")) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.maSo) list.push(data);
            } catch (e) {}
        }
    }

    // B. Quét thêm từ Supabase Cloud để phòng trường hợp máy mới / xóa LocalStorage
    const client = getSupabase();
    if (client) {
        const { data, error } = await client.from('QLHS').select('*');
        if (!error && data) {
            data.forEach(item => {
                // Nếu chưa có trong danh sách thì thêm vào
                if (!list.some(s => s.maSo === item.ma_hs)) {
                    list.push({
                        maSo: item.ma_hs,
                        ten: item.hoten,
                        lop: item.lop
                    });
                }
            });
        }
    }
    return list;
}

// ==========================================
// 3. TẢI LỊCH SỬ ĐIỂM DANH (LOCALSTORAGE)
// ==========================================
function getCheckins() {
    const list = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("CHECKIN_")) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data) list.push(data);
            } catch (e) {}
        }
    }
    return list;
}

function getLatestCheckin(maSo) {
    const result = checkins.filter(c => c.maSo === maSo);
    if (result.length === 0) return null;
    return result[result.length - 1]; // Lấy lượt điểm danh mới nhất
}

// ==========================================
// 4. HIỂN THỊ DỮ LIỆU RA BẢNG HTML (ĐÃ SỬA CHUẨN CỘT)
// ==========================================
function displayStudents(list) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (list.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #888;">
                    Không tìm thấy dữ liệu học sinh
                </td>
            </tr>`;
        return;
    }

    list.forEach(student => {
        const row = document.createElement("tr");
        const latestCheckin = getLatestCheckin(student.maSo);

        let timeAndDate = "Chưa quét";
        let status = "Chưa điểm danh";
        let statusColor = "#888";

        if (latestCheckin) {
            timeAndDate = latestCheckin.thoiGian || "Đã quét";
            status = latestCheckin.trangThai === "Đi muộn" ? "Muộn giờ" : latestCheckin.trangThai;
            statusColor = (status === "Muộn giờ" || status === "Đi muộn") ? "#ef4444" : "#10b981";
        }

        // Cấu trúc cột chuẩn: Mã học sinh | Họ và tên | Lớp | Thời gian quét | Trạng thái
        row.innerHTML = `
            <td><b>${student.maSo || ""}</b></td>
            <td>${student.ten || ""}</td>
            <td>${student.lop || "Chưa xếp"}</td>
            <td>${timeAndDate}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
        `;
        tableBody.appendChild(row);
    });
}

// ==========================================
// 5. TÌM KIẾM VÀ LỌC DỮ LIỆU
// ==========================================
function filterStudents() {
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const showOntime = ontimeFilter ? ontimeFilter.checked : false;
    const showLate = lateFilter ? lateFilter.checked : false;
    const selectedDate = dateFilter ? dateFilter.value : "";

    const filtered = students.filter(student => {
        // A. Tìm theo Tên hoặc Mã HS
        const name = (student.ten || "").toLowerCase();
        const code = (student.maSo || "").toLowerCase();
        const matchSearch = name.includes(keyword) || code.includes(keyword);
        if (!matchSearch) return false;

        const latestCheckin = getLatestCheckin(student.maSo);

        // B. Lọc theo Trạng thái (Đúng giờ / Muộn giờ)
        let matchStatus = true;
        if (showOntime || showLate) {
            if (!latestCheckin) return false;

            let status = latestCheckin.trangThai === "Đi muộn" ? "Muộn giờ" : latestCheckin.trangThai;

            if (showOntime && !showLate) {
                matchStatus = (status === "Đúng giờ");
            } else if (!showOntime && showLate) {
                matchStatus = (status === "Muộn giờ");
            } else {
                matchStatus = (status === "Đúng giờ" || status === "Muộn giờ");
            }
        }

        // C. Lọc theo Ngày quét
        let matchDate = true;
        if (selectedDate) {
            if (!latestCheckin) return false;

            const parts = selectedDate.split("-"); // Dạng YYYY-MM-DD từ input date
            const formattedDate = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`; // Đổi thành D/M/YYYY

            const studentCheckins = checkins.filter(c => c.maSo === student.maSo);
            matchDate = studentCheckins.some(c => {
                const checkinTimeStr = c.thoiGian || "";
                return checkinTimeStr.includes(formattedDate);
            });
        }

        return matchSearch && matchStatus && matchDate;
    });

    displayStudents(filtered);
}

// ==========================================
// 6. XUẤT FILE EXCEL / CSV
// ==========================================
function downloadTable() {
    const rows = tableBody.querySelectorAll("tr");
    let csv = "Mã học sinh,Họ và tên,Lớp,Thời gian quét,Trạng thái\n";

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length !== 5) return;

        const rowData = [];
        cells.forEach(cell => {
            rowData.push(`"${cell.innerText.replace(/"/g, '""')}"`);
        });
        csv += rowData.join(",") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bang-thong-ke-hoc-sinh.csv";
    link.click();
    URL.revokeObjectURL(url);
}

// ==========================================
// 7. KHỞI CHẠY TRANG WEB
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Lấy lịch sử checkin & danh sách học sinh
    checkins = getCheckins();
    students = await fetchStudents();

    // Hiển thị dữ liệu
    displayStudents(students);

    // Lắng nghe sự kiện người dùng tương tác
    if (searchInput) searchInput.addEventListener("input", filterStudents);
    if (ontimeFilter) ontimeFilter.addEventListener("change", filterStudents);
    if (lateFilter) lateFilter.addEventListener("change", filterStudents);
    if (dateFilter) dateFilter.addEventListener("change", filterStudents);
    if (downloadButton) downloadButton.addEventListener("click", downloadTable);
});