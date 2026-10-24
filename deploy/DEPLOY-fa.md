# راهنمای انتشار رسا (RASA) — نسخهٔ اولیه

این راهنما دقیقاً همان مسیری است که در مستندات آمده: **سرور مجازی (VPS) با Node.js + PM2 + Nginx + SSL**. در انتها، روش ساده‌تر «PaaS ایرانی» هم آمده است.

> ⚠️ **شرط لازم:** اپ باید روی **HTTPS** سرو شود؛ بدون آن سرویس‌ورکر PWA و نصب اپ کار نمی‌کند.

---

## مسیر ۱ — VPS با Node.js (پیشنهادی)

### پیش‌نیازها
- یک VPS با حداقل ۱ هسته CPU، ۱–۲GB RAM، اوبونتو 22.04
- دامنه‌ای که رکود A آن به IP سرور اشاره می‌کند

### ۱) نصب پیش‌نیازها روی سرور

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# PM2 (نگهدارندهٔ فرایند اپ)
sudo npm i -g pm2
```

### ۲) گرفتن کد از گیت‌هاب

```bash
cd /opt
sudo git clone https://github.com/AmirheydaripourOdin1133/rasa.git rasa
sudo chown -R $USER:$USER /opt/rasa
cd rasa
npm ci            # یا npm install
npm run build
```

### ۳) اجرای اپ با PM2

```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup       # دستور چاپ‌شده را اجرا کنید تا بعد از ری‌استارت سرور، اپ بالا بیاید
```

الان اپ روی پورت `3000` سرور اجراست — بیرون هنوز قابل دیدن نیست.

### ۴) Nginx جلوی اپ

```bash
sudo cp deploy/nginx-rasa.conf.sample /etc/nginx/sites-available/rasa
sudo nano /etc/nginx/sites-available/rasa   # your-domain.ir را با دامنهٔ خود عوض کنید
sudo ln -s /etc/nginx/sites-available/rasa /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### ۵) SSL رایگان (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.ir -d www.your-domain.ir
```

تمام ✅ — اپ روی `https://your-domain.ir` در دسترس است و بعد از ری‌استارت سرور خودکار بالا می‌آید.

### به‌روزرسانی نسخهٔ بعدی

```bash
cd /opt/rasa
git pull
npm ci && npm run build
pm2 restart rasa
```

---

## مسیر ۲ — PaaS ایرانی (ساده‌تر، بدون تنظیم سرور)

سرویس‌هایی مثل **لیارا** یا **چابکان** اپ‌های Node را مستقیم اجرا می‌کنند:

1. در پنل، یک اپ **Node.js** بسازید.
2. ریپوی گیت‌هاب `AmirheydaripourOdin1133/rasa` را به اپ وصل کنید (یا با Liara CLI: `liara deploy`).
3. دستورهای build و start از `package.json` خوانده می‌شود (`npm run build` / `npm run start`) — چیزی لازم نیست تغییر دهید.
4. SSL و دامنه از خود پنل.

---

## مسیر ۳ — هاست اشتراکی (فقط اگر مطمئنید)

فقط با خروجی استاتیک (`output: 'export'` در next.config) ممکن است و مسیر بک‌اند آینده را می‌بندد. برای این نسخه توصیه نمی‌شود.

---

## چک‌لیست بعد از انتشار

- [ ] `https://…` باز می‌شود و قفل سبز مرورگر روشن است
- [ ] از منوی مرورگر «افزودن به صفحهٔ اصلی» کار می‌کند (PWA نصب می‌شود)
- [ ] حالت نمایشی بالا می‌آید و تاریخ شمسی درست است
- [ ] آفلاین اپ را باز کنید — پوستهٔ اپ از کش می‌آید
- [ ] مسیرهای `/medication`، `/reports`، `/plan`، `/settings` بدون خطای کنسول

## نکته‌های امنیتی انتشار

- هیچ متغیر محیطی‌ای در این نسخه لازم نیست (بک‌اند غیرفعال است).
- اگر بعداً Supabase وصل شد، فقط `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` را در `.env.local` سرور بگذارید — هرگز service-role key در کلاینت.
- لاگ‌های PM2 ممکن است شامل خطاهای کاربر باشند؛ عمومی نگهشان دارید.
