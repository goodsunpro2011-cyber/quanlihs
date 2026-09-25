// 1. CHÌA KHÓA KẾT NỐI SUPABASE
const SUPABASE_URL = 'https://grgoseaoavefkcflfnna.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G0KXCxStbLCT6Wh5CHsAkQ_6g0Ni1cM';

let _supabaseClient = null;
function getSupabase() {
    if (!_supabaseClient && window.supabase) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _supabaseClient;
}

// Chuyển function thành async để dùng await tra cứu dữ liệu
document.getElementById("btnCheck").addEventListener("click", async function () {
    // 1. Lấy mã nhập vào
    let maNhap = document.getElementById("studentCode").value.trim().toUpperCase();

    if (maNhap === "") {
        document.getElementById("thongBaoCheck").innerText = "Vui lòng nhập mã học sinh!";
        document.getElementById("thongBaoCheck").style.color = "#f59e0b";
        return;
    }

    document.getElementById("thongBaoCheck").innerText = "Đang kiểm tra dữ liệu...";
    document.getElementById("thongBaoCheck").style.color = "#3b82f6";

    let hocSinh = null;

    // 2A. BƯỚC 1: Tìm nhanh trong LocalStorage trước
    let duLieuLocal = localStorage.getItem(maNhap);
    if (duLieuLocal) {
        try {
            hocSinh = JSON.parse(duLieuLocal);
        } catch (e) {}
    }

    // 2B. BƯỚC 2: Nếu LocalStorage không có, tra cứu trực tiếp trên Supabase Database
    if (!hocSinh) {
        const client = getSupabase();
        if (client) {
            const { data: records, error } = await client
                .from('QLHS')
                .select('*')
                .eq('ma_hs', maNhap);

            if (!error && records && records.length > 0) {
                // Tìm thấy học sinh trên Supabase Cloud!
                let record = records[0];
                hocSinh = {
                    ten: record.hoten,
                    lop: record.lop,
                    maSo: record.ma_hs
                };
                // Đồng bộ ngược lại LocalStorage để lần sau dùng nhanh hơn
                localStorage.setItem(maNhap, JSON.stringify(hocSinh));
            }
        }
    }

    // 3. Kiểm tra kết quả và xử lý điểm danh
    if (!hocSinh) {
        document.getElementById("thongBaoCheck").innerText = "Mã này không tồn tại";
        document.getElementById("thongBaoCheck").style.color = "#ef4444";
    } else {
        // --- XỬ LÝ THỜI GIAN VÀ TRẠNG THÁI ---
        let now = new Date();
        let gio = now.getHours();
        let phut = now.getMinutes();

        // Mốc chốt cổng: 07:15
        let trangThai = "Đúng giờ";
        if (gio > 7 || (gio === 7 && phut > 15)) {
            trangThai = "Đi muộn";
        }

        // Định dạng chuỗi thời gian hiển thị
        let thoiGianStr = now.toLocaleTimeString("vi-VN") + " - " + now.toLocaleDateString("vi-VN");

        // --- LƯU LỊCH SỬ ĐỂ TRANG 3 ĐỌC DỮ LIỆU ---
        let luotDiemDanh = {
            maSo: maNhap,
            ten: hocSinh.ten,
            lop: hocSinh.lop,
            thoiGian: thoiGianStr,
            trangThai: trangThai
        };

        // Lưu bản ghi điểm danh này theo key riêng để Trang 3 vẽ bảng
        let keyLichSu = "CHECKIN_" + maNhap + "_" + Date.now();
        localStorage.setItem(keyLichSu, JSON.stringify(luotDiemDanh));

        // --- HIỂN THỊ KẾT QUẢ RA MÀN HÌNH ---
        let mauTrangThai = trangThai === "Đi muộn" ? "#ef4444" : "#10b981";
        
        document.getElementById("thongBaoCheck").innerHTML = 
            `Học sinh: <b>${hocSinh.ten}</b> - Lớp: <b>${hocSinh.lop}</b><br>` +
            `Trạng thái: <span style="color: ${mauTrangThai}; font-weight: bold;">${trangThai}</span> (${thoiGianStr})`;
    }
});