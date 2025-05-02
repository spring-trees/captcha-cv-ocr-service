FROM node:18-slim

# 設置工作目錄
WORKDIR /app

# 安裝必要的系統依賴
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製專案文件
COPY . .

# 構建應用
RUN npm run build

# 暴露 API 服務端口
EXPOSE 3000

# 啟動 API 服務
CMD ["npm", "run", "api"]
