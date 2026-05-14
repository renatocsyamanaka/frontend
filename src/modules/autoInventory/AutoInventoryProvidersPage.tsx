import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text, Title } = Typography;

type Option = {
  id: number;
  name: string;
  email?: string | null;
};

type ProviderRow = {
  id: number;
  name: string;
  email?: string | null;
  tipoPrestador?: 'ATA' | 'PRP' | 'SPOT' | 'PSO' | string;
  estoqueAvancado: boolean;
  autoInventoryEnabled: boolean;
  coordinator?: Option | null;
  coordinatorId?: number | null;
  supervisor?: Option | null;
  supervisorId?: number | null;
};

export default function AutoInventoryProvidersPage() {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [coordinators, setCoordinators] = useState<Option[]>([]);
  const [supervisors, setSupervisors] = useState<Option[]>([]);

  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [coordinatorId, setCoordinatorId] = useState<number | null>(null);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [estoqueAvancadoFilter, setEstoqueAvancadoFilter] = useState<boolean | null>(null);
  const [autoInventoryFilter, setAutoInventoryFilter] = useState<boolean | null>(null);

  const resumo = useMemo(() => {
    const estoqueAvancado = providers.filter((item) => item.estoqueAvancado).length;
    const autoInventario = providers.filter((item) => item.autoInventoryEnabled).length;

    return {
      total: providers.length,
      estoqueAvancado,
      semEstoqueAvancado: providers.length - estoqueAvancado,
      autoInventario,
      semAutoInventario: providers.length - autoInventario,
    };
  }, [providers]);

  async function loadProviders() {
    try {
      setLoading(true);

      const res = await api.get('/auto-inventory/providers-management', {
        params: {
          ...(search ? { q: search } : {}),
          ...(coordinatorId ? { coordinatorId } : {}),
          ...(supervisorId ? { supervisorId } : {}),
          ...(estoqueAvancadoFilter !== null ? { estoqueAvancado: estoqueAvancadoFilter } : {}),
          ...(autoInventoryFilter !== null ? { autoInventoryEnabled: autoInventoryFilter } : {}),
        },
      });

      setProviders(res.data?.providers || []);
      setCoordinators(res.data?.filters?.coordinators || []);
      setSupervisors(res.data?.filters?.supervisors || []);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao carregar prestadores do auto inventário.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleProvider(row: ProviderRow, checked: boolean) {
    try {
      setSavingId(row.id);

      await api.patch(`/auto-inventory/providers/${row.id}/auto-inventory`, {
        enabled: checked,
      });

      setProviders((old) =>
        old.map((item) =>
          item.id === row.id
            ? { ...item, autoInventoryEnabled: checked }
            : item
        )
      );

      message.success(
        checked
          ? 'Prestador habilitado para receber auto inventário.'
          : 'Prestador desabilitado do auto inventário.'
      );
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao atualizar prestador.'
      );
    } finally {
      setSavingId(null);
    }
  }

  function clearFilters() {
    setQ('');
    setSearch('');
    setCoordinatorId(null);
    setSupervisorId(null);
    setEstoqueAvancadoFilter(null);
    setAutoInventoryFilter(null);
  }

  useEffect(() => {
    loadProviders();
  }, [search, coordinatorId, supervisorId, estoqueAvancadoFilter, autoInventoryFilter]);

  const columns = [
    {
      title: 'Prestador',
      dataIndex: 'name',
      key: 'name',
      width: 360,
      render: (_: any, row: ProviderRow) => (
        <div style={{ minWidth: 0 }}>
          <b style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.name}</b>
          <br />
          <Text type="secondary" style={{ wordBreak: 'break-all' }}>{row.email || '-'}</Text>
        </div>
      ),
    },
    {
      title: 'Tipo',
      key: 'tipoPrestador',
      width: 90,
      align: 'center' as const,
      render: (_: any, row: ProviderRow) => <Tag color="blue">{row.tipoPrestador || '-'}</Tag>,
    },
    {
      title: 'Estoque Avançado',
      key: 'estoqueAvancado',
      width: 150,
      align: 'center' as const,
      render: (_: any, row: ProviderRow) =>
        row.estoqueAvancado ? (
          <Tag color="green">Sim</Tag>
        ) : (
          <Tag>Não</Tag>
        ),
    },
    {
      title: 'Auto Inventário',
      key: 'autoInventoryEnabled',
      width: 150,
      align: 'center' as const,
      render: (_: any, row: ProviderRow) =>
        row.autoInventoryEnabled ? (
          <Tag color="green">Ativado</Tag>
        ) : (
          <Tag>Desativado</Tag>
        ),
    },
    {
      title: 'Ação',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, row: ProviderRow) => (
        <Switch
          checked={row.autoInventoryEnabled}
          checkedChildren="Sim"
          unCheckedChildren="Não"
          loading={savingId === row.id}
          onChange={(checked) => toggleProvider(row, checked)}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card style={{ borderRadius: 12 }}>
        <Space align="start">
          <UserSwitchOutlined style={{ fontSize: 28, color: '#1677ff', marginTop: 6 }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Prestadores do Auto Inventário
            </Title>
            <Text type="secondary">
              Liste apenas prestadores ATA, PRP, SPOT e PSO. Veja quem possui estoque avançado e defina quem deve receber o auto inventário mensal.
            </Text>
          </div>
        </Space>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Filtros corrigidos"
        description="O filtro Estoque Avançado usa o cadastro do prestador, independente do Auto Inventário estar ativado ou não. O envio mensal continua controlado pela coluna Auto Inventário."
      />

      <Card style={{ borderRadius: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Pesquisar prestador"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onPressEnter={() => setSearch(q.trim())}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              showSearch
              placeholder="Coordenador"
              value={coordinatorId ?? undefined}
              options={coordinators.map((item) => ({ value: item.id, label: item.name }))}
              optionFilterProp="label"
              style={{ width: '100%' }}
              onChange={(value) => setCoordinatorId(value ?? null)}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              showSearch
              placeholder="Supervisor"
              value={supervisorId ?? undefined}
              options={supervisors.map((item) => ({ value: item.id, label: item.name }))}
              optionFilterProp="label"
              style={{ width: '100%' }}
              onChange={(value) => setSupervisorId(value ?? null)}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Estoque Avançado"
              value={estoqueAvancadoFilter ?? undefined}
              options={[
                { value: true, label: 'Com estoque avançado' },
                { value: false, label: 'Sem estoque avançado' },
              ]}
              style={{ width: '100%' }}
              onChange={(value) => setEstoqueAvancadoFilter(value ?? null)}
            />
          </Col>

          <Col xs={24} md={3}>
            <Select
              allowClear
              placeholder="Auto Inventário"
              value={autoInventoryFilter ?? undefined}
              options={[
                { value: true, label: 'Ativado' },
                { value: false, label: 'Desativado' },
              ]}
              style={{ width: '100%' }}
              onChange={(value) => setAutoInventoryFilter(value ?? null)}
            />
          </Col>

          <Col xs={24} md={3}>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => setSearch(q.trim())}>
                Pesquisar
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadProviders}>
                Atualizar
              </Button>
            </Space>
          </Col>
        </Row>

        <Space wrap style={{ marginTop: 12 }}>
          <Tag color="blue">Total: {resumo.total}</Tag>
          <Tag color="green">Com estoque avançado: {resumo.estoqueAvancado}</Tag>
          <Tag>Sem estoque avançado: {resumo.semEstoqueAvancado}</Tag>
          <Tag color="green">Auto inventário ativo: {resumo.autoInventario}</Tag>
          <Tag>Auto inventário inativo: {resumo.semAutoInventario}</Tag>
          <Button size="small" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={providers}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="middle"
        tableLayout="fixed"
        scroll={{ x: 900 }}
      />
    </Space>
  );
}
