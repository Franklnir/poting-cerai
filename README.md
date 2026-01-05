# Potting Survey Neo Brutalism (20 Items) — React + Vite + Supabase

Form survey 20 item (Likert 1–5) tanpa esai, UI Neo Brutalism cerah.
- Responden **anonim** bisa **submit** saja.
- Halaman **/public** menampilkan **statistik agregat** + grafik (aman untuk privasi).
- Halaman **/admin** untuk melihat data mentah **khusus admin login Supabase**.

## 1) Setup Supabase
1. Buat Project Supabase
2. Buka **SQL Editor** lalu jalankan file: `supabase.sql`
3. Buat akun admin:
   - Supabase → Authentication → Users → **Add user**
   - Catat email & password
   - Jalankan SQL berikut (ganti USER_ID dengan id user admin):
     ```sql
     insert into public.admin_users(user_id) values ('USER_ID');
     ```

## 2) Setup ENV
Copy `.env.example` menjadi `.env` lalu isi:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3) Jalankan
```bash
npm install
npm run dev -- --host
```

Buka:
- Survey: `http://IP_KAMU:5173/`
- Dashboard publik: `http://IP_KAMU:5173/public`
- Admin: `http://IP_KAMU:5173/admin`

## 4) Deploy (link publik)
### Vercel
- Import project
- Set env vars (Supabase URL & anon key)
- Framework: Vite (auto)

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- File `_redirects` sudah disediakan untuk SPA routing.

## Catatan Etika
Topik sensitif. Dashboard publik hanya agregat. Data mentah hanya untuk admin yang diberi akses.
