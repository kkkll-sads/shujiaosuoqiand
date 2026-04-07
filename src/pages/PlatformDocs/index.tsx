/**
 * @file PlatformDocs/index.tsx - 平台资料页面
 * @description 使用 pdf.js 将多个 PDF 文档逐页渲染为 canvas，拼接在同一页面内滚动查看。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PageHeader } from '../../components/layout/PageHeader';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var PDF_URLS = ['/img/1.pdf'];

/** 渲染单个 PDF 的所有页面到容器中 */
function renderPdf(
  url: string,
  container: HTMLDivElement,
  devicePixelRatio: number,
  signal: AbortSignal
): Promise<void> {
  return pdfjsLib
    .getDocument({ url: url, disableAutoFetch: true })
    .promise.then(function (pdf) {
      var chain = Promise.resolve();
      var i = 1;
      while (i <= pdf.numPages) {
        (function (pageNum) {
          chain = chain.then(function () {
            if (signal.aborted) return;
            return pdf.getPage(pageNum).then(function (page) {
              if (signal.aborted) return;

              var containerWidth = container.clientWidth || window.innerWidth;
              var baseViewport = page.getViewport({ scale: 1 });
              var scale = containerWidth / baseViewport.width;
              var viewport = page.getViewport({ scale: scale });

              var canvas = document.createElement('canvas');
              canvas.style.width = '100%';
              canvas.style.height = 'auto';
              canvas.style.display = 'block';
              canvas.width = Math.floor(viewport.width * devicePixelRatio);
              canvas.height = Math.floor(viewport.height * devicePixelRatio);

              var ctx = canvas.getContext('2d');
              if (!ctx) return;

              container.appendChild(canvas);

              return page
                .render({
                  canvasContext: ctx,
                  viewport: page.getViewport({ scale: scale * devicePixelRatio }),
                })
                .promise.then(function () {
                  /* rendered */
                });
            });
          });
        })(i);
        i++;
      }
      return chain;
    });
}

export function PlatformDocsPage() {
  var containerRef = useRef<HTMLDivElement>(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');

  var loadAllPdfs = useCallback(function () {
    var el = containerRef.current;
    if (!el) return;

    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    setLoading(true);
    setError('');

    var controller = new AbortController();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var chain = Promise.resolve();
    var idx = 0;
    while (idx < PDF_URLS.length) {
      (function (url) {
        chain = chain.then(function () {
          if (controller.signal.aborted) return;
          return renderPdf(url, el, dpr, controller.signal);
        });
      })(PDF_URLS[idx]);
      idx++;
    }

    chain
      .then(function () {
        setLoading(false);
      })
      .catch(function (err) {
        if (!controller.signal.aborted) {
          setError(String((err && err.message) || '加载失败'));
          setLoading(false);
        }
      });

    return function () {
      controller.abort();
    };
  }, []);

  useEffect(function () {
    return loadAllPdfs();
  }, [loadAllPdfs]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg-base">
      <PageHeader title="平台资料" />

      <div className="relative flex-1 overflow-y-auto no-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-text-aux" />
            <span className="ml-2 text-sm text-text-aux">文档加载中…</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-4 text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={loadAllPdfs}
              className="rounded-full bg-primary-start px-6 py-2 text-sm font-medium text-white active:opacity-80"
            >
              重新加载
            </button>
          </div>
        )}

        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}

export default PlatformDocsPage;
