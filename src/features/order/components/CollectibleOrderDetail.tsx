import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

interface CollectibleOrderDetailProps {
  orderId: number;
  onBack: () => void;
  onCopy: (text: string) => void;
  onOpenHelp: () => void;
}

export const CollectibleOrderDetail = ({
  orderId,
  onBack,
  onCopy,
  onOpenHelp,
}: CollectibleOrderDetailProps) => (
  <div className="absolute inset-0 bg-bg-base z-50 flex flex-col overflow-hidden">
    <div className="bg-bg-card px-4 py-3 flex items-center justify-between border-b border-border-light">
      <button onClick={onBack} className="text-text-main p-1 -ml-1">
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-xl font-bold text-text-main">订单详情</h1>
      <div className="w-6"></div>
    </div>

    <div className="flex-1 overflow-y-auto no-scrollbar pb-[80px]">
      <div className="bg-gradient-to-r from-primary-start to-primary-end p-6 text-white">
        <h2 className="text-4xl font-bold mb-1">撮合交易中</h2>
        <p className="text-sm opacity-90">系统正在为您匹配最优交易对手</p>
      </div>

      <Card className="mx-4 -mt-4 relative z-10 mb-3 p-4">
        <div className="flex justify-between items-center mb-4 relative">
          <div className="absolute top-1/2 left-4 right-4 h-px bg-border-light -z-10"></div>
          <div className="flex flex-col items-center bg-bg-card px-1">
            <div className="w-4 h-4 rounded-full bg-primary-start flex items-center justify-center text-white mb-1">
              <CheckCircle2 size={10} />
            </div>
            <span className="text-xs text-primary-start">已下单</span>
          </div>
          <div className="flex flex-col items-center bg-bg-card px-1">
            <div className="w-4 h-4 rounded-full bg-primary-start flex items-center justify-center text-white mb-1">
              <Clock size={10} />
            </div>
            <span className="text-xs text-primary-start">撮合中</span>
          </div>
          <div className="flex flex-col items-center bg-bg-card px-1">
            <div className="w-4 h-4 rounded-full bg-border-light mb-1"></div>
            <span className="text-xs text-text-aux">待交割</span>
          </div>
          <div className="flex flex-col items-center bg-bg-card px-1">
            <div className="w-4 h-4 rounded-full bg-border-light mb-1"></div>
            <span className="text-xs text-text-aux">已完成</span>
          </div>
        </div>
        <div className="bg-bg-base rounded-lg p-3 text-s text-text-sub">
          <p className="mb-1">
            <span className="text-text-main">2026-02-27 10:00:00</span> 订单已提交，等待系统撮合
          </p>
          <p>
            <span className="text-text-main">2026-02-27 10:05:00</span> 正在为您寻找匹配的卖家份额
          </p>
        </div>
      </Card>

      <Card className="mx-4 mb-3 p-0 overflow-hidden">
        <div className="px-3 py-3 border-b border-border-light flex items-center">
          <span className="text-white text-xs px-1 rounded mr-1.5 font-medium leading-tight bg-purple-500">藏品</span>
          <span className="text-base font-bold text-text-main">国家博物馆数字文创</span>
        </div>
        <div className="p-3 flex space-x-3">
          <div className="w-[72px] h-[72px] rounded-lg bg-bg-base overflow-hidden shrink-0 border border-border-light">
            <img
              src={`https://picsum.photos/seed/detail${orderId}/150/150`}
              alt="Item"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="text-base text-text-main line-clamp-2 leading-tight mb-1">四羊方尊 3D 数字复刻件</div>
            <div className="text-s text-text-aux mb-auto">编号: #1024 / 发行量: 5000</div>
            <div className="flex justify-between items-end mt-1">
              <div className="text-lg font-bold text-text-main leading-none">
                <span className="text-s">¥</span>299.00
              </div>
              <div className="text-sm text-text-aux">x1</div>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-bg-base border-t border-border-light flex justify-between items-center">
          <span className="text-sm text-text-main flex items-center">
            <ShieldCheck size={14} className="mr-1 text-green-500" />
            确权证书
          </span>
          <span className="text-sm text-text-aux flex items-center cursor-pointer">
            查看 <ChevronRight size={12} />
          </span>
        </div>
      </Card>

      <Card className="mx-4 mb-4 p-3 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">订单编号</span>
          <span className="text-text-main flex items-center">
            28394018239
            <button className="ml-1 text-text-aux cursor-pointer" onClick={() => onCopy('28394018239')}>
              <Copy size={10} />
            </button>
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">下单时间</span>
          <span className="text-text-main">2026-02-27 10:00:00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">支付方式</span>
          <span className="text-text-main">在线支付</span>
        </div>
        <div className="h-px bg-border-light my-1"></div>
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">商品总额</span>
          <span className="text-text-main">¥299.00</span>
        </div>
        <div className="flex justify-between text-md font-bold pt-1">
          <span className="text-text-main">应付金额</span>
          <span className="text-primary-start">¥299.00</span>
        </div>
      </Card>
    </div>

    <div className="absolute bottom-0 left-0 right-0 bg-bg-card border-t border-border-light p-3 pb-safe flex justify-end space-x-3">
      <Button variant="secondary" fullWidth={false} className="h-[36px] px-5" onClick={onOpenHelp}>
        联系客服
      </Button>
      <Button variant="secondary" fullWidth={false} className="h-[36px] px-5">
        取消交易
      </Button>
    </div>
  </div>
);
