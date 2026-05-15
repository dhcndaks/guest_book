// Supabase Configuration
const SUPABASE_URL = 'https://dzbgsuslmsegbsspmmgd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_soAA2cWmL6FRgxQRgweAEQ_DzfhrVM-'; // 사용자가 .env.local에 입력한 키

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management
let currentTab = 'all';
let posts = [];

// DOM Elements
const postList = document.getElementById('post-list');
const postForm = document.getElementById('post-form');
const postInput = document.getElementById('post-input');
const tabs = document.querySelectorAll('.tab');

// Functions
async function fetchPosts() {
    postList.innerHTML = '<div class="loading">방명록을 가져오는 중...</div>';
    
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
        postList.innerHTML = '<div class="error">데이터를 불러오지 못했습니다. SQL 설정을 확인해 주세요.</div>';
        return;
    }

    posts = data;
    renderPosts();
}

function renderPosts() {
    postList.innerHTML = '';
    
    // 필터링 로직 (내 글은 user_id로 구분해야 하지만, 테스트를 위해 전체 노출)
    const filteredPosts = currentTab === 'all' 
        ? posts 
        : posts.filter(p => p.user_id === 'me' || p.is_mine); // 임시 필터

    if (filteredPosts.length === 0) {
        postList.innerHTML = '<div class="empty">첫 번째 방명록을 남겨보세요!</div>';
        return;
    }

    filteredPosts.forEach(post => {
        const dateStr = new Date(post.created_at).toLocaleDateString('ko-KR').replace(/-/g, '.').slice(0, -1);
        const postEl = document.createElement('article');
        postEl.className = 'post-card';
        postEl.innerHTML = `
            <div class="post-header">
                <div class="user-info">
                    <img src="https://i.pravatar.cc/150?u=${post.user_id || 'guest'}" class="avatar">
                    <div class="name-date">
                        <span class="name">익명 학생</span>
                        <span class="date">${dateStr}</span>
                    </div>
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-footer">
                <button class="like-btn" onclick="toggleLike('${post.id}')">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span class="like-count">${post.likes_count || 0}</span>
                </button>
            </div>
        `;
        postList.appendChild(postEl);
    });
}

async function toggleLike(postId) {
    // 좋아요 기능은 DB 연동 필요 (likes 테이블 insert)
    // 여기서는 UI 피드백을 위해 count만 1 증가시키는 시뮬레이션
    const { error } = await supabase.rpc('increment_likes', { post_id_input: postId });
    
    // 만약 RPC가 없다면 직접 업데이트 (테스트용)
    const targetPost = posts.find(p => p.id === postId);
    if (targetPost) {
        await supabase.from('posts').update({ likes_count: (targetPost.likes_count || 0) + 1 }).eq('id', postId);
    }
    
    fetchPosts();
}

async function addPost(content) {
    const { data, error } = await supabase
        .from('posts')
        .insert([{ 
            content: content,
            user_id: '00000000-0000-0000-0000-000000000000' // 임시 익명 ID (Profiles 테이블 연동 전)
        }]);

    if (error) {
        console.error('Error adding post:', error);
        alert('글 등록에 실패했습니다. (SQL 권한 또는 필드 확인 필요)');
    } else {
        fetchPosts();
    }
}

// Event Listeners
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderPosts();
    });
});

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postInput.value.trim();
    if (content) {
        await addPost(content);
        postInput.value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Initial Load
fetchPosts();
window.toggleLike = toggleLike;
