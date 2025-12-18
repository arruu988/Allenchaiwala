const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Home route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Server is working!' });
});

// Detect platform
app.get('/api/detect', (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.json({ success: false, error: 'URL required' });
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        res.json({ success: true, platform: 'youtube' });
    } else if (url.includes('instagram.com')) {
        res.json({ success: true, platform: 'instagram' });
    } else {
        res.json({ success: false, error: 'Unsupported platform' });
    }
});

// YOUTUBE - SIMPLE WORKING VERSION
app.get('/api/youtube/info', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.json({ success: false, error: 'URL required' });
        }
        
        // Extract video ID
        const videoId = getYouTubeID(url);
        if (!videoId) {
            return res.json({ success: false, error: 'Invalid YouTube URL' });
        }
        
        // Get video info from YouTube API
        const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await axios.get(apiUrl);
        
        res.json({
            success: true,
            title: response.data.title || 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            channel: response.data.author_name || 'YouTube',
            videoId: videoId,
            formats: [
                { quality: '360p', hasVideo: true, hasAudio: true, type: 'mp4' },
                { quality: '720p', hasVideo: true, hasAudio: true, type: 'mp4' },
                { quality: '1080p', hasVideo: true, hasAudio: true, type: 'mp4' }
            ],
            audioFormats: [
                { quality: '128kbps', hasVideo: false, hasAudio: true, type: 'mp3' }
            ]
        });
        
    } catch (error) {
        res.json({ 
            success: false, 
            error: 'YouTube: ' + (error.message || 'Video not available')
        });
    }
});

// INSTAGRAM - WORKING VERSION
app.get('/api/instagram/info', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.json({ success: false, error: 'URL required' });
        }
        
        // Fetch Instagram page
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = response.data;
        
        // Extract video URL from meta tags
        const videoUrl = html.match(/<meta property="og:video" content="([^"]+)"/)?.[1] ||
                        html.match(/<meta property="og:video:url" content="([^"]+)"/)?.[1];
        
        const thumbnail = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
        const title = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
                     html.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
        
        if (videoUrl) {
            res.json({
                success: true,
                title: title || 'Instagram Video',
                thumbnail: thumbnail || '',
                videoUrl: videoUrl,
                formats: [{ quality: 'HD', url: videoUrl, hasAudio: true, hasVideo: true }]
            });
        } else if (thumbnail) {
            res.json({
                success: true,
                title: title || 'Instagram Post',
                thumbnail: thumbnail,
                imageUrl: thumbnail,
                isImage: true
            });
        } else {
            res.json({ success: false, error: 'No video/image found' });
        }
        
    } catch (error) {
        res.json({ 
            success: false, 
            error: 'Instagram: ' + (error.message || 'Content not available')
        });
    }
});

// YOUTUBE DOWNLOAD (using external service)
app.get('/api/youtube/download', async (req, res) => {
    const { url, quality = '360p' } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    try {
        const videoId = getYouTubeID(url);
        
        // Redirect to external downloader (temporary solution)
        const downloadUrls = {
            '360p': `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp4&quality=360`,
            '720p': `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp4&quality=720`,
            '1080p': `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp4&quality=1080`,
            'audio': `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3`
        };
        
        const redirectUrl = downloadUrls[quality] || downloadUrls['360p'];
        res.redirect(redirectUrl);
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// INSTAGRAM DOWNLOAD
app.get('/api/instagram/download', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }
    
    try {
        // Get video URL first
        const info = await axios.get(`${req.protocol}://${req.get('host')}/api/instagram/info?url=${encodeURIComponent(url)}`);
        
        if (info.data.success && info.data.videoUrl) {
            res.redirect(info.data.videoUrl);
        } else {
            res.json({ success: false, error: 'No video found' });
        }
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Helper function
function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});