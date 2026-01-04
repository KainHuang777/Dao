@echo off
echo 啟動本地伺服器...
echo 請在瀏覽器中訪問: http://localhost:8000
echo.
echo 可用的測試頁面:
echo - http://localhost:8000/core-test.html (核心功能測試)
echo - http://localhost:8000/simple-test.html (模組測試)
echo - http://localhost:8000/index.html (主遊戲)
echo.
echo 按 Ctrl+C 停止伺服器
echo.
python -m http.server 8000