# portofolio-son

Portofolio satu halaman: kolam koi interaktif + timeline.

## Jalankan
```bash
npm install
npm run dev
```

## Struktur
- `components/koi/engine.ts`: mesin ikan koi dan ripple (Canvas 2D, tanpa dependensi)
- `components/koi/KoiCanvas.tsx`: pemasangan canvas, resize, pointer, dan loop
- `components/Hero.tsx`: nama sticky dengan blend difference, scroll bg
- `components/Timeline.tsx`: garis waktu, titik tengah sticky, kartu masuk/keluar
- `components/SmoothScroll.tsx`: Lenis yang berjalan di ticker GSAP
- `data/profile.ts` dan `data/timeline.ts`: isi konten (banyak yang masih placeholder)
