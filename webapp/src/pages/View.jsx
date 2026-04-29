import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Paper,
  Stack,
  IconButton,
  Pagination,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import FilterBar, { DEFAULT_FILTERS } from '../components/FilterBar';
import SocialPublishPanel from '../components/SocialPublishPanel';

const PER_PAGE = 50;

function filtersToParams(filters) {
  const params = {};
  if (filters.ratings && filters.ratings.length > 0) {
    params.rating = filters.ratings.join(',');
  }
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.filename) params.filename = filters.filename;
  if (filters.camera) params.camera = filters.camera;
  if (filters.fileType) params.file_type = filters.fileType;
  return params;
}

function filtersToSearch(filters) {
  const p = {};
  if (filters.ratings && filters.ratings.length > 0) p.ratings = filters.ratings.join(',');
  if (filters.dateFrom) p.dateFrom = filters.dateFrom;
  if (filters.dateTo) p.dateTo = filters.dateTo;
  if (filters.filename) p.filename = filters.filename;
  if (filters.camera) p.camera = filters.camera;
  if (filters.fileType) p.fileType = filters.fileType;
  return p;
}

function searchToFilters(searchParams) {
  return {
    ratings: searchParams.get('ratings') ? searchParams.get('ratings').split(',') : [],
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    filename: searchParams.get('filename') || '',
    camera: searchParams.get('camera') || '',
    fileType: searchParams.get('fileType') || '',
  };
}

function View() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [storagePath, setStoragePath] = useState('');
  const [images, setImages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImage, setSelectedImage] = useState(null);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState(() => searchToFilters(searchParams));

  const loadImages = useCallback(
    async (path, pg, currentFilters) => {
      if (!path) return;
      try {
        const offset = (pg - 1) * PER_PAGE;
        const filterParams = filtersToParams(currentFilters);
        const response = await api.get('/view/images', {
          params: {
            storagePath: path,
            filterImagesPerPage: PER_PAGE,
            selectOffset: offset,
            ...filterParams,
          },
        });
        setImages(response.data.images || []);
        setTotal(response.data.count || 0);
      } catch (error) {
        console.error('Failed to load images:', error);
      }
    },
    []
  );

  const loadStats = useCallback(async (path) => {
    if (!path) return;
    try {
      const response = await api.get('/view/stats', { params: { storagePath: path } });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    if (storagePath) {
      loadImages(storagePath, page, filters);
    }
  }, [storagePath, page, filters, loadImages]);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      setPage(1);
      const sp = filtersToSearch(newFilters);
      setSearchParams(sp, { replace: true });
    },
    [setSearchParams]
  );

  const handleInit = async () => {
    try {
      await api.get('/view/init', { params: { mountpoint: storagePath } });
      await loadStats(storagePath);
      loadImages(storagePath, 1, filters);
    } catch (error) {
      console.error('Failed to initialize view:', error);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          label={t('view.filter.medium') || 'Storage medium'}
          value={storagePath}
          onChange={(e) => setStoragePath(e.target.value)}
          sx={{ maxWidth: 500 }}
        />
        <Button variant="contained" onClick={handleInit}>
          {t('view.images.back_to_grid') || 'Initialize'}
        </Button>
        <IconButton
          onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
          color="primary"
          aria-label="toggle view mode"
        >
          {viewMode === 'grid' ? <ViewListIcon /> : <GridViewIcon />}
        </IconButton>
      </Stack>

      {viewMode === 'grid' && (
        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} stats={stats} />
      )}

      {viewMode === 'grid' ? (
        <>
          <Grid container spacing={2}>
            {images.map((image) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={image.ID}>
                <Card
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedImage(image);
                    setViewMode('single');
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${storagePath}/${image.Directory}/${image.File_Name}`}
                    alt={image.File_Name}
                  />
                  <CardContent>
                    <Typography variant="caption" noWrap>
                      {image.File_Name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      ) : (
        selectedImage && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={`${storagePath}/${selectedImage.Directory}/${selectedImage.File_Name}`}
                alt={selectedImage.File_Name}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <Box sx={{ mt: 3 }}>
                <Typography variant="h4" gutterBottom>
                  {selectedImage.File_Name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedImage.Create_Date}
                </Typography>
                <SocialPublishPanel
                  medium={storagePath}
                  imageId={selectedImage.ID}
                  image={selectedImage}
                  onPublished={(data) => {
                    setSelectedImage((prev) => ({
                      ...prev,
                      publish_telegram:
                        data.results?.telegram ? '1' : prev.publish_telegram,
                      publish_mastodon:
                        data.results?.mastodon ? '1' : prev.publish_mastodon,
                    }));
                  }}
                />
              </Box>
            </Box>
          </Paper>
        )
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography
            variant="body2"
            dangerouslySetInnerHTML={{
              __html:
                t('view.footer.footer') ||
                'Warning, only images that have thumbnails are displayed here. Generate them either automatically (Settings, Backup) or via the Backup page.<br>\nSee the <a href="https://github.com/outdoorbits/little-backup-box/wiki/05a.-view-image-viewer">Wiki</a> for more information.',
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default View;
