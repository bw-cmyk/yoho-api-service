# 晒单系统前端集成指南

本文档提供晒单功能增强（评论、分享、中奖关联）的前端集成指南。

## 目录

- [API 端点概览](#api-端点概览)
- [核心功能集成](#核心功能集成)
- [数据结构](#数据结构)
- [最佳实践](#最佳实践)
- [UI/UX 建议](#uiux-建议)

---

## API 端点概览

### 晒单基础功能

```typescript
// 创建晒单
POST /api/v1/showcase
Body: CreateShowcaseDto

// 获取晒单列表
GET /api/v1/showcase?page=1&limit=20&userId={userId}

// 获取晒单详情
GET /api/v1/showcase/:id

// 我的晒单
GET /api/v1/showcase/my?page=1&limit=20

// 点赞/取消点赞
POST /api/v1/showcase/:id/like

// 删除晒单
DELETE /api/v1/showcase/:id
```

### 评论功能

```typescript
// 创建评论
POST /api/v1/showcase/:id/comments
Body: { content: string, parentId?: number, replyToUserId?: string }

// 获取评论列表
GET /api/v1/showcase/:id/comments?page=1&limit=20

// 获取回复列表
GET /api/v1/showcase/comments/:id/replies?page=1&limit=20

// 删除评论
DELETE /api/v1/showcase/comments/:id
```

### 分享功能

```typescript
// 记录分享
POST /api/v1/showcase/:id/share
Body: { platform: 'TWITTER' | 'TELEGRAM' | 'FACEBOOK' | 'LINK' | 'OTHER' }

// 获取分享数据
GET /api/v1/showcase/:id/share-data
Response: { url, title, description, image, shareCount }
```

### 中奖晒单

```typescript
// 获取我的中奖历史
GET /api/v1/ecommerce/draws/my-wins?page=1&limit=20

// 获取中奖详情
GET /api/v1/ecommerce/draws/my-wins/:drawResultId

// 创建中奖晒单
POST /api/v1/showcase/winner
Body: CreateShowcaseDto & { drawResultId: number }

// 获取中奖晒单列表
GET /api/v1/showcase/winners?page=1&limit=20
```

---

## 核心功能集成

### 1. 创建晒单

#### 基础晒单创建

```typescript
import axios from 'axios';

interface MediaItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  cloudflareId?: string;
}

interface CreateShowcaseDto {
  content?: string;
  media: MediaItem[];
  productId?: number;
  drawRoundId?: number;
  prizeInfo?: string;
}

async function createShowcase(data: CreateShowcaseDto) {
  const response = await axios.post('/api/v1/showcase', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

// 示例
const showcase = await createShowcase({
  content: '我的中奖晒单！',
  media: [
    {
      type: 'IMAGE',
      url: 'https://example.com/image.jpg',
      cloudflareId: 'abc123',
    },
  ],
  productId: 1,
  prizeInfo: 'iPhone 15 Pro',
});
```

#### 文件上传

```typescript
// 单文件上传
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/api/v1/showcase/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data; // { type, url, thumbnailUrl, cloudflareId }
}

// 批量上传
async function uploadFiles(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await axios.post('/api/v1/showcase/upload/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.items; // Array<{ type, url, thumbnailUrl, cloudflareId }>
}
```

#### 完整创建流程（带上传）

```typescript
async function createShowcaseWithUpload(
  files: File[],
  content: string,
  productId?: number,
) {
  // 1. 上传文件
  const uploadedMedia = await uploadFiles(files);

  // 2. 创建晒单
  return await createShowcase({
    content,
    media: uploadedMedia,
    productId,
  });
}
```

### 2. 评论系统

#### React Hook 示例

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Comment {
  id: number;
  showcaseId: number;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  parentId: number | null;
  replyToUserId: string | null;
  replyToUserName: string | null;
  createdAt: string;
  replies?: Comment[];
}

function useComments(showcaseId: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 加载评论
  const loadComments = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const response = await axios.get(
        `/api/v1/showcase/${showcaseId}/comments?page=${currentPage}&limit=20`,
      );

      const newComments = reset
        ? response.data.items
        : [...comments, ...response.data.items];

      setComments(newComments);
      setPage(currentPage + 1);
      setHasMore(response.data.page * response.data.limit < response.data.total);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // 发表评论
  const createComment = async (
    content: string,
    parentId?: number,
    replyToUserId?: string,
  ) => {
    const response = await axios.post(
      `/api/v1/showcase/${showcaseId}/comments`,
      { content, parentId, replyToUserId },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    // 刷新评论列表
    await loadComments(true);
    return response.data;
  };

  // 删除评论
  const deleteComment = async (commentId: number) => {
    await axios.delete(`/api/v1/showcase/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 从列表中移除
    setComments(comments.filter((c) => c.id !== commentId));
  };

  useEffect(() => {
    loadComments(true);
  }, [showcaseId]);

  return {
    comments,
    loading,
    hasMore,
    loadMore: () => loadComments(false),
    createComment,
    deleteComment,
    refresh: () => loadComments(true),
  };
}
```

#### 评论组件示例

```tsx
function CommentSection({ showcaseId }: { showcaseId: number }) {
  const { comments, loading, hasMore, loadMore, createComment, deleteComment } =
    useComments(showcaseId);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;

    await createComment(
      content,
      replyTo?.parentId || replyTo?.id,
      replyTo?.userId,
    );
    setContent('');
    setReplyTo(null);
  };

  return (
    <div className="comment-section">
      {/* 评论输入框 */}
      <div className="comment-input">
        {replyTo && (
          <div className="reply-to">
            回复 @{replyTo.userName}
            <button onClick={() => setReplyTo(null)}>取消</button>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyTo ? `回复 @${replyTo.userName}` : '写评论...'}
          maxLength={500}
        />
        <button onClick={handleSubmit}>发表</button>
      </div>

      {/* 评论列表 */}
      <div className="comment-list">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={setReplyTo}
            onDelete={deleteComment}
          />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  );
}
```

### 3. 分享功能

#### 分享处理

```typescript
type SharePlatform = 'TWITTER' | 'TELEGRAM' | 'FACEBOOK' | 'LINK' | 'OTHER';

async function handleShare(showcaseId: number, platform: SharePlatform) {
  // 1. 获取分享数据
  const shareData = await axios.get(`/api/v1/showcase/${showcaseId}/share-data`);

  const { url, title, description, image } = shareData.data;

  // 2. 记录分享行为
  await axios.post(
    `/api/v1/showcase/${showcaseId}/share`,
    { platform },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  // 3. 执行分享
  switch (platform) {
    case 'TWITTER':
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        '_blank',
      );
      break;

    case 'TELEGRAM':
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
        '_blank',
      );
      break;

    case 'FACEBOOK':
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        '_blank',
      );
      break;

    case 'LINK':
      // 复制链接到剪贴板
      await navigator.clipboard.writeText(url);
      alert('链接已复制到剪贴板');
      break;
  }
}
```

#### Web Share API（移动端优先）

```typescript
async function handleNativeShare(showcaseId: number) {
  const shareData = await axios.get(`/api/v1/showcase/${showcaseId}/share-data`);
  const { url, title, description } = shareData.data;

  if (navigator.share) {
    try {
      await navigator.share({ url, title, text: description });

      // 记录分享
      await axios.post(
        `/api/v1/showcase/${showcaseId}/share`,
        { platform: 'OTHER' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  } else {
    // 降级到自定义分享面板
    showSharePanel(showcaseId);
  }
}
```

### 4. 中奖晒单

#### 中奖历史列表

```typescript
interface WinningHistoryItem {
  drawResultId: number;
  drawRoundId: number;
  productId: number;
  productName: string;
  productImage: string;
  winningNumber: number;
  prizeType: 'CASH' | 'CRYPTO' | 'PHYSICAL';
  prizeValue: string;
  prizeStatus: 'PENDING' | 'DISTRIBUTED' | 'CANCELLED';
  wonAt: string;
  hasShowcase: boolean; // 是否已创建晒单
  shippingAddress?: any;
}

async function getMyWinningHistory(page = 1, limit = 20) {
  const response = await axios.get(
    `/api/v1/ecommerce/draws/my-wins?page=${page}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
}
```

#### 中奖历史组件

```tsx
function WinningHistoryPage() {
  const [wins, setWins] = useState<WinningHistoryItem[]>([]);
  const [selectedWin, setSelectedWin] = useState<WinningHistoryItem | null>(null);

  useEffect(() => {
    loadWinningHistory();
  }, []);

  const loadWinningHistory = async () => {
    const data = await getMyWinningHistory();
    setWins(data.items);
  };

  const handleCreateShowcase = (win: WinningHistoryItem) => {
    if (win.hasShowcase) {
      alert('您已经为此中奖记录创建过晒单');
      return;
    }
    setSelectedWin(win);
    // 打开晒单创建表单
  };

  return (
    <div className="winning-history">
      <h2>我的中奖记录</h2>

      {wins.map((win) => (
        <div key={win.drawResultId} className="win-item">
          <img src={win.productImage} alt={win.productName} />
          <div className="win-info">
            <h3>{win.productName}</h3>
            <p>中奖号码: {win.winningNumber}</p>
            <p>奖品价值: ${win.prizeValue}</p>
            <p>中奖时间: {new Date(win.wonAt).toLocaleDateString()}</p>

            {win.prizeType === 'PHYSICAL' && win.shippingAddress && (
              <p>收货地址: {win.shippingAddress.fullAddress}</p>
            )}
          </div>

          <button
            onClick={() => handleCreateShowcase(win)}
            disabled={win.hasShowcase}
          >
            {win.hasShowcase ? '已晒单' : '创建晒单'}
          </button>
        </div>
      ))}

      {selectedWin && (
        <CreateWinnerShowcaseModal
          win={selectedWin}
          onClose={() => setSelectedWin(null)}
          onSuccess={loadWinningHistory}
        />
      )}
    </div>
  );
}
```

#### 创建中奖晒单

```typescript
async function createWinnerShowcase(
  drawResultId: number,
  media: MediaItem[],
  content?: string,
) {
  const response = await axios.post(
    '/api/v1/showcase/winner',
    {
      drawResultId,
      media,
      content,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
}

// 使用示例
async function handleWinnerShowcaseSubmit(win: WinningHistoryItem, files: File[]) {
  // 1. 上传文件
  const media = await uploadFiles(files);

  // 2. 创建中奖晒单
  const showcase = await createWinnerShowcase(
    win.drawResultId,
    media,
    `我中了 ${win.productName}！`,
  );

  console.log('晒单创建成功:', showcase);
}
```

---

## 数据结构

### Showcase 对象

```typescript
interface Showcase {
  id: number;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string | null;
  media: MediaItem[];
  productId: number | null;
  drawRoundId: number | null;
  prizeInfo: string | null;

  // 互动数据
  likeCount: number;
  commentCount: number;
  shareCount: number;

  // 中奖相关
  drawResultId: number | null;
  isWinnerShowcase: boolean;
  winningNumber: number | null;
  prizeType: string | null;
  prizeValue: string | null;
  shippingAddressSnapshot: ShippingAddress | null;

  // 验证标识
  isVerified: boolean;
  verifiedAt: string | null;
  verificationNote: string | null;

  // 审核状态
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
  rejectReason: string | null;

  // 运营字段
  isPinned: boolean;
  priority: number;

  // 当前用户状态
  isLiked?: boolean; // 当前用户是否已点赞

  createdAt: string;
  updatedAt: string;
}
```

### Comment 对象

```typescript
interface Comment {
  id: number;
  showcaseId: number;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  parentId: number | null;
  replyToUserId: string | null;
  replyToUserName: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[]; // 嵌套回复
}
```

---

## 最佳实践

### 1. 错误处理

```typescript
async function safeApiCall<T>(apiCall: () => Promise<T>): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      console.error('API Error:', message);
      // 显示用户友好的错误提示
      showErrorToast(message);
    }
    return null;
  }
}

// 使用
const showcase = await safeApiCall(() => createShowcase(data));
if (showcase) {
  // 成功处理
}
```

### 2. 乐观更新

```typescript
// 点赞的乐观更新
async function toggleLikeOptimistic(showcaseId: number, currentLiked: boolean) {
  // 1. 立即更新 UI
  updateLocalShowcase(showcaseId, {
    isLiked: !currentLiked,
    likeCount: currentLiked ? -1 : +1,
  });

  try {
    // 2. 调用 API
    await axios.post(`/api/v1/showcase/${showcaseId}/like`, null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    // 3. 失败时回滚
    updateLocalShowcase(showcaseId, {
      isLiked: currentLiked,
      likeCount: currentLiked ? +1 : -1,
    });
    console.error('Like failed:', error);
  }
}
```

### 3. 缓存策略

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 晒单详情查询
function useShowcase(id: number) {
  return useQuery({
    queryKey: ['showcase', id],
    queryFn: () => axios.get(`/api/v1/showcase/${id}`).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}

// 点赞 mutation
function useLikeShowcase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (showcaseId: number) =>
      axios.post(`/api/v1/showcase/${showcaseId}/like`),
    onSuccess: (_, showcaseId) => {
      // 使缓存失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['showcase', showcaseId] });
    },
  });
}
```

### 4. 分页加载

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function useShowcaseList(userId?: string) {
  return useInfiniteQuery({
    queryKey: ['showcases', userId],
    queryFn: ({ pageParam = 1 }) =>
      axios
        .get(`/api/v1/showcase?page=${pageParam}&limit=20&userId=${userId || ''}`)
        .then((res) => res.data),
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
  });
}

// 组件中使用
function ShowcaseList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useShowcaseList();

  return (
    <div>
      {data?.pages.map((page) =>
        page.items.map((showcase) => (
          <ShowcaseCard key={showcase.id} showcase={showcase} />
        )),
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  );
}
```

---

## UI/UX 建议

### 1. 中奖标识显示

```tsx
function ShowcaseCard({ showcase }: { showcase: Showcase }) {
  return (
    <div className="showcase-card">
      {/* 中奖徽章 */}
      {showcase.isWinnerShowcase && (
        <div className="winner-badge">
          <span className="trophy-icon">🏆</span>
          <span>中奖晒单</span>
        </div>
      )}

      {/* 官方认证徽章 */}
      {showcase.isVerified && (
        <div
          className="verified-badge"
          title={showcase.verificationNote || '官方认证'}
        >
          <span className="verified-icon">✓</span>
          <span>官方认证</span>
        </div>
      )}

      {/* 晒单内容 */}
      {/* ... */}
    </div>
  );
}
```

### 2. 中奖后引导晒单

```tsx
// 在中奖结果页显示
function DrawResultPage({ drawResult }: { drawResult: DrawResult }) {
  const [showPrompt, setShowPrompt] = useState(true);

  return (
    <div className="draw-result">
      <h2>🎉 恭喜中奖！</h2>
      <p>您中了 {drawResult.productName}</p>
      <p>中奖号码: {drawResult.winningNumber}</p>

      {/* 引导晒单 */}
      {showPrompt && (
        <div className="showcase-prompt">
          <p>📸 分享您的喜悦，创建晒单吧！</p>
          <button onClick={() => navigateTo(`/showcase/create?drawResultId=${drawResult.id}`)}>
            立即晒单
          </button>
          <button onClick={() => setShowPrompt(false)}>稍后</button>
        </div>
      )}
    </div>
  );
}
```

### 3. 评论嵌套显示

```tsx
function CommentItem({ comment, level = 0 }: { comment: Comment; level?: number }) {
  const maxLevel = 3; // 最多显示3层嵌套

  return (
    <div className="comment-item" style={{ marginLeft: `${level * 20}px` }}>
      <div className="comment-header">
        <img src={comment.userAvatar} alt={comment.userName} />
        <span className="user-name">{comment.userName}</span>
        {comment.replyToUserName && (
          <span className="reply-to">回复 @{comment.replyToUserName}</span>
        )}
        <span className="time">{formatTime(comment.createdAt)}</span>
      </div>

      <div className="comment-content">{comment.content}</div>

      <div className="comment-actions">
        <button onClick={() => handleReply(comment)}>回复</button>
        {isOwner && <button onClick={() => handleDelete(comment.id)}>删除</button>}
      </div>

      {/* 嵌套回复 */}
      {comment.replies && level < maxLevel && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. 分享面板

```tsx
function SharePanel({ showcaseId }: { showcaseId: number }) {
  const platforms: SharePlatform[] = ['TWITTER', 'TELEGRAM', 'FACEBOOK', 'LINK'];

  return (
    <div className="share-panel">
      <h3>分享到</h3>
      <div className="platform-list">
        {platforms.map((platform) => (
          <button
            key={platform}
            className={`platform-btn ${platform.toLowerCase()}`}
            onClick={() => handleShare(showcaseId, platform)}
          >
            <PlatformIcon platform={platform} />
            <span>{getPlatformName(platform)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 5. 实物奖品地址显示

```tsx
function WinnerShowcaseDetail({ showcase }: { showcase: Showcase }) {
  if (!showcase.isWinnerShowcase || showcase.prizeType !== 'PHYSICAL') {
    return null;
  }

  const address = showcase.shippingAddressSnapshot;

  return (
    <div className="winner-info">
      <h3>中奖信息</h3>
      <p>奖品: {showcase.prizeInfo}</p>
      <p>中奖号码: {showcase.winningNumber}</p>

      {address && (
        <div className="shipping-address">
          <h4>收货地址</h4>
          <p>{address.recipientName}</p>
          <p>{address.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
          <p>{address.fullAddress}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 性能优化建议

### 1. 图片懒加载

```tsx
import { LazyLoadImage } from 'react-lazy-load-image-component';

function MediaGallery({ media }: { media: MediaItem[] }) {
  return (
    <div className="media-gallery">
      {media.map((item, index) => (
        <LazyLoadImage
          key={index}
          src={item.url}
          alt={`Media ${index + 1}`}
          effect="blur"
          threshold={100}
        />
      ))}
    </div>
  );
}
```

### 2. 虚拟滚动（大列表）

```tsx
import { FixedSizeList } from 'react-window';

function VirtualShowcaseList({ showcases }: { showcases: Showcase[] }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ShowcaseCard showcase={showcases[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={800}
      itemCount={showcases.length}
      itemSize={400}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 3. 防抖搜索

```typescript
import { debounce } from 'lodash';

const searchShowcases = debounce(async (keyword: string) => {
  const results = await axios.get(
    `/api/v1/showcase?keyword=${encodeURIComponent(keyword)}`,
  );
  setSearchResults(results.data.items);
}, 300);
```

---

## 完整示例：晒单详情页

```tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

function ShowcaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const showcaseId = parseInt(id);

  const { data: showcase, isLoading } = useShowcase(showcaseId);
  const { mutate: toggleLike } = useLikeShowcase();
  const { comments, createComment, deleteComment } = useComments(showcaseId);

  if (isLoading) return <div>加载中...</div>;
  if (!showcase) return <div>晒单不存在</div>;

  return (
    <div className="showcase-detail">
      {/* 用户信息 */}
      <div className="user-info">
        <img src={showcase.userAvatar} alt={showcase.userName} />
        <div>
          <h3>{showcase.userName}</h3>
          {showcase.isVerified && <span className="verified-badge">✓ 官方认证</span>}
        </div>
      </div>

      {/* 晒单内容 */}
      <div className="showcase-content">
        {showcase.isWinnerShowcase && (
          <div className="winner-banner">🏆 中奖晒单</div>
        )}

        <p>{showcase.content}</p>

        <MediaGallery media={showcase.media} />

        {/* 互动按钮 */}
        <div className="actions">
          <button
            className={showcase.isLiked ? 'liked' : ''}
            onClick={() => toggleLike(showcaseId)}
          >
            ❤️ {showcase.likeCount}
          </button>

          <button>💬 {showcase.commentCount}</button>

          <button onClick={() => setShowSharePanel(true)}>
            🔗 {showcase.shareCount}
          </button>
        </div>
      </div>

      {/* 评论区 */}
      <CommentSection
        showcaseId={showcaseId}
        comments={comments}
        onCreateComment={createComment}
        onDeleteComment={deleteComment}
      />
    </div>
  );
}

export default ShowcaseDetailPage;
```

---

## 常见问题

### Q: 如何处理视频上传？

A: 视频上传使用相同的 `/api/v1/showcase/upload` 端点，后端会自动识别并上传到 Cloudflare Stream，返回 `thumbnailUrl` 作为视频缩略图。

### Q: 评论最多可以嵌套多少层？

A: 后端使用 materialized-path 树形结构，理论上无限嵌套。建议前端限制在 3 层以内以保持 UI 清晰。

### Q: 分享统计是否需要登录？

A: 是的，记录分享行为需要用户登录。但访问分享链接不需要登录。

### Q: 中奖晒单可以删除吗？

A: 可以。用户可以删除自己的晒单（包括中奖晒单），但 `drawResultId` 关联会保留，不影响中奖记录。

---

## 支持与反馈

如有问题或建议，请联系开发团队或提交 Issue。
