import { PageHeader } from '../../components/layout/PageHeader';

export const CompanyCertPage = () => {
  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-white dark:bg-gray-950">
      <PageHeader
        title="公司注册证明"
        className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
        contentClassName="h-12 px-3"
        titleClassName="text-2xl font-bold text-gray-900 dark:text-gray-100"
        backButtonClassName="text-gray-900 dark:text-gray-100"
      />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <img
          src="/company_cr.png"
          alt="公司注册证明书"
          className="w-full"
        />
      </div>
    </div>
  );
};
