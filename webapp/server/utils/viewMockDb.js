// In-memory sqlite EXIF_DATA fixture for mock mode (Mac/Windows dev,
// USE_MOCKS=true, and the GitHub Pages static build's local server).
//
// We use a real :memory: sqlite database rather than filtering a JS array so
// the same WHERE-clause builder runs in both real and mock modes — drift
// between the two would otherwise produce different filtered results in dev
// vs on-device.
import sqlite3 from 'sqlite3';
import { SOCIAL_SERVICES, maskFor } from './socialServiceBits.js';

const DIRECTORIES = ['DCIM/100EOS5D', 'DCIM/101EOS5D', 'PRIVATE/M4ROOT/CLIP', 'VIDEO'];
const FILE_TYPES = ['JPEG', 'TIFF', 'RAW', 'MP4'];
const FILE_EXTENSIONS = ['JPG', 'TIF', 'CR2', 'MP4'];
const CAMERAS = ['Canon EOS 5D Mark III', 'Sony A7 IV', 'iPhone 14 Pro'];

function buildFixtureRows(count = 120) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    const dir = DIRECTORIES[i % DIRECTORIES.length];
    const ftIdx = i % FILE_TYPES.length;
    const fileType = FILE_TYPES[ftIdx];
    const fileExt = FILE_EXTENSIONS[ftIdx];
    const camera = CAMERAS[i % CAMERAS.length];
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const lbbRating = i % 6; // 0..5
    // Spread social state across services so filters return non-trivial subsets:
    // every 3rd image is marked-for-publish on a rotating service, every 7th
    // is already-published on a rotating service.
    const publishService = i % 3 === 0 ? SOCIAL_SERVICES[i % SOCIAL_SERVICES.length] : null;
    const publishedService = i % 7 === 0 ? SOCIAL_SERVICES[i % SOCIAL_SERVICES.length] : null;
    rows.push({
      ID: i,
      Directory: dir,
      File_Name: `IMG_${String(i).padStart(4, '0')}.${fileExt}`,
      Create_Date: `2024-${month}-${day}`,
      LbbRating: lbbRating,
      Rating: String(lbbRating),
      Camera_Model_Name: camera,
      File_Type: fileType,
      File_Type_Extension: fileExt,
      Comment: '',
      social_publish: publishService ? maskFor(publishService) : 0,
      social_published: publishedService ? maskFor(publishedService) : 0,
    });
  }
  return rows;
}

let cachedDb = null;

export async function getMockViewDb() {
  if (cachedDb) return cachedDb;

  const db = new sqlite3.Database(':memory:');
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function cb(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

  await run(`CREATE TABLE EXIF_DATA (
    ID integer primary key autoincrement,
    Directory text,
    File_Name text,
    Create_Date text,
    LbbRating integer default 0,
    Rating text,
    Camera_Model_Name text,
    File_Type text,
    File_Type_Extension text,
    Comment text,
    social_publish integer default 0,
    social_published integer default 0
  )`);

  for (const row of buildFixtureRows()) {
    await run(
      `INSERT INTO EXIF_DATA
         (ID, Directory, File_Name, Create_Date, LbbRating, Rating,
          Camera_Model_Name, File_Type, File_Type_Extension, Comment,
          social_publish, social_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.ID,
        row.Directory,
        row.File_Name,
        row.Create_Date,
        row.LbbRating,
        row.Rating,
        row.Camera_Model_Name,
        row.File_Type,
        row.File_Type_Extension,
        row.Comment,
        row.social_publish,
        row.social_published,
      ]
    );
  }

  cachedDb = db;
  return db;
}
