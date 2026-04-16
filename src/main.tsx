// ⬇️ precisa vir antes de qualquer uso do antd/React
import '@ant-design/v5-patch-for-react-19';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/es/locale/pt_BR';

import { AuthProvider } from './modules/auth/AuthProvider';
import App from './App';

import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';
import './lib/leafletIcons';

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <ConfigProvider locale={ptBR}>
            <App />
          </ConfigProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);