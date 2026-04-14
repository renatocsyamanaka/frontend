import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  Empty,
  Grid,
  Image,
  Input,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  NotificationOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/access';

type Sector = {
  id: number;
  name: string;
};

type News = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  targetAllSectors?: boolean;
  sectors?: Sector[];
};

const { Title, Text, Paragraph } = Typography;

export default function NewsCenterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { user } = useAuth() as { user: any };

  const [search, setSearch] = useState('');

  const newsQuery = useQuery<News[]>({
    queryKey: ['news', 'center'],
    queryFn: async () => {
      const res = await api.get('/news');
      return res.data?.data ?? res.data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const rows = useMemo(() => {
    const base = [...(newsQuery.data || [])]
      .filter((item) => item.isActive !== false)
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

    const term = search.trim().toLowerCase();
    if (!term) return base;

    return base.filter((item) => {
      const title = String(item.title || '').toLowerCase();
      const content = String(item.content || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      const sectors = (item.sectors || []).map((s) => s.name.toLowerCase()).join(' ');

      return (
        title.includes(term) ||
        content.includes(term) ||
        category.includes(term) ||
        sectors.includes(term)
      );
    });
  }, [newsQuery.data, search]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 12,
        }}
      >
        <div>
          <Space align="center" style={{ marginBottom: 6 }}>
            <NotificationOutlined style={{ fontSize: 22, color: '#1F71B8' }} />
            <Title level={3} style={{ margin: 0 }}>
              Notícias
            </Title>
          </Space>

          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            Comunicados, avisos e novidades internas do portal.
          </Text>
        </div>

        <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            block={isMobile}
          >
            Voltar
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => qc.invalidateQueries({ queryKey: ['news'] })}
            loading={newsQuery.isFetching}
            block={isMobile}
          >
            Atualizar
          </Button>

          {hasPermission(user, 'NEWS_ADMIN_VIEW') && (
            <Link to="/noticias-admin">
              <Button icon={<SettingOutlined />} type="primary" block={isMobile}>
                Central de conteúdo
              </Button>
            </Link>
          )}
        </Space>
      </div>

      <Card
        style={{ borderRadius: 20 }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Buscar por título, conteúdo, categoria ou setor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="large"
        />
      </Card>

      <Card
        style={{ borderRadius: 20 }}
        styles={{ body: { padding: isMobile ? 12 : 20 } }}
      >
        {newsQuery.isLoading ? (
          <Text type="secondary">Carregando notícias...</Text>
        ) : rows.length === 0 ? (
          <Empty description="Nenhuma notícia encontrada." />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={rows}
            renderItem={(item) => (
              <List.Item key={item.id} style={{ paddingBlock: 18 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      item.imageUrl && !isMobile ? '240px 1fr' : '1fr',
                    gap: 18,
                    alignItems: 'start',
                  }}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      preview={false}
                      style={{
                        width: '100%',
                        borderRadius: 14,
                        objectFit: 'cover',
                        maxHeight: isMobile ? 220 : 160,
                      }}
                    />
                  ) : null}

                  <div style={{ minWidth: 0 }}>
                    <Space wrap style={{ marginBottom: 8 }}>
                      {item.category ? <Tag color="blue">{item.category}</Tag> : null}

                      {item.targetAllSectors ? (
                        <Tag color="geekblue">Todos os setores</Tag>
                      ) : (
                        (item.sectors || []).map((sector) => (
                          <Tag key={sector.id} color="purple">
                            {sector.name}
                          </Tag>
                        ))
                      )}

                      <Text type="secondary">
                        {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </Space>

                    <Title
                      level={4}
                      style={{ marginTop: 0, marginBottom: 8 }}
                    >
                      {item.title}
                    </Title>

                    <Paragraph
                      style={{
                        marginBottom: 0,
                        whiteSpace: 'pre-wrap',
                        color: '#111827',
                      }}
                    >
                      {item.content}
                    </Paragraph>
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