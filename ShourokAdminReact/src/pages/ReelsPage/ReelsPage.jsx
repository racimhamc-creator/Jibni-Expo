import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  ArrowLeft,
  User,
  MoreVertical,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import api from '../../services/api';
import './ReelsPage.css';

const ReelsPage = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const videoRefs = useRef({});
  const containerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    fetchReels();
  }, []);

  useEffect(() => {
    // Auto-play current video when index changes
    if (reels.length > 0 && currentIndex < reels.length) {
      // Small delay to ensure video element is ready
      setTimeout(() => {
        playCurrentVideo();
      }, 100);
    }
  }, [currentIndex, reels]);

  // Use Intersection Observer for better scroll detection
  useEffect(() => {
    if (reels.length === 0 || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            if (index !== currentIndex && index >= 0 && index < reels.length) {
              setCurrentIndex(index);
            }
          }
        });
      },
      {
        threshold: [0.5],
        root: containerRef.current,
        rootMargin: '0px',
      }
    );

    // Observe all reel items
    const reelItems = containerRef.current.querySelectorAll('.reel-item-tiktok');
    reelItems.forEach((item) => {
      observer.observe(item);
    });

    return () => {
      observer.disconnect();
    };
  }, [reels, currentIndex]);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const userId = user?.id || null;
      const url = `/reels?limit=50${userId ? `&userId=${userId}` : ''}`;
      const response = await api.get(url);
      
      // Use VPS URL for video files (like React Native app)
      // You can set VITE_VIDEO_BASE_URL in .env to override
      const videoBaseUrl = import.meta.env.VITE_VIDEO_BASE_URL || 
                          (api.defaults.baseURL.includes('localhost') 
                            ? api.defaults.baseURL.replace('/api', '')
                            : 'http://168.119.236.241');
      
      const baseUrl = videoBaseUrl;
      
      if (response.data.success && response.data.reels) {
        const processedReels = response.data.reels.map(reel => {
          let videoUrl = '';
          
          if (reel.videoUrl && reel.videoUrl.trim() !== '') {
            videoUrl = reel.videoUrl;
          } else if (reel.videoPath && reel.videoPath.trim() !== '') {
            if (reel.videoPath.startsWith('http://') || reel.videoPath.startsWith('https://')) {
              videoUrl = reel.videoPath;
            } else {
              // Clean and normalize the path
              let videoPath = reel.videoPath.replace(/\\/g, '/');
              if (!videoPath.startsWith('/')) {
                videoPath = '/' + videoPath;
              }
              
              // Split path into parts and encode each segment separately
              const pathParts = videoPath.split('/');
              const encodedParts = pathParts.map(part => {
                if (!part) return part;
                // Encode each part separately to handle Arabic/special characters
                return encodeURIComponent(part);
              });
              const encodedPath = encodedParts.join('/');
              
              videoUrl = `${baseUrl}${encodedPath}`;
            }
          }
          
          return {
            ...reel,
            videoUrl,
          };
        }).filter(reel => reel.videoUrl && reel.videoUrl.trim() !== '');
        
        setReels(processedReels);
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const playCurrentVideo = () => {
    // Pause all videos
    Object.values(videoRefs.current).forEach((video, idx) => {
      if (video && idx !== currentIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // Play current video
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      // Set muted state for autoplay
      currentVideo.muted = isMuted;
      
      // Reset to start
      currentVideo.currentTime = 0;
      
      // Try to play
      const playPromise = currentVideo.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            console.log('Video playing:', currentIndex);
          })
          .catch(err => {
            console.error('Error playing video:', err);
            setIsPlaying(false);
            // If autoplay fails, show play button
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleScroll = (e) => {
    if (isScrolling) return;
    
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / containerHeight);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
      setIsScrolling(true);
      setCurrentIndex(newIndex);
      
      setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    }
  };

  const handleVideoClick = () => {
    setHasUserInteracted(true);
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      if (isPlaying) {
        currentVideo.pause();
        setIsPlaying(false);
      } else {
        // Unmute on first user interaction
        if (isMuted && !hasUserInteracted) {
          currentVideo.muted = false;
          setIsMuted(false);
        }
        
        const playPromise = currentVideo.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              console.error('Error playing video:', err);
            });
        } else {
          setIsPlaying(true);
        }
      }
    }
  };

  const handleVideoDoubleClick = () => {
    // Toggle mute on double click
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.muted = !currentVideo.muted;
      setIsMuted(currentVideo.muted);
    }
  };

  const handleLike = async (reelId, e) => {
    e.stopPropagation();
    // TODO: Implement like functionality
    console.log('Like reel:', reelId);
  };

  const handleComment = (reelId, e) => {
    e.stopPropagation();
    // TODO: Implement comment functionality
    console.log('Comment on reel:', reelId);
  };

  const handleShare = async (reel, e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title || 'Shorouk Event Reel',
          text: reel.description || '',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="reels-loading">
        <div className="loading-spinner"></div>
        <p>Loading reels...</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="reels-empty">
        <Play size={64} className="empty-icon" />
        <h2>No reels yet</h2>
        <p>Check back soon for amazing festival content!</p>
        <button className="back-to-home-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="reels-page-tiktok">
      {/* Header */}
      <header className="reels-header-tiktok">
        <button className="back-btn-tiktok" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="reels-title-tiktok">Reels</h1>
      </header>

      {/* Reels Container - TikTok Style */}
      <div 
        className="reels-container-tiktok" 
        ref={containerRef}
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <div
            key={reel._id}
            className={`reel-item-tiktok ${index === currentIndex ? 'active' : ''}`}
            data-index={index}
          >
            {/* Video */}
            <div 
              className="reel-video-wrapper" 
              onClick={handleVideoClick}
              onDoubleClick={handleVideoDoubleClick}
              data-index={index}
            >
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current[index] = el;
                    // Set video properties
                    el.muted = isMuted;
                    el.loop = true;
                    el.playsInline = true;
                    el.preload = 'auto';
                  }
                }}
                src={reel.videoUrl}
                className="reel-video"
                loop
                muted={isMuted}
                playsInline
                preload="auto"
                onLoadedMetadata={() => {
                  // Video metadata loaded
                  if (index === currentIndex) {
                    playCurrentVideo();
                  }
                }}
                onPlay={() => {
                  if (index === currentIndex) {
                    setIsPlaying(true);
                  }
                }}
                onPause={() => {
                  if (index === currentIndex) {
                    setIsPlaying(false);
                  }
                }}
                onEnded={() => {
                  // Auto-scroll to next reel
                  if (index < reels.length - 1) {
                    const container = containerRef.current;
                    if (container) {
                      container.scrollTo({
                        top: (index + 1) * container.clientHeight,
                        behavior: 'smooth'
                      });
                    }
                  }
                }}
                onError={(e) => {
                  console.error('Video error:', e, reel.videoUrl);
                }}
              />
              
              {/* Play/Pause Overlay */}
              {!isPlaying && index === currentIndex && (
                <div className="play-pause-overlay">
                  <div className="play-pause-icon">
                    <Play size={48} fill="currentColor" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="reel-actions-tiktok">
              <div className="action-item">
                <button 
                  className="action-btn-tiktok"
                  onClick={(e) => handleLike(reel._id, e)}
                >
                  <Heart 
                    size={28} 
                    fill={reel.isLiked ? 'currentColor' : 'none'} 
                    className={reel.isLiked ? 'liked' : ''}
                  />
                </button>
                <span className="action-count">{reel.likesCount || 0}</span>
              </div>

              <div className="action-item">
                <button 
                  className="action-btn-tiktok"
                  onClick={(e) => handleComment(reel._id, e)}
                >
                  <MessageCircle size={28} />
                </button>
                <span className="action-count">{reel.commentsCount || 0}</span>
              </div>

              <div className="action-item">
                <button 
                  className="action-btn-tiktok"
                  onClick={(e) => handleShare(reel, e)}
                >
                  <Share2 size={28} />
                </button>
              </div>

              <div className="action-item">
                <button 
                  className="action-btn-tiktok"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentVideo = videoRefs.current[currentIndex];
                    if (currentVideo) {
                      currentVideo.muted = !currentVideo.muted;
                      setIsMuted(currentVideo.muted);
                    }
                  }}
                >
                  {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
                </button>
              </div>

              <div className="action-item">
                <button className="action-btn-tiktok">
                  <MoreVertical size={28} />
                </button>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="reel-info-tiktok">
              <div className="reel-user-info-tiktok">
                {reel.userId?.profileImage ? (
                  <img 
                    src={reel.userId.profileImage} 
                    alt={reel.userId.username}
                    className="reel-user-avatar-tiktok"
                  />
                ) : (
                  <div className="reel-user-avatar-placeholder-tiktok">
                    <User size={20} />
                  </div>
                )}
                <span className="reel-username-tiktok">
                  {reel.userId?.username || 'Unknown'}
                  {reel.userId?.isVerified && (
                    <span className="verified-badge-tiktok">✓</span>
                  )}
                </span>
              </div>

              {reel.title && (
                <h3 className="reel-title-tiktok">{reel.title}</h3>
              )}
              
              {reel.description && (
                <p className="reel-description-tiktok">{reel.description}</p>
              )}

              <div className="reel-meta-tiktok">
                <span className="reel-date-tiktok">{formatDate(reel.publishedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReelsPage;
