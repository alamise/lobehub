import { memo } from 'react';

import HomeContent from '@/routes/(main)/home/features';

const Home = memo(() => {
  return <HomeContent />;
});

Home.displayName = 'MobileHome';

export default Home;
