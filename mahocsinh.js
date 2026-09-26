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

// 2. HÀM TẠO / TÌM MÃ HỌC SINH (Đã bỏ phần thông báo Đi muộn / Đúng giờ)
async function ghepMa() {
    let ten = document.getElementById("tenInput").value.trim();
    let lop = document.getElementById("lopInput").value.trim();

    if (ten === "" || lop === "") {
        document.getElementById("ketQua").innerText = "Phải điền đủ Họ tên và Lớp!";
        return;
    }

    document.getElementById("ketQua").innerText = "Đang xử lý...";

    const client = getSupabase();
    if (!client) {
        document.getElementById("ketQua").innerText = "Chưa kết nối được Server Cloud!";
        return;
    }

    // BƯỚC 1: Kiểm tra xem học sinh đã có trên Supabase Cloud chưa
    const { data: records, error: searchError } = await client
        .from('QLHS')
        .select('ma_hs')
        .eq('hoten', ten)
        .eq('lop', lop);

    if (!searchError && records && records.length > 0) {
        // Học sinh cũ -> Lấy mã cũ
        let maSoCu = records[0].ma_hs;
        document.getElementById("ketQua").innerHTML = `
            <span style="color: #10b981; font-weight: bold;">Mã học sinh của bạn là:</span><br>
            <b style="font-size: 1.2em; color: #0284c7;">${maSoCu}</b>
        `;
    } else {
        // Học sinh mới -> Tạo mã mới
        let soNgauNhien = Math.floor(1000 + Math.random() * 9000);
        let maSoMoi = "HS" + soNgauNhien;

        const { error: insertError } = await client
            .from('QLHS')
            .insert([{ 
                hoten: ten, 
                lop: lop, 
                ma_hs: maSoMoi
            }]);

        if (insertError) {
            document.getElementById("ketQua").innerText = "Lỗi tạo mã: " + insertError.message;
        } else {
            document.getElementById("ketQua").innerHTML = `
                <span style="color: #10b981; font-weight: bold;">Tạo mã thành công!</span><br>
                Mã của bạn: <b style="font-size: 1.2em; color: #0284c7;">${maSoMoi}</b>
            `;
        }
    }
}
