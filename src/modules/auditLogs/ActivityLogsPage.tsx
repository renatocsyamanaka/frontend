import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type ActivityLog = {
  id: number;
  module: string;
  action: string;
  description?: string;
  entity?: string;
  entityId?: string | number | null;
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  method?: string;
  path?: string;
  statusCode?: number;
  request?: any;
  response?: any;
  createdAt: string;
};

type User = {
  id: number;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  isActive?: boolean;
  role?: { id: number; name: string; level?: number };
  manager?: { id: number; name: string } | null;
  cargoDescritivo?: string | null;
  ocultarCargo?: boolean | null;
};

const RAW_API_URL = import.meta.env.VITE_API_URL?.trim();
const API_URL = RAW_API_URL ? RAW_API_URL.replace(/\/+$/, '') : '';

const abs = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}/${String(url).replace(/^\/+/, '')}`;
};

const initial = (s?: string | null) => (s?.trim()?.[0]?.toUpperCase() ?? '?');

const MODULE_OPTIONS = [
  { value: 'PROJETOS_INSTALACAO', label: 'Projetos de Instalação' },
  { value: 'PECAS_PEDIDOS', label: 'Pedidos de Peças' },
  { value: 'PECAS_CATALOGO', label: 'Catálogo de Peças' },
  { value: 'USUARIOS', label: 'Usuários' },
  { value: 'NEEDS', label: 'Solicitações / Needs' },
  { value: 'DEMANDS', label: 'Demandas' },
  { value: 'CTE', label: 'CTEs / Entregas' },
];

function moduleLabel(module?: string) {
  return MODULE_OPTIONS.find((m) => m.value === module)?.label || module || '-';
}

function getDisplayRoleLabel(user?: User | null) {
  if (!user) return '—';
  if (user.ocultarCargo) return 'Oculto';
  return user.cargoDescritivo?.trim() || user.role?.name || '—';
}

function getEntityId(row: ActivityLog) {
  if (row.entityId) return String(row.entityId);

  const path = row.path || '';
  const match = path.match(/\/(\d+)(\/|$)/);
  return match ? match[1] : '';
}

function getEntityLabel(row: ActivityLog) {
  const entity = row.entity || '-';
  const path = row.path || '';
  const id = getEntityId(row);

  const projectItemMatch = path.match(/installation-projects\/(\d+)\/items\/(\d+)/);
  if (entity === 'InstallationProjectItem' && projectItemMatch) {
    return `InstallationProjectItem #${projectItemMatch[2]} / Projeto #${projectItemMatch[1]}`;
  }

  const projectProgressMatch = path.match(/installation-projects\/(\d+)\/progress\/(\d+)/);
  if (entity === 'InstallationProjectProgress' && projectProgressMatch) {
    return `InstallationProjectProgress #${projectProgressMatch[2]} / Projeto #${projectProgressMatch[1]}`;
  }

  return id ? `${entity} #${id}` : entity;
}

function JsonViewer({ value }: { value: any }) {
  return (
    <pre
      style={{
        margin: 0,
        maxHeight: 260,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: '#fafafa',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: 12,
      }}
    >
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  );
}

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [module, setModule] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [dates, setDates] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const selectedEntityId = selectedLog ? getEntityId(selectedLog) : '';
  const selectedIsUser = selectedLog?.entity === 'User' && !!selectedEntityId;

  const logsQuery = useQuery({
    queryKey: ['activity-logs', page, pageSize, module, action, search, dates],
    queryFn: async () => {
      const params: any = { page, pageSize };

      if (module) params.module = module;
      if (action) params.action = action;
      if (search.trim()) params.search = search.trim();
      if (dates?.[0]) params.startDate = dayjs(dates[0]).format('YYYY-MM-DD');
      if (dates?.[1]) params.endDate = dayjs(dates[1]).format('YYYY-MM-DD');

      const res = await api.get('/activity-logs', { params });
      return res.data?.data || res.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery<User[]>({
    queryKey: ['users-for-audit-modal'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: !!selectedIsUser,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const selectedUser = useMemo(() => {
    if (!selectedIsUser || !usersQuery.data) return null;
    return usersQuery.data.find((u) => String(u.id) === String(selectedEntityId)) || null;
  }, [selectedIsUser, usersQuery.data, selectedEntityId]);

  const rows: ActivityLog[] = useMemo(() => {
    if (Array.isArray(logsQuery.data)) return logsQuery.data;
    return logsQuery.data?.rows || logsQuery.data?.items || [];
  }, [logsQuery.data]);

  const total = useMemo(() => {
    if (typeof logsQuery.data?.count === 'number') return logsQuery.data.count;
    if (typeof logsQuery.data?.total === 'number') return logsQuery.data.total;
    return rows.length;
  }, [logsQuery.data, rows.length]);

  const actionOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean));
    return Array.from(set).map((a) => ({ value: a, label: a }));
  }, [rows]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card bordered={false} style={{ borderRadius: 20 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Logs de Auditoria
            </Title>
            <Text type="secondary">
              Consulte ações realizadas no portal por módulo, usuário e entidade.
            </Text>
          </div>

          <Button icon={<ReloadOutlined />} onClick={() => logsQuery.refetch()} loading={logsQuery.isFetching}>
            Atualizar
          </Button>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar por ação, usuário, entidade ou descrição"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{ width: 320 }}
          />

          <Select
            allowClear
            placeholder="Filtrar por módulo"
            value={module}
            onChange={(value) => {
              setPage(1);
              setModule(value);
            }}
            options={MODULE_OPTIONS}
            style={{ width: 250 }}
          />

          <Select
            allowClear
            placeholder="Filtrar por ação"
            value={action}
            onChange={(value) => {
              setPage(1);
              setAction(value);
            }}
            options={actionOptions}
            style={{ width: 260 }}
          />

          <RangePicker
            value={dates}
            onChange={(value) => {
              setPage(1);
              setDates(value);
            }}
            format="DD/MM/YYYY"
          />

          <Button
            onClick={() => {
              setPage(1);
              setModule(undefined);
              setAction(undefined);
              setSearch('');
              setDates(null);
            }}
          >
            Limpar filtros
          </Button>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        <Table
          rowKey="id"
          loading={logsQuery.isLoading || logsQuery.isFetching}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} logs encontrados`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          columns={[
            {
              title: 'Data',
              dataIndex: 'createdAt',
              width: 170,
              render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
            },
            {
              title: 'Módulo',
              dataIndex: 'module',
              width: 230,
              render: (v) => <Tag color="blue">{moduleLabel(v)}</Tag>,
            },
            {
              title: 'Ação',
              dataIndex: 'action',
              width: 250,
              render: (v) => <Tag color="geekblue">{v || '-'}</Tag>,
            },
            {
              title: 'Entidade',
              width: 300,
              render: (_, row) => (
                <Tooltip title="Ver detalhes do log">
                  <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setSelectedLog(row)} style={{ padding: 0 }}>
                    {getEntityLabel(row)}
                  </Button>
                </Tooltip>
              ),
            },
            {
              title: 'Usuário executor',
              width: 250,
              render: (_, row) => (
                <div>
                  <Text strong>{row.userName || `Usuário #${row.userId || '-'}`}</Text>
                  {row.userEmail && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {row.userEmail}
                      </Text>
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Descrição',
              dataIndex: 'description',
              ellipsis: true,
              render: (v) => v || '-',
            },
            {
              title: 'Método',
              dataIndex: 'method',
              width: 90,
              render: (v) => <Tag>{v || '-'}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'statusCode',
              width: 90,
              render: (v) => <Tag color={Number(v) >= 400 ? 'red' : 'green'}>{v || '-'}</Tag>,
            },
          ]}
        />
      </Card>

      <Modal
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        title="Detalhes do Log de Auditoria"
        width={1180}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => setSelectedLog(null)}>
            Fechar
          </Button>,
        ]}
        styles={{
          body: {
            maxHeight: '78vh',
            overflowY: 'auto',
            overflowX: 'hidden',
          },
        }}
      >
        {selectedLog && (
          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} lg={11}>
              <Card size="small" title="Detalhes do Log de Auditoria" style={{ borderRadius: 14, height: '100%' }}>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="ID do Log">#{selectedLog.id}</Descriptions.Item>
                  <Descriptions.Item label="Data">
                    {selectedLog.createdAt ? dayjs(selectedLog.createdAt).format('DD/MM/YYYY HH:mm:ss') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Módulo">{moduleLabel(selectedLog.module)}</Descriptions.Item>
                  <Descriptions.Item label="Ação">{selectedLog.action || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Entidade">{getEntityLabel(selectedLog)}</Descriptions.Item>
                  <Descriptions.Item label="ID Entidade">{selectedEntityId || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Usuário executor">
                    {selectedLog.userName || `Usuário #${selectedLog.userId || '-'}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="E-mail executor">{selectedLog.userEmail || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Status">{selectedLog.statusCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Método">{selectedLog.method || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Rota">{selectedLog.path || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Descrição">{selectedLog.description || '-'}</Descriptions.Item>
                </Descriptions>

                {selectedIsUser && (
                  <>
                    <Divider />
                    <Card size="small" title="Dados do usuário da entidade" style={{ borderRadius: 12 }}>
                      {usersQuery.isLoading ? (
                        <div style={{ textAlign: 'center', padding: 16 }}>
                          <Spin />
                        </div>
                      ) : selectedUser ? (
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          <Space align="center">
                            <Avatar src={abs(selectedUser.avatarUrl)} size={54} icon={<UserOutlined />}>
                              {initial(selectedUser.name)}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedUser.name}</div>
                              <Text type="secondary">{getDisplayRoleLabel(selectedUser)}</Text>
                            </div>
                          </Space>

                          <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="ID">#{selectedUser.id}</Descriptions.Item>
                            <Descriptions.Item label="Nome">{selectedUser.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="E-mail">{selectedUser.email || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Telefone">{selectedUser.phone || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Cargo">{getDisplayRoleLabel(selectedUser)}</Descriptions.Item>
                            <Descriptions.Item label="Gestor">{selectedUser.manager?.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                              <Tag color={selectedUser.isActive ? 'green' : 'default'}>
                                {selectedUser.isActive ? 'Ativo' : 'Inativo'}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>
                        </Space>
                      ) : (
                        <Text type="secondary">Usuário #{selectedEntityId} não encontrado na listagem.</Text>
                      )}
                    </Card>
                  </>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={13}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card size="small" title="Requisição" style={{ borderRadius: 14 }}>
                  <JsonViewer value={selectedLog.request} />
                </Card>

                <Card size="small" title="Resposta" style={{ borderRadius: 14 }}>
                  <JsonViewer value={selectedLog.response} />
                </Card>
              </Space>
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
}