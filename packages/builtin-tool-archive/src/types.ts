export const ArchiveApiName = {
  /** 获取当前正在浏览的档案的 id 与基本信息 */
  getArchiveInfo: 'get_current_archive',
} as const;

export type ArchiveApiNameType = (typeof ArchiveApiName)[keyof typeof ArchiveApiName];
