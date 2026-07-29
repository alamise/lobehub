import { parseAsInteger, useQueryParam } from '@/hooks/useQueryParam';

/**
 * 业务列表页分页与 URL 双向同步 hook。
 *
 * - 页码写入 URL（?page=N），刷新 / 从详情页返回时可正确恢复；
 * - 页码为 1 时自动从 URL 中移除参数，保持地址整洁；
 * - 使用 replace 模式，翻页不会堆叠浏览器历史记录。
 *
 * 用法：const [page, setPage] = useUrlPage();
 * setPage 兼容直接值与函数式更新（setPage(2) / setPage((p) => p - 1)）。
 */
export const useUrlPage = (
  key = 'page',
): [number, (value: number | ((prev: number) => number)) => void] =>
  useQueryParam(key, parseAsInteger.withDefault(1), {
    clearOnDefault: true,
    history: 'replace',
  });

export default useUrlPage;
