import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Form,
  Input,
  Modal,
  Table,
  message,
  Descriptions,
  Upload,
  Space,
  Progress,
  Card,
  Typography,
  Grid,
  List,
} from 'antd';
import { useMemo, useState } from 'react';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';

type ImportState = {
  open: boolean;
  total: number;
  processed: number;
  created: number;
  updated: number;
  running: boolean;
  errors: { linha: number; erro: string }[];
};

type ClientRow = {
  id: number;
  name: string;
  cidade?: string | null;
  estado?: string | null;
  documento?: string | null;
  telefone1?: string | null;
};

type ClientFull = {
  id: number;
  idCliente: string;
  name: string;
  nomeFantasia: string;
  documento: string;
  tipoCliente: string;
  segmentacao: string;
  estado: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  complemento: string;
  cep: string;
  latitude: string;
  longitude: string;
  email1: string;
  telefone1: string;
  email2: string;
  telefone2: string;
};

export function ClientsPage() {
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // ✅ estado do import
  const [importState, setImportState] = useState<ImportState>({
    open: false,
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    running: false,
    errors: [],
  });

  // modal novo
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  // modal visualizar
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  // ✅ busca + paginação mobile
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery<ClientRow[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
    staleTime: 15_000,
  });

  const viewQuery = useQuery<ClientFull>({
    queryKey: ['client', viewId],
    enabled: !!viewId && viewOpen,
    queryFn: async () => (await api.get(`/clients/${viewId}`)).data,
    retry: false,
  });

  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/clients', payload)).data,
    onSuccess: () => {
      message.success('Cliente criado');
      qc.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
      form.resetFields();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.error || e?.response?.data?.message || 'Erro'),
  });

  async function startImport(file: File) {
    setImportState({
      open: true,
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      running: true,
      errors: [],
    });

    const formData = new FormData();
    formData.append('file', file);

    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken');

    const resp = await fetch(`${api.defaults.baseURL}/clients/import/stream`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!resp.ok || !resp.body) {
      setImportState((s) => ({ ...s, running: false }));
      message.error('Falha ao iniciar importação');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const chunk of parts) {
        const lines = chunk.split('\n');
        let eventName = '';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.replace('event:', '').trim();
          if (line.startsWith('data:')) dataStr = line.replace('data:', '').trim();
        }

        if (!eventName || !dataStr) continue;

        const payload = JSON.parse(dataStr);

        if (eventName === 'start') {
          setImportState((s) => ({ ...s, total: payload.total || 0 }));
        }

        if (eventName === 'progress') {
          setImportState((s) => ({
            ...s,
            processed: payload.processed ?? s.processed,
            total: payload.total ?? s.total,
            created: payload.created ?? s.created,
            updated: payload.updated ?? s.updated,
          }));
        }

        if (eventName === 'done') {
          setImportState((s) => ({
            ...s,
            processed: payload.processed ?? s.processed,
            total: payload.total ?? s.total,
            created: payload.created ?? s.created,
            updated: payload.updated ?? s.updated,
            errors: payload.errors || [],
            running: false,
          }));

          message.success(
            `Importação concluída: ${payload.created || 0} criados, ${payload.updated || 0} atualizados`
          );
          qc.invalidateQueries({ queryKey: ['clients'] });
        }

        if (eventName === 'error') {
          setImportState((s) => ({ ...s, running: false }));
          message.error(payload.message || 'Erro na importação');
        }
      }
    }
  }

  const columns = useMemo(
    () => [
      { title: 'Cliente', dataIndex: 'name' },
      { title: 'Telefone', dataIndex: 'telefone1' },
      { title: 'CNPJ/CPF', dataIndex: 'documento' },
      { title: 'Estado', dataIndex: 'estado', width: 90 },
      { title: 'Cidade', dataIndex: 'cidade' },
      {
        title: 'Ações',
        width: 140,
        render: (_: any, row: ClientRow) => (
          <Button
            onClick={() => {
              setViewId(row.id);
              setViewOpen(true);
            }}
          >
            Visualizar
          </Button>
        ),
      },
    ],
    []
  );

  const percent =
    importState.total > 0 ? Math.round((importState.processed / importState.total) * 100) : 0;

  const rows = data || [];

  // ✅ filtro pesquisa (front)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((c) => {
      const hay = [c.name, c.documento, c.telefone1, c.cidade, c.estado]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, search]);

  // ✅ paginação no mobile
  const pagedMobile = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // helpers do form responsivo
  const grid2 = isMobile ? '1fr' : '1fr 1fr';
  const grid3 = isMobile ? '1fr' : '120px 1fr 1fr';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header responsivo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 12,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Clientes
        </Typography.Title>

        <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => {
              startImport(file as File);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} type="dashed" block={isMobile}>
              Importar Excel
            </Button>
          </Upload>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} block={isMobile}>
            Novo cliente
          </Button>
        </Space>
      </div>

      {/* ✅ Busca */}
      <Card bodyStyle={{ padding: isMobile ? 12 : 16 }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <Input.Search
            placeholder="Pesquisar cliente, CNPJ/CPF, telefone, cidade..."
            allowClear
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onSearch={() => setPage(1)}
          />
          <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {filtered.length} resultado(s)
          </Typography.Text>
        </Space>
      </Card>

      {/* Lista no mobile / Table no desktop */}
      <Card bodyStyle={{ padding: isMobile ? 12 : 24 }}>
        {isMobile ? (
          <List
            dataSource={pagedMobile}
            loading={isLoading}
            locale={{ emptyText: 'Sem clientes.' }}
            pagination={{
              current: page,
              pageSize,
              total: filtered.length,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
            }}
            renderItem={(c) => (
              <Card key={c.id} style={{ marginBottom: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  <Typography.Text strong>{c.name}</Typography.Text>

                  <Space wrap>
                    <Typography.Text type="secondary">{c.documento || '—'}</Typography.Text>
                    <Typography.Text type="secondary">{c.telefone1 || '—'}</Typography.Text>
                  </Space>

                  <Typography.Text type="secondary">
                    {c.cidade || '—'} / {c.estado || '—'}
                  </Typography.Text>

                  <Button
                    block
                    onClick={() => {
                      setViewId(c.id);
                      setViewOpen(true);
                    }}
                  >
                    Visualizar
                  </Button>
                </Space>
              </Card>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            dataSource={filtered}
            loading={isLoading}
            columns={columns as any}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Modal Import */}
      <Modal
        title="Importando clientes..."
        open={importState.open}
        width={isMobile ? '96vw' : 720}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        onCancel={() => !importState.running && setImportState((s) => ({ ...s, open: false }))}
        footer={[
          <Button
            key="close"
            onClick={() => setImportState((s) => ({ ...s, open: false }))}
            disabled={importState.running}
            block={isMobile}
          >
            Fechar
          </Button>,
        ]}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>Progresso</b>
            <span>
              {importState.processed}/{importState.total || '...'}
            </span>
          </div>

          <Progress percent={percent} status={importState.running ? 'active' : 'normal'} />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>
              <b>Criados:</b> {importState.created}
            </span>
            <span>
              <b>Atualizados:</b> {importState.updated}
            </span>
            <span>
              <b>Erros:</b> {importState.errors.length}
            </span>
          </div>

          {importState.errors.length > 0 ? (
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
              {importState.errors.slice(0, 50).map((e, idx) => (
                <div key={idx}>
                  Linha {e.linha}: {e.erro}
                </div>
              ))}
              {importState.errors.length > 50 ? <div>... (mostrando 50)</div> : null}
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Modal: Novo cliente */}
      <Modal
        title="Novo cliente"
        open={open}
        onCancel={() => setOpen(false)}
        okText="Salvar"
        confirmLoading={create.isPending}
        onOk={() => form.submit()}
        width={isMobile ? '96vw' : 900}
        style={isMobile ? { maxWidth: '96vw' } : {}}
      >
        <Form layout="vertical" form={form} onFinish={(v) => create.mutate(v)}>
          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            <Form.Item name="idCliente" label="ID_cliente" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="tipoCliente" label="tipo_cliente" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="name" label="cliente" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="nomeFantasia" label="nome_fantasia" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            <Form.Item name="documento" label="cpf/cnpj" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="segmentacao" label="segmentacao" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: grid3, gap: 12 }}>
            <Form.Item name="estado" label="estado" rules={[{ required: true }]}>
              <Input maxLength={2} />
            </Form.Item>
            <Form.Item name="cidade" label="cidade" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="bairro" label="bairro" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="logradouro" label="logradouro" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            <Form.Item name="complemento" label="complemento" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="cep" label="cep" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            <Form.Item name="latitude" label="latitude" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="longitude" label="longitude" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            <Form.Item name="email1" label="email1" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="telefone1" label="telefone1" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: grid2, gap: 12 }}>
            <Form.Item name="email2" label="email2" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="telefone2" label="telefone2" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Modal: Visualizar */}
      <Modal
        title="Cliente - Visualizar"
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewOpen(false)} block={isMobile}>
            Fechar
          </Button>,
        ]}
        width={isMobile ? '96vw' : 900}
        style={isMobile ? { maxWidth: '96vw' } : {}}
      >
        {viewQuery.isLoading ? (
          <div>Carregando...</div>
        ) : viewQuery.isError ? (
          <div style={{ color: 'red' }}>Falha ao carregar cliente</div>
        ) : (
          <Descriptions bordered size="small" column={isMobile ? 1 : 2}>
            <Descriptions.Item label="ID_cliente">{viewQuery.data?.idCliente}</Descriptions.Item>
            <Descriptions.Item label="tipo_cliente">{viewQuery.data?.tipoCliente}</Descriptions.Item>

            <Descriptions.Item label="cliente">{viewQuery.data?.name}</Descriptions.Item>
            <Descriptions.Item label="nome_fantasia">{viewQuery.data?.nomeFantasia}</Descriptions.Item>

            <Descriptions.Item label="cpf/cnpj">{viewQuery.data?.documento}</Descriptions.Item>
            <Descriptions.Item label="segmentacao">{viewQuery.data?.segmentacao}</Descriptions.Item>

            <Descriptions.Item label="estado">{viewQuery.data?.estado}</Descriptions.Item>
            <Descriptions.Item label="cidade">{viewQuery.data?.cidade}</Descriptions.Item>

            <Descriptions.Item label="bairro">{viewQuery.data?.bairro}</Descriptions.Item>
            <Descriptions.Item label="cep">{viewQuery.data?.cep}</Descriptions.Item>

            <Descriptions.Item label="logradouro" span={isMobile ? 1 : 2}>
              {viewQuery.data?.logradouro}
            </Descriptions.Item>

            <Descriptions.Item label="complemento" span={isMobile ? 1 : 2}>
              {viewQuery.data?.complemento}
            </Descriptions.Item>

            <Descriptions.Item label="latitude">{viewQuery.data?.latitude}</Descriptions.Item>
            <Descriptions.Item label="longitude">{viewQuery.data?.longitude}</Descriptions.Item>

            <Descriptions.Item label="email1">{viewQuery.data?.email1}</Descriptions.Item>
            <Descriptions.Item label="telefone1">{viewQuery.data?.telefone1}</Descriptions.Item>

            <Descriptions.Item label="email2">{viewQuery.data?.email2}</Descriptions.Item>
            <Descriptions.Item label="telefone2">{viewQuery.data?.telefone2}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
