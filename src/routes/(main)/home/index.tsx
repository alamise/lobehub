import { Flexbox } from '@lobehub/ui';
import { type FC } from 'react';

import HomePageTracker from '@/components/Analytics/HomePageTracker';

import HomeContent from './features';

const Home: FC = () => {
  return (
    <>
      <HomePageTracker />
      <Flexbox height={'100%'} style={{ overflowY: 'auto' }} width={'100%'}>
        <HomeContent />
      </Flexbox>
    </>
  );
};

export default Home;
