import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Button, Card, Checkbox, Input, List, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

type Author = { id: number; name: string };
type News = {
  id: number;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt?: string | null;
  pinned?: boolean;
  author?: Author | null;
  readAt?: string | null;
};

export default function NewsCenterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  const { data = [], isFetching } = useQuery<News[]>({
    queryKey: ['news', { includeExpired }],
    queryFn: async () => (await api.get('/news', { params: { includeExpired } })).data,
    keepPreviousData: true,
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => (await api.post(`/news/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] }),
  });

  const list = useMemo(() => {
    let rows = [...data];
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.body.toLowerCase().includes(term) ||
        (n.author?.name || '').toLowerCase().includes(term)
      );
    }
    if (onlyUnread) rows = rows.filter(n => !n.readAt);
    // fixadas em cima, depois por data
    rows.sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return dayjs(b.publishedAt).valueOf() - dayjs(a.publishedAt).valueOf();
    });
    return rows;
  }, [data, q, onlyUnread]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Notícias</Typography.Title>
        <Space>
          <Button onClick={() => navigate('/')}>Voltar</Button>
          <Button onClick={() => qc.invalidateQueries({ queryKey: ['news'] })} loading={isFetching}>
            Atualizar
          </Button>
        </Space>
      </div>

      <Card>
        <Space wrap>
          <Input
            allowClear
            placeholder="Buscar por título, texto ou autor"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 360 }}
          />
          <Checkbox checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)}>
            Somente não lidas
          </Checkbox>
          <Checkbox checked={includeExpired} onChange={(e) => setIncludeExpired(e.target.checked)}>
            Incluir expiradas
          </Checkbox>
          <Button
            onClick={async () => {
              const unread = list.filter(n => !n.readAt);
              await Promise.all(unread.map(n => api.post(`/news/${n.id}/read`)));
              qc.invalidateQueries({ queryKey: ['news'] });
            }}
          >
            Marcar todas como lidas
          </Button>
        </Space>
      </Card>

      <Card>
        <List
          itemLayout="vertical"
          dataSource={list}
          renderItem={(n) => {
            const unread = !n.readAt;
            return (
              <List.Item
                key={n.id}
                actions={[
                  <Button key="open" onClick={() => navigate(`/news#${n.id}`)}>
                    Abrir
                  </Button>,
                  unread && (
                    <Button key="read" type="primary" onClick={() => markRead.mutate(n.id)}>
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
                      {dayjs(n.publishedAt).format('DD/MM/YYYY HH:mm')}
                      {n.expiresAt && ` • expira ${dayjs(n.expiresAt).fromNow()}`}
                    </span>
                  }
                />
                <div style={{ whiteSpace: 'pre-wrap', color: '#111827' }}>{n.body}</div>
              </List.Item>
            );
          }}
        />
        {list.length === 0 && <div style={{ color: '#94a3b8' }}>Nenhuma notícia encontrada.</div>}
      </Card>
    </div>
  );
}