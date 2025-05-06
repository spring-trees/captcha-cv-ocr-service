'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

const { createWorker,createScheduler } = require('..');
const [,, imagePath] = process.argv;
const image = path.resolve(__dirname, (imagePath || '../tests/assets/images/cosmic.png'));

console.log(`初始化 OCR 服務...`);

// 全局變數
let scheduler;

const version = require('../package.json').version;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.send('OK v'+version);
})
app.post('/recognize', async (req, res) => {
    // 為每個請求創建唯一的臨時檔案路徑
    const requestId = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    try {
        // 檢查請求中是否包含圖片數據
        if (!req.body?.image) {
            return res.status(400).json({ error: '請求中缺少圖片數據' });
        }
        const imageBase64 = req.body.image;
        const expectedAnswer = req.body.expectedAnswer;
        // 使用 scheduler 添加識別任務
        const { data: { text } } = await scheduler.addJob('recognize', imageBase64);
        
        // 使用正規表示法過濾text，只保留數字
        const filteredText = text.replace(/[^\d]/g, '');
        res.json({ 
            success: true, 
            text: filteredText,
            requestId: requestId
        });
        
        
    } catch (error) {
        console.error('OCR 處理錯誤:', error);
        res.status(500).json({ 
          success: false, 
          error: '處理圖片時發生錯誤' 
        });
    } finally {
        // console.log(`close job [${requestId}]`);
    }
});

// 初始化 workers 和 scheduler 並啟動服務
async function initializeWorkerAndStartServer() {
    try {
        console.log('正在初始化 Tesseract workers...');
        
        // 創建 scheduler
        scheduler = createScheduler();
        
        // 決定要創建的 worker 數量 (根據 CPU 核心數或自定義)
        const workerCount = 4; // 可以根據需要調整
        
        console.log(`正在創建 ${workerCount} 個 worker...`);
        
        // 創建多個 worker
        for (let i = 0; i < workerCount; i++) {
            const worker = await createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        process.stdout.write(`Worker ${i+1} 識別進度: ${m.progress * 100}%\r`);
                    }
                }
            });
            
            // 設置 worker 參數
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789',
            });
            
            // 將 worker 添加到 scheduler
            scheduler.addWorker(worker);
            console.log(`Worker ${i+1} 初始化完成並添加到 scheduler`);
        }
        
        console.log('所有 Tesseract workers 初始化完成');
        
        // 在 workers 準備好後啟動服務
        app.listen(3000, () => {
            console.log('Server is running on the port no. 3000');
            console.log('OCR 服務已準備就緒，可以接受請求');
        });
    } catch (error) {
        console.error('初始化 OCR worker 失敗:', error);
        process.exit(1);
    }
}

// 啟動服務
initializeWorkerAndStartServer();