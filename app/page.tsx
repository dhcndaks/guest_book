'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Heart, Send, LogOut, Lock, Mail, User, AlertCircle, Sparkles } from 'lucide-react';
import { 
  supabase, 
  fetchPosts, 
  fetchUserLikedPostIds, 
  subscribeToChanges, 
  createPost, 
  likePost, 
  unlikePost 
} from '../lib/supabase';

// Types based on DB Schema
interface Post {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  likes_count: number;
  created_at: string;
  avatar_url: string;
}

export default function GuestbookPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth form states
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Load posts and liked info
  const loadData = async (currentUserId?: string) => {
    try {
      const fetched = await fetchPosts();
      setPosts(fetched);

      if (currentUserId) {
        const likedIds = await fetchUserLikedPostIds(currentUserId);
        setLikedPostIds(likedIds);
      } else {
        setLikedPostIds([]);
      }
    } catch (error) {
      console.error('Failed to load guestbook posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auth and state listener
  useEffect(() => {
    // Initial fetch of session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
        loadData(currentUser.id);
      } else {
        loadData();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
          loadData(currentUser.id);
        } else {
          setProfile(null);
          setLikedPostIds([]);
          loadData();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to DB changes in real-time
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      loadData(user?.id);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Fetch profile helpers
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Fallback
      if (user) {
        setProfile({
          name: user.user_metadata?.name || '익명 학생',
          avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`
        });
      }
    }
  };

  // Sign up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setAuthError('모든 정보를 채워주세요.');
      return;
    }
    if (password.length < 6) {
      setAuthError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
          }
        }
      });

      if (error) throw error;

      if (data?.session) {
        setUser(data.session.user);
      } else {
        // Verification email may be required
        setAuthError('이메일 인증 메일이 발송되었습니다. 메일함을 확인해주세요. (이메일 인증이 꺼져있다면 즉시 로그인 가능)');
        setAuthMode('login');
      }
    } catch (err: any) {
      setAuthError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sign in handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Send Post
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await createPost(user.id, inputValue);
      setInputValue('');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('글을 등록하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Like Toggle (Optimistic Update)
  const handleLikeToggle = async (postId: string) => {
    if (!user) {
      alert('좋아요 기능은 로그인 후 이용하실 수 있습니다.');
      return;
    }

    const isLiked = likedPostIds.includes(postId);

    // Optimistic UI updates
    setLikedPostIds(prev => 
      isLiked ? prev.filter(id => id !== postId) : [...prev, postId]
    );
    
    setPosts(prevPosts => 
      prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
          };
        }
        return p;
      })
    );

    try {
      if (isLiked) {
        await unlikePost(user.id, postId);
      } else {
        await likePost(user.id, postId);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert if API call fails
      loadData(user.id);
    }
  };

  const filteredPosts = activeTab === 'all' 
    ? posts 
    : posts.filter(p => p.user_id === user?.id);

  // RENDER AUTH UI IF NOT LOGGED IN
  if (!user) {
    return (
      <div className="auth-container animate-fade-in">
        <div className="auth-card animate-scale-in">
          {/* Cover Header */}
          <div className="auth-header">
            <h2>우리 반 방명록</h2>
            <p>동기들과 일상을 공유하고 소통해 보세요.</p>
          </div>

          <div className="auth-body">
            {/* Tabs */}
            <div className="auth-tabs">
              <button 
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              >
                로그인
              </button>
              <button 
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
              >
                회원가입
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="error-box animate-fade-in">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{authError}</span>
              </div>
            )}

            {/* Forms */}
            <form onSubmit={authMode === 'login' ? handleSignIn : handleSignUp}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">이름 / 닉네임</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      required
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">이메일 주소</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.ac.kr"
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">비밀번호</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isAuthLoading}
                className="btn-submit"
              >
                {isAuthLoading ? '처리 중...' : authMode === 'login' ? '로그인 완료' : '회원 가입 완료'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // MAIN RENDER (LOGGED IN)
  return (
    <div className="app-container animate-fade-in">
      {/* Header */}
      <header className="app-header">
        <div className="user-profile">
          <img 
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`} 
            alt="My Profile" 
            className="user-avatar" 
          />
          <div>
            <div className="user-welcome">환영합니다!</div>
            <div className="user-name">{profile?.name || '학우님'}</div>
          </div>
        </div>
        
        <h1 className="app-title">우리 반 방명록</h1>

        <div className="header-actions">
          <button className="icon-btn" title="알림">
            <Bell size={20} />
          </button>
          <button 
            onClick={handleSignOut} 
            title="로그아웃"
            className="icon-btn logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tab-nav">
        <button 
          onClick={() => setActiveTab('all')}
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          전체 글
          {activeTab === 'all' && <div className="tab-indicator" />}
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`}
        >
          내 글
          {activeTab === 'mine' && <div className="tab-indicator" />}
        </button>
      </nav>

      {/* List */}
      <main className="feed-main">
        {isLoading ? (
          // Skeletal Loading
          <div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-header">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-meta">
                    <div className="skeleton-title" />
                    <div className="skeleton-date" />
                  </div>
                </div>
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          // Empty State
          <div className="empty-state animate-fade-in">
            <div className="empty-icon">
              <Sparkles size={28} />
            </div>
            <h3>방명록이 비어있습니다</h3>
            <p>첫 번째 메시지를 남겨보세요!</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isLiked = likedPostIds.includes(post.id);
            return (
              <article 
                key={post.id} 
                className="post-card animate-slide-up"
              >
                <div className="post-header">
                  <img 
                    src={post.avatar_url} 
                    alt={post.author_name} 
                    className="post-avatar" 
                  />
                  <div>
                    <div className="post-author-name">{post.author_name}</div>
                    <div className="post-date">{post.created_at}</div>
                  </div>
                </div>
                
                <p className="post-content">{post.content}</p>
                
                <div className="post-footer">
                  <button 
                    onClick={() => handleLikeToggle(post.id)}
                    className={`like-btn ${isLiked ? 'liked' : ''}`}
                  >
                    <Heart 
                      size={16} 
                      className="like-heart"
                      fill={isLiked ? 'currentColor' : 'none'}
                    />
                    <span>{post.likes_count}</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* Input Bar */}
      <form 
        onSubmit={handleSend} 
        className="input-bar"
      >
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={user ? "학우들에게 전할 따뜻한 한마디를 남겨보세요..." : "로그인 후 작성이 가능합니다."}
          disabled={!user || isSubmitting}
          className="message-input"
        />
        <button 
          type="submit" 
          disabled={!user || !inputValue.trim() || isSubmitting}
          className="send-btn"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

