import {
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  ClipboardCheck,
  FilePenLine,
  FileSearch,
  FileText,
  MapPinned,
  Home,
  Radar,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface BusinessNavLeafItem {
  icon?: LucideIcon;
  key: string;
  path: string;
  title: string;
}

export interface BusinessNavGroup {
  icon: LucideIcon;
  items: BusinessNavLeafItem[];
  key: string;
  title: string;
}

export const SHARED_AGENT_PATH = '/agent/agt_J8tHPinLzsfP';

export const businessNavTopItems: BusinessNavLeafItem[] = [
  {
    icon: Home,
    key: 'home',
    path: '/',
    title: '首页',
  },
  {
    icon: Bot,
    key: 'ai-digital-human',
    path: SHARED_AGENT_PATH,
    title: 'AI 数字人',
  },
];

export const businessNavGroups: BusinessNavGroup[] = [
  {
    icon: BrainCircuit,
    items: [
      {
        icon: FileSearch,
        key: 'water-quality',
        path: '/decision/water-quality',
        title: '水环境质量分析',
      },
      {
        icon: FileSearch,
        key: 'air-quality',
        path: '/decision/air-quality',
        title: '气环境质量分析',
      },
      {
        icon: BarChart3,
        key: 'statistics',
        path: '/decision/statistics',
        title: 'AI 统计',
      },
      {
        icon: ScrollText,
        key: 'minister-interpretation',
        path: '/decision/minister-interpretation',
        title: '部委解读',
      },
    ],
    key: 'decision',
    title: 'AI 辅助决策',
  },
  {
    icon: ShieldCheck,
    items: [
      {
        icon: FileSearch,
        key: 'archive',
        path: '/enforcement/archive',
        title: 'AI 档案',
      },
      {
        icon: FileText,
        key: 'company',
        path: '/enforcement/company',
        title: 'AI 企业',
      },
      {
        icon: FileText,
        key: 'case',
        path: '/enforcement/case',
        title: 'AI 案卷',
      },
      {
        icon: ShieldCheck,
        key: 'emergency',
        path: '/enforcement/emergency',
        title: 'AI 应急',
      },
    ],
    key: 'enforcement',
    title: 'AI 辅助执法',
  },
  {
    icon: ClipboardCheck,
    items: [
      {
        icon: FilePenLine,
        key: 'eia',
        path: '/approval/eia',
        title: 'AI 环评',
      },
      {
        icon: MapPinned,
        key: 'map',
        path: '/approval/map',
        title: 'AI 地图',
      },
    ],
    key: 'approval',
    title: 'AI 辅助审批',
  },
];

export const businessNavMiddleItems: BusinessNavLeafItem[] = [
  {
    icon: Radar,
    key: 'monitoring',
    path: '/monitoring',
    title: 'AI 辅助监测',
  },
];

export const businessNavOfficeGroup: BusinessNavGroup = {
  icon: BriefcaseBusiness,
  items: [
    {
      icon: FileSearch,
      key: 'office-knowledge-base',
      path: '/office/knowledge-base',
      title: '科室业务知识库检索',
    },
    {
      icon: FilePenLine,
      key: 'office-document-format',
      path: '/office/document-format',
      title: '公文格式调整',
    },
  ],
  key: 'office',
  title: 'AI 辅助办公',
};

export const businessNavAllLeafItems: BusinessNavLeafItem[] = [
  ...businessNavTopItems,
  ...businessNavGroups.flatMap((group) => group.items),
  ...businessNavMiddleItems,
  ...businessNavOfficeGroup.items,
];

export const findBusinessNavItemByPath = (path: string): BusinessNavLeafItem | undefined =>
  businessNavAllLeafItems.find((item) => item.path === path);
