import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Divider,
  Image,
  List,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  Grid,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

type News = {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: number; name: string };
  read?: boolean;
};

const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const qc = useQueryClient();
  const [hideRead, setHideRead] = useState(false);

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const newsQuery = useQuery<News[]>({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data?.data ?? res.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => (await api.post(`/news/${id}/read`)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (e: any) => {
      const msg =
        e?.response?.status === 404
          ? 'Seu backend ainda não tem /news/:id/read. (Remova esse botão ou implemente.)'
          : e?.response?.data?.error || 'Falha ao marcar como lida';
      message.error(msg);
    },
  });

  const items = useMemo(() => {
    const src = newsQuery.data || [];
    const activeOnly = src.filter((n) => n.isActive !== false);
    if (!hideRead) return activeOnly;
    return activeOnly.filter((n) => !n.read);
  }, [hideRead, newsQuery.data]);

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      {/* ✅ HEADER responsivo */}
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Bem-vindo!
        </Title>

        <Space
          wrap
          style={{
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
          }}
        >
          <span style={{ color: '#94a3b8' }}>{newsQuery.isFetching ? 'Atualizando…' : ''}</span>


          <Link to="/news-admin">Gerenciar notícias</Link>
        </Space>
      </div>

      <Card
        title="Notícias"
        extra={<Button icon={<ReloadOutlined />} onClick={() => newsQuery.refetch()} />}
        bodyStyle={{ padding: isMobile ? 12 : 24 }}
      >
        {newsQuery.isLoading ? (
          <div>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 1 }} />
          </div>
        ) : newsQuery.isError ? (
          <Text type="danger">
            Falha ao carregar notícias. {(newsQuery.error as any)?.message || ''}
          </Text>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={items}
            locale={{ emptyText: 'Sem notícias por aqui.' }}
            renderItem={(n) => (
              <List.Item
                style={{ paddingInline: 0 }}
              >
                {/* ✅ layout responsivo: PC lado a lado / mobile empilha */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    width: '100%',
                    flexDirection: isMobile ? 'column' : 'row',
                  }}
                >
                  {n.imageUrl && (
                    <div
                      style={{
                        width: isMobile ? '100%' : 320,
                        flex: isMobile ? '1 1 auto' : '0 0 320px',
                      }}
                    >
                      <Image
                        src={n.imageUrl}
                        // ✅ mobile: ocupa 100%
                        width={isMobile ? '100%' : 320}
                        style={{
                          borderRadius: 10,
                          objectFit: 'cover',
                        }}
                        preview={false}
                        placeholder
                      />
                    </div>
                  )}

                  <div style={{ width: '100%' }}>
                    <Space wrap>
                      {n.category && <Tag>{n.category}</Tag>}
                      {!n.isActive && <Tag color="red">Inativa</Tag>}
                      <Text strong>{n.title}</Text>
                      <Text type="secondary">{dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </Space>

                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 10, marginBottom: 10 }}>
                      {n.content || <Text type="secondary">Sem conteúdo</Text>}
                    </Paragraph>

                    {/* ✅ botão no mobile vai pra baixo, full width */}

                    {n.author?.name && (
                      <div style={{ color: '#8893a0', marginTop: 10 }}>
                        <Divider type="vertical" />
                        <Text type="secondary">por {n.author.name}</Text>
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
