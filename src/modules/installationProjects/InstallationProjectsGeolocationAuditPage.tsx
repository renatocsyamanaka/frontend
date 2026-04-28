import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import ProjectLocationModal from './ProjectLocationModal';

const { Title, Text } = Typography;

type AuditRow = {
  projectId: number;
  title: string;
  clientId?: number | null;
  clientName?: string | null;
  city?: string;
  uf?: string;
  lat?: number | null;
  lng?: number | null;
  reason?: string;
};

type AuditResponse = {
  summary: {
    total: number;
    valid: number;
    missing: number;
    invalid: number;
  };
  valid: AuditRow[];
  missing: AuditRow[];
  invalid: AuditRow[];
};

function coordText(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return '—';
  return `${lat}, ${lng}`;
}

export default function InstallationProjectsGeolocationAuditPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [openModal, setOpenModal] = useState(false);
  const auditQuery = useQuery<AuditResponse>({
    queryKey: ['installation-projects-geolocation-audit'],
    queryFn: async () => {
      const res = await api.get('/installation-projects/geolocation/audit');
      return res.data?.data || res.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const filterRows = (rows: AuditRow[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const text = [
        row.title,
        row.clientName,
        row.city,
        row.uf,
        row.reason,
        row.projectId,
        row.clientId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(q);
    });
  };

  const validRows = useMemo(
    () => filterRows(auditQuery.data?.valid || []),
    [auditQuery.data, search]
  );

  const missingRows = useMemo(
    () => filterRows(auditQuery.data?.missing || []),
    [auditQuery.data, search]
  );

  const invalidRows = useMemo(
    () => filterRows(auditQuery.data?.invalid || []),
    [auditQuery.data, search]
  );

  const columns: ColumnsType<AuditRow> = [
    {
      title: 'Projeto',
      dataIndex: 'title',
      key: 'title',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 700 }}>
            {row.title || `Projeto ${row.projectId}`}
          </div>
          <Text type="secondary">ID: {row.projectId}</Text>
        </div>
      ),
    },
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 220,
      render: (_, row) => (
        <div>
          <div>{row.clientName || '—'}</div>
          <Text type="secondary">ID: {row.clientId || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Cidade/UF do projeto',
      key: 'cityUf',
      width: 200,
      render: (_, row) => `${row.city || '—'} / ${row.uf || '—'}`,
    },
    {
      title: 'Latitude / Longitude',
      key: 'coords',
      width: 220,
      render: (_, row) => coordText(row.lat, row.lng),
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      key: 'reason',
      width: 210,
      render: (value) =>
        value ? <Tag color="red">{value}</Tag> : <Tag color="green">OK</Tag>,
    },
    {
      title: 'Ação',
      key: 'action',
      width: 190,
        render: (_, row) => (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setSelectedProject(row);
              setOpenModal(true);
            }}
          >
            Editar localização
          </Button>
        ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          boxShadow: '0 18px 42px rgba(15,23,42,0.18)',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                color: '#dbeafe',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              <EnvironmentOutlined />
              Validação geográfica
            </div>

            <Title level={2} style={{ margin: 0, color: '#fff' }}>
              Auditoria de Geolocalização
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.78)' }}>
              Veja quais projetos têm coordenadas válidas, quais estão sem latitude/longitude e quais precisam de correção.
            </Text>
          </div>

          <Space wrap>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/projetos-instalacao/dashboard')}
              style={{
                borderRadius: 14,
                borderColor: 'rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              Voltar
            </Button>

            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => auditQuery.refetch()}
              loading={auditQuery.isFetching}
              style={{ borderRadius: 14 }}
            >
              Recarregar
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Statistic title="Total" value={auditQuery.data?.summary?.total || 0} />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Statistic
              title="Com coordenadas válidas"
              value={auditQuery.data?.summary?.valid || 0}
            />
          </Card>
        </Col>

        <Col xs={24} md={4}>
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Statistic title="Sem coordenadas" value={auditQuery.data?.summary?.missing || 0} />
          </Card>
        </Col>

        <Col xs={24} md={4}>
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Statistic title="Inválidas" value={auditQuery.data?.summary?.invalid || 0} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Buscar por projeto, cliente, cidade, UF ou motivo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Alert
            type="info"
            showIcon
            message="Dica"
            description="Os projetos sem coordenadas devem ser revisados manualmente. Clique em 'Abrir / Editar projeto' para ajustar a localização diretamente no cadastro do projeto."
          />
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 20 }}>
        {auditQuery.isLoading ? null : !(auditQuery.data?.summary?.total > 0) ? (
          <Empty description="Nenhum registro encontrado" />
        ) : (
          <Tabs
            defaultActiveKey="missing"
            items={[
              {
                key: 'missing',
                label: `Sem coordenadas (${missingRows.length})`,
                children: (
                  <Table
                    rowKey={(row) => `missing_${row.projectId}`}
                    columns={columns}
                    dataSource={missingRows}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 1100 }}
                  />
                ),
              },
              {
                key: 'invalid',
                label: `Inválidas (${invalidRows.length})`,
                children: (
                  <Table
                    rowKey={(row) => `invalid_${row.projectId}`}
                    columns={columns}
                    dataSource={invalidRows}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 1100 }}
                  />
                ),
              },
              {
                key: 'valid',
                label: `Válidas (${validRows.length})`,
                children: (
                  <Table
                    rowKey={(row) => `valid_${row.projectId}`}
                    columns={columns}
                    dataSource={validRows}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 1100 }}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>
      <ProjectLocationModal
        open={openModal}
        project={selectedProject}
        onClose={() => setOpenModal(false)}
        onUpdated={() => auditQuery.refetch()}
      />
    </div>
  );
}