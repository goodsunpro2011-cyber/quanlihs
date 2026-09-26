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

// ==========================================
// 2. TẢI DỮ LIỆU TỪ SUPABASE CLOUD
// ==========================================
async function fetchStudentsFromCloud() {
    const client = getSupabase();
    if (!client) return [];

    // Lấy toàn bộ danh sách học sinh từ Supabase QLHS
    const { data, error } = await client.from('QLHS').select('*');
    if (error || !data) {
        console.error("Lỗi lấy dữ liệu Supabase:", error);
        return [];
    }

    return data.map(item => {
        // Xử lý định dạng thời gian từ cột created_at của Supabase
        let formattedTime = "Chưa quét";
        if (item.created_at) {
            const dateObj = new Date(item.created_at);
            if (!isNaN(dateObj.getTime())) {
                const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = dateObj.toLocaleDateString('vi-VN');
                formattedTime = `${timeStr} - ${dateStr}`;
            }
        }

        return {
            maSo: item.ma_hs || "",
            ten: item.hoten || "",
            lop: item.lop || "Chưa xếp",
            trangThai: item.trang_thai || "Chưa điểm danh",
            thoiGian: formattedTime,
            rawDate: item.created_at ? item.created_at.split('T')[0] : ""
        };
    });
}

// ==========================================
// 3. HIỂN THỊ DỮ LIỆU RA BẢNG HTML
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

        let status = student.trangThai;
        let timeAndDate = student.thoiGian;
        let statusColor = "#888";

        if (status === "Muộn giờ" || status === "Đi muộn") {
            statusColor = "#ef4444";
        } else if (status === "Đúng giờ") {
            statusColor = "#10b981";
        }

        row.innerHTML = `
            <td><b>${student.maSo}</b></td>
            <td>${student.ten}</td>
            <td>${student.lop}</td>
            <td>${timeAndDate}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
        `;
        tableBody.appendChild(row);
    });
}

// ==========================================
// 4. TÌM KIẾM VÀ LỌC DỮ LIỆU
// ==========================================
function filterStudents() {
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const showOntime = ontimeFilter ? ontimeFilter.checked : false;
    const showLate = lateFilter ? lateFilter.checked : false;
    const selectedDate = dateFilter ? dateFilter.value : "";

    const filtered = students.filter(student => {
        // Lọc theo Tên hoặc Mã
        const name = (student.ten || "").toLowerCase();
        const code = (student.maSo || "").toLowerCase();
        const matchSearch = name.includes(keyword) || code.includes(keyword);
        if (!matchSearch) return false;

        // Lọc theo Trạng thái
        let matchStatus = true;
        if (showOntime || showLate) {
            let status = student.trangThai;
            if (showOntime && !showLate) {
                matchStatus = (status === "Đúng giờ");
            } else if (!showOntime && showLate) {
                matchStatus = (status === "Muộn giờ" || status === "Đi muộn");
            } else {
                matchStatus = (status === "Đúng giờ" || status === "Muộn giờ" || status === "Đi muộn");
            }
        }

        // Lọc theo Ngày
        let matchDate = true;
        if (selectedDate && student.rawDate) {
            matchDate = (student.rawDate === selectedDate);
        }

        return matchSearch && matchStatus && matchDate;
    });

    displayStudents(filtered);
}

// ==========================================
// 5. XUẤT FILE EXCEL / CSV
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
// 6. KHỞI CHẠY VÀ TỰ ĐỘNG CẬP NHẬT
// ==========================================
async function loadData() {
    students = await fetchStudentsFromCloud();
    filterStudents();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();

    // Tự động tải lại dữ liệu mới từ Cloud mỗi 3 giây
    setInterval(loadData, 3000);

    // Gắn sự kiện lọc
    if (searchInput) searchInput.addEventListener("input", filterStudents);
    if (ontimeFilter) ontimeFilter.addEventListener("change", filterStudents);
    if (lateFilter) lateFilter.addEventListener("change", filterStudents);
    if (dateFilter) dateFilter.addEventListener("change", filterStudents);
    if (downloadButton) downloadButton.addEventListener("click", downloadTable);
});
