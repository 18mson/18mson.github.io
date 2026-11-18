# portofolio-son

Portofolio satu halaman: kolam koi interaktif + timeline scroll.

## Jalankan
```bash
npm install
npm run dev
```

## Struktur Folder (`src/`)

```
src/
├── app/                      # Entry point App Router, layout global, dan perakitan fitur halaman utama
├── features/                 # Fitur mandiri aplikasi yang merangkum UI dan logika spesifik
│   ├── hero/                 # Bagian Hero dengan nama sticky, blend difference, dan scroll background
│   ├── koi-pond/             # Kolam koi interaktif (React wrapper dan Canvas 2D engine)
│   │   └── engine/           # Mesin simulasi koi dan air Canvas 2D murni tanpa dependensi luar
│   └── timeline/             # Bagian timeline perjalanan karir dan kartu interaktif dengan ScrollTrigger
├── components/               # Komponen UI dan layout global yang dapat digunakan kembali
│   ├── layout/               # Komponen layout global seperti penyedia smooth scroll Lenis
│   └── ui/                   # Komponen primitif antarmuka pengguna
├── content/                  # Data konten statis portofolio seperti profil dan data perjalanan
├── hooks/                    # Custom React hooks bersama di tingkat aplikasi
├── lib/                      # Inisialisasi library pihak ketiga seperti konfigurasi plugin GSAP
└── types/                    # Definisi tipe TypeScript bersama di tingkat aplikasi
```

## Aturan Dependensi

1. **Arah dependensi satu arah**: `app` -> `features` -> (`components`, `lib`, `content`).
2. **Isolasi Fitur**: Feature **TIDAK** boleh mengimpor feature lain. Perakitan antar-fitur hanya dilakukan di level `app`.
3. **Isolasi Engine**: `src/features/koi-pond/engine/` adalah modul TypeScript murni dan **TIDAK** boleh mengimpor apa pun dari luar `engine/`.
4. **Batas "use client"**: Hanya komponen interaktif (`Hero`, `KoiCanvas`, `Timeline`, `SmoothScroll`) yang menggunakan `"use client"`. Komponen server (`app/page.tsx`, `app/layout.tsx`) dan seluruh modul `engine/` tetap murni server/utilitas tanpa `"use client"`.
