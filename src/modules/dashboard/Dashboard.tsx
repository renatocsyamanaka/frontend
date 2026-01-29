import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Button, Card, Divider, Image, List, Skeleton,
  Space, Switch, Tag, Typography, message
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

type News = {
  id: number;
  title: string;
  body: string;
  audience: 'ALL' | 'ROLE' | 'USER';
  targetRoleLevel?: number | null;
  targetUserId?: number | null;
  pinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  imageUrl?: string | null;
  author?: { id: number; name: string };
  read?: boolean;
};

const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const qc = useQueryClient();
  const [hideRead, setHideRead] = useState(false);

  const newsQuery = useQuery<News[]>({
    queryKey: ['news', { includeExpired: false }],
    queryFn: async () => (await api.get('/news', { params: { includeExpired: false } })).data,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => (await api.post(`/news/${id}/read`)).data,
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['news'] }); },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao marcar como lida'),
  });

  const items = useMemo(() => {
    const src = newsQuery.data || [];
    return hideRead ? src.filter((n) => !n.read) : src;
  }, [hideRead, newsQuery.data]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={2} style={{ margin: 0 }}>Bem-vindo!</Title>
        <Space>
          <span style={{ color: '#94a3b8' }}>
            {newsQuery.isFetching ? 'Atualizando…' : ''}
          </span>
          <Switch
            checked={hideRead}
            onChange={setHideRead}
            size="small"
            checkedChildren="Ocultar lidas"
            unCheckedChildren="Mostrar lidas"
          />
          <Link to="/news-admin">Gerenciar notícias</Link>
        </Space>
      </div>

      <Card
        title="Notícias"
        extra={<Button icon={<ReloadOutlined />} onClick={() => newsQuery.refetch()} />}
      >
        {newsQuery.isLoading ? (
          <div>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 1 }} />
          </div>
        ) : newsQuery.isError ? (
          <Typography.Text type="danger">
            Falha ao carregar notícias. {(newsQuery.error as any)?.message || ''}
          </Typography.Text>
        ) : (
          <List
            dataSource={items}
            locale={{ emptyText: 'Sem notícias por aqui.' }}
            renderItem={(n) => (
              <List.Item
                // ações continuam do lado direito do item
                actions={[
                  <Button
                    size="small"
                    disabled={n.read}
                    onClick={() => markRead.mutate(n.id)}
                  >
                    {n.read ? 'Lida' : 'Marcar como lida'}
                  </Button>,
                ]}
              >
                {/* layout: imagem à esquerda / texto à direita */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    width: '100%',
                    flexWrap: 'wrap', // em telas muito estreitas, quebra para baixo
                  }}
                >
                  {n.imageUrl && (
                    <div style={{ flex: '0 0 320px' }}>
                      <Image
                        src={n.imageUrl}
                        width={320}                 // imagem maior
                        style={{
                          borderRadius: 8,
                          marginBottom: 8,
                          objectFit: 'cover',
                        }}
                        preview={false}
                        placeholder
                      />
                    </div>
                  )}

                  <div style={{ flex: '1 1 360px', minWidth: 260 }}>
                    <Space wrap>
                      {n.pinned && <Tag color="gold">Fixada</Tag>}
                      <Text strong>{n.title}</Text>
                      <Text type="secondary">
                        {dayjs(n.publishedAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                      {n.expiresAt && (
                        <Tag>{`expira em ${dayjs(n.expiresAt).format('DD/MM')}`}</Tag>
                      )}
                    </Space>

                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 8, marginBottom: 8 }}>
                      {n.body}
                    </Paragraph>

                    <div style={{ color: '#8893a0' }}>
                      <Text type="secondary">
                        {n.audience === 'ALL' && 'Público: Todos'}
                        {n.audience === 'ROLE' && `Público: nível >= ${n.targetRoleLevel}`}
                        {n.audience === 'USER' && `Público: usuário específico`}
                      </Text>
                      {n.author?.name && (
                        <>
                          <Divider type="vertical" />
                          <Text type="secondary">por {n.author.name}</Text>
                        </>
                      )}
                    </div>
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
