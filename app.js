// FFmpeg 0.11 - стабільна версія
const { createFFmpeg, fetchFile } = FFmpeg;

let ffmpeg = null;
let selectedFiles = [];
let convertedFiles = [];

let dropZone, fileInput, fileList, controls, convertBtn, progress, progressFill, progressText, result, resultText, downloadBtn;

document.addEventListener('DOMContentLoaded', () => {
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('fileInput');
    fileList = document.getElementById('fileList');
    controls = document.getElementById('controls');
    convertBtn = document.getElementById('convertBtn');
    progress = document.getElementById('progress');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    result = document.getElementById('result');
    resultText = document.getElementById('resultText');
    downloadBtn = document.getElementById('downloadBtn');

    initListeners();
});

// Ініціалізація FFmpeg 0.11
async function loadFFmpeg() {
    if (ffmpeg) return;

    ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        progress: ({ ratio }) => {
            const percent = Math.round(ratio * 100);
            progressFill.style.width = percent + '%';
        }
    });

    await ffmpeg.load();
}

function initListeners() {
    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        handleFiles(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
    });

    convertBtn.addEventListener('click', convertFiles);
    downloadBtn.addEventListener('click', resetApp);
}

function handleFiles(files) {
    const movFiles = files.filter(f => f.name.toLowerCase().endsWith('.mov'));

    if (movFiles.length === 0) {
        alert('Будь ласка, виберіть MOV файли');
        return;
    }

    selectedFiles = movFiles;
    displayFileList();
    controls.classList.remove('hidden');
    result.classList.add('hidden');
}

function displayFileList() {
    fileList.innerHTML = '';
    fileList.classList.remove('hidden');

    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>${file.name}</span>
            <span class="status" id="status-${index}">Очікує</span>
        `;
        fileList.appendChild(item);
    });

    dropZone.querySelector('p').textContent = `✓ Вибрано файлів: ${selectedFiles.length}`;
}

async function convertFiles() {
    if (selectedFiles.length === 0) return;

    controls.classList.add('hidden');
    progress.classList.remove('hidden');
    convertedFiles = [];

    try {
        progressText.textContent = 'Завантаження FFmpeg...';
        await loadFFmpeg();

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const statusEl = document.getElementById(`status-${i}`);

            statusEl.textContent = 'Конвертація...';
            statusEl.style.color = '#667eea';

            progressText.textContent = `Конвертація ${i + 1}/${selectedFiles.length}: ${file.name}`;

            const inputName = `input_${i}.mov`;
            const outputName = `output_${i}.mp4`;

            // Завантаження файлу в FFmpeg
            ffmpeg.FS('writeFile', inputName, await fetchFile(file));

            // Конвертація
            await ffmpeg.run(
                '-i', inputName,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                outputName
            );

            // Отримання результату
            const data = ffmpeg.FS('readFile', outputName);
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const fileName = file.name.replace(/\.mov$/i, '.mp4');

            // Зберігаємо файл
            convertedFiles.push({ blob, fileName });

            // Намагаємось завантажити автоматично
            downloadFile(blob, fileName);

            // Затримка перед наступним завантаженням для Chrome
            await new Promise(resolve => setTimeout(resolve, 500));

            statusEl.textContent = '✓ Готово';
            statusEl.style.color = '#4caf50';

            const percent = Math.round(((i + 1) / selectedFiles.length) * 100);
            progressFill.style.width = percent + '%';
        }

        progress.classList.add('hidden');
        result.classList.remove('hidden');
        resultText.textContent = `✓ Сконвертовано файлів: ${convertedFiles.length}`;

    } catch (error) {
        console.error('Помилка конвертації:', error);
        alert('Помилка: ' + error.message);
        progress.classList.add('hidden');
        controls.classList.remove('hidden');
    }
}

function downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Видаляємо blob URL через 100мс після завантаження
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function resetApp() {
    result.classList.add('hidden');
    fileList.classList.add('hidden');
    controls.classList.add('hidden');
    dropZone.querySelector('p').textContent = 'Перетягніть MOV файли сюди або клікніть для вибору';

    // Очищуємо всі blob об'єкти з пам'яті
    convertedFiles.forEach(({ blob }) => {
        blob = null;
    });

    selectedFiles = [];
    convertedFiles = [];
    progressFill.style.width = '0%';
}
