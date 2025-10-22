import './App.scss';

import { PRDTestGenerator } from './components/PRDTestGenerator/PRDTestGenerator';

function App() {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <PRDTestGenerator propData={{}} propState={{}} event={{}} />
    </div>
  );
}

export default App;
