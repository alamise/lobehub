import { type PropsWithChildren } from 'react';

import MobileContentLayout from '@/components/server/MobileNavLayout';

const MobileLayout = ({ children }: PropsWithChildren) => {
  return <MobileContentLayout withNav>{children}</MobileContentLayout>;
};

export default MobileLayout;
