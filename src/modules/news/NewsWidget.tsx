import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Button, Card, List, Modal, Skeleton, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import { useNavigate } from 'react-router-dom';
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

type Author = { id: number; name: string };
type News = {
  id: number;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt?: string | null;
  pinned?: boolean;
  author?: Author | null;
  readAt?: string | null;   // backend pode enviar isso; se não vier, tratamos como não lida
};

export default function NewsWidget() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery<News[]>({
    queryKey: ['news', { includeExpired: false }],
    queryFn: async () => (await api.get('/news', { params: { includeExpired: false } })).data,
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => (await api.post(`/news/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] }),
  });

  const top = useMemo(() => {
    // ordena: fixadas primeiro, depois mais recentes; limita a 6 para o widget
    const sorted = [...data].sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return dayjs(b.publishedAt).valueOf() - dayjs(a.publishedAt).valueOf();
    });
    return sorted.slice(0, 6);
  }, [data]);

  const current = top.find(n => n.id === openId) || null;

  return (
    <Card
      title="Comunicados"
      extra={
        <Space>
          <Button size="small" onClick={() => qc.invalidateQueries({ queryKey: ['news'] })}>
            Atualizar
          </Button>
          <Button size="small" type="link" onClick={() => navigate('/news')}>
            Ver todas
          </Button>
        </Space>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : top.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>Sem notícias no momento.</div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={top}
          renderItem={(n) => {
            const unread = !n.readAt;
            return (
              <List.Item
                actions={[
                  <Button
                    size="small"
                    type={unread ? 'primary' : 'default'}
                    onClick={() => setOpenId(n.id)}
                    key="ler"
                  >
                    {unread ? 'Ler' : 'Abrir'}
                  </Button>,
                  unread && (
                    <Button
                      key="mark"
                      size="small"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Marcar como lida
                    </Button>
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      {n.pinned && <Tag color="gold">Fixado</Tag>}
                      <span style={{ fontWeight: 600 }}>{n.title}</span>
                      {unread && <Badge status="processing" text="novo" />}
                    </Space>
                  }
                  description={
                    <span style={{ color: '#64748b' }}>
                      {n.author?.name ? `${n.author.name} • ` : ''}
                      {dayjs(n.publishedAt).fromNow()}
                    </span>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      <Modal
        title={current?.title}
        open={!!current}
        onCancel={() => setOpenId(null)}
        onOk={() => setOpenId(null)}
        okText="Fechar"
        destroyOnHidden
        footer={(_, { OkBtn, CancelBtn }) => (
          <Space>
            {current && !current.readAt && (
              <Button
                type="primary"
                onClick={async () => {
                  await markRead.mutateAsync(current.id);
                }}
              >
                Marcar como lida
              </Button>
            )}
            <OkBtn />
          </Space>
        )}
      >
        {current ? (
          <NewsBody news={current} />
        ) : null}
      </Modal>
    </Card>
  );
}

function NewsBody({ news }: { news: News }) {
  const { Text } = Typography;
  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      <div style={{ marginBottom: 8, color: '#64748b' }}>
        {news.author?.name && <Text type="secondary">{news.author.name} • </Text>}
        <Text type="secondary">{dayjs(news.publishedAt).format('DD/MM/YYYY HH:mm')}</Text>
        {news.expiresAt && (
          <>
            <Text type="secondary"> • expira em </Text>
            <Text type="secondary">{dayjs(news.expiresAt).format('DD/MM/YYYY HH:mm')}</Text>
          </>
        )}
      </div>
      {news.body}
    </div>
  );
}