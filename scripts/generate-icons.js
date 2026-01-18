/**
 * 圖示生成腳本
 *
 * 使用方式：
 * 1. 安裝依賴: npm install sharp
 * 2. 執行腳本: node scripts/generate-icons.js
 *
 * 或者，您可以手動準備以下圖示檔案放到 assets 目錄：
 * - icon.png (1024x1024) - 應用程式主圖示
 * - adaptive-icon.png (1024x1024) - Android 自適應圖示前景
 * - splash.png (1284x2778) - 啟動畫面圖片
 * - favicon.png (48x48) - 網頁版圖示
 */

const fs = require('fs');
const path = require('path');

// 簡單的佔位圖示生成（使用 SVG 轉 PNG 需要 sharp 套件）
const createPlaceholderSVG = (size, text, bgColor = '#2196F3') => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          fill="white" font-family="Arial" font-size="${size * 0.15}" font-weight="bold">
      ${text}
    </text>
  </svg>`;
};

const assetsDir = path.join(__dirname, '..', 'assets');

// 確保 assets 目錄存在
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 生成 SVG 佔位檔案
const icons = [
  { name: 'icon.svg', size: 1024, text: '麻醉' },
  { name: 'adaptive-icon.svg', size: 1024, text: '監測' },
  { name: 'splash.svg', size: 1284, text: '獸醫麻醉監測' },
  { name: 'favicon.svg', size: 48, text: 'AM' }
];

icons.forEach(({ name, size, text }) => {
  const svg = createPlaceholderSVG(size, text);
  fs.writeFileSync(path.join(assetsDir, name), svg);
  console.log(`已建立 ${name}`);
});

console.log('\n佔位 SVG 圖示已建立！');
console.log('請使用圖片編輯軟體將 SVG 轉換為 PNG 格式，或使用以下指令：');
console.log('\n使用 sharp 套件（推薦）：');
console.log('npm install sharp');
console.log('然後執行下方的轉換腳本\n');

// 如果有 sharp，則執行 PNG 轉換
try {
  const sharp = require('sharp');

  const pngConversions = [
    { svg: 'icon.svg', png: 'icon.png', size: 1024 },
    { svg: 'adaptive-icon.svg', png: 'adaptive-icon.png', size: 1024 },
    { svg: 'splash.svg', png: 'splash.png', width: 1284, height: 2778 },
    { svg: 'favicon.svg', png: 'favicon.png', size: 48 }
  ];

  Promise.all(pngConversions.map(async ({ svg, png, size, width, height }) => {
    const svgPath = path.join(assetsDir, svg);
    const pngPath = path.join(assetsDir, png);

    if (width && height) {
      await sharp(svgPath)
        .resize(width, height, { fit: 'contain', background: '#2196F3' })
        .png()
        .toFile(pngPath);
    } else {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
    }
    console.log(`已轉換 ${svg} -> ${png}`);
  })).then(() => {
    console.log('\nPNG 圖示已生成完成！');
  });

} catch (e) {
  console.log('sharp 套件未安裝，請手動轉換 SVG 為 PNG');
}
