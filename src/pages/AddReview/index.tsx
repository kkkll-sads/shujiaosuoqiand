import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  ChevronLeft,
  Loader2,
  Package,
  Star,
  WifiOff,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../../api/core/errors';
import { resolveUploadUrl, uploadApi, type UploadedFile } from '../../api/modules/upload';
import { Card } from '../../components/ui/Card';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { useAppNavigate } from '../../lib/navigation';

const QUICK_TAGS = ['质量好', '物流快', '服务好', '包装扎实', '正品', '性价比高', '外观不错'];

type ImageStatus = 'uploading' | 'success' | 'error';

interface UploadImage {
  errorMessage?: string;
  file: File;
  id: string;
  status: ImageStatus;
  uploaded?: UploadedFile;
  url: string;
}

export default function AddReviewPage() {
  const { goBack } = useAppNavigate();
  const { showToast } = useFeedback();
  const { id: productId } = useParams();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<UploadImage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<UploadImage[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        if (image.url.startsWith('blob:')) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, []);

  const revokePreviewUrl = (url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const uploadSingleImage = useCallback(async (image: UploadImage) => {
    try {
      const uploaded = await uploadApi.upload({
        file: image.file,
        topic: 'review',
      });

      const nextUrl = uploaded.url ? resolveUploadUrl(uploaded.url) : image.url;

      setImages((prev) =>
        prev.map((item) =>
          item.id === image.id
            ? {
                ...item,
                errorMessage: undefined,
                status: 'success',
                uploaded,
                url: nextUrl,
              }
            : item,
        ),
      );

      if (nextUrl !== image.url) {
        revokePreviewUrl(image.url);
      }
    } catch (error) {
      setImages((prev) =>
        prev.map((item) =>
          item.id === image.id
            ? {
                ...item,
                errorMessage: getErrorMessage(error),
                status: 'error',
              }
            : item,
        ),
      );
    }
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    const nextImages = Array.from<File>(files)
      .slice(0, 9 - images.length)
      .map((file) => ({
        file,
        id: Math.random().toString(36).slice(2),
        status: 'uploading' as ImageStatus,
        url: URL.createObjectURL(file),
      }));

    setImages((prev) => [...prev, ...nextImages]);
    nextImages.forEach((image) => {
      void uploadSingleImage(image);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        revokePreviewUrl(target.url);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const retryUpload = (id: string) => {
    const target = images.find((item) => item.id === id);
    if (!target) {
      return;
    }

    setImages((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, errorMessage: undefined, status: 'uploading' } : item,
      ),
    );

    void uploadSingleImage({
      ...target,
      errorMessage: undefined,
      status: 'uploading',
    });
  };

  const handleSubmit = () => {
    if (rating === 0) {
      showToast({ message: '请先选择星级评分', type: 'warning' });
      return;
    }

    showToast({
      message: '评价提交接口暂未接入，已移除本地假提交成功逻辑',
      type: 'info',
      duration: 2600,
    });
  };

  return (
    <div className="min-h-screen bg-bg-sub flex flex-col pb-24">
      <div className="sticky top-0 z-50 border-b border-border-light bg-white dark:bg-gray-900">
        <div className="flex h-11 items-center justify-between px-4">
          <button onClick={goBack} className="p-1 -ml-1 active:opacity-70">
            <ChevronLeft size={24} className="text-text-main" />
          </button>
          <h1 className="text-2xl font-medium text-text-main">发表评价</h1>
          <div className="w-8" />
        </div>
        {isOffline && (
          <div className="flex items-center justify-center bg-red-50 px-4 py-2 text-sm text-primary-start">
            <WifiOff size={14} className="mr-1" />
            网络连接已断开，请检查网络设置
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <Card className="flex items-center space-x-3 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-bg-sub text-text-sub">
            <Package size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-md text-text-main">待评价商品</h3>
            <p className="mt-1 text-sm text-text-sub">
              {productId ? `商品ID: ${productId}` : '商品信息未通过接口返回'}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col items-center p-5">
          <div className="mb-4 flex items-center space-x-4">
            <span className="text-lg font-medium text-text-main">商品评分</span>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-110"
                >
                  <Star
                    size={28}
                    className={star <= rating ? 'fill-primary-start text-primary-start' : 'text-border-main'}
                  />
                </button>
              ))}
            </div>
            <span className="w-10 text-base text-text-sub">
              {rating === 1 && '很差'}
              {rating === 2 && '较差'}
              {rating === 3 && '一般'}
              {rating === 4 && '不错'}
              {rating === 5 && '很好'}
            </span>
          </div>

          {rating > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'border border-primary-start/30 bg-primary-start/10 text-primary-start'
                      : 'border border-transparent bg-bg-sub text-text-main'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 500))}
            placeholder="说说你的使用感受，帮助其他用户了解商品情况"
            className="h-32 w-full resize-none bg-transparent text-md text-text-main outline-none placeholder:text-text-aux"
          />
          <div className="mb-4 text-right text-sm text-text-aux">{content.length}/500</div>

          <div className="grid grid-cols-3 gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-border-light bg-bg-sub"
              >
                <img src={image.url} alt="Upload" className="h-full w-full object-cover" />

                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X size={12} />
                </button>

                {image.status === 'uploading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                    <Loader2 size={20} className="mb-1 animate-spin" />
                    <span className="text-xs">上传中</span>
                  </div>
                )}

                {image.status === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
                    <AlertCircle size={20} className="mb-1 text-red-400" />
                    <span className="mb-1 px-2 text-center text-xs">
                      {image.errorMessage || '上传失败'}
                    </span>
                    <button
                      onClick={() => retryUpload(image.id)}
                      className="rounded bg-white px-2 py-0.5 text-xs text-gray-900"
                    >
                      重试
                    </button>
                  </div>
                )}
              </div>
            ))}

            {images.length < 9 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-border-main text-text-sub transition-colors active:bg-bg-sub"
              >
                <Camera size={24} className="mb-1" />
                <span className="text-xs">添加图片</span>
                <span className="text-xs text-text-aux">{images.length}/9</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="mt-6 flex items-center justify-between border-t border-border-light pt-4">
            <button
              onClick={() => setIsAnonymous((current) => !current)}
              className="flex items-center space-x-2"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border-main">
                {isAnonymous ? <span className="h-2.5 w-2.5 rounded-full bg-text-main" /> : null}
              </span>
              <span className="text-md text-text-main">匿名评价</span>
            </button>
            <span className="text-sm text-text-aux">你的评价将以匿名形式展示</span>
          </div>
        </Card>
      </div>

      <div className="fixed right-0 bottom-0 left-0 border-t border-border-light bg-white p-2 pb-safe dark:bg-gray-900">
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className={`flex h-10 w-full items-center justify-center rounded-full text-lg font-medium transition-all ${
            rating === 0
              ? 'cursor-not-allowed bg-bg-sub text-text-sub'
              : 'bg-gradient-to-r from-primary-start to-primary-end text-white active:opacity-90'
          }`}
        >
          提交评价
        </button>
      </div>
    </div>
  );
}
