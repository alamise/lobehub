import { useToolStore } from '@/store/tool';

export const useFetchInstalledPlugins = (agentId?: string) => {
  const [useFetchInstalledPlugins] = useToolStore((s) => [s.useFetchInstalledPlugins]);

  return useFetchInstalledPlugins(true, agentId);
};
