import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Dropdown,
  Alert,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloudSyncOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  InboxOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  ToolOutlined,
  UserSwitchOutlined,
  MoreOutlined,
  WarningOutlined,
  LinkOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../lib/api';
import AutoInventoryProvidersPage from './AutoInventoryProvidersPage';
import AutoInventoryItemsManager from './AutoInventoryItemsManager';

const { Title, Text } = Typography;

export default function AutoInventoryPage() {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);

  const lastStatusesRef = useRef<Record<number, string>>({});
  const [validationAlertModal, setValidationAlertModal] =  useState(false);
  const [changedProvider, setChangedProvider] =  useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  const [providerModal, setProviderModal] = useState(false);
  const [providerInventory, setProviderInventory] = useState<any>(null);

  const [itemsModal, setItemsModal] = useState(false);
  const [providersConfigModal, setProvidersConfigModal] = useState(false);

  const [configModal, setConfigModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm] = Form.useForm();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const month = selectedMonth.month() + 1;
  const year = selectedMonth.year();

  const providersRaw = dashboard?.providers || [];
  const providers = statusFilter
    ? providersRaw.filter((item: any) => item.status === statusFilter)
    : providersRaw;

  const resumo = dashboard?.resumo || {};
  const cycle = dashboard?.cycle || {};
  const config = cycle?.config || {};

  async function loadDashboard(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const res = await api.get('/auto-inventory/dashboard', {
        params: { month, year },
      });

      const nextProviders = res.data?.providers || [];
      const previousStatuses = lastStatusesRef.current || {};

      nextProviders.forEach((provider: any) => {
        const oldStatus = previousStatuses[provider.responseId];

        if (
          oldStatus &&
          oldStatus !== provider.status &&
          ['PARCIAL', 'COMPLETO'].includes(provider.status)
        ) {
          setChangedProvider(provider);
          setValidationAlertModal(true);
        }
      });

      const nextStatuses: Record<number, string> = {};
      nextProviders.forEach((provider: any) => {
        nextStatuses[provider.responseId] = provider.status;
      });

      lastStatusesRef.current = nextStatuses;
      setDashboard(res.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setDashboard(null);
        if (showLoading) message.warning('Nenhum ciclo encontrado para este mês.');
      } else {
        message.error(
          err?.response?.data?.error || 'Erro ao carregar auto inventário.'
        );
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function createCycle() {
    try {
      setCreating(true);

      await api.post('/auto-inventory/cycles', {
        month,
        year,
      });

      message.success('Ciclo criado com sucesso.');
      await loadDashboard();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Erro ao criar ciclo.');
    } finally {
      setCreating(false);
    }
  }

  async function syncProviders() {
    try {
      setSyncing(true);

      const res = await api.post('/auto-inventory/cycles/sync-providers', {
        month,
        year,
      });

      message.success(
        res.data?.message || 'Prestadores sincronizados com o ciclo.'
      );

      await loadDashboard();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao sincronizar prestadores.'
      );
    } finally {
      setSyncing(false);
    }
  }

  async function sendCycleEmails() {
    try {
      setSendingEmails(true);

      const res = await api.post('/auto-inventory/cycles/send-emails', {
        month,
        year,
      });

      message.success(
        `E-mails enviados: ${res.data?.enviados || 0}. Ignorados: ${
          res.data?.ignorados || 0
        }.`
      );

      await loadDashboard();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao enviar e-mails do ciclo.'
      );
    } finally {
      setSendingEmails(false);
    }
  }

  async function openProvider(providerId: number) {
    try {
      const res = await api.get(`/auto-inventory/providers/${providerId}`, {
        params: { month, year },
      });

      setProviderInventory(res.data);
      setProviderModal(true);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao abrir inventário do prestador.'
      );
    }
  }

  async function resend(providerId: number) {
    try {
      const res = await api.post(
        `/auto-inventory/providers/${providerId}/resend`,
        {
          month,
          year,
        }
      );

      message.success('Solicitação reenviada com sucesso.');

      if (res.data?.link) {
        navigator.clipboard?.writeText(res.data.link);
      }

      await loadDashboard();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao reenviar solicitação.'
      );
    }
  }

  async function exportExcel(providerId?: number, providerName?: string) {
    try {
      const res = await api.get('/auto-inventory/export', {
        params: {
          month,
          year,
          ...(providerId ? { providerId } : {}),
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      const safeName = String(providerName || providerId || '')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '-');

      a.href = objectUrl;
      a.download = providerId
        ? `auto-inventario-${safeName}-${month}-${year}.xlsx`
        : `auto-inventario-${month}-${year}.xlsx`;

      a.click();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        message.error('Sem permissão para exportar.');
        return;
      }

      if (err?.response?.status === 401) {
        message.error('Sessão expirada. Faça login novamente.');
        return;
      }

      message.error('Erro ao baixar Excel.');
    }
  }

  async function openConfigModal() {
    try {
      setConfigLoading(true);

      const res = await api.get('/auto-inventory/config');

      configForm.setFieldsValue({
        sendDay: res.data?.sendDay || 20,
        emailCc: res.data?.emailCc || '',
        enabled: !!res.data?.enabled,
      });

      setConfigModal(true);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao carregar configurações.'
      );
    } finally {
      setConfigLoading(false);
    }
  }

  async function saveConfig(values: any) {
    try {
      setSavingConfig(true);

      await api.patch('/auto-inventory/config', {
        sendDay: values.sendDay,
        emailCc: values.emailCc,
        enabled: values.enabled,
      });

      message.success('Configurações salvas com sucesso.');

      setConfigModal(false);
      await loadDashboard();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao salvar configurações.'
      );
    } finally {
      setSavingConfig(false);
    }
  }

  async function validateInventory(responseId: number) {
    try {
      await api.patch(`/auto-inventory/responses/${responseId}/validate`);

      message.success('Inventário validado com sucesso.');
      await loadDashboard();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error || 'Erro ao validar inventário.'
      );
    }
  }

  async function removeProviderFromCycle(providerId: number) {
    Modal.confirm({
      title: 'Remover prestador deste inventário?',
      content:
        'Essa ação remove o prestador do mês selecionado e desabilita o auto inventário para próximos ciclos.',
      okText: 'Remover',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await api.delete(
            `/auto-inventory/providers/${providerId}/remove-from-cycle`,
            {
              data: {
                month,
                year,
              },
            }
          );

          message.success('Prestador removido e auto inventário desabilitado.');
          await loadDashboard();
        } catch (err: any) {
          message.error(
            err?.response?.data?.error ||
              'Erro ao remover prestador do inventário.'
          );
        }
      },
    });
  }

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedMonth]);

  const statusTag = (status: string) => {
    if (status === 'COMPLETO') {
      return (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          Completo
        </Tag>
      );
    }

    if (status === 'PARCIAL') {
      return (
        <Tag color="orange" icon={<WarningOutlined />}>
          Parcial
        </Tag>
      );
    }

    return (
      <Tag color="red" icon={<ClockCircleOutlined />}>
        Pendente
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Prestador',
      dataIndex: ['prestador', 'name'],
      key: 'prestador',
      render: (_: any, row: any) => (
        <div>
          <b>{row.prestador?.name || 'Sem nome'}</b>
          <br />
          <Text type="secondary">{row.prestador?.email || '-'}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: statusTag,
    },
    {
      title: 'Progresso',
      key: 'progresso',
      width: 170,
      render: (_: any, row: any) => {
        const percent = row.totalItens
          ? Math.round((row.preenchidos / row.totalItens) * 100)
          : 0;

        return (
          <div>
            <Progress percent={percent} size="small" />
            <Text type="secondary">
              {row.preenchidos}/{row.totalItens} itens
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Faltantes',
      dataIndex: 'faltantes',
      key: 'faltantes',
      width: 100,
      render: (value: number) =>
        value > 0 ? <Tag color="red">{value}</Tag> : <Tag color="green">0</Tag>,
    },
    {
      title: 'Abriu em',
      dataIndex: 'openedAt',
      key: 'openedAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Última atualização',
      dataIndex: 'lastUpdateAt',
      key: 'lastUpdateAt',
      width: 180,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Validação',
      key: 'validacao',
      width: 220,
      render: (_: any, row: any) => {
        if (!row.validatedAt) {
          return <Tag color="orange">Não validado</Tag>;
        }

        return (
          <div>
            <Tag color="green" icon={<CheckSquareOutlined />}>
              Validado
            </Tag>
            <br />
            <Text type="secondary">{row.validatedBy?.name || '-'}</Text>
            <br />
            <Text type="secondary">
              {dayjs(row.validatedAt).format('DD/MM/YYYY HH:mm')}
            </Text>
          </div>
        );
      },
    },
  {
    title: 'Ações',
    key: 'acoes',
    width: 120,
    fixed: 'right' as const,
    render: (_: any, row: any) => {
      const items = [
        {
          key: 'ver',
          icon: <EyeOutlined />,
          label: 'Ver inventário',
          onClick: () => openProvider(row.providerId),
        },

        {
          key: 'validar',
          icon: <CheckSquareOutlined />,
          label: row.validatedAt ? 'Já validado' : 'Validar',
          disabled:
            !!row.validatedAt ||
            !['PARCIAL', 'COMPLETO'].includes(row.status),
          onClick: () => validateInventory(row.responseId),
        },

        {
          key: 'reenviar',
          icon: <MailOutlined />,
          label: 'Reenviar e-mail',
          onClick: () => resend(row.providerId),
        },

        {
          key: 'excel',
          icon: <DownloadOutlined />,
          label: 'Baixar Excel',
          onClick: () =>
            exportExcel(row.providerId, row.prestador?.name),
        },

        {
          key: 'abrir',
          icon: <LinkOutlined />,
          label: 'Abrir link',
          onClick: () => {
            if (row.link) {
              window.open(row.link, '_blank');
            }
          },
        },

        {
          key: 'copiar',
          icon: <CopyOutlined />,
          label: 'Copiar link',
          onClick: () => {
            navigator.clipboard.writeText(row.link || '');
            message.success('Link copiado.');
          },
        },

        {
          type: 'divider',
        },

        {
          key: 'remover',
          danger: true,
          icon: <DeleteOutlined />,
          label: 'Remover do inventário',
          onClick: () => removeProviderFromCycle(row.providerId),
        },
      ];

      return (
        <Dropdown
          menu={{ items }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button icon={<MoreOutlined />}>
            Ações
          </Button>
        </Dropdown>
      );
    },
  },
  ];

  const itemColumns = [
    {
      title: 'Código',
      dataIndex: ['item', 'codigo'],
      key: 'codigo',
      width: 160,
    },
    {
      title: 'Peça',
      dataIndex: ['item', 'nome'],
      key: 'nome',
    },
    {
      title: 'Quantidade',
      dataIndex: 'quantidade',
      key: 'quantidade',
      width: 140,
      render: (v: any) => v ?? <Tag color="red">Não preenchido</Tag>,
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Card
          style={{
            borderRadius: 20,
            border: '1px solid #edf2f7',
            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
          }}
          styles={{
            body: {
              padding: 24,
            },
          }}
        >
          <Row justify="space-between" align="middle" gutter={[20, 20]}>
            <Col xs={24} lg={8}>
              <Space direction="vertical" size={2}>
                <Space align="center" size={12}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <InboxOutlined
                      style={{
                        fontSize: 22,
                        color: '#1677ff',
                      }}
                    />
                  </div>

                  <div>
                    <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                      Auto Inventário
                    </Title>

                    <Text style={{ color: '#64748b', fontSize: 14 }}>
                      Gestão mensal de peças por prestador
                    </Text>
                  </div>
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={16}>
              <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={(date) => setSelectedMonth(date || dayjs())}
                  format="MM/YYYY"
                  style={{ borderRadius: 12 }}
                />

                <Button icon={<ReloadOutlined />} onClick={() => loadDashboard()} loading={loading}>
                  Atualizar
                </Button>

                <Button icon={<SettingOutlined />} onClick={openConfigModal} loading={configLoading}>
                  Configurações
                </Button>

                <Button icon={<ToolOutlined />} onClick={() => setItemsModal(true)}>
                  Peças
                </Button>

                <Button icon={<UserSwitchOutlined />} onClick={() => setProvidersConfigModal(true)}>
                  Prestadores
                </Button>

                <Button icon={<CloudSyncOutlined />} onClick={syncProviders} loading={syncing}>
                  Sincronizar
                </Button>

                <Button
                  icon={<MailOutlined />}
                  onClick={sendCycleEmails}
                  loading={sendingEmails}
                  disabled={!dashboard}
                >
                  Enviar e-mails
                </Button>

                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  onClick={createCycle}
                  loading={creating}
                  style={{ borderRadius: 12 }}
                >
                  Criar ciclo
                </Button>

                <Button icon={<DownloadOutlined />} onClick={() => exportExcel()} disabled={!dashboard}>
                  Excel geral
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card style={{ borderRadius: 18 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Text type="secondary">Ciclo selecionado</Text>
              <br />
              <b>{cycle?.nome || selectedMonth.format('MMMM/YYYY')}</b>
            </Col>

            <Col xs={24} md={8}>
              <Text type="secondary">Envio automático</Text>
              <br />
              {config?.enabled ? (
                <Tag color="green">Ativo - dia {config?.sendDay || 20}</Tag>
              ) : (
                <Tag color="red">Desativado</Tag>
              )}
            </Col>

            <Col xs={24} md={8}>
              <Text type="secondary">E-mails em cópia</Text>
              <br />
              <Text>{config?.emailCc || 'Nenhum e-mail em cópia'}</Text>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Card onClick={() => setStatusFilter(null)} style={{ borderRadius: 18, cursor: 'pointer' }}>
              <Statistic title="Prestadores" value={resumo.totalPrestadores || 0} prefix={<UserSwitchOutlined />} />
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card onClick={() => setStatusFilter('PENDENTE')} style={{ borderRadius: 18, cursor: 'pointer' }}>
              <Statistic title="Pendentes" value={resumo.pendentes || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card onClick={() => setStatusFilter('PARCIAL')} style={{ borderRadius: 18, cursor: 'pointer' }}>
              <Statistic title="Parciais" value={resumo.parciais || 0} prefix={<WarningOutlined />} valueStyle={{ color: '#d48806' }} />
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card onClick={() => setStatusFilter('COMPLETO')} style={{ borderRadius: 18, cursor: 'pointer' }}>
              <Statistic title="Completos" value={resumo.completos || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#389e0d' }} />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <InboxOutlined />
              <span>Prestadores do ciclo</span>
            </Space>
          }
          extra={
            statusFilter ? (
              <Tag closable color="blue" onClose={() => setStatusFilter(null)}>
                Filtro: {statusFilter}
              </Tag>
            ) : (
              <Tag color="default">Todos</Tag>
            )
          }
          style={{ borderRadius: 18 }}
        >
          <Table
            rowKey="responseId"
            loading={loading}
            columns={columns}
            dataSource={providers}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `${total} prestadores`,
            }}
            scroll={{ x: 1400 }}
          />
        </Card>
      </Space>

      <Modal title="Configurações do Auto Inventário" open={configModal} onCancel={() => setConfigModal(false)} footer={null} width={720}>
        <Form layout="vertical" form={configForm} onFinish={saveConfig}>
          <Form.Item label="Dia do envio automático" name="sendDay" rules={[{ required: true, message: 'Informe o dia do envio' }]}>
            <InputNumber min={1} max={31} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="E-mails em cópia" name="emailCc" extra="Separe múltiplos e-mails com ponto e vírgula (;).">
            <Input.TextArea rows={4} placeholder="renato.yamanaka@omnilink.com.br; supervisor@omnilink.com.br" />
          </Form.Item>

          <Form.Item label="Envio automático habilitado" name="enabled" valuePropName="checked">
            <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setConfigModal(false)}>Cancelar</Button>

            <Button type="primary" htmlType="submit" loading={savingConfig}>
              Salvar configurações
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal title="Peças do Auto Inventário" open={itemsModal} onCancel={() => setItemsModal(false)} footer={null} width={1000}>
        <AutoInventoryItemsManager />
      </Modal>

      <Modal title="Prestadores do Auto Inventário" open={providersConfigModal} onCancel={() => setProvidersConfigModal(false)} footer={null} width={1100}>
        <AutoInventoryProvidersPage />
      </Modal>

      <Modal title="Inventário do Prestador" open={providerModal} onCancel={() => setProviderModal(false)} footer={null} width={950}>
        {providerInventory && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card style={{ borderRadius: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Title level={5} style={{ margin: 0 }}>
                    {providerInventory.provider?.name}
                  </Title>
                  <Text type="secondary">{providerInventory.provider?.email}</Text>
                </Col>

                <Col>{statusTag(providerInventory.status)}</Col>
              </Row>

              {providerInventory.link && (
                <Button
                  style={{ marginTop: 16 }}
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(providerInventory.link);
                    message.success('Link copiado.');
                  }}
                >
                  Copiar link público
                </Button>
              )}
            </Card>

            <Table rowKey="id" columns={itemColumns} dataSource={providerInventory.items || []} pagination={false} />
          </Space>
        )}
      </Modal>
      <Modal
          title="Inventário atualizado"
          open={validationAlertModal}
          onCancel={() => setValidationAlertModal(false)}
          footer={[
            <Button
              key="fechar"
              onClick={() => setValidationAlertModal(false)}
            >
              Fechar
            </Button>,

            <Button
              key="ver"
              onClick={() => {
                setValidationAlertModal(false);

                if (changedProvider?.providerId) {
                  openProvider(changedProvider.providerId);
                }
              }}
            >
              Ver inventário
            </Button>,

            <Button
              key="validar"
              type="primary"
              disabled={
                !changedProvider ||
                changedProvider.validatedAt ||
                !['PARCIAL', 'COMPLETO'].includes(
                  changedProvider.status
                )
              }
              onClick={async () => {
                if (!changedProvider) return;

                await validateInventory(
                  changedProvider.responseId
                );

                setValidationAlertModal(false);
              }}
            >
              Validar agora
            </Button>,
          ]}
        >
          <Space
            direction="vertical"
            size={14}
            style={{ width: '100%' }}
          >
            <Alert
              type={
                changedProvider?.status === 'COMPLETO'
                  ? 'success'
                  : 'warning'
              }
              showIcon
              message={`${
                changedProvider?.prestador?.name || 'Prestador'
              } atualizou o auto inventário.`}
              description={`Status atual: ${
                changedProvider?.status || '-'
              }`}
            />

            <div>
              <b>Prestador:</b>{' '}
              {changedProvider?.prestador?.name || '-'}
              <br />

              <b>E-mail:</b>{' '}
              {changedProvider?.prestador?.email || '-'}
              <br />

              <b>Itens preenchidos:</b>{' '}
              {changedProvider?.preenchidos || 0}/
              {changedProvider?.totalItens || 0}
              <br />

              <b>Última atualização:</b>{' '}
              {changedProvider?.lastUpdateAt
                ? dayjs(changedProvider.lastUpdateAt).format(
                    'DD/MM/YYYY HH:mm'
                  )
                : '-'}
            </div>
          </Space>
        </Modal>
    </div>
  );
}
