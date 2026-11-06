import { promises as fs } from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';

// Configuration
const BASE_AUDIO_DIR = path.join('assets', 'audio');
const OUTPUT_FILE = 'audio-durations.json';
const TARGET_SUBDIRS = ['Piano', 'Guitar'];

async function scanAudioFiles() {
  const allResults = [];
  const errors = [];

  console.log('--- BẮT ĐẦU QUÉT THỜI LƯỢNG FILE ÂM THANH ---');

  for (const subdir of TARGET_SUBDIRS) {
    const fullSubdirPath = path.join(BASE_AUDIO_DIR, subdir);
    
    try {
      // Check if folder exists
      await fs.access(fullSubdirPath);
      const files = await fs.readdir(fullSubdirPath);
      
      // Filter only .mp3 files
      const mp3Files = files.filter(file => file.toLowerCase().endsWith('.mp3'));
      console.log(`Tìm thấy ${mp3Files.length} file MP3 trong thư mục: assets/audio/${subdir}`);

      for (const file of mp3Files) {
        const fullFilePath = path.join(fullSubdirPath, file);
        const relativePath = `${subdir}/${file}`;
        
        try {
          // Parse metadata using music-metadata
          const metadata = await parseFile(fullFilePath);
          const duration = metadata.format.duration;
          
          if (duration === undefined || isNaN(duration)) {
            throw new Error('Không thể đọc được thời lượng (duration bị undefined hoặc NaN)');
          }

          // Round duration to nearest integer as requested
          const durationSeconds = Math.round(duration);

          allResults.push({
            fileName: file,
            relativePath: relativePath,
            durationSeconds: durationSeconds
          });
        } catch (fileError) {
          console.error(`[LỖI] Không thể đọc file ${relativePath}: ${fileError.message}`);
          errors.push({
            relativePath: relativePath,
            error: fileError.message
          });
          // Add default object with duration 0 if parsing fails
          allResults.push({
            fileName: file,
            relativePath: relativePath,
            durationSeconds: 0
          });
        }
      }
    } catch (dirError) {
      console.error(`[LỖI THƯ MỤC] Không thể tiếp cận thư mục assets/audio/${subdir}: ${dirError.message}`);
      errors.push({
        directory: `assets/audio/${subdir}`,
        error: dirError.message
      });
    }
  }

  // Sort results alphabetically by relativePath for a clean output
  allResults.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Write output JSON
  try {
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf8');
    console.log(`\n[THÀNH CÔNG] Đã xuất file cấu trúc thời lượng: ${OUTPUT_FILE}`);
    console.log(`Tổng số file đã xử lý: ${allResults.length}/106`);
    if (errors.length > 0) {
      console.log(`Số file gặp lỗi: ${errors.length} (Kiểm tra log terminal ở trên)`);
    }
  } catch (writeError) {
    console.error(`[LỖI GHI FILE] Không thể tạo file JSON: ${writeError.message}`);
  }
}

// Execute scanning
scanAudioFiles();
