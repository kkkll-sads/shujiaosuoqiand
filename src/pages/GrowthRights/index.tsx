/**
 * @file GrowthRights/index.tsx - 成长权益页面
 * @description 展示用户成长权益信息，包括成长天数、待激活金、周期进度、成长阶段、配资规则、成长记录。
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TrendingUp, Calendar, Award, Activity, CheckCircle2, XCircle, Gift, Zap } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { accountApi, type GrowthRightsModeProgressItemRaw } from '../../api/modules/account';

var HOSTING_PATHS = ['/shield', '/growth_rights', '/growth-rights'];

interface GrowthRightsContentProps {
  onReloadRef?: React.MutableRefObject<(() => Promise<unknown>) | null>;
}

/** 成长权益内容区（无顶部返回栏），用于确权中心 Tab 内嵌 */
export var GrowthRightsContent = function GrowthRightsContent(props: GrowthRightsContentProps) {
  var location = useLocation();
  var [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');

  var { data, loading, error, reload } = useRequest(
    function (signal) { return accountApi.getGrowthRightsInfo({ signal }); },
    { cacheKey: 'growthRightsInfo' },
  );

  useEffect(function () {
    if (props.onReloadRef) {
      props.onReloadRef.current = reload;
    }
    return function () {
      if (props.onReloadRef) {
        props.onReloadRef.current = null;
      }
    };
  }, [reload, props.onReloadRef]);

  var prevPathRef = useRef(location.pathname);
  useEffect(function () {
    var prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    var wasOnPage = HOSTING_PATHS.indexOf(prev) !== -1;
    var isOnPage = HOSTING_PATHS.indexOf(location.pathname) !== -1;
    if (isOnPage && !wasOnPage) {
      void reload().catch(function () { return undefined; });
    }
  }, [location.pathname, reload]);

  var pendingGold =
    data?.pending_activation_gold != null
      ? Number(data.pending_activation_gold)
      : 0;
  var stage = data?.stage ?? { key: '', label: '--', rights_status: '--', min_days: 0 };
  var stages = data?.stages ?? [];
  var status = data?.status ?? {
    can_activate: false,
    can_unlock_package: false,
    financing_enabled: false,
    is_accelerated_mode: false,
  };
  var financing = data?.financing ?? { ratio: '--', rules: [] };
  var cycle = data?.cycle ?? {
    active_mode: '',
    cycle_days: 0,
    completed_cycles: 0,
    ready_for_cycle_claim: false,
    next_cycle_in_days: 0,
    remaining_days_in_cycle: 0,
    unlock_amount_per_cycle: 0,
    unlockable_amount: 0,
    claimed_cycles: 0,
    claimable_cycles: 0,
    claimable_amount: 0,
    mode_progress: {},
  };
  var dailyGrowthLogs = data?.daily_growth_logs ?? [];
  var modeProgressEntries = Object.entries(cycle.mode_progress ?? {}) as Array<
    [string, GrowthRightsModeProgressItemRaw]
  >;

  if (loading && !data) {
    return (
      <div className="flex-1 bg-bg-base flex flex-col">
        <div className="p-4 space-y-4">
          <Skeleton className="w-full h-40 rounded-[16px]" />
          <Skeleton className="w-full h-32 rounded-[16px]" />
          <Skeleton className="w-full h-64 rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-bg-base">
        <p className="text-base text-text-sub text-center mb-4">
          {error instanceof Error ? error.message : '加载失败'}
        </p>
        <button
          onClick={function () { void reload().catch(function () { return undefined; }); }}
          className="px-4 py-2 bg-primary-start text-white text-base font-medium rounded-lg"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full no-scrollbar pb-safe bg-bg-base">
        {/* Top Banner */}
        <div className="bg-gradient-to-br from-primary-start to-primary-end px-6 py-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="text-base text-white/80 mb-1 flex items-center">
              <TrendingUp size={16} className="mr-1.5" /> 累计成长天数
            </div>
            <div className="flex items-baseline">
              <span className="text-[40px] font-bold leading-none mr-2">{data?.growth_days ?? 0}</span>
              <span className="text-base text-white/80">天</span>
            </div>
            <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-s">
              当前阶段：{stage.label} ({stage.rights_status})
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-border-light bg-white dark:bg-gray-900">
          <button
            className={'flex-1 py-3 text-base font-medium relative transition-colors ' + (activeTab === 'overview' ? 'text-primary-start' : 'text-text-sub')}
            onClick={function () { setActiveTab('overview'); }}
          >
            权益概览
            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-start rounded-t-full"></div>}
          </button>
          <button
            className={'flex-1 py-3 text-base font-medium relative transition-colors ' + (activeTab === 'logs' ? 'text-primary-start' : 'text-text-sub')}
            onClick={function () { setActiveTab('logs'); }}
          >
            成长记录
            {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-start rounded-t-full"></div>}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'overview' ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-white dark:bg-gray-900 shadow-sm border-none">
                  <div className="text-s text-text-sub mb-1 flex items-center">
                    <Activity size={14} className="mr-1" /> 今日交易笔数
                  </div>
                  <div className="text-2xl font-bold text-text-main">{data?.today_trade_count ?? 0}</div>
                </Card>
                <Card className="p-4 bg-white dark:bg-gray-900 shadow-sm border-none">
                  <div className="text-s text-text-sub mb-1 flex items-center">
                    <Activity size={14} className="mr-1" /> 累计交易笔数
                  </div>
                  <div className="text-2xl font-bold text-text-main">{data?.total_trade_count ?? 0}</div>
                </Card>
                <Card className="p-4 bg-white dark:bg-gray-900 shadow-sm border-none col-span-2 flex justify-between items-center">
                  <div>
                    <div className="text-s text-text-sub mb-1">待激活金</div>
                    <div className="text-3xl font-bold text-primary-start">¥{pendingGold.toLocaleString('zh-CN', { useGrouping: false })}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center text-orange-500 dark:text-orange-300">
                    <Award size={20} />
                  </div>
                </Card>
              </div>

              {/* Cycle Summary */}
              {(cycle.claimable_cycles ?? 0) > 0 && (
                <Card className="p-4 shadow-sm border-none bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-green-700 dark:text-green-300 mb-1 flex items-center">
                        <Zap size={16} className="mr-1.5" /> 可领取周期
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        已完成 {cycle.completed_cycles ?? 0} 个周期，可领取 {cycle.claimable_cycles ?? 0} 个
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">¥{(cycle.claimable_amount ?? 0).toLocaleString('zh-CN', { useGrouping: false })}</div>
                      <div className="text-xs text-green-500 dark:text-green-400">可领取金额</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Cycle Info */}
              <Card className="p-4 shadow-sm border-none">
                <h3 className="text-md font-bold text-text-main mb-3 flex items-center">
                  <Calendar size={16} className="mr-1.5 text-primary-start" /> 周期进度
                  {status.is_accelerated_mode && (
                    <span className="ml-2 bg-red-50 text-primary-start text-2xs px-2 py-0.5 rounded-full font-medium border border-red-100 dark:border-red-500/20 dark:bg-red-500/12 dark:text-red-300">加速模式</span>
                  )}
                </h3>

                {/* Overall Cycle Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-[10px] bg-bg-base">
                  <div className="text-center">
                    <div className="text-xl font-bold text-text-main">{cycle.completed_cycles ?? 0}</div>
                    <div className="text-2xs text-text-sub mt-0.5">已完成周期</div>
                  </div>
                  <div className="text-center border-x border-border-light">
                    <div className="text-xl font-bold text-text-main">{cycle.claimed_cycles ?? 0}</div>
                    <div className="text-2xs text-text-sub mt-0.5">已领取</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary-start">{cycle.claimable_cycles ?? 0}</div>
                    <div className="text-2xs text-text-sub mt-0.5">待领取</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {modeProgressEntries.map(function (entry) {
                    var modeKey = entry[0];
                    var mode = entry[1];
                    var isActive = cycle.active_mode === modeKey;
                    var summary = mode.summary;
                    var cycleDays = mode.cycle_days ?? 0;
                    var remainingDays = summary?.remaining_days_in_cycle ?? 0;
                    var completedDaysInCycle = cycleDays > 0 ? Math.max(0, cycleDays - remainingDays) : 0;
                    var cycleProgress = cycleDays > 0
                      ? Math.min((completedDaysInCycle / cycleDays) * 100, 100)
                      : 0;
                    var modeCompletedCycles = summary?.completed_cycles ?? 0;

                    return (
                      <div key={modeKey} className={'p-3 rounded-[12px] border ' + (isActive ? 'border-primary-start bg-red-50/30 dark:bg-red-900/10' : 'border-border-light bg-bg-base')}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-base font-medium text-text-main flex items-center">
                            {mode.label}
                            {isActive && (
                              <span className="ml-1.5 text-2xs bg-primary-start text-white px-1.5 py-0.5 rounded">当前</span>
                            )}
                          </span>
                          <span className="text-xs text-text-sub">
                            每日≥{mode.daily_trade_threshold ?? 1}笔 · {cycleDays}天/周期
                          </span>
                        </div>

                        {/* Growth days vs threshold */}
                        <div className="text-sm text-text-sub mb-2">
                          成长天数 <span className={isActive ? 'text-primary-start font-bold' : 'text-text-main font-medium'}>{mode.growth_days ?? 0}</span>
                          <span className="text-text-aux"> / {mode.required_days ?? 0} 天（解锁门槛）</span>
                          {modeCompletedCycles > 0 && (
                            <span className="ml-2 text-green-600 dark:text-green-400">已完成 {modeCompletedCycles} 周期</span>
                          )}
                        </div>

                        {/* Current Cycle Progress */}
                        <div className="flex justify-between text-xs text-text-sub mb-1">
                          <span>当前周期进度</span>
                          <span>
                            <span className={isActive ? 'text-primary-start font-medium' : 'text-text-main'}>{completedDaysInCycle}</span>
                            {' / '}{cycleDays} 天
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                          <div
                            className={'h-full rounded-full transition-all duration-500 ' + (isActive ? 'bg-primary-start' : 'bg-gray-400')}
                            style={{ width: cycleProgress + '%' }}
                          ></div>
                        </div>

                        <div className="text-xs text-text-sub flex justify-between">
                          <span>
                            {remainingDays > 0
                              ? '距下次结算还需 ' + remainingDays + ' 天'
                              : '本周期已达成'}
                          </span>
                          {isActive && <span>每次解锁: ¥{cycle.unlock_amount_per_cycle ?? 0}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Stages Timeline */}
              <Card className="p-4 shadow-sm border-none">
                <h3 className="text-md font-bold text-text-main mb-4">成长阶段</h3>
                <div className="relative pl-4 border-l-2 border-border-light space-y-6">
                  {stages.map(function (s) {
                    var isCurrent = s.key === stage.key;
                    var isPast = (s.max_days != null) && (data?.growth_days ?? 0) > s.max_days;

                    return (
                      <div key={s.key} className="relative">
                        <div className={'absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900 ' + (isCurrent ? 'border-primary-start ring-4 ring-red-50 dark:ring-red-500/15' : isPast ? 'border-green-500' : 'border-gray-300 dark:border-gray-600')}></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={'text-base font-bold mb-1 ' + (isCurrent ? 'text-primary-start' : isPast ? 'text-text-main' : 'text-text-sub')}>
                              {s.label}
                            </div>
                            <div className="text-s text-text-sub">
                              {s.max_days != null ? s.min_days + ' - ' + s.max_days + ' 天' : s.min_days + ' 天以上'}
                            </div>
                          </div>
                          <div className={'text-s px-2 py-1 rounded bg-bg-base ' + (isCurrent ? 'text-primary-start font-medium' : 'text-text-sub')}>
                            {s.rights_status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Financing Rules */}
              <Card className="p-4 shadow-sm border-none">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-bold text-text-main">配资比例规则</h3>
                  <span className="text-sm text-text-sub">当前比例: <span className="text-text-main font-bold">{financing.ratio}</span></span>
                </div>
                <div className="bg-bg-base rounded-[8px] overflow-hidden border border-border-light">
                  <div className="flex bg-gray-100 dark:bg-gray-800 text-s text-text-sub font-medium">
                    <div className="flex-1 p-2 text-center border-r border-border-light">天数范围</div>
                    <div className="flex-1 p-2 text-center">配资比例</div>
                  </div>
                  {(financing.rules ?? []).map(function (rule, idx) {
                    return (
                      <div key={idx} className="flex text-sm text-text-main border-t border-border-light">
                        <div className="flex-1 p-2 text-center border-r border-border-light">
                          {rule.max_days != null ? rule.min_days + '-' + rule.max_days + '天' : rule.min_days + '天以上'}
                        </div>
                        <div className="flex-1 p-2 text-center font-medium">{rule.ratio}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          ) : (
            /* Logs Tab */
            <div className="space-y-3">
              {dailyGrowthLogs.map(function (log, idx) {
                return (
                  <Card key={idx} className="p-4 shadow-sm border-none">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base font-bold text-text-main">{log.date}</span>
                      {log.counted ? (
                        <span className="text-s text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded flex items-center">
                          <CheckCircle2 size={12} className="mr-1" /> 已计入
                        </span>
                      ) : (
                        <span className="text-s text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded flex items-center">
                          <XCircle size={12} className="mr-1" /> 未计入
                        </span>
                      )}
                    </div>

                    <div className="flex items-start mt-2">
                      {log.is_activity_bonus ? (
                        <Gift size={16} className="mr-2 shrink-0 mt-0.5 text-orange-500 dark:text-orange-300" />
                      ) : (
                        <Activity size={16} className="mr-2 shrink-0 mt-0.5 text-blue-500 dark:text-blue-300" />
                      )}
                      <div className="text-sm text-text-sub leading-relaxed">
                        {log.reason}
                      </div>
                    </div>

                    {!log.is_activity_bonus && (
                      <div className="mt-3 pt-3 border-t border-border-light flex justify-between text-s">
                        <span className="text-text-sub">交易笔数</span>
                        <span className="text-text-main font-medium">{log.trade_count} 笔</span>
                      </div>
                    )}
                  </Card>
                );
              })}
              <div className="py-4 text-center text-s text-text-aux">
                仅展示最近的成长记录
              </div>
            </div>
          )}
        </div>
      </div>
  );
};
