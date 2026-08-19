import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './lib/store';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('未找到 #root 挂载点');

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <StoreProvider>
      <App />
    </StoreProvider>
  </BrowserRouter>,
);
