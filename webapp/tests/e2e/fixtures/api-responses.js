// E2E test fixture data for API responses

export const viewMediaResponse = {
  media: ['usb', 'nvme', 'internal'],
  available: { usb: true, nvme: false, internal: true },
};

function generateImages(count = 120, page = 1, perPage = 25) {
  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, count);
  const images = [];
  for (let i = start; i < end; i++) {
    const id = i + 1;
    const filename = `IMG_${String(id).padStart(4, '0')}.jpg`;
    images.push({
      ID: id,
      File_Name: filename,
      Create_Date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      thumbnail_path: `/thumbnails/usb/${filename}`,
      rating: 0,
      comment: '',
      publish_telegram: false,
      publish_mastodon: false,
    });
  }
  return images;
}

export const viewImagesResponse = {
  images: generateImages(120, 1, 25),
  total: 120,
  dbExists: true,
};

export const viewImagesPage2Response = {
  images: generateImages(120, 2, 25),
  total: 120,
  dbExists: true,
};

export const viewImagesNotMountedResponse = {
  error: 'not_mounted',
};

export const viewImagesNoResultsResponse = {
  images: [],
  total: 0,
  dbExists: true,
};

export const viewImagesDbNotInitialisedResponse = {
  images: [],
  total: 0,
  dbExists: false,
};
