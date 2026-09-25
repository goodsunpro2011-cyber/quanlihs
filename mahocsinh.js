// 1. CHÌA KHÓA KẾT NỐI SUPABASE
const SUPABASE_URL = 'https://grgoseaoavefkcflfnna.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G0KXCxStbLCT6Wh5CHsAkQ_6g0Ni1cM';

// Khởi tạo Supabase client an toàn
let _supabaseClient = null;

function getSupabase() {
    if (!_supabaseClient && window.supabase) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _supabaseClient;
}

async function ghepMa() {
    let ten = document.getElementById("tenInput").value.trim();
    let lop = document.getElementById("lopInput").value.trim();

    if (ten === "" || lop === "") {
        document.getElementById("ketQua").innerText = "Phải điền đủ";
        return;
    }

    document.getElementById("ketQua").innerText = "Đang kiểm tra...";

    // --- BƯỚC 1: KIỂM TRA TRONG LOCALSTORAGE ---
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        try {
            let item = JSON.parse(localStorage.getItem(key));
            if (item && item.ten === ten && item.lop === lop) {
                document.getElementById("ketQua").innerText = "Mã cũ của bạn (Local): " + item.maSo;
                return; // Tìm thấy trên máy -> Dừng luôn
            }
        } catch(e) {
            // Bỏ qua nếu dữ liệu không phải JSON
        }
    }

    // --- BƯỚC 2: TÌM TRÊN SUPABASE CLOUD (Nếu Local không có) ---
    const client = getSupabase();

    if (client) {
        const { data: records, error: searchError } = await client
            .from('QLHS')
            .select('ma_hs')
            .eq('hoten', ten)
            .eq('lop', lop);

        if (!searchError && records && records.length > 0) {
            // Đã tìm thấy học sinh này trong Database Supabase!
            let maSoCu = records[0].ma_hs;

            // Đồng bộ ngược lại vào LocalStorage trên máy người dùng
            let hocSinh = { ten: ten, lop: lop, maSo: maSoCu };
            localStorage.setItem(maSoCu, JSON.stringify(hocSinh));

            document.getElementById("ketQua").innerText = "Mã cũ của bạn (Database): " + maSoCu;
            return; // Dừng lại, không tạo mã mới
        }
    }

    // --- BƯỚC 3: TẠO MÃ MỚI TOÀN BỘ (Nếu cả Local và Supabase đều chưa có) ---
    let soNgauNhien = Math.floor(1000 + Math.random() * 9000);
    let maSoMoi = "HS" + soNgauNhien;

    if (!client) {
        // Dự phòng khi mất mạng / không kết nối được Supabase
        let hocSinh = { ten: ten, lop: lop, maSo: maSoMoi };
        localStorage.setItem(maSoMoi, JSON.stringify(hocSinh));
        document.getElementById("ketQua").innerText = "Mã mới của bạn: " + maSoMoi + " (Đã lưu Local)";
        return;
    }

    // Gửi học sinh mới lên Supabase
    const { error: insertError } = await client
        .from('QLHS')
        .insert([
            { 
                hoten: ten, 
                lop: lop, 
                ma_hs: maSoMoi 
            }
        ]);

    if (insertError) {
        console.error("Lỗi Supabase:", insertError.message);
        document.getElementById("ketQua").innerText = "Mã mới: " + maSoMoi + " (Lỗi lưu Cloud: " + insertError.message + ")";
    } else {
        // Lưu vào localStorage sau khi đẩy thành công lên Cloud
        let hocSinh = { ten: ten, lop: lop, maSo: maSoMoi };
        localStorage.setItem(maSoMoi, JSON.stringify(hocSinh));

        document.getElementById("ketQua").innerText = "Mã mới của bạn: " + maSoMoi + " (Đã lưu vào Database!)";
    }
}