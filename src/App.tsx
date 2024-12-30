import { BrowserRouter } from 'react-router-dom';
import './App.scss';

import {TweetPost} from'./components/TweetPost';

function App() {
  return (
    <BrowserRouter>
      <div style={{ height: '100%', width: '100%' }}>
       
        <TweetPost
          propData={{tweetId:"1860687587624837376",theme:'dark'}}
          propState={{}}
          event={{}}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
