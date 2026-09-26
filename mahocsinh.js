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

// Hàm tính toán trạng thái Đúng giờ hay Muộn giờ tự động
function tinhTrangThaiDiemDanh() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Quy định: Mốc điểm danh là 7h15 sáng
    // Nếu vào trước 7h15 -> Đúng giờ, từ 7h15 trở đi -> Muộn giờ
    if (hours < 7 || (hours === 7 && minutes <= 15)) {
        return "Đúng giờ";
    } else {
        return "Muộn giờ";
    }
}

// 2. HÀM TẠO / TÌM MÃ VÀ TỰ ĐỘNG ĐIỂM DANH
async function ghepMa() {
    let ten = document.getElementById("tenInput").value.trim();
    let lop = document.getElementById("lopInput").value.trim();

    if (ten === "" || lop === "") {
        document.getElementById("ketQua").innerText = "Phải điền đủ Họ tên và Lớp!";
        return;
    }

    document.getElementById("ketQua").innerText = "Đang xử lý điểm danh...";

    const client = getSupabase();
    if (!client) {
        document.getElementById("ketQua").innerText = "Chưa kết nối được Server Cloud!";
        return;
    }

    // Tự động xác định trạng thái "Đúng giờ" hoặc "Muộn giờ"
    const trangThaiMoi = tinhTrangThaiDiemDanh();
    const nowISO = new Date().toISOString(); // Cập nhật lại thời gian vừa quét

    // BƯỚC 1: Kiểm tra xem học sinh đã có trên Supabase Cloud chưa
    const { data: records, error: searchError } = await client
        .from('QLHS')
        .select('ma_hs')
        .eq('hoten', ten)
        .eq('lop', lop);

    let maSoTarget = "";

    if (!searchError && records && records.length > 0) {
        // Học sinh cũ -> Cập nhật điểm danh cho mã cũ
        maSoTarget = records[0].ma_hs;
        
        const { error: updateError } = await client
            .from('QLHS')
            .update({ 
                trang_thai: trangThaiMoi,
                created_at: nowISO 
            })
            .eq('ma_hs', maSoTarget);

        if (updateError) {
            document.getElementById("ketQua").innerText = "Lỗi điểm danh: " + updateError.message;
        } else {
            document.getElementById("ketQua").innerHTML = `
                <span style="color: #10b981; font-weight: bold;">
                    Đã điểm danh (${trangThaiMoi})!
                </span><br>Mã của bạn: <b>${maSoTarget}</b>
            `;
        }
    } else {
        // Học sinh mới -> Tạo mã mới và lưu điểm danh luôn
        let soNgauNhien = Math.floor(1000 + Math.random() * 9000);
        maSoTarget = "HS" + soNgauNhien;

        const { error: insertError } = await client
            .from('QLHS')
            .insert([{ 
                hoten: ten, 
                lop: lop, 
                ma_hs: maSoTarget,
                trang_thai: trangThaiMoi,
                created_at: nowISO
            }]);

        if (insertError) {
            document.getElementById("ketQua").innerText = "Lỗi tạo mã: " + insertError.message;
        } else {
            document.getElementById("ketQua").innerHTML = `
                <span style="color: #10b981; font-weight: bold;">
                    Tạo mã & Điểm danh thành công (${trangThaiMoi})!
                </span><br>Mã của bạn: <b>${maSoTarget}</b>
            `;
        }
    }
}
