import type { OrderType } from './types';

export const ORDER_TABS: Record<OrderType, string[]> = {
  mall: ['全部', '待付款', '待发货', '待收货', '已完成', '售后'],
  collectible: ['全部', '交易中', '待交割', '已完成', '已取消', '申诉'],
};
